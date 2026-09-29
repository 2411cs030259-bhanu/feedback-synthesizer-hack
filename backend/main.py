import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Dict
from dotenv import load_dotenv

# Ensure environment variables are loaded before any service or route initialization
backend_env = Path(__file__).resolve().parent / ".env"
root_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(backend_env)
load_dotenv(root_env)
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.db import get_all_feedback, get_database
from backend.routes import (
    agent_routes,
    complaint_routes,
    config_routes,
    feedback_routes,
    memory_routes,
)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    get_database()
    if len(get_all_feedback()) == 0:
        try:
            await feedback_routes.seed_minimal_dataset()
        except Exception as exc:
            print(f"Initial seed warning: {exc}")
    yield


app = FastAPI(
    title="User Feedback Synthesizer API",
    description="Python FastAPI + Pydantic + HTTPX + Groq + Hindsight Memory Agent Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "User Feedback Synthesizer Agent (Python FastAPI)",
        "stack": {
            "backend": "Python + FastAPI",
            "validation": "Pydantic",
            "httpClient": "HTTPX",
            "ai": "Groq API via HTTP",
            "memory": "Hindsight (hindsight-client) RECALL + RETAIN",
            "database": "SQLite",
        },
    }


app.include_router(feedback_routes.router, prefix="/api")
app.include_router(complaint_routes.router, prefix="/api")
app.include_router(agent_routes.router, prefix="/api")
app.include_router(memory_routes.router, prefix="/api")
app.include_router(config_routes.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("BACKEND_PORT") or os.environ.get("PORT") or 8000)
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
