import json
import os
import sqlite3
from pathlib import Path
from typing import List, Optional
from backend.models.schemas import (
    AgentActivityRun,
    ComplaintCluster,
    FeedbackItem,
    MemoryItem,
)

_conn: Optional[sqlite3.Connection] = None


def get_database() -> sqlite3.Connection:
    global _conn
    if _conn is not None:
        return _conn

    if os.environ.get("VERCEL"):
        data_dir = Path("/tmp/data")
    else:
        data_dir = Path.cwd() / "data"

    data_dir.mkdir(parents=True, exist_ok=True)
    db_path = data_dir / "feedback.db"

    try:
        _conn = sqlite3.connect(str(db_path), check_same_thread=False)
    except Exception as exc:
        print(f"Could not open SQLite file database, falling back to :memory: ({exc})")
        _conn = sqlite3.connect(":memory:", check_same_thread=False)

    _conn.row_factory = sqlite3.Row
    init_schema(_conn)
    return _conn


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS feedback (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          source_id TEXT,
          customer TEXT,
          customer_id TEXT,
          feedback_text TEXT NOT NULL,
          created_at TEXT NOT NULL,
          received_at TEXT NOT NULL,
          sentiment TEXT NOT NULL,
          sentiment_score REAL NOT NULL,
          topic TEXT NOT NULL,
          subcategory TEXT,
          problem TEXT,
          keywords TEXT NOT NULL,
          urgency TEXT NOT NULL,
          created_timestamp INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS complaint_clusters (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          first_seen TEXT NOT NULL,
          last_seen TEXT NOT NULL,
          occurrence_count INTEGER NOT NULL,
          source_count INTEGER NOT NULL,
          sources TEXT NOT NULL,
          sentiment_trend TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS complaint_feedback (
          cluster_id TEXT NOT NULL,
          feedback_id TEXT NOT NULL,
          PRIMARY KEY (cluster_id, feedback_id)
        );

        CREATE TABLE IF NOT EXISTS agent_runs (
          id TEXT PRIMARY KEY,
          feedback_id TEXT,
          action TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          details TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_memories (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          document_id TEXT,
          metadata TEXT NOT NULL,
          tags TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
        CREATE INDEX IF NOT EXISTS idx_feedback_topic ON feedback(topic);
        CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON agent_runs(created_at);
        """
    )
    conn.commit()


def _row_to_feedback(row: sqlite3.Row) -> FeedbackItem:
    try:
        keywords = json.loads(row["keywords"] or "[]")
    except Exception:
        keywords = []

    return FeedbackItem(
        id=row["id"],
        source=row["source"],
        source_id=row["source_id"] or "",
        customer=row["customer"] or "Anonymous",
        customer_id=row["customer_id"] or "",
        feedback_text=row["feedback_text"],
        created_at=row["created_at"],
        received_at=row["received_at"],
        sentiment=row["sentiment"],
        sentiment_score=float(row["sentiment_score"]),
        topic=row["topic"],
        subcategory=row["subcategory"] or "",
        problem=row["problem"] or "",
        keywords=keywords if isinstance(keywords, list) else [],
        urgency=row["urgency"],
        created_timestamp=int(row["created_timestamp"]),
    )


def insert_feedback(item: FeedbackItem) -> FeedbackItem:
    conn = get_database()
    conn.execute(
        """
        INSERT OR REPLACE INTO feedback (
          id, source, source_id, customer, customer_id, feedback_text,
          created_at, received_at, sentiment, sentiment_score, topic,
          subcategory, problem, keywords, urgency, created_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            item.id,
            item.source or "General",
            item.source_id or "",
            item.customer or "Anonymous",
            item.customer_id or "",
            item.feedback_text,
            item.created_at,
            item.received_at,
            item.sentiment,
            float(item.sentiment_score),
            item.topic,
            item.subcategory or "",
            item.problem or "",
            json.dumps(item.keywords or []),
            item.urgency,
            int(item.created_timestamp),
        ),
    )
    conn.commit()
    return item


def get_all_feedback(
    filter_topic: Optional[str] = None, search: Optional[str] = None
) -> List[FeedbackItem]:
    conn = get_database()
    if filter_topic and filter_topic.lower() != "all":
        cur = conn.execute(
            "SELECT * FROM feedback WHERE LOWER(topic) = LOWER(?) ORDER BY created_timestamp DESC",
            (filter_topic,),
        )
    else:
        cur = conn.execute("SELECT * FROM feedback ORDER BY created_timestamp DESC")

    items = [_row_to_feedback(r) for r in cur.fetchall()]
    if search:
        q = search.lower()
        items = [
            it
            for it in items
            if q in it.feedback_text.lower()
            or (it.customer and q in it.customer.lower())
            or q in it.source.lower()
            or q in it.topic.lower()
        ]
    return items


def get_feedback_by_id(feedback_id: str) -> Optional[FeedbackItem]:
    conn = get_database()
    cur = conn.execute("SELECT * FROM feedback WHERE id = ?", (feedback_id,))
    row = cur.fetchone()
    if not row:
        return None
    return _row_to_feedback(row)


def upsert_complaint_cluster(cluster: ComplaintCluster) -> None:
    conn = get_database()
    conn.execute(
        """
        INSERT INTO complaint_clusters (
          id, title, description, first_seen, last_seen, occurrence_count,
          source_count, sources, sentiment_trend
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          first_seen = excluded.first_seen,
          last_seen = excluded.last_seen,
          occurrence_count = excluded.occurrence_count,
          source_count = excluded.source_count,
          sources = excluded.sources,
          sentiment_trend = excluded.sentiment_trend
        """,
        (
            cluster.id,
            cluster.title,
            cluster.description,
            cluster.first_seen,
            cluster.last_seen,
            int(cluster.occurrence_count),
            int(cluster.source_count),
            json.dumps(cluster.sources or []),
            cluster.sentiment_trend,
        ),
    )

    for fid in cluster.feedback_ids:
        conn.execute(
            "INSERT OR IGNORE INTO complaint_feedback (cluster_id, feedback_id) VALUES (?, ?)",
            (cluster.id, fid),
        )
    conn.commit()


def _hydrate_cluster(row: sqlite3.Row) -> ComplaintCluster:
    conn = get_database()
    links = conn.execute(
        "SELECT feedback_id FROM complaint_feedback WHERE cluster_id = ?", (row["id"],)
    ).fetchall()
    feedback_ids = [l["feedback_id"] for l in links]

    feedbacks: List[FeedbackItem] = []
    for fid in feedback_ids:
        fb = get_feedback_by_id(fid)
        if fb:
            feedbacks.append(fb)

    feedbacks.sort(key=lambda x: x.created_timestamp)

    try:
        sources = json.loads(row["sources"] or "[]")
    except Exception:
        sources = []

    return ComplaintCluster(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        first_seen=row["first_seen"],
        last_seen=row["last_seen"],
        occurrence_count=int(row["occurrence_count"]),
        source_count=int(row["source_count"]),
        sources=sources if isinstance(sources, list) else [],
        sentiment_trend=row["sentiment_trend"],
        feedback_ids=feedback_ids,
        feedbacks=feedbacks,
    )


def get_all_complaint_clusters() -> List[ComplaintCluster]:
    conn = get_database()
    rows = conn.execute(
        "SELECT * FROM complaint_clusters ORDER BY occurrence_count DESC"
    ).fetchall()
    return [_hydrate_cluster(r) for r in rows]


def get_complaint_cluster_by_id(cluster_id: str) -> Optional[ComplaintCluster]:
    conn = get_database()
    row = conn.execute(
        "SELECT * FROM complaint_clusters WHERE id = ?", (cluster_id,)
    ).fetchone()
    if not row:
        return None
    return _hydrate_cluster(row)


def insert_agent_run(run: AgentActivityRun) -> None:
    conn = get_database()
    conn.execute(
        """
        INSERT INTO agent_runs (id, feedback_id, action, status, created_at, details)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            run.id,
            run.feedback_id,
            run.action,
            run.status,
            run.created_at,
            json.dumps(run.details or {}),
        ),
    )
    conn.commit()


def get_agent_runs(limit: int = 100) -> List[AgentActivityRun]:
    conn = get_database()
    rows = conn.execute(
        "SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()

    results: List[AgentActivityRun] = []
    for r in rows:
        try:
            details = json.loads(r["details"] or "{}")
        except Exception:
            details = {}
        results.append(
            AgentActivityRun(
                id=r["id"],
                feedback_id=r["feedback_id"],
                action=r["action"],
                status=r["status"],
                created_at=r["created_at"],
                details=details if isinstance(details, dict) else {},
            )
        )
    return results


def insert_local_memory(item: MemoryItem) -> None:
    conn = get_database()
    conn.execute(
        """
        INSERT OR REPLACE INTO local_memories (id, content, document_id, metadata, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            item.id,
            item.content,
            item.document_id,
            json.dumps(item.metadata or {}),
            json.dumps(item.tags or []),
            item.created_at,
        ),
    )
    conn.commit()


def get_all_local_memories() -> List[MemoryItem]:
    conn = get_database()
    rows = conn.execute(
        "SELECT * FROM local_memories ORDER BY created_at DESC"
    ).fetchall()

    results: List[MemoryItem] = []
    for r in rows:
        try:
            metadata = json.loads(r["metadata"] or "{}")
        except Exception:
            metadata = {}
        try:
            tags = json.loads(r["tags"] or "[]")
        except Exception:
            tags = []
        results.append(
            MemoryItem(
                id=r["id"],
                content=r["content"],
                document_id=r["document_id"],
                metadata=metadata if isinstance(metadata, dict) else {},
                tags=tags if isinstance(tags, list) else [],
                created_at=r["created_at"],
            )
        )
    return results


def count_local_memories() -> int:
    conn = get_database()
    row = conn.execute("SELECT COUNT(*) as count FROM local_memories").fetchone()
    return int(row["count"]) if row else 0


def clear_database() -> None:
    conn = get_database()
    conn.executescript(
        """
        DELETE FROM feedback;
        DELETE FROM complaint_clusters;
        DELETE FROM complaint_feedback;
        DELETE FROM agent_runs;
        DELETE FROM local_memories;
        """
    )
    conn.commit()
