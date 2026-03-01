import { NextFunction, Request, Response } from 'express';
import { type UserRole, verifyToken } from '../services/authService.js';

// Extend Express Request to include userId and userRole
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const { userId, role } = verifyToken(token);
    req.userId = userId;
    req.userRole = role;
    next();
  } catch {
    res.status(401).json({ error: '认证令牌无效或已过期' });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  next();
}
