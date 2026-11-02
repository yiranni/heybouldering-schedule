import type { PayrollRow } from "@/app/types";

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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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

/** 按所选门店合并工资行；selectedStoreIds 为 null 表示全部门店（不裁剪） */
export function applyStoreFilterToPayrollRow(
  row: PayrollRow,
  selectedStoreIds: string[] | null
): PayrollRow {
  if (selectedStoreIds === null || !row.storeAttribution) {
    const { storeAttribution: _a, primaryStoreId: _p, ...rest } = row;
    return rest;
  }

  const merged = emptySlice();
  for (const storeId of selectedStoreIds) {
    const slice = row.storeAttribution[storeId];
    if (slice) addSlice(merged, slice);
  }

  const { storeAttribution: _a, primaryStoreId: _p, ...base } = row;
  return {
    ...base,
    ...merged,
  };
}
