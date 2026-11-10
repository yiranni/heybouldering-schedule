import { prisma } from "@/app/lib/prisma";
import { buildLessonFeeByCoach } from "@/app/lib/lessonFee";
import { fetchLessonFeeConfig } from "@/app/lib/lessonFee.server";
import {
  calcMonthlyHoursByCoach,
  getLessonRecordMonthDateFilter,
  getMonthDateStrBounds,
} from "@/app/lib/scheduleHours";
import { getManualHoursSumByCoach } from "@/app/lib/payrollManualHours.server";
import {
  calcOvertimePay,
  fetchOvertimeHourlyRate,
  getOvertimeHoursByCoachForMonth,
  listOvertimeRecordsForMonth,
} from "@/app/lib/overtime.server";
import {
  buildPayrollStoreAttribution,
  resolvePrimaryStoreId,
  type PayrollStoreSlice,
  type SalesByCoachStoreRow,
} from "@/app/lib/payrollStoreAttribution.server";

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

export type PayrollCoachRow = {
  id: string;
  name: string;
  employmentType: "FULL_TIME" | "PART_TIME";
};

type CommissionRuleRow = {
  minAmount: number;
  commissionRate: number;
};

export type ComputedPayrollRow = {
  coachId: string;
  coachName: string;
  employmentType: "FULL_TIME" | "PART_TIME";
  monthHours: number;
  hourlyRate: number | null;
  basicSalary: number;
  salesAmount: number;
  salesCommission: number;
  lessonFee: number;
  overtimeHours: number;
  overtimePay: number;
  totalSalary: number;
  primaryStoreId: string | null;
  storeAttribution: Record<string, PayrollStoreSlice>;
};

const DEFAULT_PART_TIME_HOURLY_RATE = 20;

export function isValidPayrollMonth(month: string): boolean {
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

function calcCommission(
  totalSales: number,
  rules: Array<{ minAmount: number; commissionRate: number }>
): number {
  const rule = [...rules]
    .sort((a, b) => b.minAmount - a.minAmount)
    .find((r) => totalSales >= r.minAmount);
  const rate = rule?.commissionRate || 0;
  return round2(totalSales * rate);
}

export async function computePayrollForMonth(month: string): Promise<{
  month: string;
  rows: ComputedPayrollRow[];
  stores: Array<{ id: string; name: string }>;
}> {
  if (!isValidPayrollMonth(month)) {
    throw new Error("month 格式应为 YYYY-MM");
  }

  const { start, end } = getMonthRange(month);
  const { startDate, endDate } = getMonthDateStrBounds(month);

  const [coaches, records, rules, salesRows, salesByCoachStoreRows, lessonTypes, lessonRecordsInMonth, savedFeeConfig, coachStoreLinks, manualHourRows, storeOptions] =
    await Promise.all([
      prisma.$queryRaw<PayrollCoachRow[]>`
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
          sr."coachId" AS "coachId",
          COALESCE(SUM(sr.amount), 0)::float AS total
        FROM sales_records sr
        LEFT JOIN inventory_transactions it ON it.id = sr."inventoryTransactionId"
        WHERE sr."soldAt" >= ${start}
          AND sr."soldAt" <= ${end}
          AND (sr."inventoryTransactionId" IS NULL OR it.type = 'SALE')
        GROUP BY sr."coachId"
      `,
      prisma.$queryRaw<SalesByCoachStoreRow[]>`
        SELECT
          sr."coachId" AS "coachId",
          it."storeId" AS "storeId",
          COALESCE(SUM(sr.amount), 0)::float AS total
        FROM sales_records sr
        LEFT JOIN inventory_transactions it ON it.id = sr."inventoryTransactionId"
        WHERE sr."soldAt" >= ${start}
          AND sr."soldAt" <= ${end}
          AND sr."coachId" IS NOT NULL
          AND (sr."inventoryTransactionId" IS NULL OR it.type = 'SALE')
        GROUP BY sr."coachId", it."storeId"
      `,
      prisma.lessonType.findMany({
        where: { archived: false },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.lessonRecord.findMany({
        where: getLessonRecordMonthDateFilter(month),
        select: {
          id: true,
          coachId: true,
          dateStr: true,
          lessonTypeId: true,
          studentCount: true,
          storeId: true,
        },
        orderBy: [{ dateStr: "asc" }, { createdAt: "asc" }],
      }),
      fetchLessonFeeConfig(),
      prisma.coachStore.findMany({
        select: {
          coachId: true,
          storeId: true,
          isPrimary: true,
        },
      }),
      prisma.payrollManualHours.findMany({
        where: { month },
        select: {
          coachId: true,
          startTime: true,
          endTime: true,
        },
      }),
      prisma.store.findMany({
        where: { archived: false },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      }),
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
  const manualHoursByCoach = await getManualHoursSumByCoach(month);
  const overtimeHoursByCoach = await getOvertimeHoursByCoachForMonth(month);
  const overtimeHourlyRate = await fetchOvertimeHourlyRate();
  const overtimeRecordsForMonth = await listOvertimeRecordsForMonth(month);

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

  const rows = coaches.map((coach: PayrollCoachRow) => {
    const current = recordByCoach.get(coach.id);
    const scheduleHours = round2(monthHoursByCoach.get(coach.id) || 0);
    const manualHours = round2(manualHoursByCoach.get(coach.id) || 0);
    const hourlyRate = round2(current?.hourlyRate ?? DEFAULT_PART_TIME_HOURLY_RATE);

    let monthHours = scheduleHours;
    let basicSalary: number;

    if (coach.employmentType === "PART_TIME") {
      monthHours = round2(scheduleHours + manualHours);
      basicSalary = round2(monthHours * hourlyRate);
    } else {
      basicSalary = current?.basicSalary ?? 0;
      if (current?.basicSalary === undefined) {
        basicSalary = previousBasicSalaryByCoach.get(coach.id) ?? 0;
      }
    }

    const salesAmount = round2(salesByCoach.get(coach.id) || 0);
    const salesCommission = calcCommission(salesAmount, rules);
    const lessonFee = round2(lessonFeeByCoach.get(coach.id) || 0);
    const overtimeHours = round2(overtimeHoursByCoach.get(coach.id) || 0);
    const overtimePay = calcOvertimePay(overtimeHours, overtimeHourlyRate);
    const totalSalary = round2((basicSalary || 0) + salesCommission + lessonFee + overtimePay);

    const employmentType: "FULL_TIME" | "PART_TIME" =
      coach.employmentType === "PART_TIME" ? "PART_TIME" : "FULL_TIME";

    return {
      coachId: coach.id,
      coachName: coach.name,
      employmentType,
      monthHours,
      hourlyRate: coach.employmentType === "PART_TIME" ? hourlyRate : null,
      basicSalary: round2(basicSalary || 0),
      salesAmount,
      salesCommission,
      lessonFee,
      overtimeHours,
      overtimePay,
      totalSalary,
    };
  });

  const payrollByCoach = new Map(
    rows.map((row) => [
      row.coachId,
      {
        monthHours: row.monthHours,
        hourlyRate: row.hourlyRate,
        basicSalary: row.basicSalary,
        salesAmount: row.salesAmount,
        salesCommission: row.salesCommission,
        lessonFee: row.lessonFee,
        overtimeHours: row.overtimeHours,
        overtimePay: row.overtimePay,
      },
    ])
  );

  const storeAttributionByCoach = buildPayrollStoreAttribution({
    coaches: coaches.map((coach) => ({
      id: coach.id,
      employmentType: coach.employmentType === "PART_TIME" ? "PART_TIME" : "FULL_TIME",
    })),
    coachStoreLinks: coachStoreLinks,
    schedules: schedulesInMonth,
    storeMap,
    manualHours: manualHourRows,
    salesByCoachStore: salesByCoachStoreRows,
    lessonTypes,
    lessonRecords: lessonRecordsInMonth,
    savedFeeConfig,
    commissionRules: rules,
    overtimeRecords: overtimeRecordsForMonth,
    overtimeHourlyRate,
    payrollByCoach,
  });

  const rowsWithStores: ComputedPayrollRow[] = rows.map((row) => ({
    ...row,
    primaryStoreId: resolvePrimaryStoreId(coachStoreLinks, row.coachId),
    storeAttribution: storeAttributionByCoach.get(row.coachId) || {},
  }));

  return {
    month,
    rows: rowsWithStores,
    stores: storeOptions,
  };
}
