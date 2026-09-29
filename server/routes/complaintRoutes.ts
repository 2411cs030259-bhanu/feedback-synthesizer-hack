import { Router, Request, Response } from 'express';
import { getAllComplaintClusters, getComplaintClusterById } from '../database/db.js';

export const complaintRouter = Router();

// GET all complaint clusters
complaintRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const clusters = getAllComplaintClusters();
    res.json({ clusters, total: clusters.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single cluster detail
complaintRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const cluster = getComplaintClusterById(req.params.id);
    if (!cluster) {
      return res.status(404).json({ error: 'Complaint cluster not found' });
    }

    res.json({ cluster, feedbacks: cluster.feedbacks || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
