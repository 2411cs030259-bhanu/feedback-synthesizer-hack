from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

SentimentType = Literal["positive", "neutral", "negative"]
UrgencyType = Literal["low", "medium", "high", "critical"]
AgentActionType = Literal[
    "OBSERVE",
    "UNDERSTAND",
    "DECIDE",
    "RECALL",
    "REASON",
    "DETECT",
    "RETAIN",
    "INSIGHT",
    "INVESTIGATE",
]
AgentStatusType = Literal["SUCCESS", "FALLBACK", "SKIPPED", "ERROR"]


class FeedbackCreateRequest(BaseModel):
    id: Optional[str] = None
    source: Optional[str] = "Support"
    source_id: Optional[str] = None
    customer: Optional[str] = "Anonymous"
    customer_id: Optional[str] = None
    feedback_text: str = Field(..., min_length=1, description="Customer feedback text")
    created_at: Optional[str] = None


class CsvImportRequest(BaseModel):
    csvContent: str = Field(..., min_length=1, description="Raw CSV string to import")


class TranscriptExtractRequest(BaseModel):
    transcript: str = Field(..., min_length=1, description="Raw call or interview transcript")


class InvestigationRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Natural language question for memory investigation")


class MemoryRecallRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Semantic query for Hindsight RECALL")
    tags: Optional[List[str]] = None
    limit: Optional[int] = 8


class FeedbackItem(BaseModel):
    id: str
    source: str
    source_id: Optional[str] = ""
    customer: Optional[str] = "Anonymous"
    customer_id: Optional[str] = ""
    feedback_text: str
    created_at: str
    received_at: str
    sentiment: SentimentType
    sentiment_score: float
    topic: str
    subcategory: Optional[str] = ""
    problem: Optional[str] = ""
    keywords: List[str] = Field(default_factory=list)
    urgency: UrgencyType
    created_timestamp: int


class FeedbackAnalysis(BaseModel):
    sentiment: SentimentType
    sentiment_score: float
    topic: str
    subcategory: str
    problem: str
    keywords: List[str] = Field(default_factory=list)
    urgency: UrgencyType
    needsHistoricalContext: bool = True
    reasoning: str


class MemoryItem(BaseModel):
    id: str
    content: str
    document_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    created_at: str
    score: Optional[float] = None


class ComplaintCluster(BaseModel):
    id: str
    title: str
    description: str
    first_seen: str
    last_seen: str
    occurrence_count: int
    source_count: int
    sources: List[str] = Field(default_factory=list)
    sentiment_trend: str
    feedback_ids: List[str] = Field(default_factory=list)
    feedbacks: Optional[List[FeedbackItem]] = None


class AgentActivityRun(BaseModel):
    id: str
    feedback_id: Optional[str] = None
    action: AgentActionType
    status: AgentStatusType
    created_at: str
    details: Dict[str, Any] = Field(default_factory=dict)


class InvestigationEvidence(BaseModel):
    source: str
    date: str
    customer: Optional[str] = "Customer"
    quote: str
    relevance: str


class InvestigationResult(BaseModel):
    question: str
    interpretedQuery: str
    relevantFound: bool
    recalledCount: int
    recalledMemories: List[MemoryItem] = Field(default_factory=list)
    recurringIssueIdentified: bool
    clusterTitle: Optional[str] = None
    answer: str
    firstObserved: Optional[str] = "Unknown"
    latestObserved: Optional[str] = "Unknown"
    channels: List[str] = Field(default_factory=list)
    evidence: List[InvestigationEvidence] = Field(default_factory=list)
    aiMode: Literal["groq", "local"]
    memoryMode: Literal["hindsight", "local"]


class SystemConfigStatus(BaseModel):
    groq: bool
    hindsight: bool
    memoryMode: Literal["hindsight", "local"]
    aiMode: Literal["groq", "local"]
    groqModel: str
    groqMessage: Optional[str] = None
    hindsightUrl: str
    hindsightBank: str
    hindsightMessage: Optional[str] = None
    totalFeedbackCount: int
    totalClusterCount: int
    totalMemoryCount: int
    backendStack: str = "Python FastAPI + Pydantic + HTTPX + hindsight-client"
