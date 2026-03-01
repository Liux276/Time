import { Request, Response, Router } from 'express';
import { adminMiddleware, authMiddleware } from '../middleware/auth.js';
import {
  createUser, deleteUser, getUserById, hasAdmin, listUsers,
  login, setupAdmin, updateProfile, updateUser,
} from '../services/authService.js';

const router = Router();

// GET /api/auth/setup-status — public, check if initial setup is needed
router.get('/setup-status', (_req: Request, res: Response) => {
  try {
    res.json({ needsSetup: !hasAdmin() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/auth/setup — public, create first admin (only when no admin exists)
router.post('/setup', async (req: Request, res: Response) => {
  try {
    if (hasAdmin()) {
      return res.status(403).json({ error: '管理员已存在，无法重复初始化' });
    }
    const { username, password, display_name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码为必填项' });
    }
    const result = await setupAdmin(username, password, display_name);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码为必填项' });
    }
    const result = await login(username, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/auth/me — get current user info
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/auth/profile — update own display_name / password
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { display_name, password } = req.body;
    const user = await updateProfile(req.userId!, { display_name, password });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// --- Admin-only user management routes ---

// GET /api/auth/users
router.get('/users', authMiddleware, adminMiddleware, (_req: Request, res: Response) => {
  try {
    res.json(listUsers());
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/auth/users
router.post('/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { username, password, display_name, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码为必填项' });
    }
    const user = await createUser(username, password, display_name, role);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { display_name, role, password } = req.body;
    const user = await updateUser(req.params.id as string, { display_name, role, password });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    deleteUser(req.params.id as string, req.userId!);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
