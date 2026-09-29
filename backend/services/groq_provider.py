import json
import os
import re
import time
from typing import Any, Dict, List, Optional
import httpx
from backend.models.schemas import (
    ComplaintCluster,
    FeedbackAnalysis,
    MemoryItem,
)

GROQ_API_BASE = "https://api.groq.com/openai/v1"


def _clean_env(val: Optional[str]) -> str:
    if not val:
        return ""
    return val.strip().strip("\"'").strip()


class GroqProvider:
    """
    Groq Reasoning Engine using HTTPX (Groq REST API via HTTP).
    """

    def __init__(self) -> None:
        self.api_key = _clean_env(os.environ.get("GROQ_API_KEY"))
        self.model = _clean_env(os.environ.get("GROQ_MODEL")) or "llama-3.3-70b-versatile"
        self.is_verified = False
        self.last_verification = 0.0

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def check_health(self) -> Dict[str, Any]:
        env_key = _clean_env(os.environ.get("GROQ_API_KEY"))
        if env_key:
            self.api_key = env_key
        env_model = _clean_env(os.environ.get("GROQ_MODEL"))
        if env_model:
            self.model = env_model

        if not self.api_key:
            return {
                "connected": False,
                "message": "GROQ_API_KEY is not configured in environment",
                "model": self.model,
            }

        now = time.time()
        if self.is_verified and (now - self.last_verification) < 30.0:
            return {
                "connected": True,
                "message": f"Groq HTTP API active with {self.model}",
                "model": self.model,
            }

        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                resp = await client.post(
                    f"{GROQ_API_BASE}/chat/completions",
                    headers=self._headers(),
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": "Ping"}],
                        "max_tokens": 5,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("choices"):
                        self.is_verified = True
                        self.last_verification = now
                        return {
                            "connected": True,
                            "message": f"Groq connected via HTTPX ({self.model})",
                            "model": self.model,
                        }

                if resp.status_code == 404 or "model_not_found" in resp.text:
                    models_resp = await client.get(
                        f"{GROQ_API_BASE}/models", headers=self._headers()
                    )
                    if models_resp.status_code == 200:
                        models_data = models_resp.json().get("data", [])
                        candidates = [
                            m.get("id", "")
                            for m in models_data
                            if "whisper" not in m.get("id", "")
                            and "guard" not in m.get("id", "")
                        ]
                        preferred = next(
                            (
                                cid
                                for cid in candidates
                                if "llama" in cid or "qwen" in cid or "gpt-oss" in cid
                            ),
                            candidates[0] if candidates else None,
                        )
                        if preferred:
                            self.model = preferred
                            retry_resp = await client.post(
                                f"{GROQ_API_BASE}/chat/completions",
                                headers=self._headers(),
                                json={
                                    "model": self.model,
                                    "messages": [{"role": "user", "content": "Ping"}],
                                    "max_tokens": 5,
                                },
                            )
                            if retry_resp.status_code == 200:
                                self.is_verified = True
                                self.last_verification = now
                                return {
                                    "connected": True,
                                    "message": f"Groq connected via HTTPX with auto-selected model: {self.model}",
                                    "model": self.model,
                                }

                self.is_verified = False
                return {
                    "connected": False,
                    "message": f"Groq HTTP {resp.status_code}: {resp.text[:120]}",
                    "model": self.model,
                }
            except Exception as exc:
                self.is_verified = False
                return {
                    "connected": False,
                    "message": f"Groq HTTPX error: {str(exc)}",
                    "model": self.model,
                }

    async def _chat_completion(
        self, prompt: str, max_tokens: int = 1500, json_mode: bool = True
    ) -> str:
        if not self.api_key:
            raise RuntimeError("Groq API key not configured")

        await self.check_health()

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a JSON-only response agent. You must respond with valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                f"{GROQ_API_BASE}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            if resp.status_code != 200:
                print(f"Groq API Error {resp.status_code}: {resp.text}")
                resp.raise_for_status()
            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                return "{}"
            return choices[0].get("message", {}).get("content", "{}") or "{}"

    def _clean_json(self, raw: str) -> Any:
        stripped = re.sub(r"<thought>[\s\S]*?</thought>", "", raw, flags=re.IGNORECASE)
        stripped = re.sub(r"<think>[\s\S]*?</think>", "", stripped, flags=re.IGNORECASE)
        stripped = re.sub(r"```json", "", stripped, flags=re.IGNORECASE)
        stripped = stripped.replace("```", "").strip()

        try:
            return json.loads(stripped)
        except Exception:
            pass

        first_obj = stripped.find("{")
        last_obj = stripped.rfind("}")
        if first_obj != -1 and last_obj != -1 and last_obj > first_obj:
            try:
                return json.loads(stripped[first_obj : last_obj + 1])
            except Exception:
                pass

        first_arr = stripped.find("[")
        last_arr = stripped.rfind("]")
        if first_arr != -1 and last_arr != -1 and last_arr > first_arr:
            try:
                return json.loads(stripped[first_arr : last_arr + 1])
            except Exception:
                pass

        return {}

    async def analyze_feedback(
        self, text: str, context: Optional[Dict[str, Optional[str]]] = None
    ) -> FeedbackAnalysis:
        ctx = context or {}
        prompt = f"""You are an expert AI Feedback Understanding Agent.
Analyze the following customer feedback and return strictly a valid JSON object.

Customer Feedback:
"{text}"
Source: {ctx.get('source') or 'Unspecified'}
Customer: {ctx.get('customer') or 'Anonymous'}

Required JSON Schema:
{{
  "sentiment": "negative" | "neutral" | "positive",
  "sentiment_score": number between -1.0 and 1.0,
  "topic": concise category name (e.g. "onboarding", "performance", "export", "pricing", "documentation", "ui"),
  "subcategory": specific area (e.g. "getting_started", "slow_load", "csv_export", "plan_limits"),
  "problem": a concise, objective statement of the struggle or concern,
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "urgency": "low" | "medium" | "high" | "critical",
  "needsHistoricalContext": boolean,
  "reasoning": "brief 1-sentence explanation"
}}"""

        content = await self._chat_completion(prompt, max_tokens=1500)
        parsed = self._clean_json(content)
        if not isinstance(parsed, dict):
            parsed = {}

        sentiment = parsed.get("sentiment")
        if sentiment not in ("negative", "neutral", "positive"):
            sentiment = "neutral"

        urgency = parsed.get("urgency")
        if urgency not in ("low", "medium", "high", "critical"):
            urgency = "medium"

        score = parsed.get("sentiment_score")
        try:
            score_val = float(score)
        except Exception:
            score_val = 0.0

        keywords = parsed.get("keywords")
        if not isinstance(keywords, list):
            keywords = []

        return FeedbackAnalysis(
            sentiment=sentiment,
            sentiment_score=score_val,
            topic=str(parsed.get("topic") or "general"),
            subcategory=str(parsed.get("subcategory") or ""),
            problem=str(parsed.get("problem") or text[:100]),
            keywords=[str(k) for k in keywords],
            urgency=urgency,
            needsHistoricalContext=parsed.get("needsHistoricalContext") is not False,
            reasoning=str(
                parsed.get("reasoning")
                or f"Groq HTTP API ({self.model}) analyzed feedback text."
            ),
        )

    async def reason_over_memories(
        self,
        current_feedback: Dict[str, str],
        recalled_memories: List[MemoryItem],
    ) -> Dict[str, Any]:
        top_memories = recalled_memories[:8]
        memories_str = "\n".join(
            f'{i + 1}. [{m.id}] Date: {m.metadata.get("date") or m.created_at} | Source: {m.metadata.get("source") or "Unknown"} | Memory: "{m.content[:200]}"'
            for i, m in enumerate(top_memories)
        )

        prompt = f"""You are an AI Agent with persistent memory analyzing recurring customer problems.
Compare the current new feedback with historical memories retrieved from Hindsight.
Determine if the new feedback represents a recurring complaint or the same underlying problem.

Current New Feedback:
- Text: "{current_feedback.get('text', '')}"
- Topic: {current_feedback.get('topic', '')}
- Core Problem: {current_feedback.get('problem', '')}
- Channel/Source: {current_feedback.get('source', '')}
- Date: {current_feedback.get('date', '')}

Recalled Historical Memories from Hindsight:
{memories_str or 'None'}

Instructions:
1. Do NOT claim complaints are identical unless they actually are. Use terms like "related complaint", "recurring issue", "same underlying problem".
2. Assess whether historical memories point to the same friction point across time and channels.
3. Return ONLY a valid JSON object.

Required JSON Schema:
{{
  "isRecurring": boolean,
  "clusterTitle": "Concise title for the recurring problem (e.g. 'Onboarding & Initial Setup Confusion')",
  "description": "2-sentence synthesis of how this problem manifests across time and sources",
  "sentimentTrend": "Repeated negative feedback" | "Escalating frustration" | "Persistent friction across channels" | "Isolated incident",
  "explanation": "Clear explanation of how historical memories connect with the new feedback",
  "relatedMemoryIds": ["id1", "id2"]
}}"""

        content = await self._chat_completion(prompt, max_tokens=1024)
        parsed = self._clean_json(content)
        if not isinstance(parsed, dict):
            parsed = {}

        topic = current_feedback.get("topic", "general")
        is_recurring = parsed.get("isRecurring")
        if is_recurring is None:
            is_recurring = len(recalled_memories) > 0

        return {
            "isRecurring": bool(is_recurring),
            "clusterTitle": str(
                parsed.get("clusterTitle") or f"{topic.capitalize()} Friction"
            ),
            "description": str(
                parsed.get("description")
                or f"Persistent customer feedback regarding {topic} across multiple touchpoints."
            ),
            "sentimentTrend": str(
                parsed.get("sentimentTrend") or "Repeated negative feedback"
            ),
            "explanation": str(
                parsed.get("explanation")
                or "Analyzed historical experiences alongside current feedback to detect pattern."
            ),
            "relatedMemoryIds": parsed.get("relatedMemoryIds")
            if isinstance(parsed.get("relatedMemoryIds"), list)
            else [m.id for m in recalled_memories],
        }

    async def answer_investigation(
        self,
        question: str,
        recalled_memories: List[MemoryItem],
        clusters: List[ComplaintCluster],
    ) -> Dict[str, Any]:
        top_memories = recalled_memories[:8]
        memories_block = (
            "None"
            if not top_memories
            else "\n".join(
                f'- [{m.metadata.get("date") or m.created_at}] [Channel: {m.metadata.get("source") or "Unknown"}] [Customer: {m.metadata.get("customer") or "Anonymous"}] "{m.content[:200]}"'
                for m in top_memories
            )
        )
        clusters_block = "\n".join(
            f"- Cluster: {c.title} (Seen {c.first_seen} to {c.last_seen}, {c.occurrence_count} occurrences across [{', '.join(c.sources)}])"
            for c in clusters
        )

        prompt = f"""You are the User Feedback Synthesizer AI Agent.
Answer the investigator's question strictly based on the provided historical memories and complaint clusters.

DO NOT INVENT FEEDBACK OR EVIDENCE. If no evidence exists in the memories, state "No relevant historical feedback was found."
Every claim must cite actual dates, sources, and quotes from the memories below.

User Question: "{question}"

Available Memories from Hindsight:
{memories_block}

Existing Complaint Clusters:
{clusters_block}

Return strictly valid JSON:
{{
  "answer": "Clear, direct, evidence-based answer summarizing the pattern, timeline, and cross-channel impact.",
  "evidence": [
    {{
      "source": "Support",
      "date": "2026-01-12",
      "customer": "Customer Name",
      "quote": "Exact quote from memory",
      "relevance": "Why this supports the answer"
    }}
  ]
}}"""

        content = await self._chat_completion(prompt, max_tokens=1024)
        parsed = self._clean_json(content)
        if not isinstance(parsed, dict):
            parsed = {}

        evidence = parsed.get("evidence")
        if not isinstance(evidence, list):
            evidence = []

        return {
            "answer": str(
                parsed.get("answer")
                or "Investigation complete based on memory records."
            ),
            "evidence": evidence,
        }

    async def extract_from_transcript(
        self, transcript_text: str
    ) -> List[Dict[str, Any]]:
        prompt = f"""You are an AI Agent extracting distinct customer feedback statements from a transcript or meeting notes.
Extract individual actionable feedback items from the text below.

Transcript:
"{transcript_text}"

Return strictly a JSON object with an "items" array:
{{
  "items": [
    {{
      "customer": "Customer Name or Speaker",
      "source": "Sales" | "Support" | "Interview",
      "feedback_text": "Direct statement or key feedback point",
      "date": "YYYY-MM-DD"
    }}
  ]
}}"""

        content = await self._chat_completion(prompt, max_tokens=2048)
        parsed = self._clean_json(content)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("items"), list):
            return parsed["items"]
        return []
