import { Router, Request, Response } from 'express';
import { feedbackAgent } from '../agent/feedbackAgent.js';
import { agentTools } from '../agent/agentTools.js';
import { AgentPlanner } from '../agent/agentPlanner.js';
import { LocalTemplateProvider } from '../services/localTemplateProvider.js';
import { createNormalizedFeedback, parseCsvFeedback } from '../services/feedbackService.js';
import { getAllFeedback, getAllComplaintClusters, clearDatabase } from '../database/db.js';
import { SAMPLE_FEEDBACK_DATA } from '../data/sampleFeedback.js';

export const feedbackRouter = Router();
const localNlp = new LocalTemplateProvider();
const planner = new AgentPlanner();

// GET all feedback
feedbackRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const list = getAllFeedback();
    res.json({ feedback: list, total: list.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST single feedback (processes through full agent loop)
feedbackRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { feedback_text, source, customer, created_at } = req.body;
    if (!feedback_text || typeof feedback_text !== 'string') {
      return res.status(400).json({ error: 'feedback_text is required' });
    }

    const result = await feedbackAgent.processFeedback({
      feedback_text,
      source: source || 'Support',
      customer: customer || 'Anonymous',
      created_at: created_at || new Date().toISOString(),
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST CSV import (for user's new data)
feedbackRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ error: 'csvContent is required' });
    }

    const items = parseCsvFeedback(csvContent);
    const results = [];

    for (const item of items) {
      const result = await feedbackAgent.processFeedback({
        feedback_text: item.feedback_text,
        source: item.source || 'Support',
        customer: item.customer || 'Imported User',
        created_at: item.created_at || new Date().toISOString(),
      });
      results.push(result);
    }

    res.json({
      success: true,
      importedCount: results.length,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST transcript extraction
feedbackRouter.post('/transcript', async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });

    let items = [];
    if (process.env.GROQ_API_KEY) {
      const { GroqProvider } = await import('../services/groqProvider.js');
      const groq = new GroqProvider();
      items = await groq.extractFromTranscript(transcript);
    } else {
      items = await localNlp.extractFromTranscript(transcript);
    }

    res.json({ items, count: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST clear all data
feedbackRouter.post('/clear', async (_req: Request, res: Response) => {
  try {
    clearDatabase();
    res.json({ success: true, message: 'All feedback, clusters, and local memories cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST seed minimal baseline (4 items)
feedbackRouter.post('/seed', async (_req: Request, res: Response) => {
  try {
    clearDatabase();
    let count = 0;

    for (const item of SAMPLE_FEEDBACK_DATA) {
      const analysis = await localNlp.analyzeFeedback(item.feedback_text, {
        source: item.source,
        customer: item.customer,
      });
      const feedback = createNormalizedFeedback(item, analysis);
      await agentTools.retain_memory(feedback);
      await planner.reasonAndCluster(feedback, []);
      count++;
    }

    const clusters = getAllComplaintClusters();
    res.json({
      success: true,
      seededCount: count,
      clustersDetected: clusters.length,
      message: `Seeded ${count} minimal baseline feedback records. Agent identified ${clusters.length} recurring complaint clusters.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
