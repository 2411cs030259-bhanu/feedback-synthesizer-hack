import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.agent.agent_planner import AgentPlanner
from backend.agent.agent_tools import agent_tools
from backend.database.db import get_all_complaint_clusters, insert_agent_run
from backend.models.schemas import (
    AgentActionType,
    AgentActivityRun,
    AgentStatusType,
    InvestigationEvidence,
    InvestigationResult,
    MemoryItem,
)
from backend.services.ai_service import ai_service
from backend.services.feedback_service import create_normalized_feedback


class FeedbackAgent:
    def __init__(self) -> None:
        self.planner = AgentPlanner()

    def _log_step(
        self,
        action: AgentActionType,
        status: AgentStatusType,
        details: Dict[str, Any],
        feedback_id: Optional[str] = None,
    ) -> AgentActivityRun:
        run = AgentActivityRun(
            id=f"run_{int(time.time() * 1000)}_{secrets.token_hex(3)}",
            feedback_id=feedback_id,
            action=action,
            status=status,
            created_at=datetime.now(timezone.utc).isoformat(),
            details=details,
        )
        insert_agent_run(run)
        return run

    async def process_feedback(self, raw_input: Dict[str, Any]) -> Dict[str, Any]:
        steps: List[AgentActivityRun] = []

        observe_step = self._log_step(
            "OBSERVE",
            "SUCCESS",
            {
                "message": f"Received incoming feedback via {raw_input.get('source') or 'Support'} channel.",
                "text_preview": str(raw_input.get("feedback_text", ""))[:100],
                "customer": raw_input.get("customer") or "Anonymous",
            },
        )
        steps.append(observe_step)

        analyze_res = await agent_tools.analyze_feedback(
            str(raw_input.get("feedback_text", "")),
            {
                "source": raw_input.get("source"),
                "customer": raw_input.get("customer"),
            },
        )
        analysis = analyze_res["analysis"]
        ai_provider = analyze_res["provider"]

        feedback = create_normalized_feedback(raw_input, analysis)

        understand_step = self._log_step(
            "UNDERSTAND",
            "SUCCESS" if ai_provider == "groq" else "FALLBACK",
            {
                "message": f"Extracted sentiment: {analysis.sentiment} ({analysis.sentiment_score}), Topic: {analysis.topic}, Subcategory: {analysis.subcategory}.",
                "problem": analysis.problem,
                "keywords": analysis.keywords,
                "urgency": analysis.urgency,
                "model": (
                    "Groq llama-3.3-70b-versatile (HTTPX)"
                    if ai_provider == "groq"
                    else "Local Template Provider"
                ),
            },
            feedback.id,
        )
        steps.append(understand_step)

        decision = self.planner.evaluate_memory_relevance(
            analysis, feedback.feedback_text
        )
        decide_step = self._log_step(
            "DECIDE",
            "SUCCESS",
            {
                "message": (
                    f"Historical memory is relevant: {decision['reason']}"
                    if decision["shouldRecall"]
                    else f"Skipping memory recall: {decision['reason']}"
                ),
                "shouldRecall": decision["shouldRecall"],
                "query": decision["recallQuery"],
            },
            feedback.id,
        )
        steps.append(decide_step)

        recalled_memories: List[MemoryItem] = []
        memory_provider = "local"

        if decision["shouldRecall"]:
            recall_result = await agent_tools.recall_memory(
                decision["recallQuery"],
                [analysis.topic, feedback.source.lower().replace(" ", "_")],
                8,
            )
            memory_provider = recall_result["provider"]
            recalled_memories = recall_result["memories"]

            recall_step = self._log_step(
                "RECALL",
                "SUCCESS" if memory_provider == "hindsight" else "FALLBACK",
                {
                    "message": (
                        f"Hindsight RECALL retrieved {len(recalled_memories)} relevant historical experiences."
                        if memory_provider == "hindsight"
                        else f"Hindsight offline. Local Memory RECALL retrieved {len(recalled_memories)} relevant historical memories."
                    ),
                    "recalled_count": len(recalled_memories),
                    "query": decision["recallQuery"],
                    "provider": memory_provider,
                    "error": recall_result.get("error"),
                    "top_memories": [
                        {
                            "id": m.id,
                            "score": m.score,
                            "source": m.metadata.get("source"),
                            "date": m.metadata.get("date") or m.created_at,
                            "content": m.content[:100],
                        }
                        for m in recalled_memories[:3]
                    ],
                },
                feedback.id,
            )
            steps.append(recall_step)
        else:
            steps.append(
                self._log_step(
                    "RECALL",
                    "SKIPPED",
                    {"message": "Recall skipped per planner decision."},
                    feedback.id,
                )
            )

        cluster_result = await self.planner.reason_and_cluster(
            feedback, recalled_memories
        )
        cluster_obj = cluster_result["cluster"]

        reason_step = self._log_step(
            "REASON",
            "SUCCESS" if cluster_result["aiProvider"] == "groq" else "FALLBACK",
            {
                "message": f"Agent compared historical memories with current feedback: {cluster_result['explanation']}",
                "recurring_detected": cluster_result["isRecurring"],
                "cluster_title": cluster_obj.title if cluster_obj else None,
                "occurrences": cluster_obj.occurrence_count if cluster_obj else 1,
                "channels": cluster_obj.sources if cluster_obj else [feedback.source],
            },
            feedback.id,
        )
        steps.append(reason_step)

        detect_step = self._log_step(
            "DETECT",
            "SUCCESS" if cluster_result["isRecurring"] else "SKIPPED",
            {
                "message": (
                    f'Detected Recurring Complaint: "{cluster_obj.title}" ({cluster_obj.occurrence_count} occurrences across {cluster_obj.source_count} channels).'
                    if cluster_result["isRecurring"] and cluster_obj
                    else "No recurring pattern detected; classified as single isolated feedback."
                ),
                "cluster_id": cluster_obj.id if cluster_obj else None,
                "first_seen": cluster_obj.first_seen if cluster_obj else None,
                "last_seen": cluster_obj.last_seen if cluster_obj else None,
            },
            feedback.id,
        )
        steps.append(detect_step)

        retain_result = await agent_tools.retain_memory(feedback)
        retain_step = self._log_step(
            "RETAIN",
            "SUCCESS" if retain_result["provider"] == "hindsight" else "FALLBACK",
            {
                "message": (
                    "Hindsight RETAIN succeeded. Memory persisted to bank with metadata tags."
                    if retain_result["provider"] == "hindsight"
                    else f"Retained in Local Memory fallback store ({retain_result.get('error') or 'Hindsight offline'})."
                ),
                "memoryId": retain_result.get("memoryId"),
                "provider": retain_result["provider"],
                "topic": feedback.topic,
                "sentiment": feedback.sentiment,
            },
            feedback.id,
        )
        steps.append(retain_step)

        if cluster_result["isRecurring"] and cluster_obj:
            insight = f'Recurring issue detected: "{cluster_obj.title}". First observed on {cluster_obj.first_seen}, now reported {cluster_obj.occurrence_count} times across {", ".join(cluster_obj.sources)}. Trend indicates {cluster_obj.sentiment_trend.lower()}.'
        else:
            insight = f"New feedback recorded under topic '{feedback.topic}'. Retained in persistent memory bank for future cross-reference."

        insight_step = self._log_step(
            "INSIGHT",
            "SUCCESS",
            {
                "message": insight,
                "cluster_id": cluster_obj.id if cluster_obj else None,
                "is_recurring": cluster_result["isRecurring"],
            },
            feedback.id,
        )
        steps.append(insight_step)

        related_feedbacks = agent_tools.find_related_feedback(feedback.topic)
        timeline = agent_tools.get_feedback_timeline(related_feedbacks)

        return {
            "feedback": feedback.model_dump(),
            "analysis": analysis.model_dump(),
            "recalledMemories": [m.model_dump() for m in recalled_memories],
            "isRecurring": cluster_result["isRecurring"],
            "cluster": cluster_obj.model_dump() if cluster_obj else None,
            "insight": insight,
            "retained": {
                "success": retain_result["success"],
                "memoryId": retain_result.get("memoryId"),
                "provider": retain_result["provider"],
            },
            "timeline": timeline,
            "agentSteps": [s.model_dump() for s in steps],
            "aiMode": ai_provider,
            "memoryMode": memory_provider,
        }

    async def investigate(self, question: str) -> InvestigationResult:
        q_trimmed = question.strip()
        q_lower = q_trimmed.lower()

        if any(k in q_lower for k in ("onboard", "setup", "start")):
            query_topic = "onboarding getting started"
        elif any(k in q_lower for k in ("slow", "performance", "lag")):
            query_topic = "performance slow latency"
        elif any(k in q_lower for k in ("export", "csv", "pdf")):
            query_topic = "export csv download"
        elif any(k in q_lower for k in ("pric", "cost", "tier")):
            query_topic = "pricing subscription cost"
        elif any(k in q_lower for k in ("doc", "api")):
            query_topic = "documentation api guide"
        else:
            query_topic = q_trimmed

        recall_result = await agent_tools.recall_memory(query_topic, None, 10)
        recalled_memories: List[MemoryItem] = recall_result["memories"]
        clusters = get_all_complaint_clusters()

        ans_res = await ai_service.answer_investigation(
            q_trimmed, recalled_memories, clusters
        )
        raw_evidence = ans_res.get("evidence", [])
        ai_provider = ans_res.get("provider", "local")

        evidence_list: List[InvestigationEvidence] = []
        channels_set = set()
        for ev in raw_evidence:
            if isinstance(ev, dict):
                src = str(ev.get("source") or "Support")
                channels_set.add(src)
                evidence_list.append(
                    InvestigationEvidence(
                        source=src,
                        date=str(ev.get("date") or ""),
                        customer=str(ev.get("customer") or "Customer"),
                        quote=str(ev.get("quote") or ""),
                        relevance=str(ev.get("relevance") or ""),
                    )
                )

        for mem in recalled_memories:
            src = mem.metadata.get("source")
            if src:
                channels_set.add(str(src))

        dates = sorted(e.date for e in evidence_list if e.date)
        matched_cluster = next(
            (c for c in clusters if any(s in channels_set for s in c.sources)),
            None,
        )

        self._log_step(
            "INVESTIGATE",
            "SUCCESS",
            {
                "message": f'Investigated question: "{q_trimmed}" -> retrieved {len(recalled_memories)} memories and {len(evidence_list)} citations.',
                "question": q_trimmed,
                "interpreted_query": query_topic,
                "recalled_count": len(recalled_memories),
                "evidence_count": len(evidence_list),
                "aiProvider": ai_provider,
                "memoryProvider": recall_result["provider"],
            },
        )

        return InvestigationResult(
            question=q_trimmed,
            interpretedQuery=query_topic,
            relevantFound=len(recalled_memories) > 0 or len(evidence_list) > 0,
            recalledCount=len(recalled_memories),
            recalledMemories=recalled_memories,
            recurringIssueIdentified=len(evidence_list) >= 2,
            clusterTitle=matched_cluster.title if matched_cluster else None,
            answer=str(ans_res.get("answer") or ""),
            firstObserved=dates[0] if dates else "Unknown",
            latestObserved=dates[-1] if dates else "Unknown",
            channels=list(channels_set),
            evidence=evidence_list,
            aiMode=ai_provider,  # type: ignore
            memoryMode=recall_result["provider"],  # type: ignore
        )


feedback_agent = FeedbackAgent()
