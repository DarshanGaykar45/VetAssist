import { PrismaClient } from '@prisma/client';

/**
 * Security check for database connection strings.
 * Validates credentials for PostgreSQL (Neon) and remote databases.
 */
export function validateDatabaseSecurity(url = process.env.DATABASE_URL) {
  if (!url) {
    console.warn('⚠️ [DB Security]: No DATABASE_URL specified in environment.');
    return { secure: false, message: 'DATABASE_URL is missing' };
  }

  // Check PostgreSQL connection strings
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
    const hasAuth = url.includes('@');
    if (!hasAuth && !isLocalhost) {
      console.warn('⚠️ [DB Security Warning]: Remote PostgreSQL connection has no authentication credentials.');
    }
    return { secure: true, type: 'postgresql', authenticated: hasAuth };
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
