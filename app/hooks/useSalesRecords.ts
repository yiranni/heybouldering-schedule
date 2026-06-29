'use client';

import { useCallback, useEffect, useState } from 'react';
import { SalesRecord, SalesRecordFilters } from '../types';

function getCurrentMonthFilters(): SalesRecordFilters {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const toDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    startDate: toDateStr(startDate),
    endDate: toDateStr(endDate),
  };
}

export function useSalesRecords(initialFilters?: SalesRecordFilters) {
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SalesRecordFilters>(
    initialFilters || getCurrentMonthFilters()
  );

  const fetchSalesRecords = useCallback(
    async (currentFilters?: SalesRecordFilters) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        const f = currentFilters || filters;
        if (f.startDate) params.append('startDate', f.startDate);
        if (f.endDate) params.append('endDate', f.endDate);
        if (f.coachId) params.append('coachId', f.coachId);

        const url = `/api/sales-records${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch sales records');
        const data = await response.json();
        setSalesRecords(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchSalesRecords();
  }, [fetchSalesRecords]);

  const updateFilters = useCallback((newFilters: SalesRecordFilters) => {
    setFilters(newFilters);
  }, []);

  const createSalesRecord = useCallback(
    async (
      record: Omit<SalesRecord, 'id' | 'coach' | 'productCategory'>
    ): Promise<SalesRecord> => {
      const response = await fetch('/api/sales-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!response.ok) throw new Error('Failed to create sales record');
      const newRecord = await response.json();
      setSalesRecords((prev) => [newRecord, ...prev]);
      return newRecord;
    },
    []
  );

  const updateSalesRecord = useCallback(
    async (
      id: string,
      updates: Partial<Omit<SalesRecord, 'id' | 'coach' | 'productCategory'>>
    ): Promise<SalesRecord> => {
      const response = await fetch(`/api/sales-records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update sales record');
      const updated = await response.json();
      setSalesRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    []
  );

  const deleteSalesRecord = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/sales-records/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete sales record');
    setSalesRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    salesRecords,
    loading,
    error,
    filters,
    updateFilters,
    createSalesRecord,
    updateSalesRecord,
    deleteSalesRecord,
    refreshSalesRecords: fetchSalesRecords,
  };
}
