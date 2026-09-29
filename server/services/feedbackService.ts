import crypto from 'node:crypto';
import type { FeedbackItem, FeedbackAnalysis } from '../../src/types/feedback.js';
import { insertFeedback, getAllFeedback, getFeedbackById } from '../database/db.js';

export function normalizeSource(src?: string): string {
  if (!src) return 'Support';
  const s = src.toLowerCase().trim();
  if (s.includes('support') || s.includes('ticket') || s.includes('helpdesk') || s.includes('desk')) return 'Support';
  if (s.includes('review') || s.includes('g2') || s.includes('capterra') || s.includes('app store')) return 'Product Review';
  if (s.includes('sales') || s.includes('demo') || s.includes('call') || s.includes('prospect')) return 'Sales';
  if (s.includes('interview') || s.includes('user research') || s.includes('ux research')) return 'Interview';
  if (s.includes('social') || s.includes('twitter') || s.includes('x') || s.includes('reddit')) return 'Social';
  return src.charAt(0).toUpperCase() + src.slice(1);
}

export function parseDate(rawDate?: string): { iso: string; timestamp: number } {
  if (!rawDate) {
    const now = new Date();
    return { iso: now.toISOString(), timestamp: now.getTime() };
  }

  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return { iso: parsed.toISOString(), timestamp: parsed.getTime() };
  }

  // Handle month names e.g. "January 12, 2026" or "Jan 12"
  const now = new Date();
  return { iso: now.toISOString(), timestamp: now.getTime() };
}

export function createNormalizedFeedback(
  input: {
    id?: string;
    source?: string;
    source_id?: string;
    customer?: string;
    customer_id?: string;
    feedback_text: string;
    created_at?: string;
  },
  analysis: FeedbackAnalysis
): FeedbackItem {
  const id = input.id || `fb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const dateInfo = parseDate(input.created_at);

  const item: FeedbackItem = {
    id,
    source: normalizeSource(input.source),
    source_id: input.source_id || `src-${id.slice(-6)}`,
    customer: input.customer?.trim() || 'Anonymous Customer',
    customer_id: input.customer_id || `cust-${crypto.randomBytes(3).toString('hex')}`,
    feedback_text: input.feedback_text.trim(),
    created_at: dateInfo.iso,
    received_at: new Date().toISOString(),
    sentiment: analysis.sentiment,
    sentiment_score: analysis.sentiment_score,
    topic: analysis.topic || 'general',
    subcategory: analysis.subcategory || '',
    problem: analysis.problem || '',
    keywords: analysis.keywords || [],
    urgency: analysis.urgency || 'medium',
    created_timestamp: dateInfo.timestamp,
  };

  insertFeedback(item);
  return item;
}

export function fetchAllFeedback(filterTopic?: string, search?: string): FeedbackItem[] {
  return getAllFeedback(filterTopic, search);
}

export function fetchFeedbackById(id: string): FeedbackItem | null {
  return getFeedbackById(id);
}

export function parseCsvFeedback(csv: string): Array<{
  source?: string;
  customer?: string;
  created_at?: string;
  feedback_text: string;
}> {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const results: Array<{ source?: string; customer?: string; created_at?: string; feedback_text: string }> = [];

  let startIdx = 0;
  const headerLower = lines[0].toLowerCase();
  const hasHeader =
    headerLower.includes('feedback') ||
    headerLower.includes('source') ||
    headerLower.includes('customer') ||
    headerLower.includes('text');

  if (hasHeader) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const tokens: string[] = [];
    let cur = '';
    let inQuote = false;

    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        tokens.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    tokens.push(cur.trim());

    if (tokens.length === 1 && tokens[0]) {
      results.push({ feedback_text: tokens[0].replace(/^"|"$/g, '') });
    } else if (tokens.length >= 2) {
      let source = 'Support';
      let customer = 'Customer';
      let date = new Date().toISOString();
      let feedbackText = '';

      if (tokens.length === 2) {
        source = tokens[0].replace(/^"|"$/g, '');
        feedbackText = tokens[1].replace(/^"|"$/g, '');
      } else if (tokens.length === 3) {
        source = tokens[0].replace(/^"|"$/g, '');
        customer = tokens[1].replace(/^"|"$/g, '');
        feedbackText = tokens[2].replace(/^"|"$/g, '');
      } else {
        if (tokens[0].match(/\d{4}/)) {
          date = tokens[0].replace(/^"|"$/g, '');
          source = tokens[1].replace(/^"|"$/g, '');
          customer = tokens[2].replace(/^"|"$/g, '');
          feedbackText = tokens.slice(3).join(', ').replace(/^"|"$/g, '');
        } else {
          source = tokens[0].replace(/^"|"$/g, '');
          customer = tokens[1].replace(/^"|"$/g, '');
          date = tokens[2].replace(/^"|"$/g, '');
          feedbackText = tokens.slice(3).join(', ').replace(/^"|"$/g, '');
        }
      }

      if (feedbackText) {
        results.push({
          source,
          customer,
          created_at: date,
          feedback_text: feedbackText,
        });
      }
    }
  }

  return results;
}

