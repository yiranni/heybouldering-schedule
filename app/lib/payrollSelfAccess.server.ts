import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import type { Role } from "@/app/lib/auth";
import { resolvePrimaryStoreId } from "@/app/lib/payrollStoreAttribution.server";
import { resolveSalesAccess, type SalesAccess } from "@/app/lib/salesAccess";

/** 主门店在此列表内的全职教练 / 店长可查看本人工资 */
export const SELF_PAYROLL_PRIMARY_STORE_NAMES = ["嘿抱外滩", "嘿抱万象城"] as const;

export type SelfPayrollEligibility = {
  allowed: boolean;
  coachId: string | null;
  primaryStoreName: string | null;
};

export async function getSelfPayrollEligibility(
  userId: string,
  role: Role
): Promise<SelfPayrollEligibility> {
  if (role !== "COACH" && role !== "MANAGER") {
    return { allowed: false, coachId: null, primaryStoreName: null };
  }

  const coach = await prisma.coach.findFirst({
    where: { userId, archived: false },
    select: {
      id: true,
      employmentType: true,
      stores: {
        select: {
          isPrimary: true,
          store: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!coach || coach.employmentType !== "FULL_TIME") {
    return { allowed: false, coachId: null, primaryStoreName: null };
  }

  const links = coach.stores.map((s) => ({
    coachId: coach.id,
    storeId: s.store.id,
    isPrimary: s.isPrimary,
  }));
  const primaryStoreId = resolvePrimaryStoreId(links, coach.id);
  const primaryStore =
    coach.stores.find((s) => s.store.id === primaryStoreId)?.store ??
    coach.stores.find((s) => s.isPrimary)?.store ??
    coach.stores[0]?.store;
  const primaryStoreName = primaryStore?.name ?? null;

  const allowed =
    primaryStoreName !== null &&
    (SELF_PAYROLL_PRIMARY_STORE_NAMES as readonly string[]).includes(primaryStoreName);

  return {
    allowed,
    coachId: allowed ? coach.id : null,
    primaryStoreName,
  };
}

export type PayrollAccess = SalesAccess & {
  payrollMode: "admin" | "self";
};

export async function resolvePayrollAccess(
  request: NextRequest
): Promise<PayrollAccess | null> {
  const access = await resolveSalesAccess(request);
  if (!access) return null;

  if (access.isAdmin) {
    return { ...access, payrollMode: "admin" };
  }

  const eligibility = await getSelfPayrollEligibility(
    access.session.userId,
    access.session.role
  );
  if (!eligibility.allowed || !eligibility.coachId || access.coachId !== eligibility.coachId) {
    return null;
  }

  return { ...access, payrollMode: "self" };
}

export function canAccessCoachPayrollDetail(
  access: PayrollAccess,
  coachId: string
): boolean {
  if (access.payrollMode === "admin") return true;
  return access.coachId === coachId;
}