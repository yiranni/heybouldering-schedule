import { PrismaClient } from '@prisma/client';

// Bump when prisma/schema.prisma changes so dev hot-reload discards stale clients.
const PRISMA_SCHEMA_VERSION = 'feature-flags-v2';

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
  prismaSchemaVersion?: string;
};

function getPrismaClient(): AppPrismaClient {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
  ) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  return client;
}

export const prisma = getPrismaClient();
