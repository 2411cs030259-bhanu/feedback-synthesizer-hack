import type { MemoryItem } from '../../src/types/feedback.js';

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']+|["']+$/g, '').trim();
}

export class HindsightService {
  private url: string;
  private apiKey: string;
  private bank: string;
  private isCloud: boolean = false;
  private isConnectedCache: boolean | null = null;
  private lastCheckTime = 0;

  constructor() {
    let rawUrl = cleanEnv(process.env.HINDSIGHT_URL);
    let rawBank = cleanEnv(process.env.HINDSIGHT_BANK);
    this.apiKey = cleanEnv(process.env.HINDSIGHT_API_KEY);

    // If HINDSIGHT_BANK was accidentally set to the API URL (e.g. https://api.hindsight.vectorize.io)
    if (rawBank.startsWith('http://') || rawBank.startsWith('https://')) {
      rawUrl = rawBank;
      rawBank = 'user-feedback-synthesizer';
    }

    // If apiKey is a Vectorize cloud key (starts with hsk_) and URL is still localhost default, route to cloud
    if (this.apiKey.startsWith('hsk_') && (!rawUrl || rawUrl.includes('localhost'))) {
      rawUrl = 'https://api.hindsight.vectorize.io';
    }

    this.url = (rawUrl || 'http://localhost:8888').replace(/\/+$/, '');
    this.bank = rawBank || 'user-feedback-synthesizer';
    this.isCloud = this.url.includes('vectorize.io');
  }

  public getConfig(): { url: string; bank: string; hasKey: boolean; isCloud: boolean } {
    return {
      url: this.url,
      bank: this.bank,
      hasKey: Boolean(this.apiKey),
      isCloud: this.isCloud,
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  public async checkHealth(): Promise<{ connected: boolean; message: string }> {
    const now = Date.now();
    if (this.isConnectedCache !== null && now - this.lastCheckTime < 15000) {
      return {
        connected: this.isConnectedCache,
        message: this.isConnectedCache
          ? `Hindsight ${this.isCloud ? 'Cloud' : 'Instance'} is active (${this.bank})`
          : 'Hindsight is offline',
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Try cloud health or bank status
      const checkUrl = this.isCloud
        ? `${this.url}/v1/default/banks`
        : `${this.url}/health`;

      let res = await fetch(checkUrl, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      }).catch(async () => {
        // Fallback probe
        return await fetch(`${this.url}/health/ready`, {
          method: 'GET',
          headers: this.getHeaders(),
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (res && (res.ok || res.status === 200)) {
        this.isConnectedCache = true;
        this.lastCheckTime = now;
        return {
          connected: true,
          message: `Connected to Hindsight (${this.isCloud ? 'Cloud' : 'Local'}, bank: ${this.bank})`,
        };
      }

      this.isConnectedCache = false;
      this.lastCheckTime = now;
      return { connected: false, message: `Hindsight returned HTTP ${res?.status}` };
    } catch (err: any) {
      this.isConnectedCache = false;
      this.lastCheckTime = now;
      return {
        connected: false,
        message: `Hindsight unreachable at ${this.url}: ${err.message || 'connection refused'}`,
      };
    }
  }

  public async retainFeedback(item: {
    content: string;
    document_id?: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<{ success: boolean; memoryId?: string; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      if (this.isCloud) {
        // Cloud endpoint: POST /v1/default/banks/{bank_id}/memories
        const endpoint = `${this.url}/v1/default/banks/${encodeURIComponent(this.bank)}/memories`;
        const body = JSON.stringify({
          async: false,
          items: [
            {
              content: item.content,
              context: item.metadata?.topic || 'customer_feedback',
              document_id: item.document_id,
              timestamp: item.metadata?.date
                ? new Date(item.metadata.date).toISOString()
                : new Date().toISOString(),
              tags: item.tags || [],
            },
          ],
        });

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: this.getHeaders(),
          body,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Hindsight Cloud retain HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json().catch(() => ({}));
        this.isConnectedCache = true;
        return {
          success: true,
          memoryId: item.document_id || 'retained_cloud',
        };
      }

      // Local Hindsight endpoint: POST /banks/{id}/retain or /banks/{id}/memories
      const endpoint = `${this.url}/banks/${encodeURIComponent(this.bank)}/retain`;
      const body = JSON.stringify({
        content: item.content,
        document_id: item.document_id,
        metadata: item.metadata || {},
        tags: item.tags || [],
      });

      let res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body,
        signal: controller.signal,
      });

      if (!res.ok && res.status === 404) {
        const fallbackEndpoint = `${this.url}/banks/${encodeURIComponent(this.bank)}/memories`;
        res = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: this.getHeaders(),
          body,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Hindsight retain HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json().catch(() => ({}));
      this.isConnectedCache = true;
      return {
        success: true,
        memoryId: data.id || data.memory_id || item.document_id,
      };
    } catch (err: any) {
      this.isConnectedCache = false;
      return {
        success: false,
        error: err.message || 'Hindsight retain failed',
      };
    }
  }

  public async recallFeedback(params: {
    query: string;
    tags?: string[];
    limit?: number;
  }): Promise<{ success: boolean; memories: MemoryItem[]; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const endpoint = this.isCloud
        ? `${this.url}/v1/default/banks/${encodeURIComponent(this.bank)}/memories/recall`
        : `${this.url}/banks/${encodeURIComponent(this.bank)}/recall`;

      const body = JSON.stringify({
        query: params.query,
        tags: params.tags || [],
        limit: params.limit || 8,
      });

      let res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body,
        signal: controller.signal,
      });

      if (!res.ok && !this.isCloud && res.status === 404) {
        const fallbackEndpoint = `${this.url}/banks/${encodeURIComponent(this.bank)}/memories/recall`;
        res = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: this.getHeaders(),
          body,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Hindsight recall HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json().catch(() => ({}));
      this.isConnectedCache = true;

      // Extract results list
      const rawList =
        data.results ||
        data.memories ||
        data.facts ||
        (Array.isArray(data) ? data : []);

      const memories: MemoryItem[] = rawList.map((m: any, idx: number) => ({
        id: m.id || m.memory_id || `hindsight-${idx}`,
        content: m.text || m.content || m.fact || String(m),
        document_id: m.document_id,
        metadata: {
          ...(m.metadata || {}),
          entities: m.entities,
          context: m.context,
        },
        tags: m.tags || [],
        created_at: m.created_at || new Date().toISOString(),
        score: typeof m.score === 'number' ? m.score : 0.9,
      }));

      return {
        success: true,
        memories,
      };
    } catch (err: any) {
      this.isConnectedCache = false;
      return {
        success: false,
        memories: [],
        error: err.message || 'Hindsight recall failed',
      };
    }
  }
}
