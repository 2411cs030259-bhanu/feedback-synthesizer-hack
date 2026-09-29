import 'dotenv/config';
import express, { Request, Response } from 'express';
import { apiRouter } from '../server/routes/index.js';

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'User Feedback Synthesizer Agent',
    platform: 'Vercel Serverless',
  });
});

// Modular Backend Routes
app.use('/api', apiRouter);

export default app;
