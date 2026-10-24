import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import booksRouter from './routes/books.js';
import authRouter from './routes/auth.js';
import cartRouter from './routes/cart.js';
import wishlistRouter from './routes/wishlist.js';
import ordersRouter from './routes/orders.js';
import reviewsRouter from './routes/reviews.js';
import adminRouter from './routes/admin.js';
import recommendationsRouter from './routes/recommendations.js';
import readingListRouter from './routes/readingList.js';
import { hashPassword } from './lib/auth.js';
import { store } from './lib/store.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());

/* ── CORS ────────────────────────────────────────────────────────────── */
const configuredOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bookhaven-cyan.vercel.app',
  ...configuredOrigins,
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    // Allow any Vercel deployment preview or production domain
    if (/^https:\/\/[a-z0-9-]+(\.vercel\.app)$/i.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

/* ── Rate Limiting ───────────────────────────────────────────────────── */
app.use(rateLimit({
  windowMs: 60_000, limit: 200,
  standardHeaders: 'draft-8', legacyHeaders: false,
}));

/* ── Health Check ────────────────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({
  status: 'ok', service: 'bookhaven-api',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

app.get('/api/health', (_req, res) => res.json({
  status: 'ok', service: 'bookhaven-api',
  timestamp: new Date().toISOString(),
}));

/* ── API Routes ──────────────────────────────────────────────────────── */
app.use('/api/books', booksRouter);
app.use('/api/auth', authRouter);
app.use('/api/cart', cartRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/reading-list', readingListRouter);

/* ── 404 ─────────────────────────────────────────────────────────────── */
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

/* ── Error Handler ───────────────────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  if (err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  const status = err.status || err.statusCode || 500;
  console.error(`[ERROR] ${new Date().toISOString()} ${err.message}`);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

/* ── Seed Admin & Demo Users ─────────────────────────────────────────── */
async function seedAdmin() {
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const adminEmails = [
    process.env.ADMIN_EMAIL || 'admin@bookhaven.com',
    'admin@bookhaven.dev',
  ];

  for (const email of adminEmails) {
    if (!await store.findUserByEmail(email)) {
      const password_hash = await hashPassword(adminPass);
      await store.createUser({
        email,
        password_hash,
        display_name: 'BookHaven Admin',
        role: 'admin',
      });
      console.log(`[SEED] Admin user seeded: ${email}`);
    }
  }

  // Seed demo reader
  if (!await store.findUserByEmail('reader@bookhaven.dev')) {
    const password_hash = await hashPassword('reader123');
    await store.createUser({
      email: 'reader@bookhaven.dev',
      password_hash,
      display_name: 'Elena Vance',
      role: 'customer',
    });
    console.log('[SEED] Demo reader seeded: reader@bookhaven.dev');
  }
}

/* ── Start Server ────────────────────────────────────────────────────── */
const port = Number(process.env.PORT) || 4000;
if (process.env.NODE_ENV !== 'test') {
  seedAdmin().then(() => {
    app.listen(port, () => {
      console.log(`\n  📚 BookHaven API listening on http://localhost:${port}`);
      console.log(`  🔗 Health: http://localhost:${port}/health`);
      console.log(`  📖 Books:  http://localhost:${port}/api/books\n`);
    });
  });
}

export default app;
