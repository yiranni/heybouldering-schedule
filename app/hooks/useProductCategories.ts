'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProductCategory } from '../types';

export function useProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/product-categories');
      if (!response.ok) throw new Error('Failed to fetch product categories');
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

  const createCategory = useCallback(async (name: string): Promise<ProductCategory> => {
    const response = await fetch('/api/product-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create product category');
    }
    const created: ProductCategory = await response.json();
    setCategories((prev) => [...prev, created]);
    return created;
  }, []);

  return {
    categories,
    loading,
    error,
    createCategory,
    refreshCategories: fetchCategories,
  };
}
