import React, { useState } from 'react';
import {
  MessageSquare,
  Repeat,
  Share2,
  Database,
  ArrowRight,
  TrendingDown,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { FeedbackItem, ComplaintCluster } from '../types/feedback';

interface OverviewViewProps {
  feedbackList: FeedbackItem[];
  clusters: ComplaintCluster[];
  onSelectCluster: (cluster: ComplaintCluster) => void;
  onNavigateToDemo: () => void;
  onNavigateToIngestion: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  feedbackList,
  clusters,
  onSelectCluster,
  onNavigateToDemo,
  onNavigateToIngestion,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  const crossChannelCount = clusters.filter(c => c.source_count > 1).length;
  const topics = Array.from(new Set(feedbackList.map(f => f.topic))).filter(Boolean);

  const filteredFeedback = feedbackList.filter(f => {
    if (selectedTopic === 'all') return true;
    return f.topic.toLowerCase() === selectedTopic.toLowerCase();
  });

  return (
    <div className="space-y-8">
      {/* Hero Narrative Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Feedback Synthesizer with Persistent Memory
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Traditional feedback tools treat every ticket in isolation. This AI agent remembers historical feedback across channels using Hindsight, recalls semantically related complaints over time, and uncovers recurring product friction that would otherwise be missed.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToDemo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              <span>Test Recurring Issue Demo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Feedback</span>
            <MessageSquare className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums dark:text-white">
              {feedbackList.length}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Ingested across channels</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Recurring Issues</span>
            <Repeat className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-indigo-600 font-mono tabular-nums dark:text-indigo-400">
              {clusters.length}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Synthesized problem clusters</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cross-Channel Issues</span>
            <Share2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums dark:text-white">
              {crossChannelCount}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Reported in 2+ sources</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Memory Bank Size</span>
            <Database className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums dark:text-white">
              {feedbackList.length}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Active retained memories</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recurring Complaints & Recent Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recurring Complaints List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Detected Recurring Complaints
              </h2>
              <p className="text-xs text-slate-500">
                Agent identified multiple customer complaints sharing the same underlying difficulty
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {clusters.length} active clusters
            </span>
          </div>

          {clusters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <p className="text-xs text-slate-500">
                No recurring complaint clusters detected yet.
              </p>
              <button
                onClick={onNavigateToDemo}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Run the Recurring Issue Demo
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {clusters.map(cluster => (
                <div
                  key={cluster.id}
                  onClick={() => onSelectCluster(cluster)}
                  className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      {/* Zero-pill metadata line */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                          {cluster.occurrence_count} related feedback items
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{cluster.source_count} channels ({cluster.sources.join(', ')})</span>
                        <span aria-hidden="true">·</span>
                        <span>Trend: {cluster.sentiment_trend}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors">
                        {cluster.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {cluster.description}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors mt-2" />
                  </div>

                  {/* Bottom Timeline Indicator */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>First seen: <strong className="text-slate-700 dark:text-slate-300">{cluster.first_seen}</strong></span>
                    </div>
                    <div>
                      <span>Latest: <strong className="text-slate-700 dark:text-slate-300">{cluster.last_seen}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Recent Feedback Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Feedback Stream
            </h2>
            <button
              onClick={onNavigateToIngestion}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              + Ingest
            </button>
          </div>

          {/* Topic Filter Chips */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg dark:bg-slate-800">
            <button
              onClick={() => setSelectedTopic('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedTopic === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All
            </button>
            {topics.slice(0, 4).map(topic => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`capitalize px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedTopic.toLowerCase() === topic.toLowerCase()
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Feedback Items List */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredFeedback.slice(0, 10).map(item => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.source}
                    </span>
                    <span>·</span>
                    <span>{item.customer || 'Anonymous'}</span>
                  </div>
                  <span className="font-mono tabular-nums">{item.created_at.slice(0, 10)}</span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                  "{item.feedback_text}"
                </p>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="capitalize">{item.topic}</span>
                  <span
                    className={
                      item.sentiment === 'positive'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : item.sentiment === 'negative'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500'
                    }
                  >
                    {item.sentiment} ({item.sentiment_score.toFixed(2)})
                  </span>
                </div>
              </div>
            ))}

            {filteredFeedback.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                No feedback matching current filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
