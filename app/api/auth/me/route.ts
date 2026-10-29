import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { clearSessionCookie, getSessionFromRequest, unauthorized } from "@/app/lib/auth";
import { getCoachIdForUserId } from "@/app/lib/salesAccess";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return unauthorized("请先登录");

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        accountId: true,
        role: true,
        name: true,
      },
    });

    if (!user) {
      const response = NextResponse.json({ error: "用户不存在" }, { status: 401 });
      clearSessionCookie(response);
      return response;
    }

    const coachId =
      user.role === "ADMIN" ? null : await getCoachIdForUserId(user.id);

    return NextResponse.json({
      user: {
        ...user,
        coachId,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
