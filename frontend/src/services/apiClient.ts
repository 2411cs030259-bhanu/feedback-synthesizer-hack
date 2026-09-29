import type {
  FeedbackItem,
  ComplaintCluster,
  SystemConfigStatus,
  InvestigationResult,
} from '../types/feedback';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export const apiClient = {
  // Config & Status
  async getStatus(): Promise<SystemConfigStatus> {
    const res = await fetch(apiUrl('/api/config/status'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // Feedback Items
  async getFeedbacks(): Promise<{ feedback: FeedbackItem[]; total: number }> {
    const res = await fetch(apiUrl('/api/feedback'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async submitFeedback(data: {
    feedback_text: string;
    source: string;
    customer?: string;
    created_at?: string;
  }): Promise<any> {
    const res = await fetch(apiUrl('/api/feedback'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async importCsv(csvContent: string): Promise<any> {
    const res = await fetch(apiUrl('/api/feedback/import'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async extractTranscript(transcript: string): Promise<any[]> {
    const res = await fetch(apiUrl('/api/feedback/transcript'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.items || [];
  },

  async clearAllData(): Promise<void> {
    const res = await fetch(apiUrl('/api/feedback/clear'), { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  async seedMinimalData(): Promise<any> {
    const res = await fetch(apiUrl('/api/feedback/seed'), { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // Complaint Clusters
  async getClusters(): Promise<{ clusters: ComplaintCluster[]; total: number }> {
    const res = await fetch(apiUrl('/api/complaints'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getClusterDetails(id: string): Promise<{ cluster: ComplaintCluster; feedbacks: FeedbackItem[] }> {
    const res = await fetch(apiUrl(`/api/complaints/${encodeURIComponent(id)}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // Agent Investigation & Activity
  async investigate(question: string): Promise<InvestigationResult> {
    const res = await fetch(apiUrl('/api/agent/investigate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getActivityRuns(limit = 150): Promise<{ runs: any[]; count: number }> {
    const res = await fetch(apiUrl(`/api/agent/activity?limit=${limit}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // Memories
  async getMemories(): Promise<{ memories: any[]; total: number; config: any }> {
    const res = await fetch(apiUrl('/api/memory'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async simulateRecall(query: string, tags?: string[], limit?: number): Promise<any> {
    const res = await fetch(apiUrl('/api/memory/recall'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, tags, limit }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
