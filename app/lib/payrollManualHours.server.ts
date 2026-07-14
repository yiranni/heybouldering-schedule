import { prisma } from "@/app/lib/prisma";
import {
  calcDailyScheduleHourEntriesForCoach,
  calcHoursFromTimes,
  ScheduleForHours,
  StoreForScheduleHours,
} from "@/app/lib/scheduleHours";

export type PartTimeHourEntry = {
  id: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  hours: number;
  source: "schedule" | "manual";
};

type PayrollManualHoursDb = {
  findMany(args: {
    where: { month: string; coachId?: string };
    orderBy?: Array<{ dateStr: "asc" } | { startTime: "asc" }>;
    select?: {
      id: true;
      coachId: true;
      dateStr: true;
      startTime: true;
      endTime: true;
    };
  }): Promise<
    Array<{
      id: string;
      coachId?: string;
      dateStr: string;
      startTime: string;
      endTime: string;
    }>
  >;
  create(args: {
    data: {
      month: string;
      coachId: string;
      dateStr: string;
      startTime: string;
      endTime: string;
    };
    select: {
      id: true;
      dateStr: true;
      startTime: true;
      endTime: true;
    };
  }): Promise<{
    id: string;
    dateStr: string;
    startTime: string;
    endTime: string;
  }>;
};

const payrollManualHoursDb = (prisma as unknown as { payrollManualHours: PayrollManualHoursDb })
  .payrollManualHours;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getManualHoursSumByCoach(month: string): Promise<Map<string, number>> {
  const records = await payrollManualHoursDb.findMany({
    where: { month },
    select: {
      id: true,
      coachId: true,
      dateStr: true,
      startTime: true,
      endTime: true,
    },
  });

  const byCoach = new Map<string, number>();
  for (const record of records) {
    const coachId = record.coachId;
    if (!coachId) continue;
    const hours = calcHoursFromTimes(record.startTime, record.endTime);
    byCoach.set(coachId, round2((byCoach.get(coachId) || 0) + hours));
  }
  return byCoach;
}

export async function buildPartTimeHoursDetails(
  month: string,
  coachId: string,
  schedules: ScheduleForHours[],
  storeMap: Map<string, StoreForScheduleHours>
): Promise<{
  items: PartTimeHourEntry[];
  scheduleHours: number;
  manualHours: number;
  totalHours: number;
}> {
  const scheduleEntries = calcDailyScheduleHourEntriesForCoach(schedules, storeMap, coachId).map(
    (entry, index) => ({
      id: `schedule-${entry.dateStr}-${index}`,
      dateStr: entry.dateStr,
      startTime: entry.startTime,
      endTime: entry.endTime,
      hours: entry.hours,
      source: "schedule" as const,
    })
  );

  const manualRecords = await payrollManualHoursDb.findMany({
    where: { month, coachId },
    orderBy: [{ dateStr: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      coachId: true,
      dateStr: true,
      startTime: true,
      endTime: true,
    },
  });

  const manualEntries: PartTimeHourEntry[] = manualRecords.map((record) => ({
    id: record.id,
    dateStr: record.dateStr,
    startTime: record.startTime,
    endTime: record.endTime,
    hours: calcHoursFromTimes(record.startTime, record.endTime),
    source: "manual" as const,
  }));

  const scheduleHours = round2(scheduleEntries.reduce((sum, entry) => sum + entry.hours, 0));
  const manualHours = round2(manualEntries.reduce((sum, entry) => sum + entry.hours, 0));
  const items = [...scheduleEntries, ...manualEntries].sort(
    (a, b) => a.dateStr.localeCompare(b.dateStr) || a.startTime.localeCompare(b.startTime)
  );

  return {
    items,
    scheduleHours,
    manualHours,
    totalHours: round2(scheduleHours + manualHours),
  };
}

export async function createManualPartTimeHours(input: {
  month: string;
  coachId: string;
  dateStr: string;
  startTime: string;
  endTime: string;
}) {
  return payrollManualHoursDb.create({
    data: input,
    select: {
      id: true,
      dateStr: true,
      startTime: true,
      endTime: true,
    },
  });
}
