import React, { useState } from 'react';
import {
  Search,
  Plus,
  UploadCloud,
  FileText,
  Filter,
  Trash2,
  RefreshCw,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { FeedbackItem } from '../types/feedback';

interface FeedbackFeedViewProps {
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

export const FeedbackFeedView: React.FC<FeedbackFeedViewProps> = ({
  feedbackList,
  onAddManualFeedback,
  onImportCsv,
  onExtractTranscript,
  onClearAll,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'manual' | 'csv' | 'transcript'>('manual');

  // Manual Form
  const [source, setSource] = useState('Support');
  const [customer, setCustomer] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // CSV
  const [csvContent, setCsvContent] = useState('');
  const [importingCsv, setImportingCsv] = useState(false);

  // Transcript
  const [transcript, setTranscript] = useState('');
  const [extractingTranscript, setExtractingTranscript] = useState(false);
  const [extractedList, setExtractedList] = useState<any[] | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onAddManualFeedback({
        source,
        customer: customer || 'Anonymous',
        date,
        text: text.trim(),
      });
      setText('');
      setCustomer('');
      setShowAddModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvSubmit = async () => {
    if (!csvContent.trim()) return;
    setImportingCsv(true);
    try {
      await onImportCsv(csvContent.trim());
      setCsvContent('');
      setShowAddModal(false);
    } finally {
      setImportingCsv(false);
    }
  };

  const handleTranscriptExtract = async () => {
    if (!transcript.trim()) return;
    setExtractingTranscript(true);
    setExtractedList(null);
    try {
      const items = await onExtractTranscript(transcript.trim());
      setExtractedList(items);
    } finally {
      setExtractingTranscript(false);
    }
  };

  const handleAddExtracted = async (item: any) => {
    await onAddManualFeedback({
      source: item.source || 'Interview',
      customer: item.customer || 'Participant',
      date: item.date || new Date().toISOString().slice(0, 10),
      text: item.feedback_text,
    });
    setExtractedList(prev => prev?.filter(i => i !== item) || null);
  };

  const channels = Array.from(new Set(feedbackList.map(f => f.source))).filter(Boolean);

  const filteredFeedbacks = feedbackList.filter(f => {
    const matchesSearch =
      !search ||
      f.feedback_text.toLowerCase().includes(search.toLowerCase()) ||
      f.customer?.toLowerCase().includes(search.toLowerCase()) ||
      f.topic.toLowerCase().includes(search.toLowerCase());
    const matchesChannel =
      channelFilter === 'all' || f.source.toLowerCase() === channelFilter.toLowerCase();
    const matchesSentiment =
      sentimentFilter === 'all' || f.sentiment.toLowerCase() === sentimentFilter.toLowerCase();
    return matchesSearch && matchesChannel && matchesSentiment;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Feedback Feed & Ingestion
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Browse all customer feedback records across Support, Reviews, Sales, and Interviews.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowAddModal(true);
                setModalMode('manual');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Feedback</span>
            </button>

            <button
              onClick={onRefresh}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Refresh feed"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={onClearAll}
              className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
              title="Clear database"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search feedback text, customer name, or topic..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">All Channels</option>
            {channels.map(ch => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>

          <select
            value={sentimentFilter}
            onChange={e => setSentimentFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">All Sentiments</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
            <option value="positive">Positive</option>
          </select>
        </div>
      </div>

      {/* Clean Table View */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Feedback Quote</th>
                <th className="py-3 px-4">Topic</th>
                <th className="py-3 px-4 text-right">Sentiment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFeedbacks.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap text-slate-500">
                    {item.created_at.slice(0, 10)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {item.source}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {item.customer || 'Anonymous'}
                  </td>
                  <td className="py-3 px-4 max-w-lg text-slate-800 dark:text-slate-200 leading-relaxed italic">
                    "{item.feedback_text}"
                  </td>
                  <td className="py-3 px-4 capitalize whitespace-nowrap text-slate-600 dark:text-slate-400">
                    {item.topic}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                    <span
                      className={
                        item.sentiment === 'positive'
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : item.sentiment === 'negative'
                          ? 'text-rose-600 dark:text-rose-400 font-semibold'
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
            <div className="py-12 text-center text-xs text-slate-400">
              No feedback records match the current filters.
            </div>
          )}
        </div>
      </div>

      {/* Ingestion Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  Add Feedback to Memory
                </span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-modes */}
            <div className="mt-4 flex gap-1 p-1 bg-slate-100 rounded-lg dark:bg-slate-800">
              <button
                onClick={() => setModalMode('manual')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                  modalMode === 'manual'
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setModalMode('csv')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                  modalMode === 'csv'
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                CSV Upload
              </button>
              <button
                onClick={() => setModalMode('transcript')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                  modalMode === 'transcript'
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Transcript
              </button>
            </div>

            {modalMode === 'manual' && (
              <form onSubmit={handleManualSubmit} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Channel
                    </label>
                    <select
                      value={source}
                      onChange={e => setSource(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs"
                    >
                      <option value="Support">Support Ticket</option>
                      <option value="Product Review">Product Review</option>
                      <option value="Sales">Sales Call</option>
                      <option value="Interview">User Interview</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Customer
                    </label>
                    <input
                      type="text"
                      value={customer}
                      onChange={e => setCustomer(e.target.value)}
                      placeholder="e.g. Rahul M."
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Feedback Text
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Enter customer quote..."
                    className="w-full rounded-md border border-slate-200 p-2 text-xs"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !text.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? 'Retaining...' : 'Submit & Retain'}
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'csv' && (
              <div className="mt-4 space-y-3">
                <textarea
                  rows={5}
                  value={csvContent}
                  onChange={e => setCsvContent(e.target.value)}
                  placeholder="source,customer,created_at,feedback_text..."
                  className="w-full font-mono text-xs p-2 border rounded-md"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleCsvSubmit}
                    disabled={importingCsv || !csvContent.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    {importingCsv ? 'Importing...' : 'Import CSV'}
                  </button>
                </div>
              </div>
            )}

            {modalMode === 'transcript' && (
              <div className="mt-4 space-y-3">
                <textarea
                  rows={4}
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder="Speaker: Setup was difficult... Customer: Also CSV export is missing."
                  className="w-full text-xs p-2 border rounded-md"
                />
                <button
                  onClick={handleTranscriptExtract}
                  disabled={extractingTranscript || !transcript.trim()}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  {extractingTranscript ? 'Extracting with Groq...' : 'Extract Items'}
                </button>

                {extractedList && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {extractedList.map((item, i) => (
                      <div
                        key={i}
                        className="p-2 border rounded-md text-xs flex justify-between items-center"
                      >
                        <span className="truncate max-w-xs italic">"{item.feedback_text}"</span>
                        <button
                          onClick={() => handleAddExtracted(item)}
                          className="text-indigo-600 font-bold ml-2"
                        >
                          + Ingest
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
