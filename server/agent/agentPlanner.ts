import { agentTools } from './agentTools.js';
import { aiService } from '../services/aiService.js';
import type { FeedbackItem, FeedbackAnalysis, MemoryItem, ComplaintCluster } from '../../src/types/feedback.js';

export interface PlanDecision {
  shouldRecall: boolean;
  recallQuery: string;
  reason: string;
}

export class AgentPlanner {
  /**
   * Evaluates if historical memory is relevant for this feedback item.
   * Skips memory recall for pure praise/positive feedback that contains no feature request or complaint.
   */
  public evaluateMemoryRelevance(analysis: FeedbackAnalysis, text: string): PlanDecision {
    if (analysis.sentiment === 'positive' && !analysis.needsHistoricalContext) {
      return {
        shouldRecall: false,
        recallQuery: '',
        reason: 'Positive praise with no recorded product friction. Memory recall not required.',
      };
    }

    const queryParts = [analysis.topic, analysis.subcategory, analysis.problem]
      .filter(Boolean)
      .join(' ');

    return {
      shouldRecall: true,
      recallQuery: queryParts || text.slice(0, 80),
      reason: `Negative or neutral feedback in '${analysis.topic}' category. Recalling historical context from memory bank.`,
    };
  }

  /**
   * Compares the current feedback against recalled memories and existing clusters.
   */
  public async reasonAndCluster(
    currentFeedback: FeedbackItem,
    recalledMemories: MemoryItem[]
  ): Promise<{
    isRecurring: boolean;
    cluster: ComplaintCluster | null;
    explanation: string;
    aiProvider: 'groq' | 'local';
  }> {
    const topic = currentFeedback.topic.toLowerCase();
    const existingClusters = agentTools.get_complaint_history();

    // Check if an existing cluster matches this topic
    const existingCluster = existingClusters.find(c => {
      const cTitle = c.title.toLowerCase();
      const cId = c.id.toLowerCase();
      return cId.includes(topic) || cTitle.includes(topic);
    });

    // Call AI service to reason over memories
    const reasoning = await aiService.reasonOverMemories(
      {
        text: currentFeedback.feedback_text,
        topic: currentFeedback.topic,
        problem: currentFeedback.problem || currentFeedback.feedback_text,
        source: currentFeedback.source,
        date: currentFeedback.created_at.slice(0, 10),
      },
      recalledMemories
    );

    // Determine recurrence:
    // It's recurring if AI says so, or if there are 2+ items on this topic in DB,
    // or if an existing cluster has previous items, or if related memories were retrieved.
    const relatedFeedbacksInDb = agentTools.find_related_feedback(currentFeedback.topic);
    const isRecurring = reasoning.isRecurring ||
      relatedFeedbacksInDb.length >= 2 ||
      (existingCluster !== undefined && existingCluster.occurrence_count >= 1) ||
      recalledMemories.length >= 1;

    if (!isRecurring && recalledMemories.length === 0 && !existingCluster && relatedFeedbacksInDb.length < 2) {
      return {
        isRecurring: false,
        cluster: null,
        explanation: 'First observed instance of this feedback topic. No previous recurring pattern detected.',
        aiProvider: reasoning.provider,
      };
    }

    // Build or update the cluster dynamically from actual data
    const clusterId = existingCluster?.id || `cluster_${topic.replace(/\s+/g, '_')}`;
    const allLinkedIds = new Set<string>(existingCluster?.feedback_ids || []);
    allLinkedIds.add(currentFeedback.id);

    // Also include any feedback IDs referenced in recalled memories
    for (const mem of recalledMemories) {
      if (mem.metadata?.feedback_id) {
        allLinkedIds.add(mem.metadata.feedback_id);
      }
    }

    const linkedFeedbacks = agentTools.find_related_feedback(currentFeedback.topic);
    for (const fb of linkedFeedbacks) {
      allLinkedIds.add(fb.id);
    }

    // Retrieve all linked items to compute real statistics
    const finalFeedbacks = Array.from(allLinkedIds)
      .map(id => agentTools.get_feedback_timeline([currentFeedback])[0] ? currentFeedback : null)
      .filter(Boolean); // helper

    const allRelatedItems = agentTools.find_related_feedback(currentFeedback.topic);
    if (!allRelatedItems.some(i => i.id === currentFeedback.id)) {
      allRelatedItems.push(currentFeedback);
    }

    // Sort by timestamp
    allRelatedItems.sort((a, b) => a.created_timestamp - b.created_timestamp);

    const firstSeen = allRelatedItems[0]?.created_at.slice(0, 10) || currentFeedback.created_at.slice(0, 10);
    const lastSeen = allRelatedItems[allRelatedItems.length - 1]?.created_at.slice(0, 10) || currentFeedback.created_at.slice(0, 10);

    const sourcesSet = new Set<string>(allRelatedItems.map(f => f.source));
    const sources = Array.from(sourcesSet);

    const cluster: ComplaintCluster = {
      id: clusterId,
      title: existingCluster?.title || reasoning.clusterTitle,
      description: reasoning.description,
      first_seen: firstSeen,
      last_seen: lastSeen,
      occurrence_count: allRelatedItems.length,
      source_count: sources.length,
      sources,
      sentiment_trend: sources.length > 1
        ? 'Repeated cross-channel feedback'
        : reasoning.sentimentTrend,
      feedback_ids: allRelatedItems.map(f => f.id),
      feedbacks: allRelatedItems,
    };

    // Save cluster to database
    agentTools.save_cluster(cluster);

    return {
      isRecurring: true,
      cluster,
      explanation: reasoning.explanation,
      aiProvider: reasoning.provider,
    };
  }
}
