import { PrismaClient } from '@prisma/client';
import { isDev } from './env';

/**
 * Client Prisma en singleton.
 *
 * En développement, `tsx watch` recharge le module à chaque sauvegarde.
 * Sans ce cache sur globalThis, chaque rechargement ouvrirait un nouveau
 * pool de connexions et MySQL finirait par répondre "Too many connections".
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? ['warn', 'error'] : ['error'],
  });

if (isDev) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
