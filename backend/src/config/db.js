import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

/**
 * Sanitizes PostgreSQL connection strings for Neon connections.
 * Strips surrounding quotes, strips channel_binding, ensures sslmode=require.
 */
export function sanitizeDatabaseUrl(url = process.env.DATABASE_URL) {
  if (!url) return url;
  let clean = url.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  if (clean.startsWith('postgresql://') || clean.startsWith('postgres://')) {
    try {
      const parsed = new URL(clean);
      parsed.searchParams.delete('channel_binding');
      if (!parsed.searchParams.has('sslmode')) {
        parsed.searchParams.set('sslmode', 'require');
      }
      return parsed.toString();
    } catch {
      return clean;
    }
  }
  return clean;
}

const activeDbUrl = sanitizeDatabaseUrl();
if (activeDbUrl) {
  process.env.DATABASE_URL = activeDbUrl;
}

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

function createPrismaClient() {
  if (activeDbUrl && (activeDbUrl.startsWith('postgresql://') || activeDbUrl.startsWith('postgres://'))) {
    const adapter = new PrismaNeon({ connectionString: activeDbUrl });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  return new PrismaClient({
    datasourceUrl: activeDbUrl,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
