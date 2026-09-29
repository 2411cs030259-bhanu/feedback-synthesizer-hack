from typing import Any, Dict, List, Optional
from backend.database.db import (
    get_all_complaint_clusters,
    get_all_feedback,
    get_complaint_cluster_by_id,
    upsert_complaint_cluster,
)
from backend.models.schemas import ComplaintCluster, FeedbackItem
from backend.services.ai_service import ai_service
from backend.services.memory_service import memory_service


class AgentTools:
    async def analyze_feedback(
        self, text: str, context: Optional[Dict[str, Optional[str]]] = None
    ) -> Dict[str, Any]:
        return await ai_service.analyze_feedback(text, context)

    async def retain_memory(self, feedback: FeedbackItem) -> Dict[str, Any]:
        memory_content = f"""Customer feedback:

Source: {feedback.source}
Date: {feedback.created_at[:10]}
Topic: {feedback.topic}
Problem: {feedback.problem or feedback.subcategory or feedback.topic}
Sentiment: {feedback.sentiment}
Customer: {feedback.customer or 'Anonymous'}

Original feedback:
"{feedback.feedback_text}" """.strip()

        return await memory_service.retain_feedback(
            {
                "content": memory_content,
                "document_id": f"hindsight_doc_{feedback.id}",
                "metadata": {
                    "source": feedback.source,
                    "source_id": feedback.source_id,
                    "feedback_id": feedback.id,
                    "date": feedback.created_at[:10],
                    "topic": feedback.topic,
                    "subcategory": feedback.subcategory,
                    "sentiment": feedback.sentiment,
                    "sentiment_score": feedback.sentiment_score,
                    "customer_id": feedback.customer_id,
                    "customer": feedback.customer,
                    "problem": feedback.problem,
                },
                "tags": [
                    feedback.topic.lower(),
                    feedback.source.lower().replace(" ", "_"),
                    feedback.sentiment,
                    "customer_feedback",
                ],
            }
        )

    async def recall_memory(
        self,
        query: str,
        tags: Optional[List[str]] = None,
        limit: int = 8,
    ) -> Dict[str, Any]:
        return await memory_service.recall_feedback(query=query, tags=tags, limit=limit)

    def find_related_feedback(
        self, topic: str, keywords: Optional[List[str]] = None
    ) -> List[FeedbackItem]:
        all_items = get_all_feedback()
        t = topic.lower()
        kw_set = {k.lower() for k in (keywords or [])}
        results: List[FeedbackItem] = []
        for item in all_items:
            if item.topic.lower() == t:
                results.append(item)
            elif kw_set and any(ik.lower() in kw_set for ik in item.keywords):
                results.append(item)
        return results

    def get_feedback_timeline(
        self, feedbacks: List[FeedbackItem]
    ) -> List[Dict[str, str]]:
        sorted_items = sorted(feedbacks, key=lambda f: f.created_timestamp)
        return [
            {
                "date": f.created_at[:10],
                "source": f.source,
                "customer": f.customer or "Anonymous",
                "feedback_text": f.feedback_text,
                "sentiment": f.sentiment,
            }
            for f in sorted_items
        ]

    def get_complaint_history(self) -> List[ComplaintCluster]:
        return get_all_complaint_clusters()

    def save_cluster(self, cluster: ComplaintCluster) -> None:
        upsert_complaint_cluster(cluster)

    def get_cluster_by_id(self, cluster_id: str) -> Optional[ComplaintCluster]:
        return get_complaint_cluster_by_id(cluster_id)


agent_tools = AgentTools()
