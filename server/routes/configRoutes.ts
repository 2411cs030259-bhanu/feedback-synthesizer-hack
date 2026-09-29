import { Router, Request, Response } from 'express';
import { HindsightService } from '../services/hindsightService.js';
import { GroqProvider } from '../services/groqProvider.js';
import { getAllFeedback, getAllComplaintClusters, countLocalMemories } from '../database/db.js';

export const configRouter = Router();
const hindsight = new HindsightService();
const groq = new GroqProvider();

// GET system health and configuration status
configRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const [hindsightHealth, groqHealth] = await Promise.all([
      hindsight.checkHealth(),
      groq.checkHealth(),
    ]);

    const totalFeedback = getAllFeedback().length;
    const totalClusters = getAllComplaintClusters().length;
    const totalMemories = countLocalMemories();

    res.json({
      groq: groqHealth.connected,
      hindsight: hindsightHealth.connected,
      memoryMode: hindsightHealth.connected ? 'hindsight' : 'local',
      aiMode: groqHealth.connected ? 'groq' : 'local',
      groqModel: groqHealth.model,
      groqMessage: groqHealth.message,
      hindsightUrl: hindsight.getConfig().url,
      hindsightBank: hindsight.getConfig().bank,
      hindsightMessage: hindsightHealth.message,
      totalFeedbackCount: totalFeedback,
      totalClusterCount: totalClusters,
      totalMemoryCount: totalMemories,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
