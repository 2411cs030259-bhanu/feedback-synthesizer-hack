import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
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
      backendStack: 'Python FastAPI + Pydantic + HTTPX + hindsight-client',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET download complete project zip
configRouter.get('/download-zip', (_req: Request, res: Response) => {
  const publicZip = path.resolve(process.cwd(), 'public', 'user-feedback-synthesizer.zip');
  const rootZip = path.resolve(process.cwd(), 'user-feedback-synthesizer.zip');
  const target = fs.existsSync(publicZip) ? publicZip : rootZip;

  if (fs.existsSync(target)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="user-feedback-synthesizer.zip"');
    fs.createReadStream(target).pipe(res);
  } else {
    res.status(404).json({ error: 'Project zip file not found' });
  }
});
