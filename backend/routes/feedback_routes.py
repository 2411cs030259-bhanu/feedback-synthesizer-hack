from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from backend.agent.agent_planner import AgentPlanner
from backend.agent.agent_tools import agent_tools
from backend.agent.feedback_agent import feedback_agent
from backend.data.sample_feedback import SAMPLE_FEEDBACK_DATA
from backend.database.db import (
    clear_database,
    get_all_complaint_clusters,
    get_all_feedback,
)
from backend.models.schemas import (
    CsvImportRequest,
    FeedbackCreateRequest,
    TranscriptExtractRequest,
)
from backend.services.ai_service import ai_service
from backend.services.feedback_service import (
    create_normalized_feedback,
    parse_csv_feedback,
)
from backend.services.local_template_provider import LocalTemplateProvider

router = APIRouter(prefix="/feedback", tags=["feedback"])
local_nlp = LocalTemplateProvider()
planner = AgentPlanner()


async def seed_minimal_dataset() -> Dict[str, Any]:
    clear_database()
    count = 0
    for item in SAMPLE_FEEDBACK_DATA:
        analysis = await local_nlp.analyze_feedback(
            item["feedback_text"],
            {"source": item["source"], "customer": item["customer"]},
        )
        feedback = create_normalized_feedback(item, analysis)
        await agent_tools.retain_memory(feedback)
        await planner.reason_and_cluster(feedback, [])
        count += 1

    clusters = get_all_complaint_clusters()
    return {
        "success": True,
        "seededCount": count,
        "clustersDetected": len(clusters),
        "message": f"Seeded {count} minimal baseline feedback records. Agent identified {len(clusters)} recurring complaint clusters.",
    }


@router.get("")
@router.get("/")
async def list_feedback(
    topic: Optional[str] = None, search: Optional[str] = None
) -> Dict[str, Any]:
    items = get_all_feedback(filter_topic=topic, search=search)
    return {
        "feedback": [i.model_dump() for i in items],
        "total": len(items),
    }


@router.post("")
@router.post("/")
async def submit_feedback(payload: FeedbackCreateRequest) -> Dict[str, Any]:
    if not payload.feedback_text.strip():
        raise HTTPException(status_code=400, detail="feedback_text is required")

    result = await feedback_agent.process_feedback(
        {
            "id": payload.id,
            "source": payload.source or "Support",
            "source_id": payload.source_id,
            "customer": payload.customer or "Anonymous",
            "customer_id": payload.customer_id,
            "feedback_text": payload.feedback_text,
            "created_at": payload.created_at
            or datetime.now(timezone.utc).isoformat(),
        }
    )
    return result


@router.post("/import")
async def import_csv_feedback(payload: CsvImportRequest) -> Dict[str, Any]:
    items = parse_csv_feedback(payload.csvContent)
    results = []
    for item in items:
        res = await feedback_agent.process_feedback(
            {
                "feedback_text": item["feedback_text"],
                "source": item.get("source") or "Support",
                "customer": item.get("customer") or "Imported User",
                "created_at": item.get("created_at")
                or datetime.now(timezone.utc).isoformat(),
            }
        )
        results.append(res)

    return {
        "success": True,
        "importedCount": len(results),
        "results": results,
    }


@router.post("/transcript")
async def extract_transcript(payload: TranscriptExtractRequest) -> Dict[str, Any]:
    items = await ai_service.extract_from_transcript(payload.transcript)
    return {"items": items, "count": len(items)}


@router.post("/clear")
async def clear_all_feedback() -> Dict[str, Any]:
    clear_database()
    return {
        "success": True,
        "message": "All feedback, clusters, and local memories cleared",
    }


@router.post("/seed")
async def seed_feedback_data() -> Dict[str, Any]:
    return await seed_minimal_dataset()
