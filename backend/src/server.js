import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import farmerRoutes from './routes/farmer.routes.js';
import inseminationRoutes from './routes/insemination.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import prisma from './config/db.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Let React frontend handle CSP in development
    crossOriginEmbedderPolicy: false,
  })
);

// Strict CORS configuration - Support CLIENT_ORIGIN, FRONTEND_URL, Vercel deployments, and localhost
const configuredOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
]
  .filter(Boolean)
  .map((url) => url.replace(/\/+$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, local scripts)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
      const isVercel = /^https:\/\/[a-z0-9\-.]+\.vercel\.app$/.test(cleanOrigin);

      if (isLocalhost || isVercel || configuredOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root endpoint - friendly landing page for browser visits
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VetAssist API — Status</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 520px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); text-align: center; }
    .badge { display: inline-block; background: #059669; color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; text-transform: uppercase; }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 12px; color: #ffffff; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
    .note { background: #0f172a; border-left: 4px solid #3b82f6; padding: 12px 16px; text-align: left; border-radius: 6px; margin-bottom: 24px; font-size: 13px; color: #cbd5e1; }
    .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; transition: background 0.2s; }
    .btn:hover { background: #1d4ed8; }
    .footer { margin-top: 24px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">● Backend API Active & Online</div>
    <h1>🐄 VetAssist Cattle AI Clinic</h1>
    <p>This is the <strong>Backend REST API service</strong> running on Render.</p>
    <div class="note">
      💡 <strong>Looking for the VetAssist Web App?</strong><br>
      The user interface runs on the <strong>Frontend (Vercel)</strong>. Please open your Vercel deployment URL to access the Doctor Login, Dashboard, Farmers, and WhatsApp Receipts.
    </div>
    <a class="btn" href="/api/health">Check API Health (/api/health)</a>
    <div class="footer">VetAssist Cattle Insemination Clinic Management System • v2.0.0</div>
  </div>
</body>
</html>`);
  }
  res.json({
    status: 'ok',
    service: 'VetAssist Cattle Insemination Clinic API',
    version: '2.0.0',
    message: 'Backend API is active. Access the user interface via the Vercel frontend URL.',
  });
});

// Health check endpoint (always accessible, exempt from rate limiting)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VetAssist Cattle Insemination Clinic API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Database connectivity check endpoint (exempt from rate limiting)
app.get('/api/db-check', async (req, res) => {
  try {
    const rawUrl = process.env.DATABASE_URL || '';
    const maskedUrl = rawUrl ? rawUrl.replace(/:([^@]+)@/, ':****@') : 'NOT_SET';
    const userCount = await prisma.user.count();
    res.json({
      status: 'connected',
      userCount,
      databaseUrlConfigured: Boolean(rawUrl),
      maskedUrl,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      name: err.name,
      message: err.message,
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    });
  }
});

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/inseminations', inseminationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// 404 Route Handler for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Global safety error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🐄 VetAssist Cattle AI Clinic API running on port ${PORT}`);
  console.log(`🔒 Single-Doctor JWT Auth, Bcrypt (12 rounds), Rate Limiter`);
  console.log(`📱 Instant One-Tap WhatsApp Receipt Delivery (wa.me)`);
  console.log(`📁 Persistent Relational Database: SQLite via Prisma ORM`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`======================================================\n`);
});

export default app;
