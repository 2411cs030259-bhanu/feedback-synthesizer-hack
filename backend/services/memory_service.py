from typing import Any, Dict, List, Optional
from backend.models.schemas import MemoryItem
from backend.services.hindsight_service import HindsightService
from backend.services.local_memory_service import LocalMemoryService


class MemoryService:
    def __init__(self) -> None:
        self.hindsight = HindsightService()
        self.local = LocalMemoryService()

    async def get_status(self) -> Dict[str, Any]:
        cfg = self.hindsight.get_config()
        health = await self.hindsight.check_health()
        total_local = self.local.count()

        if health["connected"]:
            return {
                "connected": True,
                "provider": "hindsight",
                "bank": cfg["bank"],
                "url": cfg["url"],
                "totalMemories": total_local,
                "message": health["message"],
            }

        return {
            "connected": False,
            "provider": "local",
            "bank": cfg["bank"],
            "url": cfg["url"],
            "totalMemories": total_local,
            "message": f"Hindsight is unreachable ({health['message']}). Running in Local Memory Fallback mode.",
        }

    async def retain_feedback(self, item: Dict[str, Any]) -> Dict[str, Any]:
        local_res = await self.local.retain_feedback(item)
        health = await self.hindsight.check_health()
        if health["connected"]:
            hindsight_res = await self.hindsight.retain_feedback(item)
            if hindsight_res.get("success"):
                return {
                    "success": True,
                    "provider": "hindsight",
                    "memoryId": hindsight_res.get("memoryId") or local_res["memoryId"],
                }
            return {
                "success": True,
                "provider": "local",
                "memoryId": local_res["memoryId"],
                "error": f"Hindsight retain failed ({hindsight_res.get('error')}), saved to local memory fallback.",
            }

        return {
            "success": True,
            "provider": "local",
            "memoryId": local_res["memoryId"],
        }

    async def recall_feedback(
        self,
        query: str,
        tags: Optional[List[str]] = None,
        limit: int = 8,
    ) -> Dict[str, Any]:
        health = await self.hindsight.check_health()
        if health["connected"]:
            hindsight_res = await self.hindsight.recall_feedback(
                query=query, tags=tags, limit=limit
            )
            if hindsight_res.get("success") and len(hindsight_res.get("memories", [])) > 0:
                return {
                    "success": True,
                    "provider": "hindsight",
                    "memories": hindsight_res["memories"],
                }
            if not hindsight_res.get("success"):
                local_res = await self.local.recall_feedback(
                    query=query, tags=tags, limit=limit
                )
                return {
                    "success": True,
                    "provider": "local",
                    "memories": local_res["memories"],
                    "error": f"Hindsight recall error: {hindsight_res.get('error')}. Using local recall.",
                }

        local_res = await self.local.recall_feedback(query=query, tags=tags, limit=limit)
        return {
            "success": True,
            "provider": "local",
            "memories": local_res["memories"],
        }

    def get_all_memories(self) -> List[MemoryItem]:
        return self.local.get_all()


memory_service = MemoryService()
