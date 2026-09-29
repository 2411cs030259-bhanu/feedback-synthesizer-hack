from typing import Any, Dict
from fastapi import APIRouter, HTTPException
from backend.agent.feedback_agent import feedback_agent
from backend.database.db import get_agent_runs
from backend.models.schemas import InvestigationRequest, InvestigationResult

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/investigate", response_model=InvestigationResult)
async def investigate_feedback(payload: InvestigationRequest) -> InvestigationResult:
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="question is required")

    return await feedback_agent.investigate(payload.question)


@router.get("/activity")
async def list_agent_activity(limit: int = 100) -> Dict[str, Any]:
    runs = get_agent_runs(limit=limit)
    return {
        "runs": [r.model_dump() for r in runs],
        "count": len(runs),
    }
