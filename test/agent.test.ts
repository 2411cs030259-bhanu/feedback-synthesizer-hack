import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackAgent } from '../server/agent/feedbackAgent.js';
import { memoryService } from '../server/services/memoryService.js';
import { aiService } from '../server/services/aiService.js';
import { clearDatabase, getAllFeedback, getAllComplaintClusters } from '../server/database/db.js';

test('1. Feedback Agent: Ingestion, Normalization and Agent Decision Loop', async () => {
  clearDatabase();

  const input1 = {
    source: 'support',
    customer: 'Test User A',
    feedback_text: 'Setup was difficult and I am stuck during initial setup.',
    created_at: '2026-01-15T10:00:00Z',
  };

  const result1 = await feedbackAgent.processFeedback(input1);

  assert.ok(result1.feedback.id, 'Feedback ID should be generated');
  assert.equal(result1.feedback.source, 'Support', 'Source should be normalized');
  assert.equal(result1.analysis.topic, 'onboarding', 'Topic should be onboarding');
  assert.equal(result1.feedback.sentiment, 'negative', 'Sentiment should be negative');
  assert.ok(result1.retained.success, 'Feedback must be retained in memory');
  assert.ok(result1.agentSteps.length >= 7, 'Agent should execute full workflow steps');

  // Verify DB state
  const feedbacks = getAllFeedback();
  assert.equal(feedbacks.length, 1, 'One feedback item should be in DB');
});

test('2. Memory Service: Retain and Semantic Recall', async () => {
  const retainRes = await memoryService.retainFeedback({
    content: 'Customer complains that CSV export is missing and finance cannot download reports.',
    document_id: 'doc_test_export',
    metadata: {
      source: 'Sales',
      date: '2026-03-01',
      topic: 'export',
      problem: 'Missing CSV export',
    },
    tags: ['export', 'csv', 'negative'],
  });

  assert.ok(retainRes.success, 'Retain operation should succeed');

  // Query memory using semantic synonyms without exact words
  const recallRes = await memoryService.recallFeedback({
    query: 'download data file report',
    limit: 5,
  });

  assert.ok(recallRes.success, 'Recall should succeed');
  assert.ok(recallRes.memories.length > 0, 'Should recall semantically related memory');
  assert.ok(
    recallRes.memories.some(m => m.content.includes('CSV export')),
    'Recalled item should match export memory'
  );
});

test('3. Recurring Complaint Detection across Channels and Time', async () => {
  clearDatabase();

  // Item 1: Jan Support
  await feedbackAgent.processFeedback({
    source: 'Support',
    customer: 'Rahul',
    created_at: '2026-01-12T10:00:00Z',
    feedback_text: 'Setup was difficult and I was not sure how to begin using this.',
  });

  // Item 2: March Product Review
  await feedbackAgent.processFeedback({
    source: 'Product Review',
    customer: 'Marcus',
    created_at: '2026-03-18T10:00:00Z',
    feedback_text: 'The product is good but onboarding is confusing for our new team members.',
  });

  // Item 3: June Sales
  const result3 = await feedbackAgent.processFeedback({
    source: 'Sales',
    customer: 'Devon',
    created_at: '2026-06-04T10:00:00Z',
    feedback_text: 'Our team struggled during initial setup and almost dropped the evaluation.',
  });

  assert.ok(result3.isRecurring, 'Agent should identify recurring complaint across channels');
  assert.ok(result3.cluster, 'Complaint cluster should be formed');
  assert.ok(result3.cluster!.occurrence_count >= 3, 'Should count at least 3 occurrences');
  assert.ok(result3.cluster!.source_count >= 2, 'Should detect multiple channels');

  const allClusters = getAllComplaintClusters();
  assert.ok(allClusters.length >= 1, 'Cluster should be recorded in database');
});

test('4. Natural Language Investigation with Real Citations', async () => {
  const investigation = await feedbackAgent.investigate('Has anyone complained about onboarding before?');

  assert.ok(investigation.relevantFound, 'Should find relevant memories');
  assert.ok(investigation.recalledCount >= 1, 'Should have recalled memories');
  assert.ok(investigation.answer.length > 20, 'Answer should be non-empty');
  assert.ok(investigation.evidence.length >= 1, 'Evidence array should be populated');
  assert.ok(investigation.channels.length >= 1, 'Channels should be identified');
});

test('5. Status Reporting: No fake connections', async () => {
  const memStatus = await memoryService.getStatus();
  assert.ok(memStatus.provider === 'hindsight' || memStatus.provider === 'local');

  const aiStatus = await aiService.getStatus();
  assert.ok(aiStatus.provider === 'groq' || aiStatus.provider === 'local');
});
