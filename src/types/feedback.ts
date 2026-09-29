export type SentimentType = 'positive' | 'neutral' | 'negative';
export type UrgencyType = 'low' | 'medium' | 'high' | 'critical';

export interface FeedbackItem {
  id: string;
  source: string; // 'support' | 'product_review' | 'sales' | 'interview' | 'social' | string
  source_id?: string;
  customer?: string;
  customer_id?: string;
  feedback_text: string;
  created_at: string; // ISO date string
  received_at: string; // ISO date string
  sentiment: SentimentType;
  sentiment_score: number; // -1.0 to 1.0
  topic: string;
  subcategory?: string;
  problem?: string;
  keywords: string[];
  urgency: UrgencyType;
  created_timestamp: number;
}

export interface FeedbackAnalysis {
  sentiment: SentimentType;
  sentiment_score: number;
  topic: string;
  subcategory: string;
  problem: string;
  keywords: string[];
  urgency: UrgencyType;
  needsHistoricalContext: boolean;
  reasoning: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  document_id?: string;
  metadata: {
    source?: string;
    source_id?: string;
    feedback_id?: string;
    date?: string;
    topic?: string;
    sentiment?: string;
    customer_id?: string;
    customer?: string;
    problem?: string;
    [key: string]: any;
  };
  tags: string[];
  created_at: string;
  score?: number;
}

export interface ComplaintCluster {
  id: string;
  title: string;
  description: string;
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
  source_count: number;
  sources: string[];
  sentiment_trend: string;
  feedback_ids: string[];
  feedbacks?: FeedbackItem[];
}

export interface AgentActivityRun {
  id: string;
  feedback_id?: string;
  action: 'OBSERVE' | 'UNDERSTAND' | 'DECIDE' | 'RECALL' | 'REASON' | 'DETECT' | 'RETAIN' | 'INSIGHT' | 'INVESTIGATE';
  status: 'SUCCESS' | 'FALLBACK' | 'SKIPPED' | 'ERROR';
  created_at: string;
  details: {
    message?: string;
    query?: string;
    recalled_count?: number;
    recalled_memories?: Array<{ id: string; content: string; score?: number; source?: string; date?: string }>;
    recurring_detected?: boolean;
    cluster_id?: string;
    cluster_title?: string;
    channels?: string[];
    sentiment?: string;
    evidence_count?: number;
    insight?: string;
    model?: string;
    provider?: string;
    error?: string;
    [key: string]: any;
  };
}

export interface InvestigationResult {
  question: string;
  interpretedQuery: string;
  relevantFound: boolean;
  recalledCount: number;
  recalledMemories: MemoryItem[];
  recurringIssueIdentified: boolean;
  clusterTitle?: string;
  answer: string;
  firstObserved?: string;
  latestObserved?: string;
  channels: string[];
  evidence: Array<{
    source: string;
    date: string;
    customer?: string;
    quote: string;
    relevance: string;
  }>;
  aiMode: 'groq' | 'local';
  memoryMode: 'hindsight' | 'local';
}

export interface SystemConfigStatus {
  groq: boolean;
  hindsight: boolean;
  memoryMode: 'hindsight' | 'local';
  aiMode: 'groq' | 'local';
  groqModel: string;
  hindsightUrl: string;
  hindsightBank: string;
  totalFeedbackCount: number;
  totalClusterCount: number;
  totalMemoryCount: number;
}
