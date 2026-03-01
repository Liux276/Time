import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import { Request, Response, Router } from 'express';
import {
    batchOperation, changeTaskStatus, createTask, deleteTask, exportTasks,
    getTaskById, getTasks, getTaskStatusLogs, getTaskTree, updateTask,
    type BatchOperation, type TaskFilter,
} from '../services/taskService.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const filter: TaskFilter = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      iteration_id: req.query.iteration_id as string,
      parent_id: req.query.parent_id === 'null' ? null : req.query.parent_id as string,
      search: req.query.search as string,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as 'asc' | 'desc',
      page: Number(req.query.page) || 1,
      page_size: Number(req.query.page_size) || 50,
    };
      const result = getTasks(req.userId!, filter);
    res.json(result);
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.get('/tree', (req: Request, res: Response) => {
  try {
      res.json(getTaskTree(req.userId!));
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.get('/export', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const filter: TaskFilter = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      iteration_id: req.query.iteration_id as string,
      search: req.query.search as string,
    };
      const tasks = exportTasks(req.userId!, filter, format as 'xlsx' | 'csv');
      const statusMap: Record<string, string> = { not_started: '未开始', in_progress: '进行中', completed: '已完成', cancelled: '已取消' };
      const priorityMap: Record<string, string> = { low: '低', medium: '中', high: '高' };
    const exportData = tasks.map(t => ({
        '标题': t.title, '状态': statusMap[t.status] || t.status, '优先级': priorityMap[t.priority] || t.priority,
        '预估工时': t.estimated_hours, '完成工时': t.completed_hours, '剩余工时': t.remaining_hours,
        '超出工时': t.overtime_hours, '进度(%)': t.progress,
        '预计开始': t.planned_start || '', '预计结束': t.planned_end || '',
        '创建时间': t.created_at, '完成时间': t.completed_at || '',
    }));

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('任务');
      if (exportData.length > 0) {
          sheet.columns = Object.keys(exportData[0]).map(key => ({ header: key, key, width: 15 }));
        exportData.forEach(row => sheet.addRow(row));
      }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else {
        const csvContent = exportData.length > 0 ? stringify(exportData, { header: true }) : '';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
        res.send('\uFEFF' + csvContent);
    }
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
      const id = req.params.id as string;
      const task = getTaskById(req.userId!, id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
      const logs = getTaskStatusLogs(req.userId!, id);
    res.json({ ...task, status_logs: logs });
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { title, status, priority, parent_id, iteration_id, estimated_hours, completed_hours, planned_start, planned_end, sort_order } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
      const task = createTask(req.userId!, { title, status, priority, parent_id, iteration_id, estimated_hours, completed_hours, planned_start, planned_end, sort_order });
    res.status(201).json(task);
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
      const task = updateTask(req.userId!, req.params.id as string, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
      const result = changeTaskStatus(req.userId!, req.params.id as string, status);
      if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result.task);
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
      const deleted = deleteTask(req.userId!, req.params.id as string);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

router.post('/batch', (req: Request, res: Response) => {
  try {
    const op = req.body as BatchOperation;
      if (!op.action || !op.ids?.length) return res.status(400).json({ error: 'action and ids are required' });
      res.json(batchOperation(req.userId!, op));
  } catch (error) { res.status(500).json({ error: (error as Error).message }); }
});

export default router;
