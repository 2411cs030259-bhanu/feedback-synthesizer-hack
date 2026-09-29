import { Router, Request, Response } from 'express';
import { getAgentRuns } from '../database/db.js';
import { feedbackAgent } from '../agent/feedbackAgent.js';

export const agentRouter = Router();

// POST natural language investigation
agentRouter.post('/investigate', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question is required' });
    }

    const result = await feedbackAgent.investigate(question);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET agent activity runs
agentRouter.get('/activity', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const runs = getAgentRuns(limit);
    res.json({ runs, count: runs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
