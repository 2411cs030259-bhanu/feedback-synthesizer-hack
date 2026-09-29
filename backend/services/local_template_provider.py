import re
from typing import Any, Dict, List, Optional
from backend.models.schemas import (
    ComplaintCluster,
    FeedbackAnalysis,
    MemoryItem,
)

POSITIVE_WORDS = [
    "great",
    "love",
    "excellent",
    "amazing",
    "good",
    "smooth",
    "helpful",
    "fast",
    "awesome",
    "intuitive",
    "easy",
    "perfect",
]
NEGATIVE_WORDS = [
    "confusing",
    "confused",
    "difficult",
    "struggle",
    "struggling",
    "slow",
    "lag",
    "bad",
    "poor",
    "unclear",
    "missing",
    "broken",
    "fail",
    "hard",
    "stuck",
    "frustrating",
    "expensive",
    "useless",
    "terrible",
    "crash",
    "freeze",
    "unable",
    "cannot",
    "can't",
    "don't understand",
]
CRITICAL_WORDS = [
    "crash",
    "freeze",
    "unusable",
    "critical",
    "data loss",
    "down",
    "broken completely",
    "urgent",
    "disaster",
]
HIGH_WORDS = [
    "blocking",
    "cannot work",
    "impossible",
    "major issue",
    "very slow",
    "stuck",
    "completely lost",
]

TOPIC_RULES = [
    {
        "topic": "onboarding",
        "subcategory": "getting_started",
        "keywords": [
            "onboarding",
            "setup",
            "getting started",
            "initial setup",
            "tutorial",
            "instructions",
            "walkthrough",
        ],
        "patterns": [
            r"onboard",
            r"setup",
            r"set up",
            r"get started",
            r"getting started",
            r"start using",
            r"how to start",
            r"initial step",
            r"walkthrough",
            r"configur",
        ],
        "problem": "Users experience friction and confusion during initial setup and onboarding",
    },
    {
        "topic": "performance",
        "subcategory": "speed_latency",
        "keywords": [
            "performance",
            "slow",
            "latency",
            "lag",
            "loading",
            "timeout",
            "dataset",
            "freeze",
        ],
        "patterns": [
            r"slow",
            r"lag",
            r"latency",
            r"loading",
            r"speed",
            r"unresponsive",
            r"freeze",
            r"spinning",
            r"load time",
        ],
        "problem": "System exhibits high latency and sluggish load times, especially with large datasets",
    },
    {
        "topic": "export",
        "subcategory": "file_export",
        "keywords": [
            "export",
            "csv",
            "pdf",
            "download",
            "excel",
            "data dump",
            "extract",
        ],
        "patterns": [r"export", r"csv", r"pdf", r"download", r"excel", r"extract data"],
        "problem": "Missing or inadequate data export options for CSV, PDF, and reports",
    },
    {
        "topic": "pricing",
        "subcategory": "tier_limits",
        "keywords": [
            "pricing",
            "price",
            "tier",
            "cost",
            "expensive",
            "subscription",
            "billing",
            "seat",
        ],
        "patterns": [
            r"pric",
            r"tier",
            r"cost",
            r"subscription",
            r"billing",
            r"expensive",
            r"plan limit",
            r"seat",
        ],
        "problem": "Confusion or dissatisfaction regarding pricing tiers, feature gating, or seat limits",
    },
    {
        "topic": "documentation",
        "subcategory": "api_docs",
        "keywords": [
            "documentation",
            "docs",
            "api",
            "readme",
            "examples",
            "manual",
            "reference",
        ],
        "patterns": [
            r"doc",
            r"api doc",
            r"readme",
            r"manual",
            r"examples",
            r"reference",
            r"sdk",
        ],
        "problem": "Incomplete or unclear documentation and missing API integration code examples",
    },
    {
        "topic": "ui",
        "subcategory": "navigation",
        "keywords": [
            "ui",
            "interface",
            "layout",
            "design",
            "navigation",
            "dark mode",
            "button",
        ],
        "patterns": [
            r"ui",
            r"ux",
            r"interface",
            r"menu",
            r"layout",
            r"navigation",
            r"button",
            r"dark mode",
        ],
        "problem": "User interface layout, navigation flow, or styling concerns",
    },
]


class LocalTemplateProvider:
    async def check_health(self) -> Dict[str, Any]:
        return {
            "connected": True,
            "message": "Local Template Engine active (deterministic fallback)",
            "model": "local-template-v1",
        }

    async def analyze_feedback(
        self, text: str, context: Optional[Dict[str, Optional[str]]] = None
    ) -> FeedbackAnalysis:
        lower = text.lower()
        pos_count = sum(1 for w in POSITIVE_WORDS if w in lower)
        neg_count = sum(1 for w in NEGATIVE_WORDS if w in lower)

        if neg_count > pos_count:
            sentiment = "negative"
            sentiment_score = max(-1.0, -0.35 - 0.15 * neg_count)
        elif pos_count > neg_count:
            sentiment = "positive"
            sentiment_score = min(1.0, 0.35 + 0.15 * pos_count)
        else:
            sentiment = "neutral"
            sentiment_score = 0.0

        if any(w in lower for w in CRITICAL_WORDS):
            urgency = "critical"
        elif any(w in lower for w in HIGH_WORDS):
            urgency = "high"
        elif sentiment == "positive":
            urgency = "low"
        else:
            urgency = "medium"

        matched_topic = "general"
        matched_subcategory = "general_feedback"
        matched_keywords: List[str] = []
        problem = text[:120]

        for rule in TOPIC_RULES:
            if any(re.search(pat, lower, re.IGNORECASE) for pat in rule["patterns"]):
                matched_topic = str(rule["topic"])
                matched_subcategory = str(rule["subcategory"])
                matched_keywords = list(rule["keywords"])
                problem = str(rule["problem"])
                break

        words = [
            w
            for w in re.sub(r"[^\w\s]", "", text).split()
            if len(w) > 3
            and w.lower()
            not in {
                "this",
                "that",
                "with",
                "from",
                "have",
                "been",
                "there",
                "what",
                "when",
                "will",
            }
        ]
        unique_keywords = list(dict.fromkeys([*matched_keywords, *words[:4]]))
        needs_historical = sentiment != "positive" or matched_topic != "general"

        return FeedbackAnalysis(
            sentiment=sentiment,  # type: ignore
            sentiment_score=round(sentiment_score, 2),
            topic=matched_topic,
            subcategory=matched_subcategory,
            problem=problem,
            keywords=unique_keywords[:6],
            urgency=urgency,  # type: ignore
            needsHistoricalContext=needs_historical,
            reasoning=f"Categorized as '{matched_topic}' based on lexical terms with {sentiment} sentiment.",
        )

    async def reason_over_memories(
        self,
        current_feedback: Dict[str, str],
        recalled_memories: List[MemoryItem],
    ) -> Dict[str, Any]:
        topic = current_feedback.get("topic", "general")
        if not recalled_memories:
            return {
                "isRecurring": False,
                "clusterTitle": f"{topic} feedback",
                "description": f"Single occurrence of feedback regarding {topic}.",
                "sentimentTrend": "Isolated feedback",
                "explanation": "No relevant historical memories were found in the memory bank.",
                "relatedMemoryIds": [],
            }

        current_topic = topic.lower()
        related: List[MemoryItem] = []
        for m in recalled_memories:
            mem_topic = str(m.metadata.get("topic") or "").lower()
            mem_text = m.content.lower()
            if (
                mem_topic == current_topic
                or current_topic in mem_text
                or (
                    current_topic == "onboarding"
                    and any(k in mem_text for k in ("setup", "started", "onboard"))
                )
                or (
                    current_topic == "performance"
                    and any(k in mem_text for k in ("slow", "lag", "loading"))
                )
                or (
                    current_topic == "export"
                    and any(k in mem_text for k in ("export", "csv", "pdf"))
                )
                or ((m.score or 0.0) > 0.45)
            ):
                related.append(m)

        is_recurring = len(related) >= 1
        channels = list(
            dict.fromkeys(
                [
                    current_feedback.get("source", "Support"),
                    *[
                        str(m.metadata.get("source"))
                        for m in related
                        if m.metadata.get("source")
                    ],
                ]
            )
        )

        title_map = {
            "onboarding": "Onboarding & Initial Setup Confusion",
            "performance": "Dashboard Query Latency & Sluggish Performance",
            "export": "Missing Export Functionality (CSV / PDF)",
            "pricing": "Pricing Tier Structure & Feature Gating Confusion",
            "documentation": "API Documentation & Code Example Gaps",
        }
        title = title_map.get(current_topic, f"{topic.capitalize()} Friction")

        problem_lower = current_feedback.get("problem", topic).lower()
        desc = (
            f"Persistent issue with {len(related) + 1} occurrences observed across {len(channels)} channels ({', '.join(channels)}). Multiple users report difficulty with {problem_lower}."
            if is_recurring
            else f"Single occurrence regarding {topic}."
        )

        trend = (
            "Cross-channel recurring friction"
            if len(channels) > 1
            else (
                "Escalating recurring complaints"
                if len(related) >= 3
                else "Repeated negative feedback"
            )
        )

        explanation = (
            f"Found {len(related)} relevant historical experiences dating back to earlier records. Connected to current feedback from {current_feedback.get('source', 'Support')}."
            if is_recurring
            else "Recalled items did not meet recurrence threshold."
        )

        return {
            "isRecurring": is_recurring,
            "clusterTitle": title,
            "description": desc,
            "sentimentTrend": trend,
            "explanation": explanation,
            "relatedMemoryIds": [m.id for m in related],
        }

    async def answer_investigation(
        self,
        question: str,
        recalled_memories: List[MemoryItem],
        clusters: List[ComplaintCluster],
    ) -> Dict[str, Any]:
        if not recalled_memories:
            return {
                "answer": "No relevant historical feedback was found for your inquiry in the memory bank.",
                "evidence": [],
            }

        q_lower = question.lower()
        matched_cluster = next(
            (
                c
                for c in clusters
                if ("onboard" in q_lower and "onboard" in c.title.lower())
                or ("performance" in q_lower and "performance" in c.title.lower())
                or ("slow" in q_lower and "performance" in c.title.lower())
                or ("export" in q_lower and "export" in c.title.lower())
                or ("pric" in q_lower and "pric" in c.title.lower())
                or ("doc" in q_lower and "doc" in c.title.lower())
            ),
            clusters[0] if clusters else None,
        )

        evidence = []
        for m in recalled_memories[:6]:
            quote = re.sub(r"^Customer feedback:\s*", "", m.content, flags=re.IGNORECASE).strip()
            evidence.append(
                {
                    "source": str(m.metadata.get("source") or "Support"),
                    "date": str(m.metadata.get("date") or m.created_at[:10]),
                    "customer": str(m.metadata.get("customer") or "Customer"),
                    "quote": quote,
                    "relevance": f"Matches historical problem: {m.metadata.get('problem') or m.metadata.get('topic') or 'User feedback'}",
                }
            )

        sources = list(dict.fromkeys(e["source"] for e in evidence))
        dates = sorted(e["date"] for e in evidence if e["date"])
        first_date = dates[0] if dates else "earlier this year"
        last_date = dates[-1] if dates else "recently"

        if "onboard" in q_lower or (
            matched_cluster and "onboard" in matched_cluster.title.lower()
        ):
            answer = f"Yes. Related onboarding complaints were identified across {len(sources)} distinct channels ({', '.join(sources)}). The earliest recorded issue appeared on {first_date}, and similar complaints continued through {last_date}. Users consistently report difficulty understanding initial setup steps and navigating early workflow setup."
        elif "recurring" in q_lower or "keep coming back" in q_lower:
            c_title = matched_cluster.title if matched_cluster else "System Usability"
            c_count = (
                matched_cluster.occurrence_count if matched_cluster else len(evidence)
            )
            answer = f'Analysis of recalled memory reveals {len(clusters)} active recurring problem clusters. The most prominent recurring issue is "{c_title}" with {c_count} recorded complaints spanning from {first_date} to {last_date} across {", ".join(sources)}.'
        elif "cross-channel" in q_lower or "multiple channels" in q_lower:
            answer = f"Yes. Several issues span multiple customer touchpoints. Specifically, {', '.join(sources)} channels share related complaints. The agent traced recurring pain points from sales conversations and product reviews into support tickets over time."
        elif "oldest" in q_lower or "unresolved" in q_lower:
            c_title = (
                matched_cluster.title
                if matched_cluster
                else "initial workflow configuration"
            )
            first_src = evidence[0]["source"] if evidence else "Support"
            answer = f"The oldest documented complaint cluster dates back to {first_date}, involving {first_src} feedback regarding {c_title}. Despite recurring mentions up to {last_date}, this issue remains active."
        else:
            answer = f"Based on {len(recalled_memories)} recalled memory records from the memory bank, users have reported issues spanning from {first_date} to {last_date} across {', '.join(sources)}. Below is the verifiable evidence retrieved from memory."

        return {"answer": answer, "evidence": evidence}

    async def extract_from_transcript(
        self, transcript_text: str
    ) -> List[Dict[str, Any]]:
        lines = [l.strip() for l in transcript_text.splitlines() if l.strip()]
        results: List[Dict[str, Any]] = []
        current_customer = "Participant"
        current_source = "Interview"

        for line in lines:
            date_match = re.search(r"\b(202\d-[01]\d-[0-3]\d)\b", line)
            date_val = date_match.group(1) if date_match else None

            speaker_match = re.match(r"^([^:]+):\s*(.+)$", line)
            if speaker_match:
                raw_speaker = speaker_match.group(1).strip()
                text = speaker_match.group(2).strip()
                if "sales" in raw_speaker.lower():
                    current_source = "Sales"
                    current_customer = (
                        re.sub(r"sales|[()]", "", raw_speaker, flags=re.IGNORECASE).strip()
                        or "Prospect"
                    )
                elif "support" in raw_speaker.lower() or "agent" in raw_speaker.lower():
                    current_source = "Support"
                    current_customer = (
                        re.sub(r"support|[()]", "", raw_speaker, flags=re.IGNORECASE).strip()
                        or "User"
                    )
                else:
                    current_customer = raw_speaker
                    current_source = "Interview"

                if len(text) > 15:
                    results.append(
                        {
                            "customer": current_customer,
                            "source": current_source,
                            "feedback_text": text,
                            "date": date_val,
                        }
                    )
            elif len(line) > 25 and not line.startswith("#") and not line.startswith("//"):
                results.append(
                    {
                        "customer": current_customer,
                        "source": current_source,
                        "feedback_text": re.sub(r"^[-*•]\s*", "", line),
                        "date": date_val,
                    }
                )

        return results[:15]
