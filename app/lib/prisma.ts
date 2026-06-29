import { PrismaClient } from '@prisma/client';

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['query'],
  });
}

export type AppPrismaClient = ReturnType<typeof createPrismaClient>;

export type PrismaTransactionClient = Omit<
  AppPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: AppPrismaClient;
};

function isPrismaClientCurrent(client: AppPrismaClient): boolean {
  return (
    'productCategory' in client &&
    'inventoryTransaction' in client &&
    'productVariant' in client
  );
}

function getPrismaClient(): AppPrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientCurrent(cached)) {
    return cached;
  }
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrismaClient();
