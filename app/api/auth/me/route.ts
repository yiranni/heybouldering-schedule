import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { clearSessionCookie, getSessionFromRequest, unauthorized } from "@/app/lib/auth";
import { getSelfPayrollEligibility } from "@/app/lib/payrollSelfAccess.server";
import { getCoachIdForUserId, isArchivedEmployeeUser } from "@/app/lib/salesAccess";
import type { Role } from "@/app/lib/auth";

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

    if (user.role !== "ADMIN" && (await isArchivedEmployeeUser(user.id))) {
      const response = NextResponse.json({ error: "该员工已归档，无法登录" }, { status: 403 });
      clearSessionCookie(response);
      return response;
    }

    const coachId =
      user.role === "ADMIN" ? null : await getCoachIdForUserId(user.id);
    const selfPayroll =
      user.role === "ADMIN"
        ? { allowed: false }
        : await getSelfPayrollEligibility(user.id, user.role as Role);

    return NextResponse.json({
      user: {
        ...user,
        coachId,
        canViewSelfPayroll: selfPayroll.allowed,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
