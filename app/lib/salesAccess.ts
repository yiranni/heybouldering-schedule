import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { AuthSession, getSessionFromRequest } from "@/app/lib/auth";

export type SalesAccess = {
  session: AuthSession;
  coachId: string | null;
  isAdmin: boolean;
};

export async function resolveSalesAccess(request: NextRequest): Promise<SalesAccess | null> {
  const session = getSessionFromRequest(request);
  if (!session) return null;

  if (session.role === "ADMIN") {
    return { session, coachId: null, isAdmin: true };
  }

  const coach = await prisma.coach.findFirst({
    where: {
      archived: false,
      userId: session.userId,
    },
    select: { id: true },
  });

  return { session, coachId: coach?.id ?? null, isAdmin: false };
}
