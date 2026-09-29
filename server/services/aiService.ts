import { GroqProvider } from './groqProvider.js';
import { LocalTemplateProvider } from './localTemplateProvider.js';
import type { FeedbackAnalysis, MemoryItem, ComplaintCluster } from '../../src/types/feedback.js';

export class AIService {
  private groq: GroqProvider;
  private local: LocalTemplateProvider;

  constructor() {
    this.groq = new GroqProvider();
    this.local = new LocalTemplateProvider();
  }

  public async getStatus(): Promise<{
    connected: boolean;
    provider: 'groq' | 'local';
    model: string;
    message: string;
  }> {
    const groqHealth = await this.groq.checkHealth();
    if (groqHealth.connected) {
      return {
        connected: true,
        provider: 'groq',
        model: groqHealth.model,
        message: groqHealth.message,
      };
    }

    const localHealth = await this.local.checkHealth();
    return {
      connected: false,
      provider: 'local',
      model: localHealth.model,
      message: `Groq is not connected (${groqHealth.message}). Running in Local AI Template mode.`,
    };
  }

  public async analyzeFeedback(text: string, context?: { source?: string; customer?: string }): Promise<{
    analysis: FeedbackAnalysis;
    provider: 'groq' | 'local';
  }> {
    const health = await this.groq.checkHealth();
    if (health.connected) {
      try {
        const analysis = await this.groq.analyzeFeedback(text, context);
        return { analysis, provider: 'groq' };
      } catch (err) {
        console.warn('Groq analyzeFeedback failed, falling back to local provider:', err);
      }
    }

    const analysis = await this.local.analyzeFeedback(text, context);
    return { analysis, provider: 'local' };
  }

  public async reasonOverMemories(
    currentFeedback: { text: string; topic: string; problem: string; source: string; date: string },
    recalledMemories: MemoryItem[]
  ): Promise<{
    isRecurring: boolean;
    clusterTitle: string;
    description: string;
    sentimentTrend: string;
    explanation: string;
    relatedMemoryIds: string[];
    provider: 'groq' | 'local';
  }> {
    const health = await this.groq.checkHealth();
    if (health.connected) {
      try {
        const result = await this.groq.reasonOverMemories(currentFeedback, recalledMemories);
        return { ...result, provider: 'groq' };
      } catch (err) {
        console.warn('Groq reasonOverMemories failed, falling back to local provider:', err);
      }
    }

    const result = await this.local.reasonOverMemories(currentFeedback, recalledMemories);
    return { ...result, provider: 'local' };
  }

  public async answerInvestigation(
    question: string,
    recalledMemories: MemoryItem[],
    clusters: ComplaintCluster[]
  ): Promise<{
    answer: string;
    evidence: Array<{ source: string; date: string; quote: string; customer?: string; relevance: string }>;
    provider: 'groq' | 'local';
  }> {
    const health = await this.groq.checkHealth();
    if (health.connected) {
      try {
        const result = await this.groq.answerInvestigation(question, recalledMemories, clusters);
        return { ...result, provider: 'groq' };
      } catch (err) {
        console.warn('Groq answerInvestigation failed, falling back to local provider:', err);
      }
    }

    const result = await this.local.answerInvestigation(question, recalledMemories, clusters);
    return { ...result, provider: 'local' };
  }

  public async extractFromTranscript(transcriptText: string): Promise<Array<{
    customer: string;
    source: string;
    feedback_text: string;
    date?: string;
  }>> {
    const health = await this.groq.checkHealth();
    if (health.connected) {
      try {
        const result = await this.groq.extractFromTranscript(transcriptText);
        if (result && result.length > 0) return result;
      } catch (err) {
        console.warn('Groq extractFromTranscript failed, using local parser:', err);
      }
    }

    return this.local.extractFromTranscript(transcriptText);
  }
}

export const aiService = new AIService();
