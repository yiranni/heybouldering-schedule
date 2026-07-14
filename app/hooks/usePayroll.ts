'use client';

import { useCallback, useEffect, useState } from 'react';
import { PayrollRow } from '../types';

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const DEFAULT_PART_TIME_HOURLY_RATE = 20;

export function usePayroll() {
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayroll = useCallback(async (targetMonth?: string, options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      const m = targetMonth || month;
      const response = await fetch(`/api/payroll?month=${m}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch payroll');
      }
      const data = await response.json();
      const nextRows: PayrollRow[] = data.rows || [];
      setRows(nextRows);
      setError(null);
      return nextRows;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return undefined;
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [month]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const updateRow = useCallback((coachId: string, patch: Partial<Pick<PayrollRow, 'monthHours' | 'hourlyRate' | 'basicSalary'>>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.coachId !== coachId) return row;
        const monthHours = patch.monthHours ?? row.monthHours;
        const hourlyRate = patch.hourlyRate ?? row.hourlyRate ?? DEFAULT_PART_TIME_HOURLY_RATE;
        const basicSalaryFromHours =
          row.employmentType === 'PART_TIME'
            ? Number((monthHours * hourlyRate).toFixed(2))
            : row.basicSalary;
        const basicSalary =
          patch.basicSalary !== undefined ? patch.basicSalary : basicSalaryFromHours;
        const totalSalary = Number((basicSalary + row.salesCommission + row.lessonFee).toFixed(2));
        return { ...row, monthHours, hourlyRate, basicSalary, totalSalary };
      })
    );
  }, []);

  const updatePartTimeHourlyRate = useCallback((hourlyRate: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.employmentType !== 'PART_TIME') return row;
        const basicSalary = Number((row.monthHours * hourlyRate).toFixed(2));
        const totalSalary = Number((basicSalary + row.salesCommission + row.lessonFee).toFixed(2));
        return { ...row, hourlyRate, basicSalary, totalSalary };
      })
    );
  }, []);

  const savePayroll = useCallback(async (rowsOverride?: PayrollRow[]) => {
    const rowsToSave = rowsOverride ?? rows;
    try {
      setSaving(true);
      const response = await fetch('/api/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          rows: rowsToSave.map((row) => ({
            coachId: row.coachId,
            monthHours: row.monthHours,
            hourlyRate: row.hourlyRate ?? DEFAULT_PART_TIME_HOURLY_RATE,
            basicSalary: row.basicSalary,
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save payroll');
      }
      if (rowsOverride) {
        setRows(rowsToSave);
      }
      await fetchPayroll(month, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [month, rows, fetchPayroll]);

  const saveSalaryConfig = useCallback(
    async (salaryByCoachId: Record<string, number>, partTimeHourlyRate: number) => {
      const nextRows = rows.map((row) => {
        if (row.employmentType === 'FULL_TIME') {
          const basicSalary = Number(salaryByCoachId[row.coachId] ?? row.basicSalary);
          const totalSalary = Number((basicSalary + row.salesCommission + row.lessonFee).toFixed(2));
          return { ...row, basicSalary, totalSalary };
        }
        if (row.employmentType === 'PART_TIME') {
          const basicSalary = Number((row.monthHours * partTimeHourlyRate).toFixed(2));
          const totalSalary = Number((basicSalary + row.salesCommission + row.lessonFee).toFixed(2));
          return { ...row, hourlyRate: partTimeHourlyRate, basicSalary, totalSalary };
        }
        return row;
      });
      await savePayroll(nextRows);
    },
    [rows, savePayroll]
  );

  const changeMonth = useCallback((nextMonth: string) => {
    setMonth(nextMonth);
  }, []);

  return {
    month,
    rows,
    loading,
    saving,
    error,
    changeMonth,
    updateRow,
    updatePartTimeHourlyRate,
    savePayroll,
    saveSalaryConfig,
    refreshPayroll: fetchPayroll,
  };
}
