import { Router, Request, Response } from 'express';
import { getAllLocalMemories } from '../database/db.js';
import { HindsightService } from '../services/hindsightService.js';

export const memoryRouter = Router();
const hindsight = new HindsightService();

// GET all stored memories (local + metadata)
const listMemoriesHandler = async (_req: Request, res: Response) => {
  try {
    const localMemories = getAllLocalMemories();
    const config = hindsight.getConfig();

    res.json({
      memories: localMemories,
      total: localMemories.length,
      config,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

memoryRouter.get('/', listMemoriesHandler);
memoryRouter.get('/list', listMemoriesHandler);

// POST simulate recall directly against Hindsight
memoryRouter.post('/recall', async (req: Request, res: Response) => {
  try {
    const { query, tags, limit } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const hindsightRes = await hindsight.recallFeedback({
      query,
      tags,
      limit: limit || 10,
    });

    if (hindsightRes.success && hindsightRes.memories.length > 0) {
      return res.json({
        provider: 'hindsight',
        memories: hindsightRes.memories,
        count: hindsightRes.memories.length,
      });
    }

    const allLocal = getAllLocalMemories();
    const q = query.toLowerCase();
    const local = allLocal.filter(
      m => m.content.toLowerCase().includes(q) || m.tags.some(t => q.includes(t.toLowerCase()))
    ).slice(0, limit || 10);

    res.json({
      provider: 'local',
      memories: local,
      count: local.length,
      hindsightError: hindsightRes.error,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
