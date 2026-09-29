from typing import Any, Dict, List
from backend.agent.agent_tools import agent_tools
from backend.models.schemas import (
    ComplaintCluster,
    FeedbackAnalysis,
    FeedbackItem,
    MemoryItem,
)
from backend.services.ai_service import ai_service


class AgentPlanner:
    def evaluate_memory_relevance(
        self, analysis: FeedbackAnalysis, text: str
    ) -> Dict[str, Any]:
        if analysis.sentiment == "positive" and not analysis.needsHistoricalContext:
            return {
                "shouldRecall": False,
                "recallQuery": "",
                "reason": "Positive praise with no recorded product friction. Memory recall not required.",
            }

        query_parts = " ".join(
            p for p in (analysis.topic, analysis.subcategory, analysis.problem) if p
        )
        return {
            "shouldRecall": True,
            "recallQuery": query_parts or text[:80],
            "reason": f"Negative or neutral feedback in '{analysis.topic}' category. Recalling historical context from memory bank.",
        }

    async def reason_and_cluster(
        self,
        current_feedback: FeedbackItem,
        recalled_memories: List[MemoryItem],
    ) -> Dict[str, Any]:
        topic = current_feedback.topic.lower()
        existing_clusters = agent_tools.get_complaint_history()
        existing_cluster = next(
            (
                c
                for c in existing_clusters
                if topic in c.id.lower() or topic in c.title.lower()
            ),
            None,
        )

        reasoning = await ai_service.reason_over_memories(
            {
                "text": current_feedback.feedback_text,
                "topic": current_feedback.topic,
                "problem": current_feedback.problem or current_feedback.feedback_text,
                "source": current_feedback.source,
                "date": current_feedback.created_at[:10],
            },
            recalled_memories,
        )

        related_in_db = agent_tools.find_related_feedback(current_feedback.topic)
        is_recurring = (
            bool(reasoning.get("isRecurring"))
            or len(related_in_db) >= 2
            or (existing_cluster is not None and existing_cluster.occurrence_count >= 1)
            or len(recalled_memories) >= 1
        )

        if (
            not is_recurring
            and not recalled_memories
            and existing_cluster is None
            and len(related_in_db) < 2
        ):
            return {
                "isRecurring": False,
                "cluster": None,
                "explanation": "First observed instance of this feedback topic. No previous recurring pattern detected.",
                "aiProvider": reasoning.get("provider", "local"),
            }

        cluster_id = (
            existing_cluster.id
            if existing_cluster
            else f"cluster_{topic.replace(' ', '_')}"
        )

        all_related = list(related_in_db)
        if not any(i.id == current_feedback.id for i in all_related):
            all_related.append(current_feedback)

        all_related.sort(key=lambda a: a.created_timestamp)

        first_seen = (
            all_related[0].created_at[:10]
            if all_related
            else current_feedback.created_at[:10]
        )
        last_seen = (
            all_related[-1].created_at[:10]
            if all_related
            else current_feedback.created_at[:10]
        )
        sources = list(dict.fromkeys(f.source for f in all_related))

        cluster = ComplaintCluster(
            id=cluster_id,
            title=existing_cluster.title
            if existing_cluster
            else str(reasoning.get("clusterTitle") or f"{topic.capitalize()} Friction"),
            description=str(reasoning.get("description") or ""),
            first_seen=first_seen,
            last_seen=last_seen,
            occurrence_count=len(all_related),
            source_count=len(sources),
            sources=sources,
            sentiment_trend=(
                "Repeated cross-channel feedback"
                if len(sources) > 1
                else str(reasoning.get("sentimentTrend") or "Repeated negative feedback")
            ),
            feedback_ids=[f.id for f in all_related],
            feedbacks=all_related,
        )

        agent_tools.save_cluster(cluster)
        return {
            "isRecurring": True,
            "cluster": cluster,
            "explanation": str(reasoning.get("explanation") or ""),
            "aiProvider": reasoning.get("provider", "local"),
        }
