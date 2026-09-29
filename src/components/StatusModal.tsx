import React from 'react';
import { X, CheckCircle2, AlertTriangle, Cpu, Database, Server, RefreshCw } from 'lucide-react';
import type { SystemConfigStatus } from '../types/feedback';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemConfigStatus | null;
  onRefresh: () => void;
  refreshing: boolean;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh,
  refreshing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              System Engine & Memory Status
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* AI Reasoning Engine */}
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  AI Reasoning Engine (Groq)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {status?.groq ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Groq Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Local Template Mode
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Active Provider:</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">
                  {status?.aiMode === 'groq' ? 'Groq API' : 'Local NLP Fallback'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Model:</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {status?.groqModel || 'llama-3.3-70b-versatile'}
                </span>
              </div>
              <p className="mt-2 text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[11px] leading-relaxed">
                {status?.groq
                  ? 'Groq handles structured feedback extraction, multi-memory reasoning, and natural language synthesis.'
                  : 'GROQ_API_KEY is not configured or offline. The system is operating seamlessly with deterministic local lexical/semantic reasoning.'}
              </p>
            </div>
          </div>

          {/* Persistent Memory System */}
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Persistent Memory System (Hindsight)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {status?.hindsight ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Hindsight Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Local Memory Fallback
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Active Provider:</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">
                  {status?.memoryMode === 'hindsight' ? 'Hindsight REST Bank' : 'SQLite Local Memory Store'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bank Name:</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {status?.hindsightBank || 'feedback-synthesizer'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Endpoint:</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {status?.hindsightUrl || 'http://localhost:8888'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Stored Memories:</span>
                <span className="font-mono text-slate-900 dark:text-white tabular-nums">
                  {status?.totalMemoryCount ?? 0}
                </span>
              </div>
              <p className="mt-2 text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[11px] leading-relaxed">
                {status?.hindsight
                  ? 'Connected to live Hindsight memory instance. Memories are retained in the feedback bank with multi-strategy TEMPR recall.'
                  : 'Hindsight instance is offline or unreachable at the configured URL. The agent is storing and semantically recalling memories via the resilient Local Memory Provider.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-white"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Check Connectivity Now</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
