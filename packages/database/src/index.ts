import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Database URL configuration - supports both local development and Docker environments
const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Replace localhost with 127.0.0.1 for Docker compatibility
    if (url.includes('localhost') && !url.includes('127.0.0.1')) {
      return url.replace('localhost', '127.0.0.1');
    }
    return url;
  }
  // Fallback for Docker environment
  const host = process.env.POSTGRES_HOST || '127.0.0.1';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'forensiq';
  const password = process.env.POSTGRES_PASSWORD || 'forensiq_dev_password';
  const db = process.env.POSTGRES_DB || 'forensiq_db';
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
};

const databaseUrl = getDatabaseUrl();

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export * from '@prisma/client';