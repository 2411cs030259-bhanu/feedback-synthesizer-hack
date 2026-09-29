from typing import Any, Dict
from fastapi import APIRouter, HTTPException
from backend.database.db import (
    get_all_complaint_clusters,
    get_complaint_cluster_by_id,
)

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.get("")
@router.get("/")
async def list_complaint_clusters() -> Dict[str, Any]:
    clusters = get_all_complaint_clusters()
    return {
        "clusters": [c.model_dump() for c in clusters],
        "total": len(clusters),
    }


@router.get("/{cluster_id}")
async def get_cluster_detail(cluster_id: str) -> Dict[str, Any]:
    cluster = get_complaint_cluster_by_id(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Complaint cluster not found")

    return {
        "cluster": cluster.model_dump(),
        "feedbacks": [f.model_dump() for f in (cluster.feedbacks or [])],
    }
