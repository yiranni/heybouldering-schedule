'use client';

import { useState, useEffect } from 'react';
import { ScheduleItem } from '../types';

export function useSchedules(startDate?: string, endDate?: string) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `/api/schedules${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch schedules');

      const data = await response.json();
      setSchedules(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSchedules = async (schedulesToSave: ScheduleItem[], weekStartDate: string, weekEndDate: string) => {
    try {
      console.log('saveSchedules called with:', {
        schedulesToSaveCount: schedulesToSave.length,
        weekStartDate,
        weekEndDate
      });

      // First, delete existing schedules for this week
      const deleteParams = new URLSearchParams({ startDate: weekStartDate, endDate: weekEndDate });
      const deleteResponse = await fetch(`/api/schedules?${deleteParams.toString()}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) throw new Error('Failed to clear old schedules');

      const deleteResult = await deleteResponse.json();
      console.log('Deleted schedules:', deleteResult);

      // Then, save the new schedules
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: schedulesToSave }),
      });

      if (!response.ok) throw new Error('Failed to save schedules');

      const saveResult = await response.json();
      console.log('Saved schedules:', saveResult);

      // Refresh schedules after saving
      await fetchSchedules();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete schedule');

      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteSchedulesByDateRange = async (start: string, end: string) => {
    try {
      const params = new URLSearchParams({ startDate: start, endDate: end });
      const response = await fetch(`/api/schedules?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete schedules');

      // Refresh after deletion
      await fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [startDate, endDate]);

  return {
    schedules,
    loading,
    error,
    refreshSchedules: fetchSchedules,
    saveSchedules,
    deleteSchedule,
    deleteSchedulesByDateRange,
    setSchedules,
  };
}
