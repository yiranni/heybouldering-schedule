import {
  calcRecordLessonFeeDetail,
  resolveLessonFeeConfigMap,
  type LessonFeeConfigItem,
  type LessonRecordForFee,
} from "@/app/lib/lessonFee";
import { calcHoursFromTimes, calcMonthlyHoursByCoachAndStore, type ScheduleForHours, type StoreForScheduleHours } from "@/app/lib/scheduleHours";

export type PayrollStoreSlice = {
  monthHours: number;
  basicSalary: number;
  salesAmount: number;
  salesCommission: number;
  lessonFee: number;
  overtimeHours: number;
  overtimePay: number;
  totalSalary: number;
};

export type SalesByCoachStoreRow = {
  coachId: string;
  storeId: string | null;
  total: number;
};

type CoachStoreLink = {
  coachId: string;
  storeId: string;
  isPrimary: boolean;
};

type ManualHourRow = {
  coachId: string;
  startTime: string;
  endTime: string;
};

type LessonRecordRow = {
  id: string;
  coachId: string;
  dateStr: string;
  lessonTypeId: string;
  studentCount: number;
  storeId: string | null;
};

type CoachForAttribution = {
  id: string;
  employmentType: "FULL_TIME" | "PART_TIME";
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptySlice(): PayrollStoreSlice {
  return {
    monthHours: 0,
    basicSalary: 0,
    salesAmount: 0,
    salesCommission: 0,
    lessonFee: 0,
    overtimeHours: 0,
    overtimePay: 0,
    totalSalary: 0,
  };
}

function addSlice(target: PayrollStoreSlice, part: PayrollStoreSlice): void {
  target.monthHours = round2(target.monthHours + part.monthHours);
  target.basicSalary = round2(target.basicSalary + part.basicSalary);
  target.salesAmount = round2(target.salesAmount + part.salesAmount);
  target.salesCommission = round2(target.salesCommission + part.salesCommission);
  target.lessonFee = round2(target.lessonFee + part.lessonFee);
  target.overtimeHours = round2(target.overtimeHours + part.overtimeHours);
  target.overtimePay = round2(target.overtimePay + part.overtimePay);
  target.totalSalary = round2(target.totalSalary + part.totalSalary);
}

function finalizeSlice(slice: PayrollStoreSlice): PayrollStoreSlice {
  slice.totalSalary = round2(
    slice.basicSalary + slice.salesCommission + slice.lessonFee + slice.overtimePay
  );
  return slice;
}

export function resolvePrimaryStoreId(links: CoachStoreLink[], coachId: string): string | null {
  const coachLinks = links.filter((link) => link.coachId === coachId);
  if (coachLinks.length === 0) return null;
  const primary = coachLinks.find((link) => link.isPrimary);
  return primary?.storeId ?? coachLinks[0].storeId;
}

function ensureStoreSlice(
  map: Record<string, PayrollStoreSlice>,
  storeId: string
): PayrollStoreSlice {
  if (!map[storeId]) map[storeId] = emptySlice();
  return map[storeId];
}

function calcCommission(totalSales: number, rules: Array<{ minAmount: number; commissionRate: number }>): number {
  const rule = [...rules]
    .sort((a, b) => b.minAmount - a.minAmount)
    .find((r) => totalSales >= r.minAmount);
  const rate = rule?.commissionRate || 0;
  return round2(totalSales * rate);
}

function buildLessonFeeByCoachStore(
  coaches: CoachForAttribution[],
  lessonTypes: Array<{ id: string; name: string }>,
  lessonRecords: LessonRecordRow[],
  savedFeeConfig: LessonFeeConfigItem[],
  primaryStoreByCoach: Map<string, string | null>
): Map<string, Map<string, number>> {
  const lessonTypeNameById = new Map(lessonTypes.map((item) => [item.id, item.name]));
  const feeConfigMap = resolveLessonFeeConfigMap(lessonTypes, savedFeeConfig);
  const result = new Map<string, Map<string, number>>();

  const recordsByCoach = new Map<string, LessonRecordRow[]>();
  for (const record of lessonRecords) {
    const list = recordsByCoach.get(record.coachId) || [];
    list.push(record);
    recordsByCoach.set(record.coachId, list);
  }

  for (const coach of coaches) {
    if (coach.employmentType !== "PART_TIME") continue;
    const records = (recordsByCoach.get(coach.id) || []).sort((a, b) =>
      a.dateStr.localeCompare(b.dateStr)
    );
    const noviceFreeUsed = { count: 0 };
    const byStore = new Map<string, number>();
    const fallbackStore = primaryStoreByCoach.get(coach.id);

    for (const record of records) {
      const config = feeConfigMap.get(record.lessonTypeId);
      if (!config) continue;
      const lessonRecord: LessonRecordForFee = {
        dateStr: record.dateStr,
        lessonTypeId: record.lessonTypeId,
        studentCount: record.studentCount,
        lessonTypeName: lessonTypeNameById.get(record.lessonTypeId),
      };
      const fee = calcRecordLessonFeeDetail(
        lessonRecord,
        config,
        "PART_TIME",
        noviceFreeUsed,
        lessonTypeNameById
      ).fee;
      const storeId = record.storeId || fallbackStore;
      if (!storeId) continue;
      byStore.set(storeId, round2((byStore.get(storeId) || 0) + fee));
    }
    result.set(coach.id, byStore);
  }

  return result;
}

export function buildPayrollStoreAttribution(input: {
  coaches: CoachForAttribution[];
  coachStoreLinks: CoachStoreLink[];
  schedules: ScheduleForHours[];
  storeMap: Map<string, StoreForScheduleHours>;
  manualHours: ManualHourRow[];
  salesByCoachStore: SalesByCoachStoreRow[];
  lessonTypes: Array<{ id: string; name: string }>;
  lessonRecords: LessonRecordRow[];
  savedFeeConfig: LessonFeeConfigItem[];
  commissionRules: Array<{ minAmount: number; commissionRate: number }>;
  payrollByCoach: Map<
    string,
    {
      monthHours: number;
      hourlyRate: number | null;
      basicSalary: number;
      salesAmount: number;
      salesCommission: number;
      lessonFee: number;
      overtimeHours: number;
      overtimePay: number;
    }
  >;
}): Map<string, Record<string, PayrollStoreSlice>> {
  const primaryStoreByCoach = new Map<string, string | null>();
  for (const coach of input.coaches) {
    primaryStoreByCoach.set(coach.id, resolvePrimaryStoreId(input.coachStoreLinks, coach.id));
  }

  const scheduleHoursByCoachStore = calcMonthlyHoursByCoachAndStore(input.schedules, input.storeMap);
  const manualHoursByCoach = new Map<string, number>();
  for (const row of input.manualHours) {
    const hours = calcHoursFromTimes(row.startTime, row.endTime);
    manualHoursByCoach.set(row.coachId, round2((manualHoursByCoach.get(row.coachId) || 0) + hours));
  }

  const salesAmountByCoachStore = new Map<string, Map<string, number>>();
  for (const row of input.salesByCoachStore) {
    if (!row.coachId) continue;
    const storeId = row.storeId || primaryStoreByCoach.get(row.coachId);
    if (!storeId) continue;
    if (!salesAmountByCoachStore.has(row.coachId)) {
      salesAmountByCoachStore.set(row.coachId, new Map());
    }
    const byStore = salesAmountByCoachStore.get(row.coachId)!;
    byStore.set(storeId, round2((byStore.get(storeId) || 0) + (Number(row.total) || 0)));
  }

  const lessonFeeByCoachStore = buildLessonFeeByCoachStore(
    input.coaches,
    input.lessonTypes,
    input.lessonRecords,
    input.savedFeeConfig,
    primaryStoreByCoach
  );

  const result = new Map<string, Record<string, PayrollStoreSlice>>();

  for (const coach of input.coaches) {
    const payroll = input.payrollByCoach.get(coach.id);
    if (!payroll) continue;
    const attribution: Record<string, PayrollStoreSlice> = {};
    const primaryStoreId = primaryStoreByCoach.get(coach.id);

    if (coach.employmentType === "FULL_TIME") {
      const storeId = primaryStoreId;
      if (storeId) {
        const slice = ensureStoreSlice(attribution, storeId);
        slice.monthHours = payroll.monthHours;
        slice.basicSalary = payroll.basicSalary;
        slice.salesAmount = payroll.salesAmount;
        slice.salesCommission = payroll.salesCommission;
        slice.lessonFee = payroll.lessonFee;
        slice.overtimeHours = payroll.overtimeHours;
        slice.overtimePay = payroll.overtimePay;
        finalizeSlice(slice);
      }
      result.set(coach.id, attribution);
      continue;
    }

    const hourlyRate = payroll.hourlyRate ?? 0;
    const scheduleByStore = scheduleHoursByCoachStore.get(coach.id) || new Map<string, number>();
    for (const [storeId, hours] of scheduleByStore.entries()) {
      const slice = ensureStoreSlice(attribution, storeId);
      slice.monthHours = round2(slice.monthHours + hours);
      slice.basicSalary = round2(slice.basicSalary + hours * hourlyRate);
    }

    const manualHours = manualHoursByCoach.get(coach.id) || 0;
    if (manualHours > 0 && primaryStoreId) {
      const slice = ensureStoreSlice(attribution, primaryStoreId);
      slice.monthHours = round2(slice.monthHours + manualHours);
      slice.basicSalary = round2(slice.basicSalary + manualHours * hourlyRate);
    }

    const salesByStore = salesAmountByCoachStore.get(coach.id);
    if (salesByStore) {
      for (const [storeId, salesAmount] of salesByStore.entries()) {
        const slice = ensureStoreSlice(attribution, storeId);
        slice.salesAmount = round2(slice.salesAmount + salesAmount);
        slice.salesCommission = calcCommission(slice.salesAmount, input.commissionRules);
      }
    }

    const lessonByStore = lessonFeeByCoachStore.get(coach.id);
    if (lessonByStore) {
      for (const [storeId, lessonFee] of lessonByStore.entries()) {
        const slice = ensureStoreSlice(attribution, storeId);
        slice.lessonFee = round2(slice.lessonFee + lessonFee);
      }
    }

    if (payroll.overtimePay > 0 && primaryStoreId) {
      const slice = ensureStoreSlice(attribution, primaryStoreId);
      slice.overtimeHours = payroll.overtimeHours;
      slice.overtimePay = payroll.overtimePay;
    }

    for (const slice of Object.values(attribution)) {
      finalizeSlice(slice);
    }
    result.set(coach.id, attribution);
  }

  return result;
}
