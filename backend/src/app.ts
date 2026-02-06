import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import notesRoutes from './routes/notes.routes';
import aiRoutes from './routes/ai.routes';
import { aiAssistantsRoutes } from './routes/ai-assistants.routes';
import aiAttachmentRoutes from './routes/ai-attachment.routes';
import foldersRoutes from './routes/folders.routes';
import tagsRoutes from './routes/tags.routes';
import attachmentsRoutes from './routes/attachments.routes';
import searchRoutes from './routes/search.routes';
import workspacesRoutes from './routes/workspaces.routes';
import templateRoutes from './routes/template.routes';
import chatRoutes from './routes/chat.routes';
import { initSocket } from './socket';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Trust proxy - needed when behind nginx/reverse proxy
app.set('trust proxy', true);

// Validate configuration
try {
  validateConfig();
} catch (err) {
  logger.error('Configuration validation failed', { error: err });
  process.exit(1);
}

// CORS configuration (must be before helmet and other middleware)
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = config.corsOrigin.split(',').map(o => o.trim());
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Also allow localhost:3200 for development
    if (allowedOrigins.indexOf(origin) !== -1 || origin === 'http://localhost:3200' || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware (disable for SSE to ensure streaming)
app.use(compression({
  filter: (req, res) => {
    if (req.path === '/api/ai/chat/stream') {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip high-frequency note save traffic and auth endpoints to prevent 429 during typing
  skip: (req) =>
    req.path.startsWith('/auth/login') ||
    req.path.startsWith('/auth/refresh') ||
    req.path.startsWith('/notes'),
});
app.use('/api', limiter);

// Request logging
app.use((req, _res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Static files for uploads - 使用绝对路径确保正确
const uploadsDir = path.resolve(process.cwd(), config.uploadDir);
console.log('[App] Static uploads directory:', uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.get('/api', (_req, res) => {
  res.json({
    name: 'AI Ignite Note API',
    version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        notes: '/api/notes',
        chat: '/api/chats',
        folders: '/api/folders',
        tags: '/api/tags',
        search: '/api/search',
        ai: '/api/ai',
        aiAssistants: '/api/ai-assistants',
        attachments: '/api/attachments',
        workspaces: '/api/workspaces',
        users: '/api/users',
        templates: '/api/templates',
      },
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/attachments', attachmentsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/workspaces', workspacesRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-assistants', aiAssistantsRoutes);
app.use('/api/ai-attachments', aiAttachmentRoutes);

app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

initSocket(httpServer);

// Start server
const PORT = config.port;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API endpoint: http://localhost:${PORT}/api`);
  logger.info(`Socket.IO initialized`);
});

export default app;
