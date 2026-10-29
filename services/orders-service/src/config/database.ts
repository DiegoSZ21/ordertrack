import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Instancia global del cliente Prisma
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Registrar queries lentas en desarrollo
prisma.$on('query' as never, (e: { duration: number; query: string }) => {
  if (e.duration > 500) {
    logger.warn(`Query lenta (${e.duration}ms): ${e.query}`);
  }
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Conexión a PostgreSQL establecida');
  } catch (error) {
    logger.error('❌ Error al conectar con PostgreSQL:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('📴 Conexión a PostgreSQL cerrada');
}

