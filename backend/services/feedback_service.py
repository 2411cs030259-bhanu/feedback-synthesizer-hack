import csv
import io
import re
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.database.db import insert_feedback
from backend.models.schemas import FeedbackAnalysis, FeedbackItem


def normalize_source(src: Optional[str]) -> str:
    if not src:
        return "Support"
    s = src.lower().strip()
    if any(k in s for k in ("support", "ticket", "helpdesk", "desk")):
        return "Support"
    if any(k in s for k in ("review", "g2", "capterra", "app store")):
        return "Product Review"
    if any(k in s for k in ("sales", "demo", "call", "prospect")):
        return "Sales"
    if any(k in s for k in ("interview", "user research", "ux research")):
        return "Interview"
    if any(k in s for k in ("social", "twitter", "x", "reddit")):
        return "Social"
    return src.strip().capitalize()


def parse_date(raw_date: Optional[str]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    if not raw_date:
        return {"iso": now.isoformat(), "timestamp": int(now.timestamp() * 1000)}

    cleaned = raw_date.strip()
    try:
        if cleaned.endswith("Z"):
            dt = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        elif len(cleaned) == 10 and re.match(r"^\d{4}-\d{2}-\d{2}$", cleaned):
            dt = datetime.fromisoformat(f"{cleaned}T00:00:00+00:00")
        else:
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        return {"iso": dt.isoformat(), "timestamp": int(dt.timestamp() * 1000)}
    except Exception:
        return {"iso": now.isoformat(), "timestamp": int(now.timestamp() * 1000)}


def create_normalized_feedback(
    raw_input: Dict[str, Any], analysis: FeedbackAnalysis
) -> FeedbackItem:
    fb_id = raw_input.get("id") or f"fb_{int(time.time() * 1000)}_{secrets.token_hex(3)}"
    date_info = parse_date(raw_input.get("created_at"))
    customer_raw = raw_input.get("customer")
    customer = str(customer_raw).strip() if customer_raw else "Anonymous Customer"

    item = FeedbackItem(
        id=fb_id,
        source=normalize_source(raw_input.get("source")),
        source_id=raw_input.get("source_id") or f"src-{fb_id[-6:]}",
        customer=customer,
        customer_id=raw_input.get("customer_id") or f"cust-{secrets.token_hex(3)}",
        feedback_text=str(raw_input.get("feedback_text", "")).strip(),
        created_at=date_info["iso"],
        received_at=datetime.now(timezone.utc).isoformat(),
        sentiment=analysis.sentiment,
        sentiment_score=analysis.sentiment_score,
        topic=analysis.topic or "general",
        subcategory=analysis.subcategory or "",
        problem=analysis.problem or "",
        keywords=analysis.keywords or [],
        urgency=analysis.urgency or "medium",
        created_timestamp=date_info["timestamp"],
    )
    insert_feedback(item)
    return item


def parse_csv_feedback(csv_content: str) -> List[Dict[str, str]]:
    lines = [l.strip() for l in csv_content.splitlines() if l.strip()]
    if not lines:
        return []

    first_lower = lines[0].lower()
    has_header = any(
        h in first_lower for h in ("feedback", "source", "customer", "text")
    )
    start_idx = 1 if has_header else 0

    results: List[Dict[str, str]] = []
    reader = csv.reader(io.StringIO("\n".join(lines[start_idx:])))
    for tokens in reader:
        tokens = [t.strip().strip('"') for t in tokens if t is not None]
        if not tokens:
            continue
        if len(tokens) == 1 and tokens[0]:
            results.append({"feedback_text": tokens[0]})
        elif len(tokens) >= 2:
            source = "Support"
            customer = "Customer"
            date = datetime.now(timezone.utc).isoformat()
            if len(tokens) == 2:
                source, feedback_text = tokens[0], tokens[1]
            elif len(tokens) == 3:
                source, customer, feedback_text = tokens[0], tokens[1], tokens[2]
            else:
                if re.search(r"\d{4}", tokens[0]):
                    date = tokens[0]
                    source = tokens[1]
                    customer = tokens[2]
                    feedback_text = ", ".join(tokens[3:])
                else:
                    source = tokens[0]
                    customer = tokens[1]
                    date = tokens[2]
                    feedback_text = ", ".join(tokens[3:])
            if feedback_text:
                results.append(
                    {
                        "source": source,
                        "customer": customer,
                        "created_at": date,
                        "feedback_text": feedback_text,
                    }
                )
    return results
