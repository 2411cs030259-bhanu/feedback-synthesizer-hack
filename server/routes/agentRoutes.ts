import { Router, Request, Response } from 'express';
import { getAllComplaintClusters, getAgentRuns, getAllLocalMemories } from '../database/db.js';
import { HindsightService } from '../services/hindsightService.js';
import { LocalTemplateProvider } from '../services/localTemplateProvider.js';

export const agentRouter = Router();
const hindsight = new HindsightService();
const localNlp = new LocalTemplateProvider();

// POST natural language investigation
agentRouter.post('/investigate', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question is required' });
    }

    const clusters = getAllComplaintClusters();
    let memories: any[] = [];

    // Recall from Hindsight or local store
    if (process.env.HINDSIGHT_API_KEY || process.env.HINDSIGHT_URL) {
      const recallRes = await hindsight.recallFeedback({ query: question, limit: 10 });
      if (recallRes.success && recallRes.memories.length > 0) {
        memories = recallRes.memories;
      }
    }

    if (memories.length === 0) {
      const allLocal = getAllLocalMemories();
      const q = question.toLowerCase();
      memories = allLocal.filter(
        m => m.content.toLowerCase().includes(q) || m.tags.some(t => q.includes(t.toLowerCase()))
      ).slice(0, 10);
    }

    let answerObj: any;
    if (process.env.GROQ_API_KEY) {
      const { GroqProvider } = await import('../services/groqProvider.js');
      const groq = new GroqProvider();
      answerObj = await groq.answerInvestigation(question, memories, clusters);
    } else {
      answerObj = await localNlp.answerInvestigation(question, memories, clusters);
    }

    res.json({
      question,
      answer: answerObj.answer,
      evidence: answerObj.evidence || [],
      clustersReferenced: clusters.length,
      memoriesRetrieved: memories.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET agent activity runs
agentRouter.get('/activity', async (_req: Request, res: Response) => {
  try {
    const runs = getAgentRuns(50);
    res.json({ runs, count: runs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
