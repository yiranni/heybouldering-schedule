import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { createSessionToken, setSessionCookie, type Role } from '@/app/lib/auth';
import { verifyPassword } from '@/app/lib/password';
import { getCoachIdForUserId } from '@/app/lib/salesAccess';

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

    const user = await prisma.user.findFirst({
      where: { accountId: normalizedAccount },
      select: {
        id: true,
        accountId: true,
        passwordHash: true,
        role: true,
        name: true,
      },
    });

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

    const role = user.role as Role;
    const coachId = role === 'ADMIN' ? null : await getCoachIdForUserId(user.id);

    const token = createSessionToken({
      id: user.id,
      accountId: user.accountId,
      role,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          accountId: user.accountId,
          role,
          name: user.name,
          coachId,
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
