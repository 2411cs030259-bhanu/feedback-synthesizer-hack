import 'dotenv/config';
import express, { Request, Response } from 'express';
import { apiRouter } from './server/routes/index.js';

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'User Feedback Synthesizer Agent',
  });
});

// Mount all API routes
app.use('/api', apiRouter);

// Export Express application for Vercel
export default app;
