import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

export function updateSnapshot(iterationId: string): void {
  const db = getDb();
  const today = dayjs().format('YYYY-MM-DD');

  const stats = db.prepare(`
    SELECT COALESCE(SUM(estimated_hours), 0) as total_estimated,
      COALESCE(SUM(completed_hours), 0) as total_completed
    FROM tasks WHERE iteration_id = ?
  `).get(iterationId) as { total_estimated: number; total_completed: number };

  const remaining = Math.max(0, stats.total_estimated - stats.total_completed);

  const existing = db.prepare(
    'SELECT id FROM daily_snapshots WHERE iteration_id = ? AND snapshot_date = ?'
  ).get(iterationId, today) as { id: string } | undefined;

  if (existing) {
    db.prepare('UPDATE daily_snapshots SET remaining_hours = ?, completed_hours = ? WHERE id = ?')
      .run(remaining, stats.total_completed, existing.id);
  } else {
    db.prepare('INSERT INTO daily_snapshots (id, iteration_id, snapshot_date, remaining_hours, completed_hours) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), iterationId, today, remaining, stats.total_completed);
  }
}

export function getBurndownData(userId: string, iterationId: string) {
  const db = getDb();
  const iteration = db.prepare('SELECT * FROM iterations WHERE id = ? AND user_id = ?').get(iterationId, userId) as {
    planned_start: string | null; planned_end: string | null;
  } | undefined;
  if (!iteration) return null;

  const snapshots = db.prepare(
    'SELECT snapshot_date, remaining_hours, completed_hours FROM daily_snapshots WHERE iteration_id = ? ORDER BY snapshot_date ASC'
  ).all(iterationId) as { snapshot_date: string; remaining_hours: number; completed_hours: number }[];

  let idealLine: { date: string; hours: number }[] = [];
  if (iteration.planned_start && iteration.planned_end && snapshots.length > 0) {
    const start = dayjs(iteration.planned_start);
    const end = dayjs(iteration.planned_end);
    const totalDays = end.diff(start, 'day');
    const totalHours = (snapshots[0]?.remaining_hours || 0) + (snapshots[0]?.completed_hours || 0);
    if (totalDays > 0) {
      const dailyBurn = totalHours / totalDays;
      for (let i = 0; i <= totalDays; i++) {
        idealLine.push({ date: start.add(i, 'day').format('YYYY-MM-DD'), hours: Math.max(0, totalHours - dailyBurn * i) });
      }
    }
  }

  return {
    iteration_id: iterationId,
    planned_start: iteration.planned_start,
    planned_end: iteration.planned_end,
    snapshots,
    ideal_line: idealLine,
  };
}

export function getWorkloadStats(userId: string, startDate: string, endDate: string, granularity: string = 'month') {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT completed_hours, completed_at, created_at FROM tasks
    WHERE user_id = ? AND completed_hours > 0
      AND ((completed_at IS NOT NULL AND completed_at >= ? AND completed_at <= ?)
        OR (completed_at IS NULL AND created_at >= ? AND created_at <= ?))
  `).all(userId, startDate, endDate + 'T23:59:59', startDate, endDate + 'T23:59:59') as {
    completed_hours: number; completed_at: string | null; created_at: string;
  }[];

  const groups = new Map<string, number>();
  for (const task of tasks) {
    const date = task.completed_at || task.created_at;
    let key: string;
    switch (granularity) {
      case 'week': key = dayjs(date).startOf('week').format('YYYY-MM-DD'); break;
      case 'quarter': { const d = dayjs(date); key = `${d.year()}-Q${Math.floor(d.month() / 3) + 1}`; break; }
      case 'year': key = dayjs(date).format('YYYY'); break;
      default: key = dayjs(date).format('YYYY-MM'); break;
    }
    groups.set(key, (groups.get(key) || 0) + task.completed_hours);
  }

  const result = Array.from(groups.entries())
    .map(([period, hours]) => ({ period, hours: Math.round(hours * 100) / 100 }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return {
    start_date: startDate, end_date: endDate, granularity,
    data: result,
    total_hours: Math.round(result.reduce((sum, item) => sum + item.hours, 0) * 100) / 100,
  };
}
