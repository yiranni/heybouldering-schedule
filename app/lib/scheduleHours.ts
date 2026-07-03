import { HOURS_CONFIG } from "../constants";
import { Shift, ShiftType } from "../types";

export type TimeRange = { start: number; end: number };

export type StoreForScheduleHours = {
  id: string;
  shifts?: unknown;
  morningShiftStart?: string;
  morningShiftEnd?: string;
  eveningShiftStart?: string;
  eveningShiftEnd?: string;
  eveningExtendedEnd?: string | null;
};

export type ScheduleForHours = {
  coachId: string;
  dateStr: string;
  storeId: string;
  shiftId: string;
  shiftName?: string;
  shiftType?: ShiftType;
  isExtended?: boolean;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getDurationRange(startTime: string, endTime: string): TimeRange {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end < start) end += 24 * 60;
  return { start, end };
}

function mergeRanges(ranges: TimeRange[]): number {
  if (ranges.length === 0) return 0;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  return merged.reduce((sum, range) => sum + (range.end - range.start), 0);
}

function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function parseStoreShifts(store: StoreForScheduleHours): Shift[] {
  if (Array.isArray(store.shifts) && store.shifts.length > 0) {
    return store.shifts as Shift[];
  }
  return [
    {
      id: "morning",
      name: "早班",
      start: store.morningShiftStart || HOURS_CONFIG.MORNING.start,
      end: store.morningShiftEnd || HOURS_CONFIG.MORNING.end,
      daysOfWeek: null,
    },
    {
      id: "evening",
      name: "晚班",
      start: store.eveningShiftStart || HOURS_CONFIG.EVENING.start,
      end: store.eveningShiftEnd || HOURS_CONFIG.EVENING.end,
      daysOfWeek: null,
    },
  ];
}

function isEveningShift(shiftId: string, shiftName?: string): boolean {
  const id = shiftId.toLowerCase();
  if (id === "evening" || id.includes("evening")) return true;
  if (id === "morning" || id.includes("morning")) return false;
  if (shiftName?.includes("晚")) return true;
  if (shiftName?.includes("早")) return false;
  return false;
}

function isMorningShift(shiftId: string, shiftName?: string): boolean {
  const id = shiftId.toLowerCase();
  if (id === "morning" || id.includes("morning")) return true;
  if (id === "evening" || id.includes("evening")) return false;
  if (shiftName?.includes("早")) return true;
  if (shiftName?.includes("晚")) return false;
  return false;
}

function resolveEveningEndTime(
  schedule: ScheduleForHours,
  store: StoreForScheduleHours | undefined,
  defaultEnd: string
): string {
  if (schedule.isExtended) {
    return store?.eveningExtendedEnd || HOURS_CONFIG.EVENING_EXTENDED.end;
  }

  const dayOfWeek = getDayOfWeek(schedule.dateStr);
  const isWeekendEvening =
    (dayOfWeek === 5 || dayOfWeek === 6) &&
    (schedule.shiftType === "EVENING" || isEveningShift(schedule.shiftId, schedule.shiftName));

  if (!isWeekendEvening) return defaultEnd;
  if (store?.eveningExtendedEnd) return store.eveningExtendedEnd;
  if (schedule.shiftId === "evening") return HOURS_CONFIG.EVENING_EXTENDED.end;
  return defaultEnd;
}

export function resolveScheduleShiftTimes(
  schedule: ScheduleForHours,
  store: StoreForScheduleHours | undefined
): { start: string; end: string } {
  const shifts = store ? parseStoreShifts(store) : [];
  const matched = shifts.find((shift) => shift.id === schedule.shiftId);

  if (matched) {
    const end = resolveEveningEndTime(schedule, store, matched.end);
    return { start: matched.start, end };
  }

  if (schedule.shiftType === "MORNING" || isMorningShift(schedule.shiftId, schedule.shiftName)) {
    return { start: HOURS_CONFIG.MORNING.start, end: HOURS_CONFIG.MORNING.end };
  }

  if (schedule.shiftType === "EVENING" || isEveningShift(schedule.shiftId, schedule.shiftName)) {
    return {
      start: HOURS_CONFIG.EVENING.start,
      end: resolveEveningEndTime(schedule, store, HOURS_CONFIG.EVENING.end),
    };
  }

  return {
    start: HOURS_CONFIG.EVENING.start,
    end: HOURS_CONFIG.EVENING.end,
  };
}

export function getMonthDateStrBounds(month: string): { startDate: string; endDate: string } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const monthPadded = String(monthIndex + 1).padStart(2, "0");
  return {
    startDate: `${year}-${monthPadded}-01`,
    endDate: `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function calcMonthlyHoursByCoach(
  schedules: ScheduleForHours[],
  storeMap: Map<string, StoreForScheduleHours>
): Map<string, number> {
  const byCoachDate = new Map<string, TimeRange[]>();

  for (const schedule of schedules) {
    const key = `${schedule.coachId}__${schedule.dateStr}`;
    const store = storeMap.get(schedule.storeId);
    const { start, end } = resolveScheduleShiftTimes(schedule, store);
    const ranges = byCoachDate.get(key) || [];
    ranges.push(getDurationRange(start, end));
    byCoachDate.set(key, ranges);
  }

  const monthHoursByCoach = new Map<string, number>();
  for (const [key, ranges] of byCoachDate.entries()) {
    const coachId = key.split("__")[0];
    const minutes = mergeRanges(ranges);
    monthHoursByCoach.set(
      coachId,
      round2((monthHoursByCoach.get(coachId) || 0) + minutes / 60)
    );
  }

  return monthHoursByCoach;
}
