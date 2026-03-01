import { Request, Response, Router } from 'express';
import {
    changeIterationStatus, createIteration, deleteIteration,
    getActiveIteration, getIterationById, getIterations, getLatestIteration, updateIteration,
} from '../services/iterationService.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
    try { res.json(getIterations(req.userId!)); }
    catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.get('/active', (req: Request, res: Response) => {
    try { res.json(getActiveIteration(req.userId!)); }
    catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.get('/latest', (req: Request, res: Response) => {
    try { res.json(getLatestIteration(req.userId!)); }
    catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
      const iteration = getIterationById(req.userId!, req.params.id as string);
    if (!iteration) return res.status(404).json({ error: 'Iteration not found' });
    res.json(iteration);
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, status, planned_start, planned_end, summary } = req.body;
      if (!name) return res.status(400).json({ error: '迭代名称为必填项' });
      if (!planned_start) return res.status(400).json({ error: '开始时间为必填项' });
      if (!planned_end) return res.status(400).json({ error: '结束时间为必填项' });
      const iteration = createIteration(req.userId!, { name, status, planned_start, planned_end, summary });
    res.status(201).json(iteration);
  } catch (error) { res.status(400).json({ error: (error as Error).message }); }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
      const iteration = updateIteration(req.userId!, req.params.id as string, req.body);
    if (!iteration) return res.status(404).json({ error: 'Iteration not found' });
    res.json(iteration);
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
      const result = changeIterationStatus(req.userId!, req.params.id as string, status);
      if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result.iteration);
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
      const deleted = deleteIteration(req.userId!, req.params.id as string);
    if (!deleted) return res.status(404).json({ error: 'Iteration not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

export default router;
