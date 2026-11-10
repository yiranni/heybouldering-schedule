import { computePayrollForMonth } from "@/app/lib/payrollCompute.server";

export const EMPLOYEE_ANALYTICS_START_MONTH = "2026-05";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatAnalyticsMonthLabel(month: string): string {
  const [year, monthPart] = month.split("-");
  return `${year}/${Number(monthPart)}`;
}

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function enumerateMonthsInclusive(from: string, to: string): string[] {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const months: string[] = [];
  let year = fromYear;
  let month = fromMonth;

  while (year < toYear || (year === toYear && month <= toMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

import type { EmployeeTrendPoint, EmployeeTrendSeries } from "@/app/types";

export async function buildEmployeePayrollTrends(
  startMonth: string = EMPLOYEE_ANALYTICS_START_MONTH,
  endMonth?: string
): Promise<{
  startMonth: string;
  endMonth: string;
  monthLabels: Array<{ month: string; label: string }>;
  employees: EmployeeTrendSeries[];
}> {
  const end = endMonth || currentYearMonth();
  const months = enumerateMonthsInclusive(startMonth, end);

  const coachNames = new Map<string, string>();
  const valuesByMonthCoach = new Map<
    string,
    Map<string, { totalSalary: number; salesAmount: number }>
  >();

  for (const month of months) {
    const { rows } = await computePayrollForMonth(month);
    const byCoach = new Map<string, { totalSalary: number; salesAmount: number }>();

    for (const row of rows) {
      coachNames.set(row.coachId, row.coachName);
      byCoach.set(row.coachId, {
        totalSalary: row.totalSalary,
        salesAmount: row.salesAmount,
      });
    }

    valuesByMonthCoach.set(month, byCoach);
  }

  const employees: EmployeeTrendSeries[] = Array.from(coachNames.entries())
    .sort((a, b) => a[1].localeCompare(b[1], "zh-CN"))
    .map(([coachId, coachName]) => ({
      coachId,
      coachName,
      points: months.map((month) => {
        const values = valuesByMonthCoach.get(month)?.get(coachId) || {
          totalSalary: 0,
          salesAmount: 0,
        };
        const totalSalary = round2(values.totalSalary);
        const salesAmount = round2(values.salesAmount);
        return {
          month,
          monthLabel: formatAnalyticsMonthLabel(month),
          totalSalary,
          salesAmount,
          gap: round2(salesAmount - totalSalary),
        };
      }),
    }));

  return {
    startMonth,
    endMonth: end,
    monthLabels: months.map((month) => ({
      month,
      label: formatAnalyticsMonthLabel(month),
    })),
    employees,
  };
}
