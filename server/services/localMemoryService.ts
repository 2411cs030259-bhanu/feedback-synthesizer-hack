import type { MemoryItem } from '../../src/types/feedback.js';
import {
  insertLocalMemory,
  getAllLocalMemories,
  countLocalMemories,
} from '../database/db.js';

// Synonyms and semantic expansion map to ensure semantic recall works even without exact text matching
const SEMANTIC_CLUSTERS: Record<string, string[]> = {
  onboarding: [
    'onboard', 'onboarding', 'setup', 'set up', 'getting started', 'get started',
    'start using', 'begin', 'initial setup', 'walkthrough', 'tutorial',
    'instructions', 'confusing', 'unclear', 'struggling to start', 'first steps'
  ],
  performance: [
    'slow', 'lag', 'lagging', 'latency', 'speed', 'performance', 'loading',
    'loads slow', 'freeze', 'freezes', 'hang', 'timeout', 'crash', 'large dataset',
    'spinning wheel', 'unresponsive', 'sluggish'
  ],
  export: [
    'export', 'download', 'csv', 'pdf', 'excel', 'extract', 'file export',
    'data export', 'missing export', 'save report', 'dump data'
  ],
  pricing: [
    'pricing', 'price', 'tier', 'plans', 'cost', 'expensive', 'subscription',
    'billing', 'quote', 'seat', 'charge', 'rate', 'upgrade'
  ],
  documentation: [
    'docs', 'documentation', 'api docs', 'readme', 'instructions', 'manual',
    'reference', 'sdk guide', 'examples', 'endpoint explanation', 'developer docs'
  ],
  ui: [
    'ui', 'interface', 'layout', 'design', 'cluttered', 'dark mode', 'button',
    'mobile', 'responsive', 'ux', 'navigation', 'confusing menu'
  ],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function expandQueryTerms(terms: string[]): Set<string> {
  const expanded = new Set<string>(terms);

  for (const term of terms) {
    for (const [_cluster, clusterWords] of Object.entries(SEMANTIC_CLUSTERS)) {
      if (clusterWords.some(w => w.includes(term) || term.includes(w))) {
        for (const w of clusterWords) {
          expanded.add(w.toLowerCase());
        }
      }
    }
  }

  return expanded;
}

export class LocalMemoryService {
  public async retainFeedback(item: {
    content: string;
    document_id?: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<{ success: boolean; memoryId: string }> {
    const id = item.document_id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const memoryItem: MemoryItem = {
      id,
      content: item.content,
      document_id: item.document_id,
      metadata: item.metadata || {},
      tags: item.tags || [],
      created_at: (item.metadata?.date ? new Date(item.metadata.date).toISOString() : new Date().toISOString()),
    };

    insertLocalMemory(memoryItem);
    return { success: true, memoryId: id };
  }

  public async recallFeedback(params: {
    query: string;
    tags?: string[];
    limit?: number;
  }): Promise<{ success: boolean; memories: MemoryItem[] }> {
    const all = getAllLocalMemories();
    if (all.length === 0) {
      return { success: true, memories: [] };
    }

    const queryTokens = tokenize(params.query);
    const expandedKeywords = expandQueryTerms(queryTokens);
    const filterTags = (params.tags || []).map(t => t.toLowerCase());

    const scored = all.map(mem => {
      let score = 0;
      const memTokens = tokenize(mem.content);
      const memTags = (mem.tags || []).map(t => t.toLowerCase());
      const metadataTopic = (mem.metadata?.topic || '').toLowerCase();
      const metadataProblem = (mem.metadata?.problem || '').toLowerCase();

      // 1. Direct token overlap (BM25-style weighting)
      for (const qt of queryTokens) {
        if (memTokens.includes(qt)) {
          score += 0.25;
        }
      }

      // 2. Semantic cluster expansion match
      for (const ek of expandedKeywords) {
        if (mem.content.toLowerCase().includes(ek)) {
          score += 0.2;
        }
        if (metadataProblem.includes(ek)) {
          score += 0.25;
        }
      }

      // 3. Tag / Topic alignment
      if (filterTags.length > 0) {
        for (const ft of filterTags) {
          if (memTags.includes(ft) || metadataTopic === ft) {
            score += 0.35;
          }
        }
      }

      // 4. Exact topic match bonus
      if (metadataTopic && params.query.toLowerCase().includes(metadataTopic)) {
        score += 0.4;
      }

      // Normalize score between 0.0 and 0.99
      const normalizedScore = Math.min(0.99, Number((score / (1 + score * 0.5)).toFixed(3)));

      return {
        ...mem,
        score: Math.max(0.1, normalizedScore),
      };
    });

    // Filter relevant memories (score > 0.18 threshold to avoid irrelevant matches)
    const relevant = scored
      .filter(m => (m.score || 0) >= 0.2)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, params.limit || 8);

    return {
      success: true,
      memories: relevant,
    };
  }

  public getAll(): MemoryItem[] {
    return getAllLocalMemories();
  }

  public count(): number {
    return countLocalMemories();
  }
}
