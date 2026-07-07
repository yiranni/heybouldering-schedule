import { ScheduleItem, Store } from '../types';

export const EMPTY_STORE_FILTER = '__none__';

export function matchesStoreFilter(
  record: { storeId?: string | null },
  storeFilter?: string
): boolean {
  if (!storeFilter) return true;
  if (storeFilter === EMPTY_STORE_FILTER) return !record.storeId;
  return record.storeId === storeFilter;
}

export function toLessonDayKey(dateTimeLocal: string): string {
  return dateTimeLocal.slice(0, 10);
}

export function resolveDefaultStoreId(
  coachId: string | undefined,
  dateTimeLocal: string,
  schedules: ScheduleItem[],
  stores: Store[]
): string {
  const firstStoreId = stores[0]?.id || '';
  if (!coachId || !dateTimeLocal || stores.length === 0) {
    return firstStoreId;
  }

  const day = toLessonDayKey(dateTimeLocal);
  const daySchedule = schedules.find(
    (schedule) => schedule.coachId === coachId && schedule.dateStr === day
  );

  return daySchedule?.storeId || firstStoreId;
}
