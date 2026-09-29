import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  HelpCircle,
  Database,
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  Quote,
  CheckCircle2,
} from 'lucide-react';
import type { InvestigationResult } from '../types/feedback';

interface InvestigationViewProps {
  onInvestigate: (question: string) => Promise<InvestigationResult>;
}

const PRESET_QUESTIONS = [
  'Has anyone complained about onboarding before?',
  'What complaints keep coming back across multiple channels?',
  'What is the oldest unresolved complaint?',
  'Which problems appear across multiple channels?',
  'Are customers still reporting setup issues?',
  'What feedback has become more negative over time?',
];

export const InvestigationView: React.FC<InvestigationViewProps> = ({ onInvestigate }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestigationResult | null>(null);

  const handleRunInvestigation = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await onInvestigate(q.trim());
      setResult(res);
      setQuestion(q);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Investigator with Persistent Memory</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Natural Language Feedback Investigation
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Ask complex questions about your feedback history across all channels and dates. The agent interprets your intent, queries Hindsight memory using multi-strategy recall, reasons over the retrieved records, and provides a strictly verifiable answer grounded in customer quotes.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRunInvestigation()}
              placeholder="e.g. Has anyone complained about onboarding before? What is the oldest unresolved issue?"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <button
            onClick={() => handleRunInvestigation()}
            disabled={loading || !question.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Recalling & Reasoning...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Investigate</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Question Suggestions */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 block mb-2">
            Suggested Investigation Prompts:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUESTIONS.map((pq, idx) => (
              <button
                key={idx}
                onClick={() => handleRunInvestigation(pq)}
                disabled={loading}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
              >
                {pq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Investigation Results */}
      {result && (
        <div className="space-y-6">
          {/* Agent Reasoning Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-500" />
                <span>
                  Query interpreted as:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    "{result.interpretedQuery}"
                  </strong>
                </span>
                <span>·</span>
                <span className="font-mono tabular-nums">
                  {result.recalledCount} memories retrieved from {result.memoryMode === 'hindsight' ? 'Hindsight Bank' : 'Local Store'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Reasoning Mode: {result.aiMode === 'groq' ? 'Groq Llama-3.3' : 'Local NLP Fallback'}
              </div>
            </div>

            {/* Direct Answer */}
            <div className="mt-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                Agent Synthesized Answer
              </h2>
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-line">
                  {result.answer}
                </p>

                {result.channels && result.channels.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-4 text-xs text-slate-500">
                    <div>
                      First observed:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {result.firstObserved || 'Recorded history'}
                      </strong>
                    </div>
                    <div>
                      Latest observed:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {result.latestObserved || 'Recent'}
                      </strong>
                    </div>
                    <div>
                      Channels involved:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {result.channels.join(', ')}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Verifiable Supporting Evidence List */}
            <div className="mt-6">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Supporting Evidence from Memory ({result.evidence.length} citations)
              </h3>

              {result.evidence.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No direct matching historical feedback items were found in the memory bank.
                </p>
              ) : (
                <div className="space-y-3">
                  {result.evidence.map((ev, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {ev.source}
                          </span>
                          <span>·</span>
                          <span>{ev.customer || 'Anonymous Customer'}</span>
                        </div>
                        <span className="font-mono tabular-nums">{ev.date}</span>
                      </div>

                      <div className="flex items-start gap-2 mt-1">
                        <Quote className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-800 dark:text-slate-200 italic leading-relaxed">
                          "{ev.quote}"
                        </p>
                      </div>

                      {ev.relevance && (
                        <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                          Relevance: <span className="text-slate-700 dark:text-slate-300">{ev.relevance}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
