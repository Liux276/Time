import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import { getDb } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'time-app-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

export type UserRole = 'admin' | 'user';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface UserPublic {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResult {
  token: string;
  user: UserPublic;
}

function toPublic(user: UserRow): UserPublic {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    created_at: user.created_at,
  };
}

function validateUsername(raw: string): string {
  const clean = xss(raw.trim().toLowerCase());
  if (!clean || clean.length < 2 || clean.length > 32) {
    throw new Error('用户名长度需在 2-32 个字符之间');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    throw new Error('用户名只能包含字母、数字和下划线');
  }
  return clean;
}

function validatePassword(password: string): void {
  if (!password || password.length < 6 || password.length > 128) {
    throw new Error('密码长度需在 6-128 个字符之间');
  }
}

/** Check whether at least one admin user exists */
export function hasAdmin(): boolean {
  const db = getDb();
  const row = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  return !!row;
}

/** First-time setup: create the initial admin account (only when no admin exists) */
export async function setupAdmin(username: string, password: string, displayName?: string): Promise<AuthResult> {
  if (hasAdmin()) {
    throw new Error('管理员已存在，无法重复初始化');
  }

  const db = getDb();
  const cleanUsername = validateUsername(username);
  validatePassword(password);
  const cleanDisplayName = xss((displayName || cleanUsername).trim());

  const id = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  db.prepare(
    'INSERT INTO users (id, username, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, cleanUsername, passwordHash, cleanDisplayName, 'admin', now);

  const user: UserRow = { id, username: cleanUsername, password_hash: passwordHash, display_name: cleanDisplayName, role: 'admin', created_at: now };
  const token = signToken(user.id, user.role);
  return { token, user: toPublic(user) };
}

/** Admin creates a new user (admin or regular) */
export async function createUser(
  username: string, password: string, displayName?: string, role: UserRole = 'user',
): Promise<UserPublic> {
  const db = getDb();
  const cleanUsername = validateUsername(username);
  validatePassword(password);
  const cleanDisplayName = xss((displayName || cleanUsername).trim());

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    throw new Error('该用户名已被注册');
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  db.prepare(
    'INSERT INTO users (id, username, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, cleanUsername, passwordHash, cleanDisplayName, role, now);

  return { id, username: cleanUsername, display_name: cleanDisplayName, role, created_at: now };
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const db = getDb();
  const cleanUsername = username.trim().toLowerCase();

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername) as UserRow | undefined;
  if (!user) {
    throw new Error('用户名或密码错误');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new Error('用户名或密码错误');
  }

  const token = signToken(user.id, user.role);
  return { token, user: toPublic(user) };
}

export function verifyToken(token: string): { userId: string; role: UserRole } {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role?: UserRole };
    // Fallback for tokens without role (issued before migration)
    return { userId: payload.userId, role: payload.role || 'user' };
  } catch {
    throw new Error('Token 无效或已过期');
  }
}

export function getUserById(id: string): UserPublic | null {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return user ? toPublic(user) : null;
}

export function listUsers(): UserPublic[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[];
  return rows.map(toPublic);
}

export async function updateUser(id: string, updates: { display_name?: string; role?: UserRole; password?: string }): Promise<UserPublic> {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!user) throw new Error('用户不存在');

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.display_name !== undefined) {
    fields.push('display_name = ?');
    values.push(xss(updates.display_name.trim()));
  }
  if (updates.role !== undefined) {
    if (!['admin', 'user'].includes(updates.role)) throw new Error('无效的角色');
    fields.push('role = ?');
    values.push(updates.role);
  }
  if (updates.password) {
    validatePassword(updates.password);
    const hash = await bcrypt.hash(updates.password, SALT_ROUNDS);
    fields.push('password_hash = ?');
    values.push(hash);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getUserById(id)!;
}

export function deleteUser(id: string, currentUserId: string): void {
  if (id === currentUserId) throw new Error('不能删除自己');
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) throw new Error('用户不存在');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

/** Update own profile (display_name and/or password) */
export async function updateProfile(userId: string, updates: { display_name?: string; password?: string }): Promise<UserPublic> {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.display_name !== undefined) {
    fields.push('display_name = ?');
    values.push(xss(updates.display_name.trim()));
  }
  if (updates.password) {
    validatePassword(updates.password);
    const hash = await bcrypt.hash(updates.password, SALT_ROUNDS);
    fields.push('password_hash = ?');
    values.push(hash);
  }

  if (fields.length > 0) {
    values.push(userId);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getUserById(userId)!;
}

function signToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
