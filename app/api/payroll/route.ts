import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { buildLessonFeeByCoach } from "@/app/lib/lessonFee";
import {
  calcLessonFeesByCoachForMonth,
  fetchLessonFeeConfig,
} from "@/app/lib/lessonFee.server";
import { resolveSalesAccess } from "@/app/lib/salesAccess";
import {
  calcMonthlyHoursByCoach,
  getMonthDateStrBounds,
} from "@/app/lib/scheduleHours";

type SalesTotalRow = {
  coachId: string;
  total: number;
};

type PayrollRecordRow = {
  id: string;
  month: string;
  coachId: string;
  workedHours: number | null;
  hourlyRate: number | null;
  basicSalary: number;
  lessonFee: number;
};

type PreviousBasicSalaryRow = {
  coachId: string;
  basicSalary: number;
};

type CoachRow = {
  id: string;
  name: string;
  employmentType: "FULL_TIME" | "PART_TIME";
};

type CommissionRuleRow = {
  minAmount: number;
  commissionRate: number;
};

const DEFAULT_PART_TIME_HOURLY_RATE = 20;

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
    const { startDate, endDate } = getMonthDateStrBounds(month);

    const [coaches, records, rules, salesRows, lessonTypes, lessonRecordsInMonth, savedFeeConfig] =
      await Promise.all([
      prisma.$queryRaw<CoachRow[]>`
        SELECT
          id,
          name,
          "employmentType" AS "employmentType"
        FROM coaches
        WHERE archived = false
        ORDER BY "createdAt" ASC
      `,
      prisma.$queryRaw<PayrollRecordRow[]>`
        SELECT
          id,
          month,
          "coachId" AS "coachId",
          "workedHours"::float AS "workedHours",
          "hourlyRate"::float AS "hourlyRate",
          "basicSalary"::float AS "basicSalary",
          "lessonFee"::float AS "lessonFee"
        FROM payroll_records
        WHERE month = ${month}
      `,
      prisma.$queryRaw<CommissionRuleRow[]>`
        SELECT
          "minAmount"::float AS "minAmount",
          "commissionRate"::float AS "commissionRate"
        FROM commission_rules
        WHERE archived = false
      `,
      prisma.$queryRaw<SalesTotalRow[]>`
        SELECT
          "coachId" AS "coachId",
          COALESCE(SUM(amount), 0)::float AS total
        FROM sales_records
        WHERE "soldAt" >= ${start} AND "soldAt" <= ${end}
        GROUP BY "coachId"
      `,
      prisma.lessonType.findMany({
        where: { archived: false },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.lessonRecord.findMany({
        where: {
          dateStr: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          coachId: true,
          dateStr: true,
          lessonTypeId: true,
          studentCount: true,
        },
        orderBy: [{ dateStr: "asc" }, { createdAt: "asc" }],
      }),
      fetchLessonFeeConfig(),
    ]);

    const schedulesInMonth = await prisma.schedule.findMany({
      where: {
        dateStr: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        coachId: true,
        dateStr: true,
        storeId: true,
        shiftId: true,
        shiftName: true,
      },
    });
    const scheduleStoreIds = [...new Set(schedulesInMonth.map((schedule) => schedule.storeId))];
    const stores =
      scheduleStoreIds.length > 0
        ? await prisma.store.findMany({
            where: { id: { in: scheduleStoreIds } },
            select: { id: true, shifts: true },
          })
        : [];
    const storeMap = new Map(stores.map((store) => [store.id, store]));
    const monthHoursByCoach = calcMonthlyHoursByCoach(schedulesInMonth, storeMap);

    const recordByCoach = new Map<string, PayrollRecordRow>(
      records.map((r: PayrollRecordRow): [string, PayrollRecordRow] => [r.coachId, r])
    );
    const salesByCoach = new Map<string, number>(
      salesRows.map((r: SalesTotalRow): [string, number] => [r.coachId, Number(r.total) || 0])
    );
    const previousBasicSalaryRows = await prisma.$queryRaw<PreviousBasicSalaryRow[]>`
      SELECT DISTINCT ON ("coachId")
        "coachId" AS "coachId",
        "basicSalary"::float AS "basicSalary"
      FROM payroll_records
      WHERE month < ${month}
      ORDER BY "coachId", month DESC
    `;
    const previousBasicSalaryByCoach = new Map(
      previousBasicSalaryRows.map((r: PreviousBasicSalaryRow): [string, number] => [
        r.coachId,
        Number(r.basicSalary) || 0,
      ])
    );

    const lessonFeeByCoach = buildLessonFeeByCoach(
      coaches,
      lessonTypes,
      lessonRecordsInMonth,
      savedFeeConfig
    );

    const rows = await Promise.all(
      coaches.map(async (coach: CoachRow) => {
        const current = recordByCoach.get(coach.id);
        const scheduleHours = round2(monthHoursByCoach.get(coach.id) || 0);
        const hourlyRate = round2(current?.hourlyRate ?? DEFAULT_PART_TIME_HOURLY_RATE);

        let monthHours = scheduleHours;
        let basicSalary: number;

        if (coach.employmentType === "PART_TIME") {
          monthHours = scheduleHours;
          basicSalary = round2(monthHours * hourlyRate);
        } else {
          // 全职按月薪，支持从上月带入
          basicSalary = current?.basicSalary ?? 0;
          if (current?.basicSalary === undefined) {
            basicSalary = previousBasicSalaryByCoach.get(coach.id) ?? 0;
          }
        }

        const salesAmount = round2(salesByCoach.get(coach.id) || 0);
        const salesCommission = calcCommission(salesAmount, rules);
        const lessonFee = round2(lessonFeeByCoach.get(coach.id) || 0);
        const totalSalary = round2((basicSalary || 0) + salesCommission + lessonFee);

        return {
          coachId: coach.id,
          coachName: coach.name,
          employmentType: coach.employmentType === "PART_TIME" ? "PART_TIME" : "FULL_TIME",
          monthHours,
          hourlyRate: coach.employmentType === "PART_TIME" ? hourlyRate : null,
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
        totalLaborCost: round2(
          rows.reduce((sum: number, r: { totalSalary: number }) => sum + r.totalSalary, 0)
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
              "coachId" AS "coachId",
              COALESCE(SUM(amount), 0)::float AS total
            FROM sales_records
            WHERE "soldAt" >= ${start} AND "soldAt" <= ${end} AND "coachId" IN (${Prisma.join(coachIds)})
            GROUP BY "coachId"
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
