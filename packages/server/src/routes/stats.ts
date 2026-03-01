import { Request, Response, Router } from 'express';
import { getBurndownData, getWorkloadStats } from '../services/statsService.js';

const router = Router();

router.get('/burndown/:iterationId', (req: Request, res: Response) => {
  try {
      const data = getBurndownData(req.userId!, req.params.iterationId as string);
    if (!data) return res.status(404).json({ error: 'Iteration not found' });
    res.json(data);
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.get('/workload', (req: Request, res: Response) => {
  try {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const granularity = (req.query.granularity as string) || 'month';
      if (!startDate || !endDate) return res.status(400).json({ error: 'start_date and end_date are required' });
      const data = getWorkloadStats(req.userId!, startDate, endDate, granularity);
    res.json(data);
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

export default router;
