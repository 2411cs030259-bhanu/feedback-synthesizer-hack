import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { FeedbackItem, ComplaintCluster, AgentActivityRun, MemoryItem } from '../../src/types/feedback.js';

let db: DatabaseSync;

export function getDatabase(): DatabaseSync {
  if (db) return db;

  const dataDir = process.env.VERCEL
    ? path.join('/tmp', 'data')
    : path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      // directory might already exist
    }
  }

  const dbPath = path.join(dataDir, 'feedback.db');
  try {
    db = new DatabaseSync(dbPath);
  } catch (err) {
    console.warn('Could not open SQLite file database, falling back to :memory:', err);
    db = new DatabaseSync(':memory:');
  }

  initSchema(db);
  return db;
}

function initSchema(database: DatabaseSync) {
  database.exec(`
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
  `);
}

// Feedback DB Methods
export function insertFeedback(item: FeedbackItem): FeedbackItem {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO feedback (
      id, source, source_id, customer, customer_id, feedback_text,
      created_at, received_at, sentiment, sentiment_score, topic,
      subcategory, problem, keywords, urgency, created_timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    item.id,
    item.source || 'General',
    item.source_id || '',
    item.customer || 'Anonymous',
    item.customer_id || '',
    item.feedback_text,
    item.created_at,
    item.received_at,
    item.sentiment,
    item.sentiment_score,
    item.topic,
    item.subcategory || '',
    item.problem || '',
    JSON.stringify(item.keywords || []),
    item.urgency,
    item.created_timestamp
  );

  return item;
}

export function getAllFeedback(filterTopic?: string, search?: string): FeedbackItem[] {
  const database = getDatabase();
  let query = 'SELECT * FROM feedback ORDER BY created_timestamp DESC';
  const params: string[] = [];

  if (filterTopic && filterTopic !== 'all') {
    query = 'SELECT * FROM feedback WHERE LOWER(topic) = LOWER(?) ORDER BY created_timestamp DESC';
    params.push(filterTopic);
  }

  const rows = database.prepare(query).all(...params) as any[];

  return rows
    .map(r => ({
      id: r.id,
      source: r.source,
      source_id: r.source_id,
      customer: r.customer,
      customer_id: r.customer_id,
      feedback_text: r.feedback_text,
      created_at: r.created_at,
      received_at: r.received_at,
      sentiment: r.sentiment,
      sentiment_score: Number(r.sentiment_score),
      topic: r.topic,
      subcategory: r.subcategory,
      problem: r.problem,
      keywords: JSON.parse(r.keywords || '[]'),
      urgency: r.urgency,
      created_timestamp: Number(r.created_timestamp),
    }))
    .filter(item => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        item.feedback_text.toLowerCase().includes(q) ||
        item.customer?.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q)
      );
    });
}

export function getFeedbackById(id: string): FeedbackItem | null {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM feedback WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    source_id: row.source_id,
    customer: row.customer,
    customer_id: row.customer_id,
    feedback_text: row.feedback_text,
    created_at: row.created_at,
    received_at: row.received_at,
    sentiment: row.sentiment,
    sentiment_score: Number(row.sentiment_score),
    topic: row.topic,
    subcategory: row.subcategory,
    problem: row.problem,
    keywords: JSON.parse(row.keywords || '[]'),
    urgency: row.urgency,
    created_timestamp: Number(row.created_timestamp),
  };
}

// Complaint Clusters DB Methods
export function upsertComplaintCluster(cluster: ComplaintCluster): void {
  const database = getDatabase();
  const stmt = database.prepare(`
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
  `);

  stmt.run(
    cluster.id,
    cluster.title,
    cluster.description,
    cluster.first_seen,
    cluster.last_seen,
    cluster.occurrence_count,
    cluster.source_count,
    JSON.stringify(cluster.sources),
    cluster.sentiment_trend
  );

  // Link feedback items
  const linkStmt = database.prepare(`
    INSERT OR IGNORE INTO complaint_feedback (cluster_id, feedback_id)
    VALUES (?, ?)
  `);
  for (const fid of cluster.feedback_ids) {
    linkStmt.run(cluster.id, fid);
  }
}

export function getAllComplaintClusters(): ComplaintCluster[] {
  const database = getDatabase();
  const rows = database.prepare(`
    SELECT * FROM complaint_clusters ORDER BY occurrence_count DESC
  `).all() as any[];

  return rows.map(r => {
    const feedbackLinks = database.prepare(`
      SELECT feedback_id FROM complaint_feedback WHERE cluster_id = ?
    `).all(r.id) as any[];

    const feedbackIds = feedbackLinks.map(l => l.feedback_id);
    const feedbacks: FeedbackItem[] = [];

    for (const fid of feedbackIds) {
      const fb = getFeedbackById(fid);
      if (fb) feedbacks.push(fb);
    }

    feedbacks.sort((a, b) => a.created_timestamp - b.created_timestamp);

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      first_seen: r.first_seen,
      last_seen: r.last_seen,
      occurrence_count: Number(r.occurrence_count),
      source_count: Number(r.source_count),
      sources: JSON.parse(r.sources || '[]'),
      sentiment_trend: r.sentiment_trend,
      feedback_ids: feedbackIds,
      feedbacks,
    };
  });
}

export function getComplaintClusterById(id: string): ComplaintCluster | null {
  const database = getDatabase();
  const r = database.prepare('SELECT * FROM complaint_clusters WHERE id = ?').get(id) as any;
  if (!r) return null;

  const feedbackLinks = database.prepare(`
    SELECT feedback_id FROM complaint_feedback WHERE cluster_id = ?
  `).all(r.id) as any[];

  const feedbackIds = feedbackLinks.map(l => l.feedback_id);
  const feedbacks: FeedbackItem[] = [];

  for (const fid of feedbackIds) {
    const fb = getFeedbackById(fid);
    if (fb) feedbacks.push(fb);
  }

  feedbacks.sort((a, b) => a.created_timestamp - b.created_timestamp);

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    first_seen: r.first_seen,
    last_seen: r.last_seen,
    occurrence_count: Number(r.occurrence_count),
    source_count: Number(r.source_count),
    sources: JSON.parse(r.sources || '[]'),
    sentiment_trend: r.sentiment_trend,
    feedback_ids: feedbackIds,
    feedbacks,
  };
}

// Agent Runs DB Methods
export function insertAgentRun(run: AgentActivityRun): void {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO agent_runs (id, feedback_id, action, status, created_at, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    run.id,
    run.feedback_id || null,
    run.action,
    run.status,
    run.created_at,
    JSON.stringify(run.details || {})
  );
}

export function getAgentRuns(limit = 100): AgentActivityRun[] {
  const database = getDatabase();
  const rows = database.prepare(`
    SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?
  `).all(limit) as any[];

  return rows.map(r => ({
    id: r.id,
    feedback_id: r.feedback_id,
    action: r.action,
    status: r.status,
    created_at: r.created_at,
    details: JSON.parse(r.details || '{}'),
  }));
}

// Local Memories DB Methods
export function insertLocalMemory(item: MemoryItem): void {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO local_memories (id, content, document_id, metadata, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    item.id,
    item.content,
    item.document_id || null,
    JSON.stringify(item.metadata || {}),
    JSON.stringify(item.tags || []),
    item.created_at
  );
}

export function getAllLocalMemories(): MemoryItem[] {
  const database = getDatabase();
  const rows = database.prepare(`
    SELECT * FROM local_memories ORDER BY created_at DESC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    content: r.content,
    document_id: r.document_id,
    metadata: JSON.parse(r.metadata || '{}'),
    tags: JSON.parse(r.tags || '[]'),
    created_at: r.created_at,
  }));
}

export function countLocalMemories(): number {
  const database = getDatabase();
  const r = database.prepare('SELECT COUNT(*) as count FROM local_memories').get() as any;
  return Number(r?.count || 0);
}

export function clearDatabase(): void {
  const database = getDatabase();
  database.exec(`
    DELETE FROM feedback;
    DELETE FROM complaint_clusters;
    DELETE FROM complaint_feedback;
    DELETE FROM agent_runs;
    DELETE FROM local_memories;
  `);
}
