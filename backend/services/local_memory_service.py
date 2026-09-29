import re
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from backend.database.db import (
    count_local_memories,
    get_all_local_memories,
    insert_local_memory,
)
from backend.models.schemas import MemoryItem

SEMANTIC_CLUSTERS: Dict[str, List[str]] = {
    "onboarding": [
        "onboard",
        "onboarding",
        "setup",
        "set up",
        "getting started",
        "get started",
        "start using",
        "begin",
        "initial setup",
        "walkthrough",
        "tutorial",
        "instructions",
        "confusing",
        "unclear",
        "struggling to start",
        "first steps",
    ],
    "performance": [
        "slow",
        "lag",
        "lagging",
        "latency",
        "speed",
        "performance",
        "loading",
        "loads slow",
        "freeze",
        "freezes",
        "hang",
        "timeout",
        "crash",
        "large dataset",
        "spinning wheel",
        "unresponsive",
        "sluggish",
    ],
    "export": [
        "export",
        "download",
        "csv",
        "pdf",
        "excel",
        "extract",
        "file export",
        "data export",
        "missing export",
        "save report",
        "dump data",
    ],
    "pricing": [
        "pricing",
        "price",
        "tier",
        "plans",
        "cost",
        "expensive",
        "subscription",
        "billing",
        "quote",
        "seat",
        "charge",
        "rate",
        "upgrade",
    ],
    "documentation": [
        "docs",
        "documentation",
        "api docs",
        "readme",
        "instructions",
        "manual",
        "reference",
        "sdk guide",
        "examples",
        "endpoint explanation",
        "developer docs",
    ],
    "ui": [
        "ui",
        "interface",
        "layout",
        "design",
        "cluttered",
        "dark mode",
        "button",
        "mobile",
        "responsive",
        "ux",
        "navigation",
        "confusing menu",
    ],
}


def _tokenize(text: str) -> List[str]:
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return [t for t in cleaned.split() if len(t) > 2]


def _expand_query_terms(terms: List[str]) -> Set[str]:
    expanded = set(terms)
    for term in terms:
        for cluster_words in SEMANTIC_CLUSTERS.values():
            if any(w in term or term in w for w in cluster_words):
                for w in cluster_words:
                    expanded.add(w.lower())
    return expanded


class LocalMemoryService:
    async def retain_feedback(self, item: Dict[str, Any]) -> Dict[str, Any]:
        doc_id = item.get("document_id")
        mem_id = doc_id or f"mem_{int(time.time() * 1000)}_{secrets.token_hex(3)}"
        metadata = item.get("metadata") or {}
        date_str = metadata.get("date")
        created_at = (
            f"{date_str}T00:00:00Z"
            if date_str and len(str(date_str)) == 10
            else datetime.now(timezone.utc).isoformat()
        )

        memory_item = MemoryItem(
            id=mem_id,
            content=str(item.get("content", "")),
            document_id=doc_id,
            metadata=metadata,
            tags=item.get("tags") or [],
            created_at=created_at,
        )
        insert_local_memory(memory_item)
        return {"success": True, "memoryId": mem_id}

    async def recall_feedback(
        self,
        query: str,
        tags: Optional[List[str]] = None,
        limit: int = 8,
    ) -> Dict[str, Any]:
        all_memories = get_all_local_memories()
        if not all_memories:
            return {"success": True, "memories": []}

        query_tokens = _tokenize(query)
        expanded_keywords = _expand_query_terms(query_tokens)
        filter_tags = [t.lower() for t in (tags or [])]

        scored: List[MemoryItem] = []
        for mem in all_memories:
            score = 0.0
            mem_tokens = _tokenize(mem.content)
            mem_tags = [t.lower() for t in (mem.tags or [])]
            metadata_topic = str(mem.metadata.get("topic") or "").lower()
            metadata_problem = str(mem.metadata.get("problem") or "").lower()
            content_lower = mem.content.lower()

            for qt in query_tokens:
                if qt in mem_tokens:
                    score += 0.25

            for ek in expanded_keywords:
                if ek in content_lower:
                    score += 0.2
                if ek in metadata_problem:
                    score += 0.25

            if filter_tags:
                for ft in filter_tags:
                    if ft in mem_tags or metadata_topic == ft:
                        score += 0.35

            if metadata_topic and metadata_topic in query.lower():
                score += 0.4

            normalized = min(0.99, round(score / (1.0 + score * 0.5), 3))
            mem_copy = mem.model_copy(update={"score": max(0.1, normalized)})
            if (mem_copy.score or 0.0) >= 0.2:
                scored.append(mem_copy)

        scored.sort(key=lambda m: m.score or 0.0, reverse=True)
        return {"success": True, "memories": scored[:limit]}

    def get_all(self) -> List[MemoryItem]:
        return get_all_local_memories()

    def count(self) -> int:
        return count_local_memories()
