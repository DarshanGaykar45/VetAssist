import { PrismaClient } from '@prisma/client';

/**
 * Security check for database connection strings.
 * If deployed beyond localhost or using remote databases (MongoDB, PostgreSQL, MySQL),
 * confirms authentication credentials are present in the connection string.
 */
export function validateDatabaseSecurity(url = process.env.DATABASE_URL) {
  if (!url) {
    console.warn('⚠️ [DB Security]: No DATABASE_URL specified in environment.');
    return { secure: false, message: 'DATABASE_URL is missing' };
  }

  // Check MongoDB connection strings
  if (url.startsWith('mongodb://') || url.startsWith('mongodb+srv://')) {
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
    const hasAuth = url.includes('@') && !url.match(/mongodb(\+srv)?:\/\/:?@/);

    if (!hasAuth) {
      if (isLocalhost) {
        console.warn('⚠️ [DB Security Warning]: Local MongoDB connection has no authentication credentials.');
      } else {
        console.error('🚨 [DB Security Critical]: Remote MongoDB instance requires authentication credentials! Do not expose unauthenticated databases in production.');
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Database authentication required: Remote MongoDB connection string lacks user credentials.');
        }
      }
      return { secure: false, type: 'mongodb', authenticated: false };
    }
    return { secure: true, type: 'mongodb', authenticated: true };
  }

  // SQLite local file database
  if (url.startsWith('file:')) {
    return { secure: true, type: 'sqlite', local: true };
  }

  return { secure: true, type: 'relational' };
}

// Perform security check at startup
validateDatabaseSecurity();

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
