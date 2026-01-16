'use client';

import { useState, useEffect, useCallback } from 'react';
import { LessonRecord, LessonRecordFilters } from '../types';

export function useLessonRecords(initialFilters?: LessonRecordFilters) {
  const [lessonRecords, setLessonRecords] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LessonRecordFilters>(initialFilters || {});

  const fetchLessonRecords = useCallback(async (currentFilters?: LessonRecordFilters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const filtersToUse = currentFilters || filters;
      
      if (filtersToUse.startDate) params.append('startDate', filtersToUse.startDate);
      if (filtersToUse.endDate) params.append('endDate', filtersToUse.endDate);
      if (filtersToUse.coachId) params.append('coachId', filtersToUse.coachId);
      if (filtersToUse.lessonTypeId) params.append('lessonTypeId', filtersToUse.lessonTypeId);

      const url = `/api/lesson-records${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch lesson records');
      }
      
      const data = await response.json();
      setLessonRecords(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLessonRecords();
  }, [fetchLessonRecords]);

  const updateFilters = useCallback((newFilters: LessonRecordFilters) => {
    setFilters(newFilters);
  }, []);

  const createLessonRecord = useCallback(async (
    record: Omit<LessonRecord, 'id' | 'lessonType' | 'coach'>
  ): Promise<LessonRecord> => {
    const response = await fetch('/api/lesson-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      throw new Error('Failed to create lesson record');
    }

    const newRecord = await response.json();
    setLessonRecords((prev) => [newRecord, ...prev]);
    return newRecord;
  }, []);

  const updateLessonRecord = useCallback(async (
    id: string,
    updates: Partial<Omit<LessonRecord, 'id' | 'lessonType' | 'coach'>>
  ): Promise<LessonRecord> => {
    const response = await fetch(`/api/lesson-records/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update lesson record');
    }

    const updatedRecord = await response.json();
    setLessonRecords((prev) =>
      prev.map((r) => (r.id === id ? updatedRecord : r))
    );
    return updatedRecord;
  }, []);

  const deleteLessonRecord = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/lesson-records/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete lesson record');
    }

    setLessonRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    lessonRecords,
    loading,
    error,
    filters,
    updateFilters,
    createLessonRecord,
    updateLessonRecord,
    deleteLessonRecord,
    refreshLessonRecords: fetchLessonRecords,
  };
}

