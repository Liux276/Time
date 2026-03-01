import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { sanitize } from '../utils/sanitize.js';

export interface IterationRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  planned_start: string;
  planned_end: string;
  summary: string;
  created_at: string;
}

export interface IterationWithStats extends IterationRow {
  task_count: number;
  estimated_hours: number;
  completed_hours: number;
  remaining_hours: number;
}

function enrichIteration(iteration: IterationRow): IterationWithStats {
  const db = getDb();
  const stats = db.prepare(`
    SELECT COUNT(*) as task_count,
      COALESCE(SUM(estimated_hours), 0) as estimated_hours,
      COALESCE(SUM(completed_hours), 0) as completed_hours
    FROM tasks WHERE iteration_id = ?
  `).get(iteration.id) as { task_count: number; estimated_hours: number; completed_hours: number };
  return {
    ...iteration,
    task_count: stats.task_count,
    estimated_hours: stats.estimated_hours,
    completed_hours: stats.completed_hours,
    remaining_hours: Math.max(0, stats.estimated_hours - stats.completed_hours),
  };
}

export function getIterations(userId: string): IterationWithStats[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM iterations WHERE user_id = ? ORDER BY created_at DESC').all(userId) as IterationRow[];
  return rows.map(enrichIteration);
}

export function getActiveIteration(userId: string): IterationWithStats | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM iterations WHERE user_id = ? AND status = 'active' LIMIT 1").get(userId) as IterationRow | undefined;
  return row ? enrichIteration(row) : null;
}

export function getLatestIteration(userId: string): IterationWithStats | null {
  const db = getDb();
  // Active first, then most recently created
  const row = db.prepare(
    "SELECT * FROM iterations WHERE user_id = ? ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 1"
  ).get(userId) as IterationRow | undefined;
  return row ? enrichIteration(row) : null;
}

export function getIterationById(userId: string, id: string): IterationWithStats | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM iterations WHERE id = ? AND user_id = ?').get(id, userId) as IterationRow | undefined;
  return row ? enrichIteration(row) : null;
}

export interface CreateIterationInput {
  name: string;
  status?: string;
  planned_start: string;
  planned_end: string;
  summary?: string;
}

export function createIteration(userId: string, input: CreateIterationInput): IterationWithStats {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = input.status || 'planning';
  const name = sanitize(input.name);
  const summary = sanitize(input.summary || '');

  if (!name) throw new Error('迭代名称为必填项');
  if (!input.planned_start) throw new Error('开始时间为必填项');
  if (!input.planned_end) throw new Error('结束时间为必填项');
  if (input.planned_end < input.planned_start) throw new Error('结束时间不能早于开始时间');

  if (status === 'active') {
    const existing = db.prepare("SELECT id FROM iterations WHERE user_id = ? AND status = 'active'").get(userId);
    if (existing) throw new Error('同时只能有一个执行中的迭代');
  }

  db.prepare(`
    INSERT INTO iterations (id, user_id, name, status, planned_start, planned_end, summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, name, status, input.planned_start, input.planned_end, summary, now);

  return getIterationById(userId, id)!;
}

export function updateIteration(userId: string, id: string, updates: Partial<CreateIterationInput>): IterationWithStats | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM iterations WHERE id = ? AND user_id = ?').get(id, userId) as IterationRow | undefined;
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(sanitize(updates.name)); }
  if (updates.planned_start !== undefined) { fields.push('planned_start = ?'); values.push(updates.planned_start); }
  if (updates.planned_end !== undefined) { fields.push('planned_end = ?'); values.push(updates.planned_end); }
  if (updates.summary !== undefined) { fields.push('summary = ?'); values.push(sanitize(updates.summary)); }

  // Validate dates if either is being updated
  const newStart = updates.planned_start ?? existing.planned_start;
  const newEnd = updates.planned_end ?? existing.planned_end;
  if (newStart && newEnd && newEnd < newStart) throw new Error('结束时间不能早于开始时间');

  if (fields.length === 0) return getIterationById(userId, id);
  values.push(id);
  db.prepare(`UPDATE iterations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getIterationById(userId, id);
}

export function changeIterationStatus(userId: string, id: string, newStatus: string): { success: boolean; iteration?: IterationWithStats; error?: string } {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM iterations WHERE id = ? AND user_id = ?').get(id, userId) as IterationRow | undefined;
  if (!existing) return { success: false, error: 'Iteration not found' };

  const validStatuses = ['planning', 'active', 'completed'];
  if (!validStatuses.includes(newStatus)) return { success: false, error: `Invalid status: "${newStatus}"` };

  if (newStatus === 'active') {
    const activeRow = db.prepare("SELECT id FROM iterations WHERE user_id = ? AND status = 'active' AND id != ?").get(userId, id);
    if (activeRow) return { success: false, error: '另一个迭代正在执行中，请先结束它' };
  }

  db.prepare('UPDATE iterations SET status = ? WHERE id = ?').run(newStatus, id);
  return { success: true, iteration: getIterationById(userId, id)! };
}

export function deleteIteration(userId: string, id: string): boolean {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM iterations WHERE id = ? AND user_id = ?').get(id, userId) as IterationRow | undefined;
  if (!existing) return false;
  db.prepare('UPDATE tasks SET iteration_id = NULL WHERE iteration_id = ?').run(id);
  db.prepare('DELETE FROM iterations WHERE id = ?').run(id);
  return true;
}
