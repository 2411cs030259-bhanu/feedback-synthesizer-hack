import Groq from 'groq-sdk';
import type { FeedbackAnalysis, MemoryItem, ComplaintCluster } from '../../src/types/feedback.js';

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']+|["']+$/g, '').trim();
}

export class GroqProvider {
  private client: Groq | null = null;
  private model: string;
  private isVerified = false;
  private lastVerification = 0;

  constructor() {
    const apiKey = cleanEnv(process.env.GROQ_API_KEY);
    this.model = cleanEnv(process.env.GROQ_MODEL) || 'llama-3.3-70b-versatile';
    if (apiKey) {
      try {
        this.client = new Groq({ apiKey });
      } catch (err) {
        console.warn('Failed to initialize Groq client:', err);
        this.client = null;
      }
    }
  }

  public async checkHealth(): Promise<{ connected: boolean; message: string; model: string }> {
    if (!this.client) {
      return {
        connected: false,
        message: 'GROQ_API_KEY is not configured in environment',
        model: this.model,
      };
    }

    const now = Date.now();
    if (this.isVerified && now - this.lastVerification < 30000) {
      return { connected: true, message: `Groq API active with ${this.model}`, model: this.model };
    }

    try {
      const resp = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5,
      });

      if (resp.choices && resp.choices.length > 0) {
        this.isVerified = true;
        this.lastVerification = now;
        return { connected: true, message: `Groq connected with ${this.model}`, model: this.model };
      }
    } catch (err: any) {
      if (err.message?.includes('model_not_found') || err.status === 404) {
        try {
          const modelsList = await this.client.models.list();
          const chatCandidates = modelsList.data
            .map(m => m.id)
            .filter(id => !id.includes('whisper') && !id.includes('guard'));

          const preferred =
            chatCandidates.find(id => id.includes('qwen') || id.includes('gpt-oss') || id.includes('llama')) ||
            chatCandidates[0];

          if (preferred) {
            this.model = preferred;
            const retryResp = await this.client.chat.completions.create({
              model: this.model,
              messages: [{ role: 'user', content: 'Ping' }],
              max_tokens: 5,
            });

            if (retryResp.choices && retryResp.choices.length > 0) {
              this.isVerified = true;
              this.lastVerification = now;
              return {
                connected: true,
                message: `Groq connected with auto-selected model: ${this.model}`,
                model: this.model,
              };
            }
          }
        } catch (discoverErr: any) {
          console.warn('Groq model auto-discovery failed:', discoverErr);
        }
      }

      this.isVerified = false;
      return {
        connected: false,
        message: `Groq error: ${err.message || 'verification failed'}`,
        model: this.model,
      };
    }

    return { connected: false, message: 'Groq returned no completions', model: this.model };
  }

  private cleanJson(raw: string): any {
    const stripped = raw
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // 1. Direct parse attempt
    try {
      return JSON.parse(stripped);
    } catch {
      // 2. Exact bounds parse
      const firstObj = stripped.indexOf('{');
      const lastObj = stripped.lastIndexOf('}');
      if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
        try {
          return JSON.parse(stripped.substring(firstObj, lastObj + 1));
        } catch {
          // continue
        }
      }

      const firstArr = stripped.indexOf('[');
      const lastArr = stripped.lastIndexOf(']');
      if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
        try {
          return JSON.parse(stripped.substring(firstArr, lastArr + 1));
        } catch {
          // continue
        }
      }

      // 3. Auto-repair truncated or partial JSON
      const repaired = this.repairJson(stripped);
      if (repaired !== null) {
        return repaired;
      }

      // 4. Return empty fallback object rather than throwing fatal error
      return {};
    }
  }

  private repairJson(str: string): any {
    if (!str.includes('{') && !str.includes('[')) {
      return null;
    }

    let candidate = str;
    const startIdx = candidate.indexOf('{');
    if (startIdx !== -1) {
      candidate = candidate.slice(startIdx);
    }

    candidate = candidate.replace(/,\s*([\]}])/g, '$1');

    let inString = false;
    let quoteEscaped = false;
    const stack: string[] = [];

    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (ch === '\\' && inString) {
        quoteEscaped = !quoteEscaped;
        continue;
      }
      if (ch === '"' && !quoteEscaped) {
        inString = !inString;
      } else if (!inString) {
        if (ch === '{') stack.push('}');
        else if (ch === '[') stack.push(']');
        else if (ch === '}' || ch === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === ch) {
            stack.pop();
          }
        }
      }
      quoteEscaped = false;
    }

    if (inString) {
      candidate += '"';
    }

    candidate = candidate.trim().replace(/[,:]\s*$/, '');

    while (stack.length > 0) {
      candidate += stack.pop();
    }

    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  public async analyzeFeedback(text: string, context?: { source?: string; customer?: string }): Promise<FeedbackAnalysis> {
    if (!this.client) throw new Error('Groq client not configured');
    await this.checkHealth();

    const prompt = `You are an expert AI Feedback Understanding Agent.
Analyze the following customer feedback and return strictly a valid JSON object.

Customer Feedback:
"${text}"
Source: ${context?.source || 'Unspecified'}
Customer: ${context?.customer || 'Anonymous'}

Required JSON Schema:
{
  "sentiment": "negative" | "neutral" | "positive",
  "sentiment_score": number between -1.0 and 1.0,
  "topic": concise category name (e.g. "onboarding", "performance", "export", "pricing", "documentation", "ui"),
  "subcategory": specific area (e.g. "getting_started", "slow_load", "csv_export", "plan_limits"),
  "problem": a concise, objective statement of the struggle or concern,
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "urgency": "low" | "medium" | "high" | "critical",
  "needsHistoricalContext": boolean,
  "reasoning": "brief 1-sentence explanation"
}`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a JSON-only response agent. You must respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = this.cleanJson(content);

    return {
      sentiment: ['negative', 'neutral', 'positive'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
      sentiment_score: typeof parsed.sentiment_score === 'number' ? parsed.sentiment_score : 0,
      topic: parsed.topic || 'general',
      subcategory: parsed.subcategory || '',
      problem: parsed.problem || text.slice(0, 100),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      urgency: ['low', 'medium', 'high', 'critical'].includes(parsed.urgency) ? parsed.urgency : 'medium',
      needsHistoricalContext: parsed.needsHistoricalContext !== false,
      reasoning: parsed.reasoning || `Groq (${this.model}) analyzed feedback text.`,
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
    if (!this.client) throw new Error('Groq client not configured');
    await this.checkHealth();

    const prompt = `You are an AI Agent with persistent memory analyzing recurring customer problems.
Compare the current new feedback with historical memories retrieved from Hindsight.
Determine if the new feedback represents a recurring complaint or the same underlying problem.

Current New Feedback:
- Text: "${currentFeedback.text}"
- Topic: ${currentFeedback.topic}
- Core Problem: ${currentFeedback.problem}
- Channel/Source: ${currentFeedback.source}
- Date: ${currentFeedback.date}

Recalled Historical Memories from Hindsight:
${recalledMemories.map((m, i) => `${i + 1}. [${m.id}] Date: ${m.metadata?.date || m.created_at} | Source: ${m.metadata?.source || 'Unknown'} | Memory: "${m.content}"`).join('\n')}

Instructions:
1. Do NOT claim complaints are identical unless they actually are. Use terms like "related complaint", "recurring issue", "same underlying problem".
2. Assess whether historical memories point to the same friction point across time and channels.
3. Return ONLY a valid JSON object.

Required JSON Schema:
{
  "isRecurring": boolean,
  "clusterTitle": "Concise title for the recurring problem (e.g. 'Onboarding & Initial Setup Confusion')",
  "description": "2-sentence synthesis of how this problem manifests across time and sources",
  "sentimentTrend": "Repeated negative feedback" | "Escalating frustration" | "Persistent friction across channels" | "Isolated incident",
  "explanation": "Clear explanation of how historical memories connect with the new feedback",
  "relatedMemoryIds": ["id1", "id2"]
}`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a JSON-only response agent. You must respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2048,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = this.cleanJson(content);

    // Fallback extraction from raw string if keys are missing
    let isRecurring = Boolean(parsed.isRecurring);
    if (parsed.isRecurring === undefined) {
      const match = content.match(/"isRecurring"\s*:\s*(true|false)/i);
      if (match) isRecurring = match[1].toLowerCase() === 'true';
      else isRecurring = recalledMemories.length > 0;
    }

    const clusterTitle =
      parsed.clusterTitle ||
      (content.match(/"clusterTitle"\s*:\s*"([^"]+)"/)?.[1]) ||
      `${currentFeedback.topic.charAt(0).toUpperCase() + currentFeedback.topic.slice(1)} Friction`;

    const description =
      parsed.description ||
      (content.match(/"description"\s*:\s*"([^"]+)"/)?.[1]) ||
      `Persistent customer feedback regarding ${currentFeedback.topic} across multiple touchpoints.`;

    const sentimentTrend =
      parsed.sentimentTrend ||
      (content.match(/"sentimentTrend"\s*:\s*"([^"]+)"/)?.[1]) ||
      'Repeated negative feedback';

    const explanation =
      parsed.explanation ||
      (content.match(/"explanation"\s*:\s*"([^"]+)"/)?.[1]) ||
      'Analyzed historical experiences alongside current feedback to detect pattern.';

    const relatedMemoryIds = Array.isArray(parsed.relatedMemoryIds)
      ? parsed.relatedMemoryIds
      : recalledMemories.map(m => m.id);

    return {
      isRecurring,
      clusterTitle,
      description,
      sentimentTrend,
      explanation,
      relatedMemoryIds,
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
    if (!this.client) throw new Error('Groq client not configured');
    await this.checkHealth();

    const prompt = `You are the User Feedback Synthesizer AI Agent.
Answer the investigator's question strictly based on the provided historical memories and complaint clusters.

DO NOT INVENT FEEDBACK OR EVIDENCE. If no evidence exists in the memories, state "No relevant historical feedback was found."
Every claim must cite actual dates, sources, and quotes from the memories below.

User Question: "${question}"

Available Memories from Hindsight:
${recalledMemories.length === 0 ? 'None' : recalledMemories.map(m => `- [${m.metadata?.date || m.created_at}] [Channel: ${m.metadata?.source || 'Unknown'}] [Customer: ${m.metadata?.customer || 'Anonymous'}] "${m.content}"`).join('\n')}

Existing Complaint Clusters:
${clusters.map(c => `- Cluster: ${c.title} (Seen ${c.first_seen} to ${c.last_seen}, ${c.occurrence_count} occurrences across [${c.sources.join(', ')}])`).join('\n')}

Return strictly valid JSON:
{
  "answer": "Clear, direct, evidence-based answer summarizing the pattern, timeline, and cross-channel impact.",
  "evidence": [
    {
      "source": "Support",
      "date": "2026-01-12",
      "customer": "Customer Name",
      "quote": "Exact quote from memory",
      "relevance": "Why this supports the answer"
    }
  ]
}`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a JSON-only response agent. You must respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2048,
    });

    const parsed = this.cleanJson(completion.choices[0]?.message?.content || '{}');
    return {
      answer: parsed.answer || 'Investigation complete based on memory records.',
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    };
  }

  public async extractFromTranscript(transcriptText: string): Promise<Array<{
    customer: string;
    source: string;
    feedback_text: string;
    date?: string;
  }>> {
    if (!this.client) throw new Error('Groq client not configured');
    await this.checkHealth();

    const prompt = `You are an AI Agent extracting distinct customer feedback statements from a transcript or meeting notes.
Extract individual actionable feedback items from the text below.

Transcript:
"${transcriptText}"

Return strictly a JSON array of objects:
[
  {
    "customer": "Customer Name or Speaker",
    "source": "Sales" | "Support" | "Interview",
    "feedback_text": "Direct statement or key feedback point",
    "date": "YYYY-MM-DD"
  }
]`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a JSON-only response agent. You must respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2048,
    });

    try {
      const parsed = this.cleanJson(completion.choices[0]?.message?.content || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
