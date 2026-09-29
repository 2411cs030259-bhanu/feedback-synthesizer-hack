import type { FeedbackAnalysis, MemoryItem, ComplaintCluster } from '../../src/types/feedback.js';

const POSITIVE_WORDS = ['great', 'love', 'excellent', 'amazing', 'good', 'smooth', 'helpful', 'fast', 'awesome', 'intuitive', 'easy', 'perfect'];
const NEGATIVE_WORDS = ['confusing', 'confused', 'difficult', 'struggle', 'struggling', 'slow', 'lag', 'bad', 'poor', 'unclear', 'missing', 'broken', 'fail', 'hard', 'stuck', 'frustrating', 'expensive', 'useless', 'terrible', 'crash', 'freeze', 'unable', 'cannot', "can't", "don't understand"];
const CRITICAL_WORDS = ['crash', 'freeze', 'unusable', 'critical', 'data loss', 'down', 'broken completely', 'urgent', 'disaster'];
const HIGH_WORDS = ['blocking', 'cannot work', 'impossible', 'major issue', 'very slow', 'stuck', 'completely lost'];

const TOPIC_RULES: Array<{
  topic: string;
  subcategory: string;
  keywords: string[];
  patterns: RegExp[];
  problemTemplate: (text: string) => string;
}> = [
  {
    topic: 'onboarding',
    subcategory: 'getting_started',
    keywords: ['onboarding', 'setup', 'getting started', 'initial setup', 'tutorial', 'instructions', 'walkthrough'],
    patterns: [/onboard/i, /setup/i, /set up/i, /get started/i, /getting started/i, /start using/i, /how to start/i, /initial step/i, /walkthrough/i],
    problemTemplate: () => 'Users experience friction and confusion during initial setup and onboarding',
  },
  {
    topic: 'performance',
    subcategory: 'speed_latency',
    keywords: ['performance', 'slow', 'latency', 'lag', 'loading', 'timeout', 'dataset', 'freeze'],
    patterns: [/slow/i, /lag/i, /latency/i, /loading/i, /speed/i, /unresponsive/i, /freeze/i, /spinning/i, /load time/i],
    problemTemplate: () => 'System exhibits high latency and sluggish load times, especially with large datasets',
  },
  {
    topic: 'export',
    subcategory: 'file_export',
    keywords: ['export', 'csv', 'pdf', 'download', 'excel', 'data dump', 'extract'],
    patterns: [/export/i, /csv/i, /pdf/i, /download/i, /excel/i, /extract data/i],
    problemTemplate: () => 'Missing or inadequate data export options for CSV, PDF, and reports',
  },
  {
    topic: 'pricing',
    subcategory: 'tier_limits',
    keywords: ['pricing', 'price', 'tier', 'cost', 'expensive', 'subscription', 'billing', 'seat'],
    patterns: [/pric/i, /tier/i, /cost/i, /subscription/i, /billing/i, /expensive/i, /plan limit/i],
    problemTemplate: () => 'Confusion or dissatisfaction regarding pricing tiers, feature gating, or seat limits',
  },
  {
    topic: 'documentation',
    subcategory: 'api_docs',
    keywords: ['documentation', 'docs', 'api', 'readme', 'examples', 'manual', 'reference'],
    patterns: [/doc/i, /api doc/i, /readme/i, /manual/i, /examples/i, /reference/i, /sdk/i],
    problemTemplate: () => 'Incomplete or unclear documentation and missing API integration code examples',
  },
  {
    topic: 'ui',
    subcategory: 'navigation',
    keywords: ['ui', 'interface', 'layout', 'design', 'navigation', 'dark mode', 'button'],
    patterns: [/ui/i, /ux/i, /interface/i, /menu/i, /layout/i, /navigation/i, /button/i, /dark mode/i],
    problemTemplate: () => 'User interface layout, navigation flow, or styling concerns',
  },
];

export class LocalTemplateProvider {
  public async checkHealth(): Promise<{ connected: boolean; message: string; model: string }> {
    return {
      connected: true,
      message: 'Local Template Engine active (deterministic fallback)',
      model: 'local-template-v1',
    };
  }

  public async analyzeFeedback(text: string, _context?: { source?: string; customer?: string }): Promise<FeedbackAnalysis> {
    const lower = text.toLowerCase();

    // Sentiment calculation
    let posCount = 0;
    let negCount = 0;
    for (const w of POSITIVE_WORDS) {
      if (lower.includes(w)) posCount++;
    }
    for (const w of NEGATIVE_WORDS) {
      if (lower.includes(w)) negCount++;
    }

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let sentimentScore = 0;

    if (negCount > posCount) {
      sentiment = 'negative';
      sentimentScore = Math.max(-1.0, -0.35 - 0.15 * negCount);
    } else if (posCount > negCount) {
      sentiment = 'positive';
      sentimentScore = Math.min(1.0, 0.35 + 0.15 * posCount);
    } else {
      sentiment = 'neutral';
      sentimentScore = 0.0;
    }

    // Urgency calculation
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (CRITICAL_WORDS.some(w => lower.includes(w))) {
      urgency = 'critical';
    } else if (HIGH_WORDS.some(w => lower.includes(w))) {
      urgency = 'high';
    } else if (sentiment === 'positive') {
      urgency = 'low';
    }

    // Topic classification
    let matchedTopic = 'general';
    let matchedSubcategory = 'general_feedback';
    let matchedKeywords: string[] = [];
    let problem = text.slice(0, 120);

    for (const rule of TOPIC_RULES) {
      if (rule.patterns.some(p => p.test(lower))) {
        matchedTopic = rule.topic;
        matchedSubcategory = rule.subcategory;
        matchedKeywords = [...rule.keywords];
        problem = rule.problemTemplate(text);
        break;
      }
    }

    // Extract dynamic keywords
    const words = text
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'been', 'there', 'what', 'when', 'will'].includes(w.toLowerCase()));

    const uniqueKeywords = Array.from(new Set([...matchedKeywords, ...words.slice(0, 4)]));

    const needsHistoricalContext = sentiment !== 'positive' || matchedTopic !== 'general';

    return {
      sentiment,
      sentiment_score: Number(sentimentScore.toFixed(2)),
      topic: matchedTopic,
      subcategory: matchedSubcategory,
      problem,
      keywords: uniqueKeywords.slice(0, 6),
      urgency,
      needsHistoricalContext,
      reasoning: `Categorized as '${matchedTopic}' based on lexical terms with ${sentiment} sentiment.`,
    };
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
  }> {
    if (!recalledMemories || recalledMemories.length === 0) {
      return {
        isRecurring: false,
        clusterTitle: `${currentFeedback.topic} feedback`,
        description: `Single occurrence of feedback regarding ${currentFeedback.topic}.`,
        sentimentTrend: 'Isolated feedback',
        explanation: 'No relevant historical memories were found in the memory bank.',
        relatedMemoryIds: [],
      };
    }

    // Check which recalled memories share the same topic or semantic cluster
    const currentTopic = currentFeedback.topic.toLowerCase();
    const related = recalledMemories.filter(m => {
      const memTopic = (m.metadata?.topic || '').toLowerCase();
      const memText = m.content.toLowerCase();
      return (
        memTopic === currentTopic ||
        memText.includes(currentTopic) ||
        (currentTopic === 'onboarding' && (memText.includes('setup') || memText.includes('started') || memText.includes('onboard'))) ||
        (currentTopic === 'performance' && (memText.includes('slow') || memText.includes('lag') || memText.includes('loading'))) ||
        (currentTopic === 'export' && (memText.includes('export') || memText.includes('csv') || memText.includes('pdf'))) ||
        (m.score && m.score > 0.45)
      );
    });

    const isRecurring = related.length >= 1;
    const channels = Array.from(new Set([currentFeedback.source, ...related.map(m => m.metadata?.source).filter(Boolean)]));

    let title = `${currentFeedback.topic.charAt(0).toUpperCase() + currentFeedback.topic.slice(1)} Friction`;
    if (currentTopic === 'onboarding') title = 'Onboarding & Initial Setup Confusion';
    if (currentTopic === 'performance') title = 'Dashboard Query Latency & Sluggish Performance';
    if (currentTopic === 'export') title = 'Missing Export Functionality (CSV / PDF)';
    if (currentTopic === 'pricing') title = 'Pricing Tier Structure & Feature Gating Confusion';
    if (currentTopic === 'documentation') title = 'API Documentation & Code Example Gaps';

    const desc = isRecurring
      ? `Persistent issue with ${related.length + 1} occurrences observed across ${channels.length} channels (${channels.join(', ')}). Multiple users report difficulty with ${currentFeedback.problem.toLowerCase()}.`
      : `Single occurrence regarding ${currentFeedback.topic}.`;

    const trend = channels.length > 1
      ? 'Cross-channel recurring friction'
      : related.length >= 3
      ? 'Escalating recurring complaints'
      : 'Repeated negative feedback';

    const explanation = isRecurring
      ? `Found ${related.length} relevant historical experiences dating back to earlier records. Connected to current feedback from ${currentFeedback.source}.`
      : 'Recalled items did not meet recurrence threshold.';

    return {
      isRecurring,
      clusterTitle: title,
      description: desc,
      sentimentTrend: trend,
      explanation,
      relatedMemoryIds: related.map(m => m.id),
    };
  }

  public async answerInvestigation(
    question: string,
    recalledMemories: MemoryItem[],
    clusters: ComplaintCluster[]
  ): Promise<{
    answer: string;
    evidence: Array<{ source: string; date: string; quote: string; customer?: string; relevance: string }>;
  }> {
    if (!recalledMemories || recalledMemories.length === 0) {
      return {
        answer: 'No relevant historical feedback was found for your inquiry in the memory bank.',
        evidence: [],
      };
    }

    const qLower = question.toLowerCase();

    // Check relevant cluster
    let matchedCluster = clusters.find(c => {
      const titleLower = c.title.toLowerCase();
      return (
        (qLower.includes('onboard') && titleLower.includes('onboard')) ||
        (qLower.includes('performance') && titleLower.includes('performance')) ||
        (qLower.includes('slow') && titleLower.includes('performance')) ||
        (qLower.includes('export') && titleLower.includes('export')) ||
        (qLower.includes('pric') && titleLower.includes('pric')) ||
        (qLower.includes('doc') && titleLower.includes('doc'))
      );
    });

    if (!matchedCluster && clusters.length > 0) {
      // Pick highest occurrence cluster if general query
      matchedCluster = clusters[0];
    }

    const evidence = recalledMemories.slice(0, 6).map(m => ({
      source: m.metadata?.source || 'Support',
      date: m.metadata?.date || m.created_at.slice(0, 10),
      customer: m.metadata?.customer || 'Customer',
      quote: m.content.replace(/^Customer feedback:\s*/i, '').trim(),
      relevance: `Matches historical problem: ${m.metadata?.problem || m.metadata?.topic || 'User feedback'}`,
    }));

    const sources = Array.from(new Set(evidence.map(e => e.source)));
    const dates = evidence.map(e => e.date).sort();
    const firstDate = dates[0] || 'earlier this year';
    const lastDate = dates[dates.length - 1] || 'recently';

    let answer = '';
    if (qLower.includes('onboard') || (matchedCluster && matchedCluster.title.toLowerCase().includes('onboard'))) {
      answer = `Yes. Related onboarding complaints were identified across ${sources.length} distinct channels (${sources.join(', ')}). The earliest recorded issue appeared on ${firstDate}, and similar complaints continued through ${lastDate}. Users consistently report difficulty understanding initial setup steps and navigating early workflow setup.`;
    } else if (qLower.includes('recurring') || qLower.includes('keep coming back')) {
      answer = `Analysis of recalled memory reveals ${clusters.length} active recurring problem clusters. The most prominent recurring issue is "${matchedCluster?.title || 'System Usability'}" with ${matchedCluster?.occurrence_count || evidence.length} recorded complaints spanning from ${firstDate} to ${lastDate} across ${sources.join(', ')}.`;
    } else if (qLower.includes('cross-channel') || qLower.includes('multiple channels')) {
      answer = `Yes. Several issues span multiple customer touchpoints. Specifically, ${sources.join(', ')} channels share related complaints. The agent traced recurring pain points from sales conversations and product reviews into support tickets over time.`;
    } else if (qLower.includes('oldest') || qLower.includes('unresolved')) {
      answer = `The oldest documented complaint cluster dates back to ${firstDate}, involving ${evidence[0]?.source || 'Support'} feedback regarding ${matchedCluster?.title || 'initial workflow configuration'}. Despite recurring mentions up to ${lastDate}, this issue remains active.`;
    } else {
      answer = `Based on ${recalledMemories.length} recalled memory records from the memory bank, users have reported issues spanning from ${firstDate} to ${lastDate} across ${sources.join(', ')}. Below is the verifiable evidence retrieved from memory.`;
    }

    return {
      answer,
      evidence,
    };
  }

  public async extractFromTranscript(transcriptText: string): Promise<Array<{
    customer: string;
    source: string;
    feedback_text: string;
    date?: string;
  }>> {
    const lines = transcriptText.split('\n').map(l => l.trim()).filter(Boolean);
    const results: Array<{ customer: string; source: string; feedback_text: string; date?: string }> = [];

    let currentCustomer = 'Participant';
    let currentSource = 'Interview';

    for (const line of lines) {
      // Check for date pattern
      const dateMatch = line.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
      const date = dateMatch ? dateMatch[1] : undefined;

      // Check speaker syntax: "Customer:", "Speaker 1:", "Rahul (Support):"
      const speakerMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (speakerMatch) {
        const rawSpeaker = speakerMatch[1].trim();
        const text = speakerMatch[2].trim();

        if (rawSpeaker.toLowerCase().includes('sales')) {
          currentSource = 'Sales';
          currentCustomer = rawSpeaker.replace(/sales/i, '').replace(/[()]/g, '').trim() || 'Prospect';
        } else if (rawSpeaker.toLowerCase().includes('support') || rawSpeaker.toLowerCase().includes('agent')) {
          currentSource = 'Support';
          currentCustomer = rawSpeaker.replace(/support/i, '').replace(/[()]/g, '').trim() || 'User';
        } else {
          currentCustomer = rawSpeaker;
          currentSource = 'Interview';
        }

        // Only include if statement has substance
        if (text.length > 15) {
          results.push({
            customer: currentCustomer,
            source: currentSource,
            feedback_text: text,
            date,
          });
        }
      } else if (line.length > 25 && !line.startsWith('#') && !line.startsWith('//')) {
        results.push({
          customer: currentCustomer,
          source: currentSource,
          feedback_text: line.replace(/^[-*•]\s*/, ''),
          date,
        });
      }
    }

    return results.slice(0, 15);
  }
}
