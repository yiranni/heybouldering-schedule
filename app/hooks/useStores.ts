'use client';

import { useState, useEffect } from 'react';
import { Store } from '../types';

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stores');
      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }
      const data = await response.json();
      setStores(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const createStore = async (store: Omit<Store, 'id'>) => {
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(store),
      });

      if (!response.ok) {
        throw new Error('Failed to create store');
      }

      const newStore = await response.json();
      setStores((prev) => [...prev, newStore]);
      return newStore;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateStore = async (id: string, updates: Partial<Omit<Store, 'id'>>) => {
    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update store');
      }

      const updatedStore = await response.json();
      setStores((prev) => prev.map((s) => (s.id === id ? updatedStore : s)));
      return updatedStore;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteStore = async (id: string) => {
    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete store');
      }

      setStores((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  return {
    stores,
    loading,
    error,
    refreshStores: fetchStores,
    createStore,
    updateStore,
    deleteStore,
  };
}
