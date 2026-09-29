import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from backend.models.schemas import MemoryItem

try:
    from hindsight_client import Hindsight as HindsightSDKClient  # type: ignore
except Exception:
    HindsightSDKClient = None


def _clean_env(val: Optional[str]) -> str:
    if not val:
        return ""
    return val.strip().strip("\"'").strip()


class HindsightService:
    """
    Persistent Agent Memory Layer using Python `hindsight-client` and `httpx`
    for Hindsight RECALL + RETAIN operations.
    """

    def __init__(self) -> None:
        raw_url = _clean_env(os.environ.get("HINDSIGHT_URL"))
        raw_bank = _clean_env(os.environ.get("HINDSIGHT_BANK"))
        self.api_key = _clean_env(os.environ.get("HINDSIGHT_API_KEY"))

        if raw_bank.startswith("http://") or raw_bank.startswith("https://"):
            raw_url = raw_bank
            raw_bank = "feedback-synthesizer"

        if self.api_key.startswith("hsk_") and (not raw_url or "localhost" in raw_url):
            raw_url = "https://api.hindsight.vectorize.io"

        self.url = (raw_url or "http://localhost:8888").rstrip("/")
        self.bank = raw_bank or "feedback-synthesizer"
        self.is_cloud = "vectorize.io" in self.url
        self.is_connected_cache: Optional[bool] = None
        self.last_check_time = 0.0

        self.sdk_client: Optional[Any] = None
        if HindsightSDKClient is not None:
            try:
                self.sdk_client = HindsightSDKClient(base_url=self.url)
            except Exception:
                self.sdk_client = None

    def _sync_env(self) -> None:
        raw_url = _clean_env(os.environ.get("HINDSIGHT_URL"))
        raw_bank = _clean_env(os.environ.get("HINDSIGHT_BANK"))
        api_key = _clean_env(os.environ.get("HINDSIGHT_API_KEY"))
        if api_key:
            self.api_key = api_key
        if raw_bank:
            if raw_bank.startswith("http://") or raw_bank.startswith("https://"):
                raw_url = raw_bank
                raw_bank = "user-feedback-synthesizer"
            self.bank = raw_bank
        if self.api_key.startswith("hsk_") and (not raw_url or "localhost" in raw_url):
            raw_url = "https://api.hindsight.vectorize.io"
        if raw_url:
            self.url = raw_url.rstrip("/")
        self.is_cloud = "vectorize.io" in self.url

    def get_config(self) -> Dict[str, Any]:
        self._sync_env()
        return {
            "url": self.url,
            "bank": self.bank,
            "hasKey": bool(self.api_key),
            "isCloud": self.is_cloud,
            "sdkAvailable": HindsightSDKClient is not None,
        }

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def check_health(self) -> Dict[str, Any]:
        self._sync_env()
        now = time.time()
        if self.is_connected_cache is not None and (now - self.last_check_time) < 15.0:
            return {
                "connected": self.is_connected_cache,
                "message": (
                    f"Hindsight {'Cloud' if self.is_cloud else 'Instance'} is active ({self.bank})"
                    if self.is_connected_cache
                    else "Hindsight is offline"
                ),
            }

        check_url = (
            f"{self.url}/v1/default/banks"
            if self.is_cloud
            else f"{self.url}/health"
        )

        async with httpx.AsyncClient(timeout=3.5) as client:
            try:
                res = await client.get(check_url, headers=self._headers())
                if res.status_code >= 400 and not self.is_cloud:
                    res = await client.get(
                        f"{self.url}/health/ready", headers=self._headers()
                    )

                if res.status_code == 200:
                    self.is_connected_cache = True
                    self.last_check_time = now
                    return {
                        "connected": True,
                        "message": f"Connected to Hindsight ({'Cloud' if self.is_cloud else 'Local'}, bank: {self.bank})",
                    }

                self.is_connected_cache = False
                self.last_check_time = now
                return {
                    "connected": False,
                    "message": f"Hindsight returned HTTP {res.status_code}",
                }
            except Exception as exc:
                self.is_connected_cache = False
                self.last_check_time = now
                return {
                    "connected": False,
                    "message": f"Hindsight unreachable at {self.url}: {str(exc)}",
                }

    async def retain_feedback(self, item: Dict[str, Any]) -> Dict[str, Any]:
        content = item.get("content", "")
        document_id = item.get("document_id")
        metadata = item.get("metadata") or {}
        tags = item.get("tags") or []

        if self.sdk_client is not None and not self.is_cloud:
            try:
                if hasattr(self.sdk_client, "retain"):
                    self.sdk_client.retain(
                        bank_id=self.bank,
                        content=content,
                        context=metadata.get("topic", "customer_feedback"),
                        document_id=document_id,
                    )
                    self.is_connected_cache = True
                    return {
                        "success": True,
                        "memoryId": document_id or "retained_hindsight_sdk",
                    }
            except Exception:
                pass

        async with httpx.AsyncClient(timeout=6.0) as client:
            try:
                if self.is_cloud:
                    endpoint = f"{self.url}/v1/default/banks/{self.bank}/memories"
                    payload = {
                        "async": False,
                        "items": [
                            {
                                "content": content,
                                "context": metadata.get("topic") or "customer_feedback",
                                "document_id": document_id,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                                "tags": tags,
                            }
                        ],
                    }
                    res = await client.post(
                        endpoint, headers=self._headers(), json=payload
                    )
                    res.raise_for_status()
                    self.is_connected_cache = True
                    return {
                        "success": True,
                        "memoryId": document_id or "retained_cloud",
                    }

                endpoint = f"{self.url}/banks/{self.bank}/retain"
                payload = {
                    "content": content,
                    "document_id": document_id,
                    "metadata": metadata,
                    "tags": tags,
                }
                res = await client.post(endpoint, headers=self._headers(), json=payload)
                if res.status_code == 404:
                    fallback_ep = f"{self.url}/banks/{self.bank}/memories"
                    res = await client.post(
                        fallback_ep, headers=self._headers(), json=payload
                    )
                res.raise_for_status()
                data = res.json() if res.content else {}
                self.is_connected_cache = True
                return {
                    "success": True,
                    "memoryId": data.get("id")
                    or data.get("memory_id")
                    or document_id
                    or "retained_local_hindsight",
                }
            except Exception as exc:
                self.is_connected_cache = False
                return {
                    "success": False,
                    "error": str(exc),
                }

    async def recall_feedback(
        self,
        query: str,
        tags: Optional[List[str]] = None,
        limit: int = 8,
    ) -> Dict[str, Any]:
        if self.sdk_client is not None and not self.is_cloud:
            try:
                if hasattr(self.sdk_client, "recall"):
                    sdk_res = self.sdk_client.recall(
                        bank_id=self.bank,
                        query=query,
                    )
                    raw_items = (
                        getattr(sdk_res, "results", None)
                        or getattr(sdk_res, "memories", None)
                        or (sdk_res if isinstance(sdk_res, list) else [])
                    )
                    if raw_items:
                        memories: List[MemoryItem] = []
                        for idx, m in enumerate(raw_items[:limit]):
                            text_val = (
                                getattr(m, "text", None)
                                or getattr(m, "content", None)
                                or (m.get("text") if isinstance(m, dict) else str(m))
                            )
                            memories.append(
                                MemoryItem(
                                    id=f"hindsight-sdk-{idx}",
                                    content=str(text_val),
                                    metadata={},
                                    tags=tags or [],
                                    created_at=datetime.now(timezone.utc).isoformat(),
                                    score=0.9,
                                )
                            )
                        self.is_connected_cache = True
                        return {"success": True, "memories": memories}
            except Exception:
                pass

        endpoint = (
            f"{self.url}/v1/default/banks/{self.bank}/memories/recall"
            if self.is_cloud
            else f"{self.url}/banks/{self.bank}/recall"
        )
        payload = {
            "query": query,
            "tags": tags or [],
            "limit": limit,
        }

        async with httpx.AsyncClient(timeout=6.0) as client:
            try:
                res = await client.post(endpoint, headers=self._headers(), json=payload)
                if res.status_code == 404 and not self.is_cloud:
                    fallback_ep = f"{self.url}/banks/{self.bank}/memories/recall"
                    res = await client.post(
                        fallback_ep, headers=self._headers(), json=payload
                    )
                res.raise_for_status()
                data = res.json() if res.content else {}
                self.is_connected_cache = True

                raw_list = (
                    data.get("results")
                    or data.get("memories")
                    or data.get("facts")
                    or (data if isinstance(data, list) else [])
                )
                if isinstance(raw_list, list) and limit > 0:
                    raw_list = raw_list[:limit]

                memories = []
                for idx, m in enumerate(raw_list):
                    if isinstance(m, dict):
                        memories.append(
                            MemoryItem(
                                id=str(
                                    m.get("id")
                                    or m.get("memory_id")
                                    or f"hindsight-{idx}"
                                ),
                                content=str(
                                    m.get("text")
                                    or m.get("content")
                                    or m.get("fact")
                                    or m
                                ),
                                document_id=m.get("document_id"),
                                metadata={
                                    **(m.get("metadata") or {}),
                                    "entities": m.get("entities"),
                                    "context": m.get("context"),
                                },
                                tags=m.get("tags") or [],
                                created_at=str(
                                    m.get("created_at")
                                    or datetime.now(timezone.utc).isoformat()
                                ),
                                score=float(m.get("score", 0.9))
                                if isinstance(m.get("score"), (int, float))
                                else 0.9,
                            )
                        )
                    else:
                        memories.append(
                            MemoryItem(
                                id=f"hindsight-{idx}",
                                content=str(m),
                                metadata={},
                                tags=[],
                                created_at=datetime.now(timezone.utc).isoformat(),
                                score=0.9,
                            )
                        )

                return {"success": True, "memories": memories}
            except Exception as exc:
                self.is_connected_cache = False
                return {
                    "success": False,
                    "memories": [],
                    "error": str(exc),
                }
