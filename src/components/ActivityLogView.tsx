import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Clock,
} from 'lucide-react';
import type { AgentActivityRun } from '../types/feedback';

export const ActivityLogView: React.FC = () => {
  const [runs, setRuns] = useState<AgentActivityRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agent/activity?limit=150');
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actions = Array.from(new Set(runs.map(r => r.action))).filter(Boolean);

  const filteredRuns = runs.filter(r => {
    if (selectedAction === 'all') return true;
    return r.action === selectedAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
              <Activity className="h-3.5 w-3.5" />
              <span>Hackathon Judge Audit Trail</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Agent Activity Execution Log
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every autonomous decision, memory recall, retain call, reasoning pass, and fallback event is recorded chronologically. Click any entry to inspect raw execution parameters and payloads.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Action Filter */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedAction('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              selectedAction === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            All Actions ({runs.length})
          </button>
          {actions.map(action => (
            <button
              key={action}
              onClick={() => setSelectedAction(action)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedAction === action
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading activity log...
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No agent activities recorded yet. Trigger feedback processing to generate logs.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRuns.map(run => {
              const isExpanded = expandedId === run.id;
              return (
                <div
                  key={run.id}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 transition-colors dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : run.id)}
                    className="flex cursor-pointer items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {run.status === 'SUCCESS' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : run.status === 'FALLBACK' ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                            -
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            {run.action}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-xs ${
                              run.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : run.status === 'FALLBACK'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {run.status}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                          {run.details?.message || JSON.stringify(run.details)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-[11px] tabular-nums text-slate-400">
                        {new Date(run.created_at).toLocaleTimeString()}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON details payload */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                        Execution Payload Details:
                      </div>
                      <pre className="max-h-60 overflow-y-auto rounded-md bg-slate-50 p-3 font-mono text-[11px] text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
                        {JSON.stringify(run.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
