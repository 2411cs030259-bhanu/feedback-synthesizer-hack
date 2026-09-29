import { aiService } from '../services/aiService.js';
import { memoryService } from '../services/memoryService.js';
import {
  getAllComplaintClusters,
  getComplaintClusterById,
  upsertComplaintCluster,
  getAllFeedback,
} from '../database/db.js';
import type {
  FeedbackItem,
  FeedbackAnalysis,
  MemoryItem,
  ComplaintCluster,
} from '../../src/types/feedback.js';

export const agentTools = {
  /**
   * Tool: analyze_feedback
   * Extracts sentiment, topic, subcategory, problem, and urgency from raw feedback text
   */
  async analyze_feedback(text: string, context?: { source?: string; customer?: string }): Promise<{
    analysis: FeedbackAnalysis;
    provider: 'groq' | 'local';
  }> {
    return await aiService.analyzeFeedback(text, context);
  },

  /**
   * Tool: retain_memory
   * Retains structured feedback into Hindsight (or local memory provider fallback)
   */
  async retain_memory(feedback: FeedbackItem): Promise<{
    success: boolean;
    provider: 'hindsight' | 'local';
    memoryId: string;
    error?: string;
  }> {
    const memoryContent = `Customer feedback:

Source: ${feedback.source}
Date: ${feedback.created_at.slice(0, 10)}
Topic: ${feedback.topic}
Problem: ${feedback.problem || feedback.subcategory || feedback.topic}
Sentiment: ${feedback.sentiment}
Customer: ${feedback.customer || 'Anonymous'}

Original feedback:
"${feedback.feedback_text}"`;

    return await memoryService.retainFeedback({
      content: memoryContent,
      document_id: `hindsight_doc_${feedback.id}`,
      metadata: {
        source: feedback.source,
        source_id: feedback.source_id,
        feedback_id: feedback.id,
        date: feedback.created_at.slice(0, 10),
        topic: feedback.topic,
        subcategory: feedback.subcategory,
        sentiment: feedback.sentiment,
        sentiment_score: feedback.sentiment_score,
        customer_id: feedback.customer_id,
        customer: feedback.customer,
        problem: feedback.problem,
      },
      tags: [
        feedback.topic.toLowerCase(),
        feedback.source.toLowerCase().replace(/\s+/g, '_'),
        feedback.sentiment,
        'customer_feedback',
      ],
    });
  },

  /**
   * Tool: recall_memory
   * Performs semantic recall from Hindsight (or local memory provider fallback)
   */
  async recall_memory(query: string, tags?: string[], limit = 8): Promise<{
    success: boolean;
    provider: 'hindsight' | 'local';
    memories: MemoryItem[];
    error?: string;
  }> {
    return await memoryService.recallFeedback({ query, tags, limit });
  },

  /**
   * Tool: find_related_feedback
   * Retrieves past feedback items that share topic or keywords
   */
  find_related_feedback(topic: string, keywords: string[] = []): FeedbackItem[] {
    const all = getAllFeedback();
    const t = topic.toLowerCase();
    return all.filter(item => {
      if (item.topic.toLowerCase() === t) return true;
      if (keywords.some(k => item.keywords.some(ik => ik.toLowerCase() === k.toLowerCase()))) return true;
      return false;
    });
  },

  /**
   * Tool: get_feedback_timeline
   * Generates a chronological timeline of feedback for a topic or cluster
   */
  get_feedback_timeline(feedbacks: FeedbackItem[]): Array<{
    date: string;
    source: string;
    customer: string;
    feedback_text: string;
    sentiment: string;
  }> {
    return [...feedbacks]
      .sort((a, b) => a.created_timestamp - b.created_timestamp)
      .map(f => ({
        date: f.created_at.slice(0, 10),
        source: f.source,
        customer: f.customer || 'Anonymous',
        feedback_text: f.feedback_text,
        sentiment: f.sentiment,
      }));
  },

  /**
   * Tool: get_complaint_history
   * Retrieves all recorded recurring complaint clusters
   */
  get_complaint_history(): ComplaintCluster[] {
    return getAllComplaintClusters();
  },

  /**
   * Tool: get_cross_channel_feedback
   * Checks distribution across different sources for a set of feedback items
   */
  get_cross_channel_feedback(feedbacks: FeedbackItem[]): {
    channels: string[];
    channelCounts: Record<string, number>;
    isCrossChannel: boolean;
  } {
    const channelCounts: Record<string, number> = {};
    for (const fb of feedbacks) {
      channelCounts[fb.source] = (channelCounts[fb.source] || 0) + 1;
    }
    const channels = Object.keys(channelCounts);
    return {
      channels,
      channelCounts,
      isCrossChannel: channels.length > 1,
    };
  },

  /**
   * Tool: save_cluster
   * Updates or inserts a complaint cluster
   */
  save_cluster(cluster: ComplaintCluster): void {
    upsertComplaintCluster(cluster);
  },

  /**
   * Tool: get_cluster_by_id
   */
  get_cluster_by_id(id: string): ComplaintCluster | null {
    return getComplaintClusterById(id);
  },
};
