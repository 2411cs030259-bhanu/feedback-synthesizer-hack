import io
import os
import zipfile
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from backend.database.db import (
    count_local_memories,
    get_all_complaint_clusters,
    get_all_feedback,
)
from backend.models.schemas import SystemConfigStatus
from backend.services.groq_provider import GroqProvider
from backend.services.hindsight_service import HindsightService

router = APIRouter(prefix="/config", tags=["config"])
hindsight = HindsightService()
groq = GroqProvider()

EXCLUDED_DIRS = {
    "node_modules",
    ".venv",
    "venv",
    ".git",
    "dist",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
}
EXCLUDED_FILES = {
    "user-feedback-synthesizer.zip",
    ".DS_Store",
}


@router.get("/status", response_model=SystemConfigStatus)
async def get_system_status() -> SystemConfigStatus:
    hindsight_health = await hindsight.check_health()
    groq_health = await groq.check_health()

    total_feedback = len(get_all_feedback())
    total_clusters = len(get_all_complaint_clusters())
    total_memories = count_local_memories()
    cfg = hindsight.get_config()

    return SystemConfigStatus(
        groq=bool(groq_health["connected"]),
        hindsight=bool(hindsight_health["connected"]),
        memoryMode="hindsight" if hindsight_health["connected"] else "local",
        aiMode="groq" if groq_health["connected"] else "local",
        groqModel=str(groq_health["model"]),
        groqMessage=str(groq_health["message"]),
        hindsightUrl=str(cfg["url"]),
        hindsightBank=str(cfg["bank"]),
        hindsightMessage=str(hindsight_health["message"]),
        totalFeedbackCount=total_feedback,
        totalClusterCount=total_clusters,
        totalMemoryCount=total_memories,
        backendStack="Python FastAPI + Pydantic + HTTPX + hindsight-client",
    )


@router.get("/download-zip")
async def download_project_zip() -> StreamingResponse:
    root_dir = Path.cwd()
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIRS]
            rel_dir = Path(dirpath).relative_to(root_dir)
            for fname in filenames:
                if fname in EXCLUDED_FILES or fname.endswith(".pyc") or fname == ".env":
                    continue
                full_path = Path(dirpath) / fname
                arcname = str(Path("user-feedback-synthesizer") / rel_dir / fname)
                try:
                    zf.write(full_path, arcname=arcname)
                except Exception:
                    pass

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="user-feedback-synthesizer.zip"'
        },
    )
