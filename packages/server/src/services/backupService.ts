import dayjs from 'dayjs';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import cron from 'node-cron';
import { tmpdir } from 'os';
import { join } from 'path';
import { createClient, type WebDAVClient } from 'webdav';
import { getDb, getDbPath, reopenDb } from '../db/index.js';

export interface WebDAVConfig {
  server_url: string;
  username: string;
  password: string;
  remote_path: string;
  interval_minutes: number;
  enabled: number;
  last_backup_at: string | null;
}

const GLOBAL_ID = 'global';
let cronJob: cron.ScheduledTask | null = null;

export function getBackupConfig(): WebDAVConfig {
  const db = getDb();
  const config = db.prepare('SELECT * FROM webdav_config WHERE id = ?').get(GLOBAL_ID) as WebDAVConfig | undefined;
  if (!config) {
    return { server_url: '', username: '', password: '', remote_path: '/time-backup/', interval_minutes: 60, enabled: 0, last_backup_at: null };
  }
  return { ...config, password: config.password ? '******' : '' };
}

function getRawConfig(): WebDAVConfig | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM webdav_config WHERE id = ?').get(GLOBAL_ID) as WebDAVConfig | undefined;
}

export function updateBackupConfig(updates: Partial<WebDAVConfig>): WebDAVConfig {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.server_url !== undefined) { fields.push('server_url = ?'); values.push(updates.server_url); }
  if (updates.username !== undefined) { fields.push('username = ?'); values.push(updates.username); }
  if (updates.password !== undefined && updates.password !== '******') { fields.push('password = ?'); values.push(updates.password); }
  if (updates.remote_path !== undefined) { fields.push('remote_path = ?'); values.push(updates.remote_path); }
  if (updates.interval_minutes !== undefined) { fields.push('interval_minutes = ?'); values.push(updates.interval_minutes); }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled); }

  if (fields.length > 0) {
    values.push(GLOBAL_ID);
    db.prepare(`UPDATE webdav_config SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  scheduleBackup();
  return getBackupConfig();
}

function getWebDAVClient(): WebDAVClient | null {
  const config = getRawConfig();
  if (!config || !config.server_url || !config.username || !config.password) return null;
  return createClient(config.server_url, { username: config.username, password: config.password });
}

export async function triggerBackup(): Promise<{ success: boolean; message: string }> {
  return performBackup();
}

async function performBackup(): Promise<{ success: boolean; message: string }> {
  const client = getWebDAVClient();
  if (!client) return { success: false, message: 'WebDAV 未正确配置' };

  const config = getRawConfig()!;
  const remotePath = config.remote_path.endsWith('/') ? config.remote_path : config.remote_path + '/';

  try {
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const backupFileName = `time_backup_${timestamp}.db`;
    const tempPath = join(tmpdir(), `time_backup_${timestamp}.db`);

    // Use VACUUM INTO for a consistent, safe copy without pausing the server
    const db = getDb();
    db.exec(`VACUUM INTO '${tempPath.replace(/'/g, "''")}'`);

    // Stream upload to reduce memory usage
    const stream = createReadStream(tempPath);
    await client.putFileContents(`${remotePath}${backupFileName}`, stream, { overwrite: true });

    // Clean up temp file
    await unlink(tempPath).catch(() => {});

    // Update last backup time
    db.prepare('UPDATE webdav_config SET last_backup_at = ? WHERE id = ?').run(new Date().toISOString(), GLOBAL_ID);

    return { success: true, message: `备份成功: ${backupFileName}` };
  } catch (error) {
    return { success: false, message: `备份失败: ${(error as Error).message}` };
  }
}

export async function restoreFromBackup(fileName?: string): Promise<{ success: boolean; message: string }> {
  const client = getWebDAVClient();
  if (!client) return { success: false, message: 'WebDAV 未正确配置' };

  const config = getRawConfig()!;
  const remotePath = config.remote_path.endsWith('/') ? config.remote_path : config.remote_path + '/';

  try {
    if (!fileName) {
      const contents = await client.getDirectoryContents(remotePath) as Array<{ basename: string; lastmod: string }>;
      const dbFiles = contents
        .filter(f => f.basename.startsWith('time_backup_') && f.basename.endsWith('.db'))
        .sort((a, b) => b.basename.localeCompare(a.basename));
      if (dbFiles.length === 0) return { success: false, message: '未找到备份文件' };
      fileName = dbFiles[0].basename;
    }

    const fileContent = await client.getFileContents(`${remotePath}${fileName}`) as Buffer;

    // First backup current db using VACUUM INTO
    const tempBackup = join(tmpdir(), `time_pre_restore_${Date.now()}.db`);
    const db = getDb();
    db.exec(`VACUUM INTO '${tempBackup.replace(/'/g, "''")}'`);

    // Write restored file
    const { writeFileSync } = await import('fs');
    const dbPath = getDbPath();

    // Close and replace
    const { closeDb } = await import('../db/index.js');
    closeDb();
    writeFileSync(dbPath, fileContent);

    // Reopen
    reopenDb();

    return { success: true, message: `已从 ${fileName} 恢复，原数据已备份到 ${tempBackup}` };
  } catch (error) {
    // Try to reopen on failure
    try { reopenDb(); } catch {}
    return { success: false, message: `恢复失败: ${(error as Error).message}` };
  }
}

export function scheduleBackup(): void {
  if (cronJob) { cronJob.stop(); cronJob = null; }

  const config = getRawConfig();
  if (!config || !config.enabled || !config.server_url) return;

  const interval = Math.max(5, config.interval_minutes || 60);
  const cronExpr = `*/${interval} * * * *`;

  cronJob = cron.schedule(cronExpr, async () => {
    console.log('[Backup] Running scheduled backup...');
    const result = await triggerBackup();
    console.log(`[Backup] ${result.message}`);
  });

  console.log(`[Backup] Scheduled every ${interval} minutes`);
}

export async function getBackupList(): Promise<{ success: boolean; files?: Array<{ name: string; lastmod: string }>; error?: string }> {
  const client = getWebDAVClient();
  if (!client) return { success: false, error: 'WebDAV 未正确配置' };

  try {
    const config = getRawConfig()!;
    const remotePath = config.remote_path.endsWith('/') ? config.remote_path : config.remote_path + '/';
    const contents = await client.getDirectoryContents(remotePath) as Array<{ basename: string; lastmod: string }>;
    const files = contents
      .filter(f => f.basename.startsWith('time_backup_') && f.basename.endsWith('.db'))
      .sort((a, b) => b.basename.localeCompare(a.basename))
      .map(f => ({ name: f.basename, lastmod: f.lastmod }));
    return { success: true, files };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
