import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { AuthSession, getSessionFromRequest } from "@/app/lib/auth";

export type SalesAccess = {
  session: AuthSession;
  coachId: string | null;
  isAdmin: boolean;
};

export async function getCoachIdForUserId(userId: string): Promise<string | null> {
  const coach = await prisma.coach.findFirst({
    where: {
      archived: false,
      userId,
    },
    select: { id: true },
  });
  return coach?.id ?? null;
}

/** 账号绑定了已归档教练档案的员工（不含纯管理员账号） */
export async function isArchivedEmployeeUser(userId: string): Promise<boolean> {
  const coach = await prisma.coach.findFirst({
    where: { userId },
    select: { archived: true },
  });
  return coach?.archived === true;
}

export async function resolveSalesAccess(request: NextRequest): Promise<SalesAccess | null> {
  const session = getSessionFromRequest(request);
  if (!session) return null;

  if (session.role === "ADMIN") {
    return { session, coachId: null, isAdmin: true };
  }

  if (await isArchivedEmployeeUser(session.userId)) {
    return null;
  }

  const coachId = await getCoachIdForUserId(session.userId);
  return { session, coachId, isAdmin: false };
}
