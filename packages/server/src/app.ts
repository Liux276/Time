import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { adminMiddleware, authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import backupRouter from './routes/backup.js';
import iterationsRouter from './routes/iterations.js';
import statsRouter from './routes/stats.js';
import tasksRouter from './routes/tasks.js';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
}));

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));

// Global rate limit: 200 requests per minute
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '请求过于频繁，请稍后再试' },
}));

// Stricter rate limit for auth endpoints: 10 per minute
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '登录/注册请求过于频繁，请稍后再试' },
});

// Public routes (no auth required)
app.use('/api/auth', authLimiter, authRouter);

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes (auth required)
app.use('/api/tasks', authMiddleware, tasksRouter);
app.use('/api/iterations', authMiddleware, iterationsRouter);
app.use('/api/stats', authMiddleware, statsRouter);
app.use('/api/backup', authMiddleware, adminMiddleware, backupRouter);

export default app;
