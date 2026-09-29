import React, { useState } from 'react';
import {
  PlusCircle,
  UploadCloud,
  FileText,
  Search,
  Download,
  Loader2,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { FeedbackItem } from '../types/feedback';

interface IngestionViewProps {
  feedbackList: FeedbackItem[];
  onAddManualFeedback: (data: {
    source: string;
    customer: string;
    date: string;
    text: string;
  }) => Promise<void>;
  onImportCsv: (csvContent: string) => Promise<void>;
  onExtractTranscript: (transcript: string) => Promise<any[]>;
  onClearAll: () => Promise<void>;
  onRefresh: () => void;
}

export const IngestionView: React.FC<IngestionViewProps> = ({
  feedbackList,
  onAddManualFeedback,
  onImportCsv,
  onExtractTranscript,
  onClearAll,
  onRefresh,
}) => {
  const [activeSubtab, setActiveSubtab] = useState<'manual' | 'csv' | 'transcript'>('manual');

  // Manual Form State
  const [manualSource, setManualSource] = useState('Support');
  const [manualCustomer, setManualCustomer] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualText, setManualText] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // CSV State
  const [csvInput, setCsvInput] = useState('');
  const [uploadingCsv, setUploadingCsv] = useState(false);

  // Transcript State
  const [transcriptInput, setTranscriptInput] = useState('');
  const [analyzingTranscript, setAnalyzingTranscript] = useState(false);
  const [extractedItems, setExtractedItems] = useState<any[] | null>(null);

  // Table Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setSubmittingManual(true);
    try {
      await onAddManualFeedback({
        source: manualSource,
        customer: manualCustomer || 'Anonymous',
        date: manualDate,
        text: manualText.trim(),
      });
      setManualText('');
      setManualCustomer('');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleCsvSubmit = async () => {
    if (!csvInput.trim()) return;
    setUploadingCsv(true);
    try {
      await onImportCsv(csvInput.trim());
      setCsvInput('');
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleLoadSampleCsv = () => {
    setCsvInput(`source,customer,created_at,feedback_text
Support,Rahul M.,2026-01-12T10:15:00Z,"Setup was difficult and I wasn't sure what to do next after creating an account."
Product Review,Marcus Chen,2026-03-18T09:20:00Z,"The product is useful once configured, but the onboarding process is confusing."
Sales,Devon Patel,2026-06-04T11:00:00Z,"Our team struggled during initial setup and evaluated dropping the POC."
Support,Carlos Gomez,2026-09-22T08:30:00Z,"The onboarding instructions are still unclear. New team members keep asking how to begin."`);
  };

  const handleTranscriptAnalyze = async () => {
    if (!transcriptInput.trim()) return;
    setAnalyzingTranscript(true);
    setExtractedItems(null);
    try {
      const items = await onExtractTranscript(transcriptInput.trim());
      setExtractedItems(items);
    } finally {
      setAnalyzingTranscript(false);
    }
  };

  const handleImportExtractedItem = async (item: any) => {
    await onAddManualFeedback({
      source: item.source || 'Interview',
      customer: item.customer || 'Participant',
      date: item.date || new Date().toISOString().slice(0, 10),
      text: item.feedback_text,
    });
    setExtractedItems(prev => prev?.filter(i => i !== item) || null);
  };

  const channels = Array.from(new Set(feedbackList.map(f => f.source))).filter(Boolean);

  const filteredFeedbacks = feedbackList.filter(f => {
    const matchesSearch =
      !searchQuery ||
      f.feedback_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel =
      selectedChannel === 'all' || f.source.toLowerCase() === selectedChannel.toLowerCase();
    return matchesSearch && matchesChannel;
  });

  return (
    <div className="space-y-8">
      {/* Ingestion Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Multi-Source Feedback Ingestion
            </h1>
            <p className="text-xs text-slate-500">
              Submit feedback manually, upload CSV files, or extract feedback from call transcripts
            </p>
          </div>

          {/* Subtabs Segmented Controls */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setActiveSubtab('manual')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubtab === 'manual'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Manual Form
            </button>
            <button
              onClick={() => setActiveSubtab('csv')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubtab === 'csv'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              CSV Import
            </button>
            <button
              onClick={() => setActiveSubtab('transcript')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubtab === 'transcript'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Transcript Parser
            </button>
          </div>
        </div>

        {/* Subtab 1: Manual Input */}
        {activeSubtab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Source / Channel
                </label>
                <select
                  value={manualSource}
                  onChange={e => setManualSource(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Support">Support Ticket</option>
                  <option value="Product Review">Product Review</option>
                  <option value="Sales">Sales Call</option>
                  <option value="Interview">User Interview</option>
                  <option value="Social">Social / Forum</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={manualCustomer}
                  onChange={e => setManualCustomer(e.target.value)}
                  placeholder="e.g. Rahul M. or Company"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Customer Feedback Text
              </label>
              <textarea
                rows={3}
                required
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                placeholder="Enter feedback statement. Agent will analyze sentiment, topic, and store in Hindsight memory..."
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingManual || !manualText.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {submittingManual ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Agent Processing...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Process & Retain Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Subtab 2: CSV Import */}
        {activeSubtab === 'csv' && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Paste CSV text with columns: source, customer, created_at, feedback_text</span>
              <button
                onClick={handleLoadSampleCsv}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Insert Sample CSV
              </button>
            </div>

            <textarea
              rows={6}
              value={csvInput}
              onChange={e => setCsvInput(e.target.value)}
              placeholder="source,customer,created_at,feedback_text..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 font-mono text-xs p-3 text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="flex justify-end">
              <button
                onClick={handleCsvSubmit}
                disabled={uploadingCsv || !csvInput.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {uploadingCsv ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing & Processing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Import CSV Batch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Subtab 3: Transcript Extraction */}
        {activeSubtab === 'transcript' && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-500">
              Paste sales demo notes, user interview transcripts, or customer call logs. The AI agent will parse individual customer feedback items.
            </p>

            <textarea
              rows={5}
              value={transcriptInput}
              onChange={e => setTranscriptInput(e.target.value)}
              placeholder="Speaker 1 (Sales): How was your experience with the trial?&#10;Customer (Elena): The initial setup was very confusing, we weren't sure how to configure the roles.&#10;Customer (Elena): Also, the export to CSV feature is missing and our finance team needs it."
              className="w-full rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="flex justify-end">
              <button
                onClick={handleTranscriptAnalyze}
                disabled={analyzingTranscript || !transcriptInput.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {analyzingTranscript ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Extracting Feedback...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5" />
                    <span>Extract Feedback Items</span>
                  </>
                )}
              </button>
            </div>

            {/* Extracted Items Preview */}
            {extractedItems && (
              <div className="mt-4 rounded-lg bg-slate-50 p-4 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  Extracted Feedback Items ({extractedItems.length})
                </h3>
                <div className="space-y-2">
                  {extractedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex-1 pr-3">
                        <div className="text-[11px] text-slate-500 font-semibold mb-0.5">
                          {item.customer} · {item.source}
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 italic">
                          "{item.feedback_text}"
                        </p>
                      </div>
                      <button
                        onClick={() => handleImportExtractedItem(item)}
                        className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0 dark:bg-indigo-950 dark:text-indigo-400"
                      >
                        + Ingest
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Feedback Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              All Ingested Feedback ({filteredFeedbacks.length})
            </h2>
            <p className="text-xs text-slate-500">
              Normalized records stored in SQLite and retained in persistent memory
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-500 hover:text-slate-700 rounded-md border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400"
              title="Clear all data for clean demo reset"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Database</span>
            </button>
          </div>
        </div>

        {/* Search & Channel Filter */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search feedback text, customer, or topic..."
              className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <select
            value={selectedChannel}
            onChange={e => setSelectedChannel(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">All Channels</option>
            {channels.map(ch => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Feedback Text</th>
                <th className="py-2.5 px-3">Topic</th>
                <th className="py-2.5 px-3 text-right">Sentiment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFeedbacks.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap text-slate-500">
                    {item.created_at.slice(0, 10)}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    {item.source}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{item.customer || 'Anonymous'}</td>
                  <td className="py-2.5 px-3 max-w-md text-slate-800 dark:text-slate-200">
                    "{item.feedback_text}"
                  </td>
                  <td className="py-2.5 px-3 capitalize whitespace-nowrap">{item.topic}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums">
                    <span
                      className={
                        item.sentiment === 'positive'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.sentiment === 'negative'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }
                    >
                      {item.sentiment_score > 0 ? `+${item.sentiment_score}` : item.sentiment_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredFeedbacks.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No feedback records match the current criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
