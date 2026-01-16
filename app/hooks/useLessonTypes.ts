'use client';

import { useState, useEffect, useCallback } from 'react';
import { LessonType } from '../types';

export function useLessonTypes() {
  const [lessonTypes, setLessonTypes] = useState<LessonType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessonTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/lesson-types');
      if (!response.ok) {
        throw new Error('Failed to fetch lesson types');
      }
      const data = await response.json();
      setLessonTypes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessonTypes();
  }, [fetchLessonTypes]);

  const createLessonType = useCallback(async (lessonType: Omit<LessonType, 'id'>): Promise<LessonType> => {
    const response = await fetch('/api/lesson-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lessonType),
    });

    if (!response.ok) {
      throw new Error('Failed to create lesson type');
    }

    const newLessonType = await response.json();
    setLessonTypes((prev) => [...prev, newLessonType]);
    return newLessonType;
  }, []);

  const updateLessonType = useCallback(async (id: string, updates: Partial<Omit<LessonType, 'id'>>): Promise<void> => {
    const response = await fetch(`/api/lesson-types/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update lesson type');
    }

    const updatedLessonType = await response.json();
    setLessonTypes((prev) =>
      prev.map((lt) => (lt.id === id ? updatedLessonType : lt))
    );
  }, []);

  const deleteLessonType = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/lesson-types/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete lesson type');
    }

    setLessonTypes((prev) => prev.filter((lt) => lt.id !== id));
  }, []);

  return {
    lessonTypes,
    loading,
    error,
    createLessonType,
    updateLessonType,
    deleteLessonType,
    refreshLessonTypes: fetchLessonTypes,
  };
}

