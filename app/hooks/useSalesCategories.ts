'use client';

import { useCallback, useEffect, useState } from 'react';
import { SalesCategory } from '../types';

export function useSalesCategories() {
  const [categories, setCategories] = useState<SalesCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sales-categories');
      if (!response.ok) throw new Error('Failed to fetch sales categories');
      const data = await response.json();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refreshCategories: fetchCategories,
  };
}
