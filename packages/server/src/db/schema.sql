-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  iteration_id TEXT REFERENCES iterations(id) ON DELETE SET NULL,
  estimated_hours REAL DEFAULT 0,
  completed_hours REAL DEFAULT 0,
  planned_start TEXT,
  planned_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Task status change logs
CREATE TABLE IF NOT EXISTS task_status_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Iterations table
CREATE TABLE IF NOT EXISTS iterations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  planned_start TEXT NOT NULL,
  planned_end TEXT NOT NULL,
  summary TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Daily snapshots for burndown charts
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id TEXT PRIMARY KEY,
  iteration_id TEXT NOT NULL REFERENCES iterations(id) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,
  remaining_hours REAL DEFAULT 0,
  completed_hours REAL DEFAULT 0,
  UNIQUE(iteration_id, snapshot_date)
);

-- WebDAV backup configuration (global, single row)
CREATE TABLE IF NOT EXISTS webdav_config (
  id TEXT PRIMARY KEY,
  server_url TEXT DEFAULT '',
  username TEXT DEFAULT '',
  password TEXT DEFAULT '',
  remote_path TEXT DEFAULT '/time-backup/',
  interval_minutes INTEGER DEFAULT 60,
  enabled INTEGER DEFAULT 0,
  last_backup_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_iteration_id ON tasks(iteration_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_status_logs_task_id ON task_status_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_iteration ON daily_snapshots(iteration_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_iterations_user_id ON iterations(user_id);

