import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  // Database
  databaseUrl: string;

  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;

  // Server
  port: number;
  nodeEnv: string;
  corsOrigin: string;

  // AI Providers
  googleAiApiKey?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  ollamaApiUrl?: string;
  lmStudioApiUrl?: string;

  // File Upload
  maxFileSize: number;
  uploadDir: string;

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // Email
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPass: string;
  emailFrom: string;
  frontendUrl: string;
}

export const config: Config = {
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  ollamaApiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
  lmStudioApiUrl: process.env.LM_STUDIO_API_URL || 'http://localhost:1234',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Email Configuration
  emailHost: process.env.EMAIL_HOST || 'smtp.qq.com',
  emailPort: parseInt(process.env.EMAIL_PORT || '465', 10),
  emailUser: process.env.EMAIL_USER || '',
  emailPass: process.env.EMAIL_PASS || '',
  emailFrom: process.env.EMAIL_FROM || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// Validate required config
export function validateConfig(): void {
  const required = ['databaseUrl', 'jwtSecret'];
  const missing = required.filter(key => !(config as any)[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  if (config.nodeEnv === 'production' && config.jwtSecret === 'default-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}
