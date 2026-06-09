import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

type SalesTotalRow = {
  coachId: string;
  total: number;
};

function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

function getMonthRange(month: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
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

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可查看工资计算");

    const month = new URL(request.url).searchParams.get("month") || "";
    if (!isValidMonth(month)) {
      return NextResponse.json({ error: "month 格式应为 YYYY-MM" }, { status: 400 });
    }
    const { start, end } = getMonthRange(month);

    const [coaches, records, rules, salesRows] = await Promise.all([
      prisma.coach.findMany({
        where: { archived: false },
        select: { id: true, name: true, color: true, avatar: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payrollRecord.findMany({
        where: { month },
        select: {
          id: true,
          coachId: true,
          basicSalary: true,
          lessonFee: true,
        },
      }),
      prisma.commissionRule.findMany({
        where: { archived: false },
        select: { minAmount: true, commissionRate: true },
      }),
      prisma.$queryRaw<SalesTotalRow[]>`
        SELECT
          "coachId" AS "coachId",
          COALESCE(SUM(amount), 0)::float AS total
        FROM sales_records
        WHERE "soldAt" >= ${start} AND "soldAt" <= ${end}
        GROUP BY "coachId"
      `,
    ]);

    const recordByCoach = new Map(records.map((r) => [r.coachId, r]));
    const salesByCoach = new Map(salesRows.map((r) => [r.coachId, Number(r.total) || 0]));

    const rows = await Promise.all(
      coaches.map(async (coach) => {
        const current = recordByCoach.get(coach.id);
        let basicSalary = current?.basicSalary;
        if (basicSalary === undefined) {
          const latestPrevious = await prisma.payrollRecord.findFirst({
            where: {
              coachId: coach.id,
              month: { lt: month },
            },
            orderBy: { month: "desc" },
            select: { basicSalary: true },
          });
          basicSalary = latestPrevious?.basicSalary ?? 0;
        }

        const salesAmount = round2(salesByCoach.get(coach.id) || 0);
        const salesCommission = calcCommission(salesAmount, rules);
        const lessonFee = round2(current?.lessonFee ?? 0);
        const totalSalary = round2((basicSalary || 0) + salesCommission + lessonFee);

        return {
          coachId: coach.id,
          coachName: coach.name,
          basicSalary: round2(basicSalary || 0),
          salesAmount,
          salesCommission,
          lessonFee,
          totalSalary,
        };
      })
    );

    return NextResponse.json({
      month,
      rows,
      totals: {
        totalLaborCost: round2(rows.reduce((sum, r) => sum + r.totalSalary, 0)),
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
        basicSalary?: unknown;
        lessonFee?: unknown;
      };
      return {
      coachId: String(item.coachId || ""),
      basicSalary: Number(item.basicSalary),
      lessonFee: Number(item.lessonFee),
      };
    });
    if (normalizedRows.some((r) => !r.coachId || Number.isNaN(r.basicSalary) || Number.isNaN(r.lessonFee))) {
      return NextResponse.json({ error: "rows 数据格式无效" }, { status: 400 });
    }

    const { start, end } = getMonthRange(month);
    const coachIds = normalizedRows.map((r) => r.coachId);
    const rulesPromise = prisma.commissionRule.findMany({
      where: { archived: false },
      select: { minAmount: true, commissionRate: true },
    });
    const salesPromise =
      coachIds.length === 0
        ? Promise.resolve([] as SalesTotalRow[])
        : prisma.$queryRaw<SalesTotalRow[]>`
            SELECT
              "coachId" AS "coachId",
              COALESCE(SUM(amount), 0)::float AS total
            FROM sales_records
            WHERE "soldAt" >= ${start} AND "soldAt" <= ${end} AND "coachId" IN (${Prisma.join(coachIds)})
            GROUP BY "coachId"
          `;
    const [rules, salesRows] = await Promise.all([rulesPromise, salesPromise]);
    const salesByCoach = new Map(salesRows.map((r) => [r.coachId, Number(r.total) || 0]));

    await prisma.$transaction(
      normalizedRows.map((row) => {
        const salesAmount = round2(salesByCoach.get(row.coachId) || 0);
        const salesCommission = calcCommission(salesAmount, rules);
        return prisma.payrollRecord.upsert({
          where: { month_coachId: { month, coachId: row.coachId } },
          create: {
            month,
            coachId: row.coachId,
            basicSalary: round2(row.basicSalary),
            lessonFee: round2(row.lessonFee),
            salesCommission,
          },
          update: {
            basicSalary: round2(row.basicSalary),
            lessonFee: round2(row.lessonFee),
            salesCommission,
          },
        });
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving payroll:", error);
    return NextResponse.json({ error: "Failed to save payroll" }, { status: 500 });
  }
}
