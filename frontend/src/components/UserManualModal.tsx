import React from 'react';
import {
  X,
  BookOpen,
  UploadCloud,
  Layers,
  Sparkles,
  Search,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                User Manual & System Guide
              </h2>
              <p className="text-xs text-slate-500">
                How to use the User Feedback Synthesizer AI Agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {/* Section 1: Overview */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>1. Overview & Purpose</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cross-Channel Feedback Synthesis with Persistent Memory
            </h3>
            <p>
              In high-velocity product teams, customer feedback arrives fragmented across disjointed channels: Support tickets (Zendesk), Sales calls (Gong/HubSpot), Product reviews (G2/App Store), and User interviews. 
              The <strong>User Feedback Synthesizer</strong> uses an autonomous AI agent backed by <strong>Groq AI (Fast Reasoning)</strong> and <strong>Vectorize Hindsight Cloud (Persistent Long-Term Memory)</strong> to connect these disparate touchpoints across time, proving the core thesis:
            </p>
            <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 font-medium text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
              “This exact complaint has come up <strong>N times</strong> across <strong>N channels</strong> since Month — sentiment is worsening.”
            </div>
          </section>

          {/* Section 2: Uploading Data */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
              <UploadCloud className="h-3.5 w-3.5" />
              <span>2. Uploading Your Own Data</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Data Ingestion Methods
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>CSV File Upload</span>
                </div>
                <p>
                  Drag and drop any CSV file. Click <strong>"Download Sample CSV"</strong> to get the standard 4-column format (<code className="font-mono text-[10px]">date, source, customer, feedback_text</code>).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Paste Raw Lines</span>
                </div>
                <p>
                  Paste tabular lines or comma-separated rows directly into the textarea without creating a file.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Single Feedback Form</span>
                </div>
                <p>
                  Input a single customer quote with Channel (Support, Sales, Product Review, Interview, Social) and date.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Meeting Transcript Extractor</span>
                </div>
                <p>
                  Paste Zoom/Gong transcripts. Groq AI scans dialogue and extracts discrete customer complaints automatically.
                </p>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-rose-600 dark:text-rose-400">Database Controls:</span>
              <span>Use <strong>"Clear All Data"</strong> to empty records and start completely fresh, or <strong>"Reset Minimal Baseline"</strong> to load the clean 4-item sample.</span>
            </div>
          </section>

          {/* Section 3: Navigation Views */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
              <Layers className="h-3.5 w-3.5" />
              <span>3. Main App Views</span>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  1. Patterns View
                </div>
                <p>
                  Displays the Core Thesis card highlighting the primary friction cluster. Below it, browse all identified complaint clusters with channel badges, occurrence counters, and sentiment trends. Click any card to open full citations.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  2. Test Agent (Playground)
                </div>
                <p>
                  Watch the agent execute its 8-step cognitive loop live: Ingestion → Sentiment Extraction → SQLite Store → Hindsight Memory Retain → Planner Decision → Semantic Recall → Synthesis → Cluster Update.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  3. Ask Memory (Natural Language Investigation)
                </div>
                <p>
                  Ask any question about customer sentiment (e.g. <em>"What are users saying about setup?"</em>, <em>"Are sales prospects dropping out?"</em>). The agent recalls semantic memories and provides evidence citations with dates, channels, and verbatim quotes.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  4. Feedback Feed
                </div>
                <p>
                  Complete tabular log of all ingested feedback with instant keyword search and channel pills (Support, Sales, Product Review, Interview).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  5. Memory Bank (Hindsight Cloud)
                </div>
                <p>
                  Inspect items retained in Vectorize Hindsight Cloud bank (<code className="font-mono text-[10px]">user-feedback-synthesizer</code>). Test live semantic recall queries directly against the vector index.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  6. Activity Log
                </div>
                <p>
                  Chronological audit log showing every agent tool invocation, retention, recall, and cluster update.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Live Engine Status */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>4. Live Dual-Engine Architecture</span>
            </div>
            <p>
              Click the <strong>Memory / AI status pill</strong> in the top bar anytime to inspect real-time connectivity:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>AI Engine</strong>: Groq Cloud API running <code className="font-mono text-[10px]">qwen/qwen3.8-27b</code> for fast inference.</li>
              <li><strong>Memory Engine</strong>: Vectorize Hindsight Cloud API (<code className="font-mono text-[10px]">https://api.hindsight.vectorize.io</code>) for persistent semantic storage and vector recall.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end dark:border-slate-800 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
