import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { createSessionToken, setSessionCookie } from '@/app/lib/auth';
import { verifyPassword } from '@/app/lib/password';

export async function POST(request: NextRequest) {
  try {
    const { account, password } = await request.json();

    if (!account || !password) {
      return NextResponse.json(
        { error: '请输入账号和密码' },
        { status: 400 }
      );
    }

    const normalizedAccount = String(account).trim().toLowerCase();
    const plainPassword = String(password);

    const users = await prisma.$queryRaw<
      Array<{
        id: string;
        accountId: string;
        passwordHash: string;
        role: 'ADMIN' | 'COACH';
        name: string | null;
      }>
    >`
      SELECT
        id,
        account_id AS "accountId",
        password_hash AS "passwordHash",
        role,
        name
      FROM users
      WHERE account_id = ${normalizedAccount}
      LIMIT 1
    `;
    const user = users[0] ?? null;

    if (!user) {
      return NextResponse.json(
        { error: '账号或密码错误' },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(plainPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '账号或密码错误' },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      id: user.id,
      accountId: user.accountId,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          accountId: user.accountId,
          role: user.role,
          name: user.name,
        },
        message: '登录成功'
      },
      { status: 200 }
    );

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
