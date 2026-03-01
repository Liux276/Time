import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', '..', 'data');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = join(DATA_DIR, 'time.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(database: Database.Database): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  database.exec(schema);

  // --- Incremental migrations for existing databases ---

  // Add role column to users if missing
  const userCols = database.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some(c => c.name === 'role')) {
    database.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'))");
  }

  // Migrate webdav_config: drop user_id dependency, keep one global row
  const wdCols = database.prepare("PRAGMA table_info(webdav_config)").all() as { name: string }[];
  if (wdCols.some(c => c.name === 'user_id')) {
    // Pick the best existing config to keep (prefer enabled, then first)
    const best = database.prepare(
      "SELECT * FROM webdav_config ORDER BY enabled DESC, rowid ASC LIMIT 1"
    ).get() as Record<string, unknown> | undefined;

    database.exec("DROP TABLE webdav_config");
    database.exec(`CREATE TABLE IF NOT EXISTS webdav_config (
      id TEXT PRIMARY KEY,
      server_url TEXT DEFAULT '',
      username TEXT DEFAULT '',
      password TEXT DEFAULT '',
      remote_path TEXT DEFAULT '/time-backup/',
      interval_minutes INTEGER DEFAULT 60,
      enabled INTEGER DEFAULT 0,
      last_backup_at TEXT
    )`);

    if (best) {
      database.prepare(
        `INSERT OR IGNORE INTO webdav_config (id, server_url, username, password, remote_path, interval_minutes, enabled, last_backup_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run('global', best.server_url || '', best.username || '', best.password || '',
            best.remote_path || '/time-backup/', best.interval_minutes ?? 60,
            best.enabled ?? 0, best.last_backup_at ?? null);
    }
  }

  // Ensure global webdav_config row exists
  const globalConfig = database.prepare("SELECT id FROM webdav_config WHERE id = 'global'").get();
  if (!globalConfig) {
    database.prepare("INSERT INTO webdav_config (id) VALUES ('global')").run();
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
      (db as unknown) = undefined;
  }
}

/** Re-open the database after a restore operation */
export function reopenDb(): Database.Database {
    closeDb();
    return getDb();
}

export function getDbPath(): string {
  return DB_PATH;
}

/** Reset database — deletes and recreates (dev only) */
export function resetDb(): void {
    closeDb();
    if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
    // WAL/SHM files
    if (existsSync(DB_PATH + '-wal')) unlinkSync(DB_PATH + '-wal');
    if (existsSync(DB_PATH + '-shm')) unlinkSync(DB_PATH + '-shm');
    getDb();
}
