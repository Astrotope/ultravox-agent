import { PrismaClient } from '@prisma/client';

// Global variable to store the Prisma client instance
let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Initialize Prisma client with connection pooling
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
  }
  
  return prisma;
}

// For development hot reloading
if (process.env.NODE_ENV === 'development') {
  if (global.__prisma) {
    prisma = global.__prisma;
  } else {
    prisma = getPrismaClient();
    global.__prisma = prisma;
  }
} else {
  prisma = getPrismaClient();
}

export { prisma };

// Graceful shutdown helper
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}