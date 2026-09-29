import { HindsightService } from './hindsightService.js';
import { LocalMemoryService } from './localMemoryService.js';
import type { MemoryItem } from '../../src/types/feedback.js';

export class MemoryService {
  private hindsight: HindsightService;
  private local: LocalMemoryService;

  constructor() {
    this.hindsight = new HindsightService();
    this.local = new LocalMemoryService();
  }

  public async getStatus(): Promise<{
    connected: boolean;
    provider: 'hindsight' | 'local';
    bank: string;
    url: string;
    totalMemories: number;
    message: string;
  }> {
    const hindsightConfig = this.hindsight.getConfig();
    const hindsightHealth = await this.hindsight.checkHealth();
    const totalLocal = this.local.count();

    if (hindsightHealth.connected) {
      return {
        connected: true,
        provider: 'hindsight',
        bank: hindsightConfig.bank,
        url: hindsightConfig.url,
        totalMemories: totalLocal,
        message: hindsightHealth.message,
      };
    }

    return {
      connected: false,
      provider: 'local',
      bank: hindsightConfig.bank,
      url: hindsightConfig.url,
      totalMemories: totalLocal,
      message: `Hindsight is unreachable (${hindsightHealth.message}). Running in Local Memory Fallback mode.`,
    };
  }

  public async retainFeedback(item: {
    content: string;
    document_id?: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<{ success: boolean; provider: 'hindsight' | 'local'; memoryId: string; error?: string }> {
    // Always persist to local store for resilience and fast browsing
    const localResult = await this.local.retainFeedback(item);

    // Check if Hindsight is reachable
    const health = await this.hindsight.checkHealth();
    if (health.connected) {
      const hindsightResult = await this.hindsight.retainFeedback(item);
      if (hindsightResult.success) {
        return {
          success: true,
          provider: 'hindsight',
          memoryId: hindsightResult.memoryId || localResult.memoryId,
        };
      }
      // If Hindsight failed during retain, note the error but return local success
      return {
        success: true,
        provider: 'local',
        memoryId: localResult.memoryId,
        error: `Hindsight retain failed (${hindsightResult.error}), saved to local memory fallback.`,
      };
    }

    return {
      success: true,
      provider: 'local',
      memoryId: localResult.memoryId,
    };
  }

  public async recallFeedback(params: {
    query: string;
    tags?: string[];
    limit?: number;
  }): Promise<{
    success: boolean;
    provider: 'hindsight' | 'local';
    memories: MemoryItem[];
    error?: string;
  }> {
    const health = await this.hindsight.checkHealth();

    if (health.connected) {
      const hindsightResult = await this.hindsight.recallFeedback(params);
      if (hindsightResult.success && hindsightResult.memories.length > 0) {
        return {
          success: true,
          provider: 'hindsight',
          memories: hindsightResult.memories,
        };
      }
      // If Hindsight returned no results or failed, merge with local recall
      if (!hindsightResult.success) {
        const localResult = await this.local.recallFeedback(params);
        return {
          success: true,
          provider: 'local',
          memories: localResult.memories,
          error: `Hindsight recall error: ${hindsightResult.error}. Using local recall.`,
        };
      }
    }

    // Default to local recall
    const localResult = await this.local.recallFeedback(params);
    return {
      success: true,
      provider: 'local',
      memories: localResult.memories,
    };
  }

  public getAllMemories(): MemoryItem[] {
    return this.local.getAll();
  }
}

export const memoryService = new MemoryService();
