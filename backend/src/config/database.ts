import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Global PrismaClient instance
declare global {
  var prisma: PrismaClient | undefined;
}

// Create Prisma Client with logging
export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

// In development, attach to global to prevent hot-reload from creating new clients
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
    return true;
  } catch (err) {
    logger.error('Database connection failed', { error: err });
    return false;
  }
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
