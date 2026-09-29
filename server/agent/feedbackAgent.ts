import crypto from 'node:crypto';
import { agentTools } from './agentTools.js';
import { AgentPlanner } from './agentPlanner.js';
import { createNormalizedFeedback } from '../services/feedbackService.js';
import { insertAgentRun, getAllComplaintClusters } from '../database/db.js';
import type {
  FeedbackItem,
  ComplaintCluster,
  MemoryItem,
  AgentActivityRun,
  InvestigationResult,
} from '../../src/types/feedback.js';

export interface ProcessFeedbackResult {
  feedback: FeedbackItem;
  analysis: any;
  recalledMemories: MemoryItem[];
  isRecurring: boolean;
  cluster: ComplaintCluster | null;
  insight: string;
  retained: { success: boolean; memoryId?: string; provider: string };
  timeline: Array<{ date: string; source: string; customer: string; feedback_text: string }>;
  agentSteps: AgentActivityRun[];
  aiMode: 'groq' | 'local';
  memoryMode: 'hindsight' | 'local';
}

export class FeedbackAgent {
  private planner: AgentPlanner;

  constructor() {
    this.planner = new AgentPlanner();
  }

  private logStep(
    action: AgentActivityRun['action'],
    status: AgentActivityRun['status'],
    details: Record<string, any>,
    feedbackId?: string
  ): AgentActivityRun {
    const run: AgentActivityRun = {
      id: `run_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      feedback_id: feedbackId,
      action,
      status,
      created_at: new Date().toISOString(),
      details,
    };
    insertAgentRun(run);
    return run;
  }

  /**
   * Main Agent Loop for Ingesting and Synthesizing Feedback:
   * OBSERVE -> UNDERSTAND -> DECIDE -> RECALL -> REASON -> DETECT -> RETAIN -> INSIGHT
   */
  public async processFeedback(rawInput: {
    id?: string;
    source?: string;
    source_id?: string;
    customer?: string;
    customer_id?: string;
    feedback_text: string;
    created_at?: string;
  }): Promise<ProcessFeedbackResult> {
    const steps: AgentActivityRun[] = [];

    // Step 1: OBSERVE
    const observeStep = this.logStep('OBSERVE', 'SUCCESS', {
      message: `Received incoming feedback via ${rawInput.source || 'Support'} channel.`,
      text_preview: rawInput.feedback_text.slice(0, 100),
      customer: rawInput.customer || 'Anonymous',
    });
    steps.push(observeStep);

    // Step 2: UNDERSTAND (Groq / Local analysis)
    const { analysis, provider: aiProvider } = await agentTools.analyze_feedback(rawInput.feedback_text, {
      source: rawInput.source,
      customer: rawInput.customer,
    });

    // Create normalized feedback in DB
    const feedback = createNormalizedFeedback(rawInput, analysis);

    const understandStep = this.logStep(
      'UNDERSTAND',
      aiProvider === 'groq' ? 'SUCCESS' : 'FALLBACK',
      {
        message: `Extracted sentiment: ${analysis.sentiment} (${analysis.sentiment_score}), Topic: ${analysis.topic}, Subcategory: ${analysis.subcategory}.`,
        problem: analysis.problem,
        keywords: analysis.keywords,
        urgency: analysis.urgency,
        model: aiProvider === 'groq' ? 'Groq llama-3.3-70b-versatile' : 'Local Template Provider',
      },
      feedback.id
    );
    steps.push(understandStep);

    // Step 3: DECIDE
    const decision = this.planner.evaluateMemoryRelevance(analysis, feedback.feedback_text);
    const decideStep = this.logStep(
      'DECIDE',
      'SUCCESS',
      {
        message: decision.shouldRecall
          ? `Historical memory is relevant: ${decision.reason}`
          : `Skipping memory recall: ${decision.reason}`,
        shouldRecall: decision.shouldRecall,
        query: decision.recallQuery,
      },
      feedback.id
    );
    steps.push(decideStep);

    // Step 4: RECALL (Hindsight / Local Memory)
    let recalledMemories: MemoryItem[] = [];
    let memoryProvider: 'hindsight' | 'local' = 'local';

    if (decision.shouldRecall) {
      const recallResult = await agentTools.recall_memory(
        decision.recallQuery,
        [analysis.topic, feedback.source.toLowerCase().replace(/\s+/g, '_')],
        8
      );
      memoryProvider = recallResult.provider;
      recalledMemories = recallResult.memories;

      const recallStep = this.logStep(
        'RECALL',
        recallResult.provider === 'hindsight' ? 'SUCCESS' : 'FALLBACK',
        {
          message: recallResult.provider === 'hindsight'
            ? `Hindsight RECALL retrieved ${recalledMemories.length} relevant historical experiences.`
            : `Hindsight offline. Local Memory RECALL retrieved ${recalledMemories.length} relevant historical memories.`,
          recalled_count: recalledMemories.length,
          query: decision.recallQuery,
          provider: recallResult.provider,
          error: recallResult.error,
          top_memories: recalledMemories.slice(0, 3).map(m => ({
            id: m.id,
            score: m.score,
            source: m.metadata?.source,
            date: m.metadata?.date || m.created_at,
            content: m.content.slice(0, 100),
          })),
        },
        feedback.id
      );
      steps.push(recallStep);
    } else {
      const skipRecallStep = this.logStep(
        'RECALL',
        'SKIPPED',
        { message: 'Recall skipped per planner decision.' },
        feedback.id
      );
      steps.push(skipRecallStep);
    }

    // Step 5: REASON & Step 6: DETECT
    const clusterResult = await this.planner.reasonAndCluster(feedback, recalledMemories);

    const reasonStep = this.logStep(
      'REASON',
      clusterResult.aiProvider === 'groq' ? 'SUCCESS' : 'FALLBACK',
      {
        message: `Agent compared historical memories with current feedback: ${clusterResult.explanation}`,
        recurring_detected: clusterResult.isRecurring,
        cluster_title: clusterResult.cluster?.title,
        occurrences: clusterResult.cluster?.occurrence_count || 1,
        channels: clusterResult.cluster?.sources || [feedback.source],
      },
      feedback.id
    );
    steps.push(reasonStep);

    const detectStep = this.logStep(
      'DETECT',
      clusterResult.isRecurring ? 'SUCCESS' : 'SKIPPED',
      {
        message: clusterResult.isRecurring
          ? `Detected Recurring Complaint: "${clusterResult.cluster?.title}" (${clusterResult.cluster?.occurrence_count} occurrences across ${clusterResult.cluster?.source_count} channels).`
          : 'No recurring pattern detected; classified as single isolated feedback.',
        cluster_id: clusterResult.cluster?.id,
        first_seen: clusterResult.cluster?.first_seen,
        last_seen: clusterResult.cluster?.last_seen,
      },
      feedback.id
    );
    steps.push(detectStep);

    // Step 7: RETAIN (Persist into Hindsight)
    const retainResult = await agentTools.retain_memory(feedback);
    const retainStep = this.logStep(
      'RETAIN',
      retainResult.provider === 'hindsight' ? 'SUCCESS' : 'FALLBACK',
      {
        message: retainResult.provider === 'hindsight'
          ? `Hindsight RETAIN succeeded. Memory persisted to bank with metadata tags.`
          : `Retained in Local Memory fallback store (${retainResult.error || 'Hindsight offline'}).`,
        memoryId: retainResult.memoryId,
        provider: retainResult.provider,
        topic: feedback.topic,
        sentiment: feedback.sentiment,
      },
      feedback.id
    );
    steps.push(retainStep);

    // Step 8: INSIGHT
    let insight = '';
    if (clusterResult.isRecurring && clusterResult.cluster) {
      const c = clusterResult.cluster;
      insight = `Recurring issue detected: "${c.title}". First observed on ${c.first_seen}, now reported ${c.occurrence_count} times across ${c.sources.join(', ')}. Trend indicates ${c.sentiment_trend.toLowerCase()}.`;
    } else {
      insight = `New feedback recorded under topic '${feedback.topic}'. Retained in persistent memory bank for future cross-reference.`;
    }

    const insightStep = this.logStep(
      'INSIGHT',
      'SUCCESS',
      {
        message: insight,
        cluster_id: clusterResult.cluster?.id,
        is_recurring: clusterResult.isRecurring,
      },
      feedback.id
    );
    steps.push(insightStep);

    // Build timeline for this topic
    const relatedFeedbacks = agentTools.find_related_feedback(feedback.topic);
    const timeline = agentTools.get_feedback_timeline(relatedFeedbacks);

    return {
      feedback,
      analysis,
      recalledMemories,
      isRecurring: clusterResult.isRecurring,
      cluster: clusterResult.cluster,
      insight,
      retained: {
        success: retainResult.success,
        memoryId: retainResult.memoryId,
        provider: retainResult.provider,
      },
      timeline,
      agentSteps: steps,
      aiMode: aiProvider,
      memoryMode: memoryProvider,
    };
  }

  /**
   * Natural Language Investigation Flow:
   * Interprets question -> Hindsight RECALL -> Agent Reasoning -> Evidence-based answer
   */
  public async investigate(question: string): Promise<InvestigationResult> {
    const qTrimmed = question.trim();

    // 1. Interpret question into memory search query
    let queryTopic = 'onboarding';
    const qLower = qTrimmed.toLowerCase();
    if (qLower.includes('onboard') || qLower.includes('setup') || qLower.includes('start')) queryTopic = 'onboarding getting started';
    else if (qLower.includes('slow') || qLower.includes('performance') || qLower.includes('lag')) queryTopic = 'performance slow latency';
    else if (qLower.includes('export') || qLower.includes('csv') || qLower.includes('pdf')) queryTopic = 'export csv download';
    else if (qLower.includes('pric') || qLower.includes('cost') || qLower.includes('tier')) queryTopic = 'pricing subscription cost';
    else if (qLower.includes('doc') || qLower.includes('api')) queryTopic = 'documentation api guide';
    else queryTopic = qTrimmed;

    // 2. Hindsight RECALL
    const recallResult = await agentTools.recall_memory(queryTopic, undefined, 10);
    const recalledMemories = recallResult.memories;

    // 3. Retrieve clusters
    const clusters = getAllComplaintClusters();

    // 4. Reason with AI service
    const { answer, evidence, provider: aiProvider } = await agentTools.analyze_feedback(qTrimmed)
      .then(() => agentTools.recall_memory(queryTopic))
      .then(async () => {
        const { aiService } = await import('../services/aiService.js');
        return await aiService.answerInvestigation(qTrimmed, recalledMemories, clusters);
      });

    // Extract channels from evidence
    const channelsSet = new Set<string>();
    for (const ev of evidence) {
      if (ev.source) channelsSet.add(ev.source);
    }
    for (const mem of recalledMemories) {
      if (mem.metadata?.source) channelsSet.add(mem.metadata.source);
    }

    const dates = evidence.map(e => e.date).filter(Boolean).sort();

    // Log the investigation
    this.logStep(
      'INVESTIGATE',
      'SUCCESS',
      {
        question: qTrimmed,
        interpreted_query: queryTopic,
        recalled_count: recalledMemories.length,
        evidence_count: evidence.length,
        aiProvider,
        memoryProvider: recallResult.provider,
      }
    );

    return {
      question: qTrimmed,
      interpretedQuery: queryTopic,
      relevantFound: recalledMemories.length > 0 || evidence.length > 0,
      recalledCount: recalledMemories.length,
      recalledMemories,
      recurringIssueIdentified: evidence.length >= 2,
      clusterTitle: clusters.find(c => c.sources.some(s => channelsSet.has(s)))?.title,
      answer,
      firstObserved: dates[0] || 'Unknown',
      latestObserved: dates[dates.length - 1] || 'Unknown',
      channels: Array.from(channelsSet),
      evidence,
      aiMode: aiProvider,
      memoryMode: recallResult.provider,
    };
  }
}

export const feedbackAgent = new FeedbackAgent();
