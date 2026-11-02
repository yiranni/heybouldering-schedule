import { prisma } from "@/app/lib/prisma";
import { findPayrollSettingValue, upsertPayrollSettingValue } from "@/app/lib/payrollSettings";
import { getMonthDateStrBounds } from "@/app/lib/scheduleHours";

export const OVERTIME_HOURLY_RATE_KEY = "overtime_hourly_rate_v1";
export const DEFAULT_OVERTIME_HOURLY_RATE = 30;

type OvertimeRequestWithStore = {
  id: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  hours: number;
  storeId: string | null;
  store: { id: string; name: string } | null;
};

type OvertimeRecordMonthSelect = {
  coachId: string;
  storeId: string | null;
  hours: number;
};

type OvertimeRequestDb = {
  findMany(args: {
    where: {
      coachId?: string;
      dateStr?: { gte?: string; lte?: string };
    };
    orderBy?: Array<{ dateStr: "asc" } | { createdAt: "asc" }>;
    include?: {
      store: { select: { id: true; name: true } };
    };
    select?: { coachId: true; storeId: true; hours: true };
  }): Promise<OvertimeRequestWithStore[] | OvertimeRecordMonthSelect[]>;
  create(args: {
    data: {
      coachId: string;
      storeId: string;
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
      storeId: true;
    };
  }): Promise<{
    id: string;
    dateStr: string;
    startTime: string;
    endTime: string;
    hours: number;
    storeId: string;
  }>;
  delete(args: { where: { id: string } }): Promise<{ id: string }>;
};

function getOvertimeRequestDb(): OvertimeRequestDb {
  return (prisma as unknown as { overtimeRequest: OvertimeRequestDb }).overtimeRequest;
}

export type OvertimeRequestItem = {
  id: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  hours: number;
  storeId: string | null;
  storeName: string | null;
};

export type OvertimeRecordForMonth = {
  coachId: string;
  storeId: string | null;
  hours: number;
};

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
  const db = getOvertimeRequestDb();
  const records = (await db.findMany({
    where: {
      coachId,
      dateStr: { gte: startDate, lte: endDate },
    },
    orderBy: [{ dateStr: "asc" }, { createdAt: "asc" }],
    include: {
      store: {
        select: { id: true, name: true },
      },
    },
  })) as OvertimeRequestWithStore[];
  return records.map((record) => ({
    id: record.id,
    dateStr: record.dateStr,
    startTime: record.startTime ?? "",
    endTime: record.endTime ?? "",
    hours: round2(Number(record.hours) || 0),
    storeId: record.storeId,
    storeName: record.store?.name ?? null,
  }));
}

export async function listOvertimeRecordsForMonth(month: string): Promise<OvertimeRecordForMonth[]> {
  const { startDate, endDate } = getMonthDateStrBounds(month);
  const db = getOvertimeRequestDb();
  const records = (await db.findMany({
    where: {
      dateStr: { gte: startDate, lte: endDate },
    },
    select: {
      coachId: true,
      storeId: true,
      hours: true,
    },
  })) as OvertimeRecordMonthSelect[];
  return records.map((record) => ({
    coachId: record.coachId,
    storeId: record.storeId,
    hours: round2(Number(record.hours) || 0),
  }));
}

export async function getOvertimeHoursByCoachForMonth(month: string): Promise<Map<string, number>> {
  const records = await listOvertimeRecordsForMonth(month);
  const byCoach = new Map<string, number>();
  for (const record of records) {
    byCoach.set(record.coachId, round2((byCoach.get(record.coachId) || 0) + record.hours));
  }
  return byCoach;
}

export async function createOvertimeRequest(input: {
  coachId: string;
  storeId: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  hours: number;
}) {
  const db = getOvertimeRequestDb();
  return db.create({
    data: input,
    select: {
      id: true,
      dateStr: true,
      startTime: true,
      endTime: true,
      hours: true,
      storeId: true,
    },
  });
}

export async function deleteOvertimeRequest(id: string): Promise<boolean> {
  const db = getOvertimeRequestDb();
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

export async function coachCanUseStoreForOvertime(coachId: string, storeId: string): Promise<boolean> {
  const link = await prisma.coachStore.findFirst({
    where: { coachId, storeId },
    select: { id: true },
  });
  return Boolean(link);
}
