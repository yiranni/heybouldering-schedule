'use client';

import { useState, useEffect } from 'react';
import { Coach } from '../types';

export function useCoaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoaches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/coaches');
      if (!response.ok) {
        throw new Error('Failed to fetch coaches');
      }
      const data = await response.json();
      setCoaches(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching coaches:', err);
    } finally {
      setLoading(false);
    }
  };

  const createCoach = async (coach: Omit<Coach, 'id'>) => {
    try {
      const response = await fetch('/api/coaches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coach),
      });

      if (!response.ok) {
        throw new Error('Failed to create coach');
      }

      const newCoach = await response.json();
      setCoaches((prev) => [...prev, newCoach]);
      return newCoach;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateCoach = async (id: string, updates: Partial<Omit<Coach, 'id'>>) => {
    try {
      const response = await fetch(`/api/coaches/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update coach');
      }

      const updatedCoach = await response.json();
      setCoaches((prev) => prev.map((c) => (c.id === id ? updatedCoach : c)));
      return updatedCoach;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteCoach = async (id: string) => {
    try {
      const response = await fetch(`/api/coaches/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete coach');
      }

      setCoaches((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  return {
    coaches,
    loading,
    error,
    refreshCoaches: fetchCoaches,
    createCoach,
    updateCoach,
    deleteCoach,
  };
}
