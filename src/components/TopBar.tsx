import React from 'react';
import {
  Sparkles,
  RefreshCw,
  Info,
  UploadCloud,
  BookOpen,
} from 'lucide-react';
import type { SystemConfigStatus } from '../types/feedback';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: SystemConfigStatus | null;
  onOpenStatusModal: () => void;
  onOpenManual: () => void;
  onSeedData: () => void;
  seeding: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  status,
  onOpenStatusModal,
  onOpenManual,
  onSeedData,
  seeding,
}) => {
  const tabs = [
    { id: 'patterns', label: 'Patterns' },
    { id: 'upload', label: 'Upload Data', icon: true },
    { id: 'demo', label: 'Test Agent' },
    { id: 'investigation', label: 'Ask Memory' },
    { id: 'feed', label: 'Feedback Feed' },
    { id: 'memory', label: 'Memory Bank' },
    { id: 'activity', label: 'Activity' },
  ];

  const isHindsightCloud = status?.hindsightUrl?.includes('vectorize.io');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={e => {
              e.preventDefault();
              setActiveTab('patterns');
            }}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 hover:text-slate-700 dark:text-white dark:hover:text-slate-200"
          >
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              FS
            </div>
            <span>User Feedback Synthesizer</span>
          </a>
        </div>

        {/* Zone 2: Navigation segmented tabs */}
        <nav className="hidden lg:flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const isUpload = tab.id === 'upload';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : isUpload
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {isUpload && <UploadCloud className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Live Engine Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Engine Indicator Button */}
          <button
            onClick={onOpenStatusModal}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Inspect live Hindsight memory and Groq AI engines"
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden xl:inline text-slate-500 dark:text-slate-400">Memory:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.memoryMode === 'hindsight'
                  ? isHindsightCloud
                    ? 'Hindsight Cloud'
                    : 'Hindsight Local'
                  : 'Local Fallback'}
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-600">·</span>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="hidden xl:inline text-slate-500 dark:text-slate-400">AI:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.aiMode === 'groq' ? 'Groq' : 'Local'}
              </span>
            </div>

            <Info className="h-3 w-3 text-slate-400" />
          </button>

          {/* User Manual Button */}
          <button
            onClick={onOpenManual}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="View User Manual & Guide"
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Manual</span>
          </button>

          {/* Quick upload or reset action */}
          <button
            onClick={() => setActiveTab('upload')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload Data</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-200 px-4 py-2 bg-slate-50 gap-1 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
