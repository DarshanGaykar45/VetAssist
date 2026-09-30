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

// Health check endpoint (always accessible, exempt from rate limiting)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VetAssist Cattle Insemination Clinic API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
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
