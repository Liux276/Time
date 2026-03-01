import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { sanitize } from '../utils/sanitize.js';
import { updateSnapshot } from './statsService.js';

const VALID_STATUSES = new Set(['not_started', 'in_progress', 'completed', 'cancelled']);

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  status: string;
  priority: string;
  parent_id: string | null;
  iteration_id: string | null;
  estimated_hours: number;
  completed_hours: number;
  planned_start: string | null;
  planned_end: string | null;
  created_at: string;
  completed_at: string | null;
  sort_order: number;
}

export interface TaskWithComputed extends TaskRow {
  remaining_hours: number;
  overtime_hours: number;
  progress: number;
  children?: TaskWithComputed[];
  has_children?: boolean;
}

export interface TaskFilter {
  status?: string;
  priority?: string;
  iteration_id?: string;
  parent_id?: string | null;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

function computeFields(task: TaskRow): TaskWithComputed {
  const remaining_hours = Math.max(0, task.estimated_hours - task.completed_hours);
  const overtime_hours = Math.max(0, task.completed_hours - task.estimated_hours);
  const progress = task.estimated_hours > 0
    ? Math.min(100, Math.round((task.completed_hours / task.estimated_hours) * 100))
    : 0;
  return { ...task, remaining_hours, overtime_hours, progress };
}

function aggregateParent(taskId: string): { estimated: number; completed: number } {
  const db = getDb();
  const children = db.prepare('SELECT id, estimated_hours, completed_hours FROM tasks WHERE parent_id = ?').all(taskId) as TaskRow[];
  if (children.length === 0) {
    const self = db.prepare('SELECT estimated_hours, completed_hours FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;
    return { estimated: self?.estimated_hours ?? 0, completed: self?.completed_hours ?? 0 };
  }
  let estimated = 0, completed = 0;
  for (const child of children) {
    const childAgg = aggregateParent(child.id);
    estimated += childAgg.estimated;
    completed += childAgg.completed;
  }
  return { estimated, completed };
}

function enrichTask(task: TaskRow): TaskWithComputed {
  const db = getDb();
  const childCount = db.prepare('SELECT COUNT(*) as cnt FROM tasks WHERE parent_id = ?').get(task.id) as { cnt: number };
  const hasChildren = childCount.cnt > 0;
  if (hasChildren) {
    const agg = aggregateParent(task.id);
    task = { ...task, estimated_hours: agg.estimated, completed_hours: agg.completed };
  }
  return { ...computeFields(task), has_children: hasChildren };
}

export function getTasks(userId: string, filter: TaskFilter): { data: TaskWithComputed[]; total: number } {
  const db = getDb();
  const conditions: string[] = ['t.user_id = ?'];
  const params: unknown[] = [userId];

  if (filter.status) { conditions.push('t.status = ?'); params.push(filter.status); }
  if (filter.priority) { conditions.push('t.priority = ?'); params.push(filter.priority); }
  if (filter.iteration_id) { conditions.push('t.iteration_id = ?'); params.push(filter.iteration_id); }
  if (filter.parent_id !== undefined) {
    if (filter.parent_id === null || filter.parent_id === '') {
      conditions.push('t.parent_id IS NULL');
    } else {
      conditions.push('t.parent_id = ?');
      params.push(filter.parent_id);
    }
  }
  if (filter.search) { conditions.push('t.title LIKE ?'); params.push(`%${filter.search}%`); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const sortBy = filter.sort_by || 'created_at';
  const sortOrder = filter.sort_order === 'asc' ? 'ASC' : 'DESC';
  const allowedSortFields = ['title', 'status', 'priority', 'created_at', 'estimated_hours', 'completed_hours', 'sort_order'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM tasks t ${where}`).get(...params) as { total: number };
  const page = filter.page || 1;
  const pageSize = filter.page_size || 50;
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(
    `SELECT t.* FROM tasks t ${where} ORDER BY t.${safeSortBy} ${sortOrder} LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as TaskRow[];

  return { data: rows.map(enrichTask), total: countRow.total };
}

export function getTaskTree(userId: string): TaskWithComputed[] {
  const db = getDb();
  const allTasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC').all(userId) as TaskRow[];
  const enriched = allTasks.map(enrichTask);
  const map = new Map<string, TaskWithComputed>();
  enriched.forEach((t) => { t.children = []; map.set(t.id, t); });
  const roots: TaskWithComputed[] = [];
  enriched.forEach((t) => {
    if (t.parent_id && map.has(t.parent_id)) map.get(t.parent_id)!.children!.push(t);
    else roots.push(t);
  });
  return roots;
}

export function getTaskById(userId: string, id: string): TaskWithComputed | null {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as TaskRow | undefined;
  if (!task) return null;
  const enriched = enrichTask(task);
  const children = db.prepare('SELECT * FROM tasks WHERE parent_id = ? AND user_id = ? ORDER BY sort_order ASC, created_at ASC').all(id, userId) as TaskRow[];
  enriched.children = children.map(enrichTask);
  return enriched;
}

export function getTaskStatusLogs(userId: string, taskId: string) {
  const db = getDb();
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
  if (!task) return [];
  return db.prepare('SELECT * FROM task_status_logs WHERE task_id = ? ORDER BY changed_at DESC').all(taskId);
}

export interface CreateTaskInput {
  title: string;
  status?: string;
  priority?: string;
  parent_id?: string | null;
  iteration_id?: string | null;
  estimated_hours?: number;
  completed_hours?: number;
  planned_start?: string | null;
  planned_end?: string | null;
  sort_order?: number;
}

export function createTask(userId: string, input: CreateTaskInput): TaskWithComputed {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const title = sanitize(input.title);

  db.prepare(`
    INSERT INTO tasks (id, user_id, title, status, priority, parent_id, iteration_id, estimated_hours, completed_hours, planned_start, planned_end, created_at, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, title, input.status || 'not_started', input.priority || 'medium',
    input.parent_id || null, input.iteration_id || null,
    input.estimated_hours || 0, input.completed_hours || 0,
    input.planned_start || null, input.planned_end || null, now, input.sort_order || 0);

  db.prepare('INSERT INTO task_status_logs (id, task_id, from_status, to_status, changed_at) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), id, '', input.status || 'not_started', now);

  if (input.iteration_id) updateSnapshot(input.iteration_id);
  return getTaskById(userId, id)!;
}

export function updateTask(userId: string, id: string, updates: Partial<CreateTaskInput>): TaskWithComputed | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as TaskRow | undefined;
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];
  const allowedFields: (keyof CreateTaskInput)[] = [
    'title', 'priority', 'parent_id', 'iteration_id',
    'estimated_hours', 'completed_hours', 'planned_start', 'planned_end', 'sort_order',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      let val = updates[field] ?? null;
      if (field === 'title' && typeof val === 'string') val = sanitize(val);
      fields.push(`${field} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return getTaskById(userId, id);

  values.push(id);
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const iterationId = updates.iteration_id ?? existing.iteration_id;
  if (iterationId) updateSnapshot(iterationId);
  if (existing.iteration_id && existing.iteration_id !== updates.iteration_id) updateSnapshot(existing.iteration_id);
  return getTaskById(userId, id);
}

export function changeTaskStatus(userId: string, id: string, newStatus: string): { success: boolean; task?: TaskWithComputed; error?: string } {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as TaskRow | undefined;
  if (!existing) return { success: false, error: 'Task not found' };

  if (!VALID_STATUSES.has(newStatus)) {
    return { success: false, error: 'Invalid status' };
  }

  if (existing.status === newStatus) {
    return { success: false, error: 'Task is already in this status' };
  }

  const now = new Date().toISOString();
  const updateFields: string[] = ['status = ?'];
  const updateValues: unknown[] = [newStatus];
  if (newStatus === 'completed') { updateFields.push('completed_at = ?'); updateValues.push(now); }

  updateValues.push(id);
  db.prepare(`UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
  db.prepare('INSERT INTO task_status_logs (id, task_id, from_status, to_status, changed_at) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), id, existing.status, newStatus, now);
  if (existing.iteration_id) updateSnapshot(existing.iteration_id);
  return { success: true, task: getTaskById(userId, id)! };
}

export function deleteTask(userId: string, id: string): boolean {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as TaskRow | undefined;
  if (!existing) return false;
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (existing.iteration_id) updateSnapshot(existing.iteration_id);
  return true;
}

export interface BatchOperation {
  action: 'update_status' | 'delete' | 'move_iteration' | 'update_priority';
  ids: string[];
  params?: { status?: string; iteration_id?: string | null; priority?: string };
}

export function batchOperation(userId: string, op: BatchOperation): { success: number; failed: number; errors: string[] } {
  const db = getDb();
  let success = 0, failed = 0;
  const errors: string[] = [];

  const transaction = db.transaction(() => {
    for (const id of op.ids) {
      try {
        switch (op.action) {
          case 'update_status': {
            const r = changeTaskStatus(userId, id, op.params?.status || '');
            if (r.success) success++; else { failed++; errors.push(`${id}: ${r.error}`); }
            break;
          }
          case 'delete': {
            if (deleteTask(userId, id)) success++; else { failed++; errors.push(`${id}: not found`); }
            break;
          }
          case 'move_iteration': {
            const t = updateTask(userId, id, { iteration_id: op.params?.iteration_id ?? null });
            if (t) success++; else { failed++; errors.push(`${id}: not found`); }
            break;
          }
          case 'update_priority': {
            const t = updateTask(userId, id, { priority: op.params?.priority });
            if (t) success++; else { failed++; errors.push(`${id}: not found`); }
            break;
          }
        }
      } catch (e) { failed++; errors.push(`${id}: ${(e as Error).message}`); }
    }
  });

  transaction();
  return { success, failed, errors };
}

export function exportTasks(userId: string, filter: TaskFilter, _format: 'xlsx' | 'csv'): TaskWithComputed[] {
  const db = getDb();
  const conditions: string[] = ['user_id = ?'];
  const params: unknown[] = [userId];
  if (filter.status) { conditions.push('status = ?'); params.push(filter.status); }
  if (filter.priority) { conditions.push('priority = ?'); params.push(filter.priority); }
  if (filter.iteration_id) { conditions.push('iteration_id = ?'); params.push(filter.iteration_id); }
  if (filter.search) { conditions.push('title LIKE ?'); params.push(`%${filter.search}%`); }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const rows = db.prepare(`SELECT * FROM tasks ${where} ORDER BY sort_order ASC, created_at ASC`).all(...params) as TaskRow[];
  return rows.map(enrichTask);
}
