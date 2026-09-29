import React, { useState } from 'react';
import {
  Repeat,
  Share2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  ChevronRight,
  Quote,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import type { FeedbackItem, ComplaintCluster } from '../types/feedback';

interface PatternDetectionViewProps {
  clusters: ComplaintCluster[];
  feedbackList: FeedbackItem[];
  onSelectCluster: (cluster: ComplaintCluster) => void;
  onNavigateToDemo: () => void;
  onNavigateToFeed: () => void;
}

export const PatternDetectionView: React.FC<PatternDetectionViewProps> = ({
  clusters,
  feedbackList,
  onSelectCluster,
  onNavigateToDemo,
  onNavigateToFeed,
}) => {
  const [selectedClusterDetail, setSelectedClusterDetail] = useState<ComplaintCluster | null>(null);

  // Find the most prominent cluster (e.g. Onboarding or highest occurrences)
  const heroCluster =
    clusters.find(c => c.title.toLowerCase().includes('onboard') || c.id.includes('onboard')) ||
    clusters[0];

  const crossChannelCount = clusters.filter(c => c.source_count > 1).length;

  return (
    <div className="space-y-8">
      {/* Executive Hero Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Cross-Quarter Pattern Detection · Powered by Hindsight Memory</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Stop Rediscovering the Same Complaints Every Quarter
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Product teams receive feedback scattered across support tickets, app reviews, and sales calls. Because tools operate in silos, teams repeatedly re-discover the same problem every quarter without realizing it's the exact same friction point.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onNavigateToDemo}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              <span>Test Interactive Agent</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onNavigateToFeed}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <span>View Raw Feed</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Highlight Card: The Core Memory Angle */}
      {heroCluster && (
        <div className="rounded-xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 p-6 shadow-sm dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 dark:border-indigo-800/80">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-indigo-100 dark:border-indigo-900/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Flame className="h-4 w-4 text-rose-500" />
                <span>Primary Recurring Pattern Alert · Cross-Channel Discovery</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                "{heroCluster.title}"
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectCluster(heroCluster)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
              >
                <span>View Verifiable Timeline</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* The Exact Punchline Quote from Hackathon Thesis */}
          <div className="mt-4 rounded-lg bg-white p-4 border border-indigo-100 shadow-2xs dark:bg-slate-800/80 dark:border-indigo-900/40">
            <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
              "This exact complaint has come up{' '}
              <span className="text-indigo-600 dark:text-indigo-400 font-mono underline decoration-indigo-300 decoration-2 underline-offset-4">
                {heroCluster.occurrence_count} times
              </span>{' '}
              across{' '}
              <span className="text-indigo-600 dark:text-indigo-400 font-mono underline decoration-indigo-300 decoration-2 underline-offset-4">
                {heroCluster.source_count} channels
              </span>{' '}
              since {heroCluster.first_seen} —{' '}
              <span className="text-rose-600 dark:text-rose-400">sentiment is worsening</span>."
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {heroCluster.description}
            </p>

            {/* Micro Metadata Timeline Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  First seen: <strong className="text-slate-800 dark:text-slate-200">{heroCluster.first_seen}</strong>
                </span>
                <span>·</span>
                <span>
                  Latest: <strong className="text-slate-800 dark:text-slate-200">{heroCluster.last_seen}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>Channels: <strong className="text-slate-800 dark:text-slate-200">{heroCluster.sources.join(', ')}</strong></span>
              </div>

              <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>{heroCluster.sentiment_trend}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Feedback
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {feedbackList.length}
            </span>
            <span className="text-xs text-slate-500">records</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Support, reviews, sales & interviews</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Recurring Patterns
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
              {clusters.length}
            </span>
            <span className="text-xs text-slate-500">clusters</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Synthesized by agent over time</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Cross-Channel Issues
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {crossChannelCount}
            </span>
            <span className="text-xs text-slate-500">multi-channel</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Invisible to single-channel tools</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hindsight Memory Bank
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {feedbackList.length}
            </span>
            <span className="text-xs text-slate-500">facts</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Persistent Vectorize cloud bank</p>
        </div>
      </div>

      {/* All Recurring Patterns Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              All Recurring Problems Across Channels
            </h2>
            <p className="text-xs text-slate-500">
              Discovered by recalling historical memories when new feedback matches prior friction points
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {clusters.length} active patterns
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clusters.map(cluster => (
            <div
              key={cluster.id}
              onClick={() => onSelectCluster(cluster)}
              className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-600 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {cluster.occurrence_count} occurrences · {cluster.source_count} channels
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {cluster.first_seen} → {cluster.last_seen}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors">
                  {cluster.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {cluster.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Sources:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {cluster.sources.join(', ')}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  Timeline & Quotes
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
