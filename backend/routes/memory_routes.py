from typing import Any, Dict
from fastapi import APIRouter, HTTPException
from backend.database.db import get_all_local_memories
from backend.models.schemas import MemoryRecallRequest
from backend.services.hindsight_service import HindsightService
from backend.services.memory_service import memory_service

router = APIRouter(prefix="/memory", tags=["memory"])
hindsight = HindsightService()


@router.get("")
@router.get("/")
@router.get("/list")
async def get_memories() -> Dict[str, Any]:
    local_memories = get_all_local_memories()
    config = hindsight.get_config()
    return {
        "memories": [m.model_dump() for m in local_memories],
        "total": len(local_memories),
        "config": config,
    }


@router.post("/recall")
async def recall_memories(payload: MemoryRecallRequest) -> Dict[str, Any]:
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="query is required")

    recall_res = await memory_service.recall_feedback(
        query=payload.query.strip(),
        tags=payload.tags,
        limit=payload.limit or 8,
    )
    memories = recall_res.get("memories", [])
    return {
        "provider": recall_res.get("provider", "local"),
        "memories": [m.model_dump() for m in memories],
        "count": len(memories),
        "hindsightError": recall_res.get("error"),
    }
