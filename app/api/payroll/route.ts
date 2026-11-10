import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { forbidden, unauthorized } from "@/app/lib/auth";
import {
  calcLessonFeesByCoachForMonth,
  fetchLessonFeeConfig,
} from "@/app/lib/lessonFee.server";
import { resolveSalesAccess } from "@/app/lib/salesAccess";
import { getMonthDateStrBounds } from "@/app/lib/scheduleHours";
import {
  calcOvertimePay,
  fetchOvertimeHourlyRate,
} from "@/app/lib/overtime.server";
import {
  computePayrollForMonth,
  isValidPayrollMonth,
} from "@/app/lib/payrollCompute.server";

type CommissionRuleRow = {
  minAmount: number;
  commissionRate: number;
};

type SalesTotalRow = {
  coachId: string;
  total: number;
};

function isValidMonth(month: string): boolean {
  return isValidPayrollMonth(month);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calcCommission(totalSales: number, rules: Array<{ minAmount: number; commissionRate: number }>): number {
  const rule = [...rules]
    .sort((a, b) => b.minAmount - a.minAmount)
    .find((r) => totalSales >= r.minAmount);
  const rate = rule?.commissionRate || 0;
  return round2(totalSales * rate);
}

function getMonthRange(month: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可查看工资计算");

    const month = new URL(request.url).searchParams.get("month") || "";
    if (!isValidMonth(month)) {
      return NextResponse.json({ error: "month 格式应为 YYYY-MM" }, { status: 400 });
    }

    const { rows: rowsWithStores, stores: storeOptions } = await computePayrollForMonth(month);

    return NextResponse.json({
      month,
      rows: rowsWithStores,
      stores: storeOptions,
      totals: {
        totalLaborCost: round2(
          rowsWithStores.reduce((sum: number, r: { totalSalary: number }) => sum + r.totalSalary, 0)
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching payroll:", error);
    return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可编辑工资计算");

    const body = await request.json();
    const month = String(body?.month || "");
    const rows: unknown[] = Array.isArray(body?.rows) ? body.rows : [];
    if (!isValidMonth(month)) {
      return NextResponse.json({ error: "month 格式应为 YYYY-MM" }, { status: 400 });
    }

    const normalizedRows = rows.map((row: unknown) => {
      const item = (row || {}) as {
        coachId?: unknown;
        monthHours?: unknown;
        hourlyRate?: unknown;
        basicSalary?: unknown;
      };
      return {
        coachId: String(item.coachId || ""),
        monthHours: Number(item.monthHours),
        hourlyRate: Number(item.hourlyRate),
        basicSalary: Number(item.basicSalary),
      };
    });
    if (
      normalizedRows.some(
        (r) =>
          !r.coachId ||
          Number.isNaN(r.monthHours) ||
          Number.isNaN(r.hourlyRate) ||
          Number.isNaN(r.basicSalary)
      )
    ) {
      return NextResponse.json({ error: "rows 数据格式无效" }, { status: 400 });
    }

    const { start, end } = getMonthRange(month);
    const coachIds = normalizedRows.map((r) => r.coachId);
    const rulesPromise = prisma.$queryRaw<CommissionRuleRow[]>`
      SELECT
        "minAmount"::float AS "minAmount",
        "commissionRate"::float AS "commissionRate"
      FROM commission_rules
      WHERE archived = false
    `;
    const salesPromise =
      coachIds.length === 0
        ? Promise.resolve([] as SalesTotalRow[])
        : prisma.$queryRaw<SalesTotalRow[]>`
            SELECT
              sr."coachId" AS "coachId",
              COALESCE(SUM(sr.amount), 0)::float AS total
            FROM sales_records sr
            LEFT JOIN inventory_transactions it ON it.id = sr."inventoryTransactionId"
            WHERE sr."soldAt" >= ${start}
              AND sr."soldAt" <= ${end}
              AND sr."coachId" IN (${Prisma.join(coachIds)})
              AND (sr."inventoryTransactionId" IS NULL OR it.type = 'SALE')
            GROUP BY sr."coachId"
          `;
    const [rules, salesRows, lessonFeeByCoach] = await Promise.all([
      rulesPromise,
      salesPromise,
      calcLessonFeesByCoachForMonth(month),
    ]);
    const salesByCoach = new Map<string, number>(
      salesRows.map((r: SalesTotalRow): [string, number] => [r.coachId, Number(r.total) || 0])
    );

    await prisma.$transaction(
      normalizedRows.map((row) => {
        const salesAmount = round2(salesByCoach.get(row.coachId) || 0);
        const salesCommission = calcCommission(salesAmount, rules);
        const lessonFee = round2(lessonFeeByCoach.get(row.coachId) || 0);
        return prisma.$executeRaw`
          INSERT INTO payroll_records (
            id,
            month,
            "coachId",
            "workedHours",
            "hourlyRate",
            "basicSalary",
            "lessonFee",
            "salesCommission",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${randomUUID()},
            ${month},
            ${row.coachId},
            ${round2(row.monthHours)},
            ${round2(row.hourlyRate)},
            ${round2(row.basicSalary)},
            ${lessonFee},
            ${salesCommission},
            NOW(),
            NOW()
          )
          ON CONFLICT (month, "coachId")
          DO UPDATE SET
            "basicSalary" = EXCLUDED."basicSalary",
            "lessonFee" = EXCLUDED."lessonFee",
            "workedHours" = EXCLUDED."workedHours",
            "hourlyRate" = EXCLUDED."hourlyRate",
            "salesCommission" = EXCLUDED."salesCommission",
            "updatedAt" = NOW()
        `;
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving payroll:", error);
    return NextResponse.json({ error: "Failed to save payroll" }, { status: 500 });
  }
}
