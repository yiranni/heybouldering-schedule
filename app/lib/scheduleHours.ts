import { HOURS_CONFIG } from "../constants";
import { Shift, ShiftType } from "../types";

export type TimeRange = { start: number; end: number };

export type StoreForScheduleHours = {
  id: string;
  shifts?: unknown;
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

/** 与排班页 calculateStats 保持一致的班次时段解析 */
export function resolveScheduleShiftTimes(
  schedule: ScheduleForHours,
  store: StoreForScheduleHours | undefined
): { start: string; end: string } {
  const shifts = store?.shifts;
  if (store && Array.isArray(shifts) && shifts.length > 0) {
    const matched = (shifts as Shift[]).find((shift) => shift.id === schedule.shiftId);
    if (matched) {
      return { start: matched.start, end: matched.end };
    }
    if (schedule.shiftType === "MORNING") {
      return { start: HOURS_CONFIG.MORNING.start, end: HOURS_CONFIG.MORNING.end };
    }
    return {
      start: HOURS_CONFIG.EVENING.start,
      end: schedule.isExtended ? HOURS_CONFIG.EVENING_EXTENDED.end : HOURS_CONFIG.EVENING.end,
    };
  }

  if (schedule.shiftType === "MORNING") {
    return { start: HOURS_CONFIG.MORNING.start, end: HOURS_CONFIG.MORNING.end };
  }
  return {
    start: HOURS_CONFIG.EVENING.start,
    end: schedule.isExtended ? HOURS_CONFIG.EVENING_EXTENDED.end : HOURS_CONFIG.EVENING.end,
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

/** Lesson records store ISO datetimes in dateStr; use [start, nextMonth) for safe filtering. */
export function getLessonRecordMonthDateFilter(month: string): {
  dateStr: { gte: string; lt: string };
} {
  const { startDate } = getMonthDateStrBounds(month);
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const nextMonth = new Date(year, monthNum, 1);
  const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
  return {
    dateStr: {
      gte: startDate,
      lt: nextMonthStart,
    },
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
