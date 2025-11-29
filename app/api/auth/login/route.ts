import { NextRequest, NextResponse } from 'next/server';

// 允许的用户列表 - 从环境变量读取
// 格式: EMAIL1:PASSWORD1,EMAIL2:PASSWORD2
const getAuthorizedUsers = () => {
  const authUsers = process.env.AUTHORIZED_USERS || '';

  if (!authUsers) {
    console.warn('警告: AUTHORIZED_USERS 环境变量未设置');
    return [];
  }

  return authUsers.split(',').map(pair => {
    const [email, password] = pair.split(':');
    return { email: email.trim(), password: password.trim() };
  }).filter(user => user.email && user.password);
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '请输入邮箱和密码' },
        { status: 400 }
      );
    }

    const authorizedUsers = getAuthorizedUsers();

    if (authorizedUsers.length === 0) {
      return NextResponse.json(
        { error: '系统未配置授权用户' },
        { status: 500 }
      );
    }

    // 验证用户
    const user = authorizedUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // 生成简单的 token（实际生产环境应使用 JWT）
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    return NextResponse.json(
      {
        token,
        email: user.email,
        message: '登录成功'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
