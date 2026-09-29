import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface UploadDataViewProps {
  onDataChanged: () => Promise<void>;
  totalFeedbacks: number;
}

export const UploadDataView: React.FC<UploadDataViewProps> = ({
  onDataChanged,
  totalFeedbacks,
}) => {
  const [activeMode, setActiveMode] = useState<'csv' | 'paste' | 'single' | 'transcript'>('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV file & text state
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ count: number; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Single manual feedback
  const [source, setSource] = useState('Support');
  const [customer, setCustomer] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // Transcript state
  const [transcript, setTranscript] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedList, setExtractedList] = useState<any[] | null>(null);

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg(null);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file');
    };
    reader.readAsText(file);
  };

  // Ingest CSV
  const handleIngestCsv = async () => {
    if (!csvContent.trim()) {
      setErrorMsg('Please upload a file or paste CSV content first.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setUploadResult(null);

    try {
      const res = await apiClient.importCsv(csvContent.trim());
      setUploadResult({
        count: res.importedCount || 0,
        message: `Successfully ingested ${res.importedCount} feedback records into Hindsight Memory and Groq AI.`,
      });
      setCsvContent('');
      setFileName('');
      await onDataChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to ingest CSV data');
    } finally {
      setIsUploading(false);
    }
  };

  // Ingest Single
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setIsSubmittingSingle(true);
    setErrorMsg(null);
    try {
      await apiClient.submitFeedback({
        feedback_text: feedbackText.trim(),
        source,
        customer: customer.trim() || 'Anonymous',
        created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
      });
      setUploadResult({
        count: 1,
        message: `Feedback recorded and retained into memory bank.`,
      });
      setFeedbackText('');
      setCustomer('');
      await onDataChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // Ingest Transcript
  const handleExtractTranscript = async () => {
    if (!transcript.trim()) return;
    setIsExtracting(true);
    setErrorMsg(null);
    try {
      const items = await apiClient.extractTranscript(transcript.trim());
      setExtractedList(items);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to extract transcript items');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleIngestExtractedItem = async (item: any) => {
    await apiClient.submitFeedback({
      feedback_text: item.feedback_text,
      source: item.source || 'Interview',
      customer: item.customer || 'Speaker',
      created_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
    });
    setExtractedList(prev => prev?.filter(i => i !== item) || null);
    await onDataChanged();
  };

  // Download Sample CSV
  const handleDownloadSample = () => {
    const sample = `date,source,customer,feedback_text
2026-02-10,Support,Jane Doe,"The onboarding steps were not clear and I couldn't set up my account."
2026-04-15,Sales,Acme Corp,"Prospect complained that initial configuration was too confusing."
2026-07-20,Product Review,Marcus L.,"Great features but getting started documentation is missing key steps."`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_feedback.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear Database
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all feedback, clusters, and local memories? You can then upload your fresh dataset.')) {
      return;
    }
    try {
      await apiClient.clearAllData();
      setUploadResult({
        count: 0,
        message: 'All data cleared. Database is now empty and ready for your new data.',
      });
      await onDataChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clear data');
    }
  };

  // Load Minimal Baseline
  const handleLoadMinimal = async () => {
    try {
      const res = await apiClient.seedMinimalData();
      setUploadResult({
        count: res.seededCount || 4,
        message: `Loaded minimal 4-item baseline dataset across 4 channels.`,
      });
      await onDataChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to seed baseline');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Data Ingestion Hub</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Upload Your Own Customer Feedback
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Upload your CSV feedback files, paste transcripts, or enter single complaints. Every entry is normalized, parsed for sentiment by Groq, and retained in persistent Hindsight memory.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400"
              title="Clear all records to start completely fresh"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All Data ({totalFeedbacks})</span>
            </button>

            <button
              onClick={handleLoadMinimal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Reset to 4-item minimal baseline"
            >
              <Database className="h-3.5 w-3.5" />
              <span>Reset Minimal Baseline (4 items)</span>
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {uploadResult && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{uploadResult.message}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveMode('csv')}
          className={`pb-3 text-xs font-bold transition-colors relative flex items-center gap-2 ${
            activeMode === 'csv'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Upload CSV File</span>
        </button>

        <button
          onClick={() => setActiveMode('paste')}
          className={`pb-3 text-xs font-bold transition-colors relative flex items-center gap-2 ${
            activeMode === 'paste'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Paste Raw Text / CSV</span>
        </button>

        <button
          onClick={() => setActiveMode('single')}
          className={`pb-3 text-xs font-bold transition-colors relative flex items-center gap-2 ${
            activeMode === 'single'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>Single Feedback Entry</span>
        </button>

        <button
          onClick={() => setActiveMode('transcript')}
          className={`pb-3 text-xs font-bold transition-colors relative flex items-center gap-2 ${
            activeMode === 'transcript'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Extract from Call Transcript</span>
        </button>
      </div>

      {/* Mode 1: CSV File Upload */}
      {activeMode === 'csv' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Upload CSV File
              </h2>
              <p className="text-xs text-slate-500">
                Supports columns: <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">date</code>,{' '}
                <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">source</code>,{' '}
                <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">customer</code>,{' '}
                <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">feedback_text</code>
              </p>
            </div>

            <button
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Sample CSV</span>
            </button>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50/50 transition-all dark:border-slate-800 dark:hover:bg-slate-800/40"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.txt"
              className="hidden"
            />
            <UploadCloud className="mx-auto h-8 w-8 text-indigo-500 mb-2" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {fileName ? fileName : 'Click to select CSV file from your computer'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports .csv and text formats with headers
            </p>
          </div>

          {csvContent && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Preview of Selected File ({csvContent.split('\n').filter(Boolean).length} lines)
                </span>
                <button
                  onClick={() => {
                    setCsvContent('');
                    setFileName('');
                  }}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Clear Selection
                </button>
              </div>

              <textarea
                readOnly
                value={csvContent}
                rows={6}
                className="w-full font-mono text-xs rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
              />

              <button
                onClick={handleIngestCsv}
                disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Ingesting & Processing Feedback with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Ingest {csvContent.split('\n').filter(Boolean).length - 1} Records into Memory</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Paste Raw CSV / Lines */}
      {activeMode === 'paste' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Paste Raw Feedback Lines
            </h2>
            <p className="text-xs text-slate-500">
              Paste comma-separated feedback rows or lines. First row can be header: <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">source,customer,date,feedback_text</code>.
            </p>
          </div>

          <textarea
            rows={8}
            value={csvContent}
            onChange={e => setCsvContent(e.target.value)}
            placeholder={`Support,Alice,2026-05-10,"Setup was confusing and team dropped evaluation."
Product Review,Bob,2026-06-15,"Great platform but getting started guide is outdated."`}
            className="w-full font-mono text-xs rounded-lg border border-slate-200 bg-white p-3 text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <button
            onClick={handleIngestCsv}
            disabled={isUploading || !csvContent.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Process & Retain Lines</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Mode 3: Single Entry */}
      {activeMode === 'single' && (
        <form
          onSubmit={handleSingleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Single Feedback Ingestion
            </h2>
            <p className="text-xs text-slate-500">
              Directly input a single customer review, support quote, or sales call note.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Channel / Source
              </label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="Support">Support Ticket</option>
                <option value="Product Review">Product Review</option>
                <option value="Sales">Sales Call</option>
                <option value="Interview">User Interview</option>
                <option value="Social">Social / Forum</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Customer Name / Org
              </label>
              <input
                type="text"
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                placeholder="e.g. Acme Corp / Alex Chen"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Feedback Text / Verbatim Quote
            </label>
            <textarea
              rows={4}
              required
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="e.g. Setup was difficult and our engineers couldn't configure the initial workspace."
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingSingle || !feedbackText.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmittingSingle ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Retaining in Memory...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Submit & Retain in Bank</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Mode 4: Transcript */}
      {activeMode === 'transcript' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Extract from Call / Interview Transcript
            </h2>
            <p className="text-xs text-slate-500">
              Paste meeting notes, Gong/Zoom transcripts, or user call summaries. Groq AI will identify discrete customer complaints and quotes.
            </p>
          </div>

          <textarea
            rows={6}
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder={`Interviewer: How was your experience onboarding?
Customer: Honestly, setup took 3 days because docs were confusing. Also we desperately need CSV exports.`}
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <button
            onClick={handleExtractTranscript}
            disabled={isExtracting || !transcript.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Extracting with Groq AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Extract Feedback Items</span>
              </>
            )}
          </button>

          {extractedList && extractedList.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Extracted Items ({extractedList.length}) - Click to Retain:
              </span>
              {extractedList.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="max-w-xl">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                      {item.source || 'Interview'} · {item.customer || 'Speaker'}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      "{item.feedback_text}"
                    </p>
                  </div>
                  <button
                    onClick={() => handleIngestExtractedItem(item)}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shrink-0 ml-3"
                  >
                    <span>+ Retain</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
