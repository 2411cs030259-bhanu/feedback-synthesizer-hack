import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Sparkles,
  Tag,
  Calendar,
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
} from 'lucide-react';
import type { MemoryItem, SystemConfigStatus } from '../types/feedback';
import { apiClient } from '../services/apiClient';

interface MemoryExplorerViewProps {
  status: SystemConfigStatus | null;
}

export const MemoryExplorerView: React.FC<MemoryExplorerViewProps> = ({ status }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recallQuery, setRecallQuery] = useState('');
  const [recalling, setRecalling] = useState(false);
  const [recallResults, setRecallResults] = useState<MemoryItem[] | null>(null);
  const [recallProvider, setRecallProvider] = useState<'hindsight' | 'local'>('local');
  const [activeTag, setActiveTag] = useState<string>('all');

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMemories();
      setMemories(data.memories || []);
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleTestRecall = async () => {
    if (!recallQuery.trim()) return;
    setRecalling(true);
    setRecallResults(null);

    try {
      const data = await apiClient.simulateRecall(recallQuery.trim(), undefined, 6);
      setRecallResults(data.memories || []);
      setRecallProvider(data.provider || 'local');
    } catch (err) {
      console.error('Failed to test recall:', err);
    } finally {
      setRecalling(false);
    }
  };

  const allTags = Array.from(
    new Set(memories.flatMap(m => m.tags || []).filter(Boolean))
  );

  const filteredMemories = memories.filter(m => {
    if (activeTag === 'all') return true;
    return (m.tags || []).includes(activeTag) || m.metadata?.topic === activeTag;
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
              <Database className="h-3.5 w-3.5" />
              <span>Persistent Memory Layer</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hindsight Memory Bank Explorer
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Inspect the structured experiences stored inside the memory bank. When new feedback arrives, Hindsight does not perform plain string matching; it retrieves memories using multi-strategy semantic ranking, entity matching, and temporal traversal.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/60">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Memory Bank</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-white">
                {status?.hindsightBank || 'feedback-synthesizer'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/60">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Stored Facts</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums dark:text-white">
                {memories.length}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Recall Tester */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
            Simulate Hindsight Memory Recall
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Enter any query phrase to test semantic recall against the memory bank (e.g. "struggling with initial steps", "data export", "latency issues").
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={recallQuery}
                onChange={e => setRecallQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTestRecall()}
                placeholder="e.g. struggling with initial setup or getting started"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              onClick={handleTestRecall}
              disabled={recalling || !recallQuery.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {recalling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Recalling...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Execute RECALL</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recall Test Results */}
        {recallResults && (
          <div className="mt-4 rounded-lg bg-indigo-50/50 p-4 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span className="font-semibold text-slate-900 dark:text-white">
                RECALL Results ({recallResults.length} memories returned via {recallProvider === 'hindsight' ? 'Hindsight API' : 'Local Memory Provider'})
              </span>
              <span className="font-mono text-[11px]">Query: "{recallQuery}"</span>
            </div>

            {recallResults.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No matching memories above similarity threshold.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recallResults.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {m.metadata?.source || 'Feedback'} · {m.metadata?.customer || 'Customer'}
                      </span>
                      {typeof m.score === 'number' && (
                        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          Score: {(m.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 italic line-clamp-3">
                      "{m.content.replace(/^Customer feedback:\s*/i, '')}"
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 font-mono">
                      Date: {m.metadata?.date || m.created_at.slice(0, 10)} · Topic: {m.metadata?.topic || 'general'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stored Experiences List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Stored Experiences ({filteredMemories.length})
            </h2>
            <p className="text-xs text-slate-500">
              Structured memories currently active in the feedback bank
            </p>
          </div>

          {/* Tag filters */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg dark:bg-slate-800">
            <button
              onClick={() => setActiveTag('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTag === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Tags
            </button>
            {allTags.slice(0, 5).map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`capitalize px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTag === tag
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tag.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
            Loading memories from memory bank...
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
            No memories stored yet. Seed sample data or ingest feedback to populate memory.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMemories.map(mem => (
              <div
                key={mem.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {mem.metadata?.source || 'Feedback'}
                      </span>
                      <span>·</span>
                      <span>{mem.metadata?.customer || 'Anonymous'}</span>
                    </div>
                    <span className="font-mono tabular-nums">
                      {mem.metadata?.date || mem.created_at.slice(0, 10)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 italic mb-3 line-clamp-3">
                    "{mem.content.replace(/^Customer feedback:\s*/i, '').trim()}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {mem.metadata?.problem && (
                    <div className="text-[11px] text-slate-500">
                      Problem: <span className="text-slate-700 dark:text-slate-300">{mem.metadata.problem}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                    {(mem.tags || []).slice(0, 3).map((t, idx) => (
                      <span key={idx} className="font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
