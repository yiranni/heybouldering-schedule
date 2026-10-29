import { prisma } from "@/app/lib/prisma";
import { findPayrollSettingValue, upsertPayrollSettingValue } from "@/app/lib/payrollSettings";
import { getMonthDateStrBounds } from "@/app/lib/scheduleHours";

export const OVERTIME_HOURLY_RATE_KEY = "overtime_hourly_rate_v1";
export const DEFAULT_OVERTIME_HOURLY_RATE = 30;

export type OvertimeRequestItem = {
  id: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  hours: number;
};

type OvertimeRequestDb = {
  findMany(args: {
    where: {
      coachId?: string;
      dateStr?: { gte?: string; lte?: string };
    };
    orderBy?: Array<{ dateStr: "asc" } | { createdAt: "asc" }>;
    select?: {
      id: true;
      coachId?: true;
      dateStr: true;
      startTime?: true;
      endTime?: true;
      hours: true;
    };
  }): Promise<
    Array<{
      id: string;
      coachId?: string;
      dateStr: string;
      startTime?: string;
      endTime?: string;
      hours: number;
    }>
  >;
  create(args: {
    data: {
      coachId: string;
      dateStr: string;
      startTime: string;
      endTime: string;
      hours: number;
    };
    select: {
      id: true;
      dateStr: true;
      startTime: true;
      endTime: true;
      hours: true;
    };
  }): Promise<{
    id: string;
    dateStr: string;
    startTime: string;
    endTime: string;
    hours: number;
  }>;
  delete(args: { where: { id: string } }): Promise<{ id: string }>;
};

async function getOvertimeRequestDb(): Promise<OvertimeRequestDb> {
  return (prisma as unknown as { overtimeRequest: OvertimeRequestDb }).overtimeRequest;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function fetchOvertimeHourlyRate(): Promise<number> {
  const raw = await findPayrollSettingValue(OVERTIME_HOURLY_RATE_KEY);
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate < 0) return DEFAULT_OVERTIME_HOURLY_RATE;
  return round2(rate);
}

export async function saveOvertimeHourlyRate(rate: number): Promise<number> {
  const normalized = round2(Math.max(0, rate));
  await upsertPayrollSettingValue(OVERTIME_HOURLY_RATE_KEY, normalized);
  return normalized;
}

export async function listOvertimeRequestsForCoachMonth(
  coachId: string,
  month: string
): Promise<OvertimeRequestItem[]> {
  const { startDate, endDate } = getMonthDateStrBounds(month);
  const db = await getOvertimeRequestDb();
  const records = await db.findMany({
    where: {
      coachId,
      dateStr: { gte: startDate, lte: endDate },
    },
    orderBy: [{ dateStr: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      coachId: true,
      dateStr: true,
      startTime: true,
      endTime: true,
      hours: true,
    },
  });
  return records.map((record) => ({
    id: record.id,
    dateStr: record.dateStr,
    startTime: record.startTime ?? "",
    endTime: record.endTime ?? "",
    hours: round2(Number(record.hours) || 0),
  }));
}

export async function getOvertimeHoursByCoachForMonth(month: string): Promise<Map<string, number>> {
  const { startDate, endDate } = getMonthDateStrBounds(month);
  const db = await getOvertimeRequestDb();
  const records = await db.findMany({
    where: {
      dateStr: { gte: startDate, lte: endDate },
    },
    select: { id: true, coachId: true, dateStr: true, hours: true },
  });

  const byCoach = new Map<string, number>();
  for (const record of records) {
    const coachId = record.coachId;
    if (!coachId) continue;
    const hours = round2(Number(record.hours) || 0);
    byCoach.set(coachId, round2((byCoach.get(coachId) || 0) + hours));
  }
  return byCoach;
}

export async function createOvertimeRequest(input: {
  coachId: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  hours: number;
}) {
  const db = await getOvertimeRequestDb();
  return db.create({
    data: input,
    select: { id: true, dateStr: true, startTime: true, endTime: true, hours: true },
  });
}

export async function deleteOvertimeRequest(id: string): Promise<boolean> {
  const db = await getOvertimeRequestDb();
  try {
    await db.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export function calcOvertimePay(totalHours: number, hourlyRate: number): number {
  return round2(totalHours * hourlyRate);
}
