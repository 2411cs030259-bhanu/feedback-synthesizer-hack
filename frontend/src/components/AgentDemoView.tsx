import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Cpu,
  Layers,
  Calendar,
  Send,
  Loader2,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Quote,
  Flame,
} from 'lucide-react';
import type { FeedbackItem, ComplaintCluster, AgentActivityRun } from '../types/feedback';

interface AgentDemoViewProps {
  onProcessCustomFeedback: (text: string, source: string, customer: string) => Promise<any>;
  onSeedDemoData: () => Promise<void>;
  clusters: ComplaintCluster[];
  feedbackList: FeedbackItem[];
}

const PRESET_SCENARIOS = [
  {
    label: 'Onboarding Confusion',
    channel: 'Support',
    customer: 'Sarah (Enterprise Customer)',
    text: "Our team still doesn't understand how to get started with the workspace setup.",
    description: 'Triggers multi-month cross-channel onboarding synthesis across Support, Sales, and Reviews.',
  },
  {
    label: 'Sluggish Dashboard Latency',
    channel: 'Product Review',
    customer: 'David K. (Data Analytics Lead)',
    text: 'Dashboard query latency is unbearable, taking 30+ seconds to load larger tables.',
    description: 'Connects to earlier latency tickets in Support and Sales demos.',
  },
  {
    label: 'Missing CSV / PDF Export',
    channel: 'Sales',
    customer: 'Jordan Reed (VP Finance, Apex)',
    text: 'We cannot proceed with renewal without one-click CSV and PDF scheduled exports.',
    description: 'Connects to finance block reports across Support and Sales.',
  },
  {
    label: 'Pricing Tier Confusion',
    channel: 'Interview',
    customer: 'Claire Bennett',
    text: 'Pricing tiers are confusing. Do view-only team members count against active seat limits?',
    description: 'Connects to pricing complaints from Sales calls and Reviews.',
  },
];

export const AgentDemoView: React.FC<AgentDemoViewProps> = ({
  onProcessCustomFeedback,
  clusters,
  feedbackList,
}) => {
  const [complaintText, setComplaintText] = useState(PRESET_SCENARIOS[0].text);
  const [channel, setChannel] = useState(PRESET_SCENARIOS[0].channel);
  const [customer, setCustomer] = useState(PRESET_SCENARIOS[0].customer);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentResult, setAgentResult] = useState<any | null>(null);

  const handleSelectPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setComplaintText(preset.text);
    setChannel(preset.channel);
    setCustomer(preset.customer);
    setAgentResult(null);
  };

  const handleRunAgent = async () => {
    if (!complaintText.trim()) return;
    setIsProcessing(true);
    setAgentResult(null);

    try {
      const result = await onProcessCustomFeedback(complaintText.trim(), channel, customer);
      setAgentResult(result);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setAgentResult(null);
    setComplaintText(PRESET_SCENARIOS[0].text);
    setChannel(PRESET_SCENARIOS[0].channel);
    setCustomer(PRESET_SCENARIOS[0].customer);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Interactive Agent Playground</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Test Pattern Detection with New Feedback
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Submit a customer complaint to see how the agent recalls past memories from Hindsight, discovers whether it's part of a recurring pattern across other channels, and synthesizes the cross-quarter insight.
            </p>
          </div>

          {agentResult && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear & Reset</span>
            </button>
          )}
        </div>

        {/* 1-Click Quick Scenario Presets */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
            Click to Load Test Complaint Scenario:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PRESET_SCENARIOS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 text-left rounded-lg border text-xs transition-all ${
                  complaintText === preset.text
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs dark:border-indigo-600 dark:bg-indigo-950/30'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                  {preset.label}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form & Live Execution Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 5 Cols: Input & Trigger */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Incoming Feedback Details
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Customer Feedback
                </label>
                <textarea
                  rows={4}
                  value={complaintText}
                  onChange={e => setComplaintText(e.target.value)}
                  placeholder="Enter raw customer feedback..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                    Channel / Source
                  </label>
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Support">Support Ticket</option>
                    <option value="Product Review">Product Review</option>
                    <option value="Sales">Sales Call</option>
                    <option value="Interview">User Interview</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customer}
                    onChange={e => setCustomer(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleRunAgent}
                disabled={isProcessing || !complaintText.trim()}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Agent Recalling & Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Process Feedback with Memory</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Synthesized Pattern Result & Agent Steps */}
        <div className="lg:col-span-7 space-y-6">
          {/* Synthesized Output Banner */}
          {agentResult ? (
            <div className="rounded-xl border-2 border-indigo-500/50 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-indigo-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-rose-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {agentResult.isRecurring
                      ? 'Recurring Problem Pattern Detected'
                      : 'Feedback Synthesized'}
                  </h3>
                </div>
                {agentResult.cluster && (
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {agentResult.cluster.occurrence_count} Total Occurrences
                  </span>
                )}
              </div>

              {/* The Core Synthesis Headline */}
              <div className="rounded-lg bg-indigo-50/50 p-4 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40">
                <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                  "This exact complaint has come up{' '}
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono underline decoration-indigo-300 underline-offset-4">
                    {agentResult.cluster?.occurrence_count || 1} times
                  </span>{' '}
                  across{' '}
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono underline decoration-indigo-300 underline-offset-4">
                    {agentResult.cluster?.source_count || 1} channels
                  </span>{' '}
                  since {agentResult.cluster?.first_seen || 'earlier this year'} —{' '}
                  <span className="text-rose-600 dark:text-rose-400 font-bold">sentiment is worsening</span>."
                </div>

                <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {agentResult.insight}
                </p>

                {agentResult.cluster && (
                  <div className="mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-900/40 flex flex-wrap gap-4 text-xs text-slate-500">
                    <div>
                      Timeline span:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {agentResult.cluster.first_seen} → {agentResult.cluster.last_seen}
                      </strong>
                    </div>
                    <div>
                      Channels involved:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {agentResult.cluster.sources.join(', ')}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline Citations */}
              {agentResult.timeline && agentResult.timeline.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Connected Timeline Across Channels ({agentResult.timeline.length} Citations)
                  </h4>
                  <div className="relative pl-5 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200 dark:before:bg-indigo-900 max-h-[300px] overflow-y-auto pr-1">
                    {agentResult.timeline.map((item: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-5 top-1.5 h-2 w-2 rounded-full border border-white bg-indigo-600 dark:border-slate-900" />
                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.source} · {item.customer}
                            </span>
                            <span className="font-mono tabular-nums">{item.date}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 italic">
                            "{item.feedback_text}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Select a scenario on the left and click <strong>"Process Feedback with Memory"</strong> to trigger the live agent and witness the recurring pattern synthesis.
            </div>
          )}

          {/* Stepper Pipeline */}
          {agentResult && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Agent Execution Steps
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {agentResult.agentSteps.length} Steps
                </span>
              </div>

              <div className="space-y-2">
                {agentResult.agentSteps.map((step: AgentActivityRun, idx: number) => (
                  <div
                    key={step.id || idx}
                    className="flex items-start gap-2.5 p-2 rounded-md bg-slate-50/80 text-xs dark:bg-slate-800/40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                          {step.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {step.status}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        {step.details.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
