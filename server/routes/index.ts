import { Router } from 'express';
import { feedbackRouter } from './feedbackRoutes.js';
import { complaintRouter } from './complaintRoutes.js';
import { agentRouter } from './agentRoutes.js';
import { memoryRouter } from './memoryRoutes.js';
import { configRouter } from './configRoutes.js';

export const apiRouter = Router();

apiRouter.use('/feedback', feedbackRouter);
apiRouter.use('/complaints', complaintRouter);
apiRouter.use('/agent', agentRouter);
apiRouter.use('/memory', memoryRouter);
apiRouter.use('/config', configRouter);
