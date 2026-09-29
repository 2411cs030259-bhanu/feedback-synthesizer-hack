import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { StatusModal } from './components/StatusModal';
import { ClusterDetailModal } from './components/ClusterDetailModal';
import { UserManualModal } from './components/UserManualModal';
import { PatternDetectionView } from './components/PatternDetectionView';
import { UploadDataView } from './components/UploadDataView';
import { AgentDemoView } from './components/AgentDemoView';
import { InvestigationView } from './components/InvestigationView';
import { MemoryExplorerView } from './components/MemoryExplorerView';
import { FeedbackFeedView } from './components/FeedbackFeedView';
import { ActivityLogView } from './components/ActivityLogView';
import { apiClient } from './services/apiClient';
import type {
  FeedbackItem,
  ComplaintCluster,
  SystemConfigStatus,
  InvestigationResult,
} from './types/feedback';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('patterns');
  const [status, setStatus] = useState<SystemConfigStatus | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [clusters, setClusters] = useState<ComplaintCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<ComplaintCluster | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  // Fetch system status
  const fetchStatus = async () => {
    try {
      setRefreshingStatus(true);
      const data = await apiClient.getStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setRefreshingStatus(false);
    }
  };

  // Fetch feedback items
  const fetchFeedbacks = async () => {
    try {
      const data = await apiClient.getFeedbacks();
      setFeedbackList(data.feedback || []);
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    }
  };

  // Fetch complaint clusters
  const fetchClusters = async () => {
    try {
      const data = await apiClient.getClusters();
      setClusters(data.clusters || []);
    } catch (err) {
      console.error('Failed to fetch clusters:', err);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchStatus(), fetchFeedbacks(), fetchClusters()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Seed / Reset minimal sample dataset (4 items)
  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await apiClient.seedMinimalData();
      await refreshAll();
    } catch (err) {
      console.error('Failed to seed dataset:', err);
    } finally {
      setSeeding(false);
    }
  };

  // Submit custom feedback (Interactive demo)
  const handleProcessCustomFeedback = async (text: string, source: string, customer: string) => {
    const result = await apiClient.submitFeedback({
      feedback_text: text,
      source,
      customer,
      created_at: new Date().toISOString(),
    });
    await refreshAll();
    return result;
  };

  // Natural Language Investigation
  const handleInvestigate = async (question: string): Promise<InvestigationResult> => {
    return await apiClient.investigate(question);
  };

  // Manual single feedback submission
  const handleAddManualFeedback = async (data: {
    source: string;
    customer: string;
    date: string;
    text: string;
  }) => {
    await apiClient.submitFeedback({
      feedback_text: data.text,
      source: data.source,
      customer: data.customer,
      created_at: data.date,
    });
    await refreshAll();
  };

  // CSV Import
  const handleImportCsv = async (csvContent: string) => {
    await apiClient.importCsv(csvContent);
    await refreshAll();
  };

  // Extract from Transcript
  const handleExtractTranscript = async (transcript: string) => {
    return await apiClient.extractTranscript(transcript);
  };

  // Clear Database
  const handleClearAll = async () => {
    if (!window.confirm('Clear all feedback, clusters, and local memories? You can then upload your fresh dataset.')) {
      return;
    }
    await apiClient.clearAllData();
    await refreshAll();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* 3-Zone Clean Top Bar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
        onSeedData={handleSeedData}
        seeding={seeding}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'patterns' && (
          <PatternDetectionView
            clusters={clusters}
            feedbackList={feedbackList}
            onSelectCluster={setSelectedCluster}
            onNavigateToDemo={() => setActiveTab('demo')}
            onNavigateToFeed={() => setActiveTab('feed')}
          />
        )}

        {activeTab === 'upload' && (
          <UploadDataView
            onDataChanged={refreshAll}
            totalFeedbacks={feedbackList.length}
          />
        )}

        {activeTab === 'demo' && (
          <AgentDemoView
            onProcessCustomFeedback={handleProcessCustomFeedback}
            onSeedDemoData={handleSeedData}
            clusters={clusters}
            feedbackList={feedbackList}
          />
        )}

        {activeTab === 'investigation' && (
          <InvestigationView onInvestigate={handleInvestigate} />
        )}

        {activeTab === 'feed' && (
          <FeedbackFeedView
            feedbackList={feedbackList}
            onAddManualFeedback={handleAddManualFeedback}
            onImportCsv={handleImportCsv}
            onExtractTranscript={handleExtractTranscript}
            onClearAll={handleClearAll}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === 'memory' && <MemoryExplorerView status={status} />}

        {activeTab === 'activity' && <ActivityLogView />}
      </main>

      {/* Modals */}
      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        status={status}
        onRefresh={fetchStatus}
        refreshing={refreshingStatus}
      />

      <ClusterDetailModal
        cluster={selectedCluster}
        onClose={() => setSelectedCluster(null)}
      />

      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            User Feedback Synthesizer · AI Agent with Persistent Memory (Groq + Hindsight)
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Memory: {status?.memoryMode === 'hindsight' ? 'Hindsight Cloud' : 'Local Fallback'} · AI: {status?.aiMode === 'groq' ? 'Groq' : 'Local'}
          </div>
        </div>
      </footer>
    </div>
  );
}
