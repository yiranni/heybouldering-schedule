import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasAuthorizedUsers: !!process.env.AUTHORIZED_USERS,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
    },
    database: {
      status: 'unknown',
      error: null,
    }
  };

  // 尝试连接数据库
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();

    // 尝试简单查询
    const storeCount = await prisma.store.count();

    checks.database.status = 'connected';
    checks.database.storeCount = storeCount;

    await prisma.$disconnect();
  } catch (error: any) {
    checks.database.status = 'error';
    checks.database.error = error.message;
  }

  return NextResponse.json(checks, {
    status: checks.database.status === 'connected' ? 200 : 500
  });
}
