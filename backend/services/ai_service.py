from typing import Any, Dict, List, Optional
from backend.models.schemas import (
    ComplaintCluster,
    MemoryItem,
)
from backend.services.groq_provider import GroqProvider
from backend.services.local_template_provider import LocalTemplateProvider


class AIService:
    def __init__(self) -> None:
        self.groq = GroqProvider()
        self.local = LocalTemplateProvider()

    async def get_status(self) -> Dict[str, Any]:
        groq_health = await self.groq.check_health()
        if groq_health["connected"]:
            return {
                "connected": True,
                "provider": "groq",
                "model": groq_health["model"],
                "message": groq_health["message"],
            }

        local_health = await self.local.check_health()
        return {
            "connected": False,
            "provider": "local",
            "model": local_health["model"],
            "message": f"Groq is not connected ({groq_health['message']}). Running in Local AI Template mode.",
        }

    async def analyze_feedback(
        self, text: str, context: Optional[Dict[str, Optional[str]]] = None
    ) -> Dict[str, Any]:
        health = await self.groq.check_health()
        if health["connected"]:
            try:
                analysis = await self.groq.analyze_feedback(text, context)
                return {"analysis": analysis, "provider": "groq"}
            except Exception as exc:
                print(f"Groq analyze_feedback failed, falling back to local provider: {exc}")

        analysis = await self.local.analyze_feedback(text, context)
        return {"analysis": analysis, "provider": "local"}

    async def reason_over_memories(
        self,
        current_feedback: Dict[str, str],
        recalled_memories: List[MemoryItem],
    ) -> Dict[str, Any]:
        health = await self.groq.check_health()
        if health["connected"]:
            try:
                res = await self.groq.reason_over_memories(
                    current_feedback, recalled_memories
                )
                return {**res, "provider": "groq"}
            except Exception as exc:
                print(f"Groq reason_over_memories failed, falling back to local: {exc}")

        res = await self.local.reason_over_memories(
            current_feedback, recalled_memories
        )
        return {**res, "provider": "local"}

    async def answer_investigation(
        self,
        question: str,
        recalled_memories: List[MemoryItem],
        clusters: List[ComplaintCluster],
    ) -> Dict[str, Any]:
        health = await self.groq.check_health()
        if health["connected"]:
            try:
                res = await self.groq.answer_investigation(
                    question, recalled_memories, clusters
                )
                return {**res, "provider": "groq"}
            except Exception as exc:
                print(f"Groq answer_investigation failed, falling back to local: {exc}")

        res = await self.local.answer_investigation(
            question, recalled_memories, clusters
        )
        return {**res, "provider": "local"}

    async def extract_from_transcript(
        self, transcript_text: str
    ) -> List[Dict[str, Any]]:
        health = await self.groq.check_health()
        if health["connected"]:
            try:
                items = await self.groq.extract_from_transcript(transcript_text)
                if items:
                    return items
            except Exception as exc:
                print(f"Groq extract_from_transcript failed, using local parser: {exc}")

        return await self.local.extract_from_transcript(transcript_text)


ai_service = AIService()
