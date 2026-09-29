import React from 'react';
import { X, Calendar, Layers, TrendingUp, Quote, MessageSquare } from 'lucide-react';
import type { ComplaintCluster } from '../types/feedback';

interface ClusterDetailModalProps {
  cluster: ComplaintCluster | null;
  onClose: () => void;
}

export const ClusterDetailModal: React.FC<ClusterDetailModalProps> = ({ cluster, onClose }) => {
  if (!cluster) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Recurring Complaint Cluster</span>
              <span>·</span>
              <span className="font-mono tabular-nums">{cluster.occurrence_count} Occurrences</span>
              <span>·</span>
              <span className="font-mono tabular-nums">{cluster.source_count} Channels</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {cluster.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Summary Banner */}
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {cluster.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  First seen <strong className="text-slate-800 dark:text-slate-200">{cluster.first_seen}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Latest <strong className="text-slate-800 dark:text-slate-200">{cluster.last_seen}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Channels: <strong className="text-slate-800 dark:text-slate-200">{cluster.sources.join(', ')}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Trend: <strong className="text-slate-800 dark:text-slate-200">{cluster.sentiment_trend}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Timeline */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Chronological Timeline & Verifiable Citations
            </h3>

            {cluster.feedbacks && cluster.feedbacks.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {cluster.feedbacks.map((fb, idx) => (
                  <div key={fb.id || idx} className="relative">
                    <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-600 dark:border-slate-900" />
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {fb.source}
                          </span>
                          <span>·</span>
                          <span>{fb.customer || 'Anonymous'}</span>
                        </div>
                        <span className="font-mono tabular-nums">{fb.created_at.slice(0, 10)}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                        "{fb.feedback_text}"
                      </p>
                      {fb.problem && (
                        <div className="mt-2 text-[11px] text-slate-500">
                          Identified friction: <span className="text-slate-700 dark:text-slate-300">{fb.problem}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                {cluster.feedback_ids.length} feedback items linked to this recurring issue.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
