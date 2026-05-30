'use client';

import { useCallback, useEffect, useState } from 'react';
import { CommissionRule } from '../types';

export function useCommissionRules() {
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissionRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/commission-rules');
      if (!response.ok) throw new Error('Failed to fetch commission rules');
      const data = await response.json();
      setCommissionRules(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommissionRules();
  }, [fetchCommissionRules]);

  const createCommissionRule = useCallback(
    async (rule: Omit<CommissionRule, 'id'>): Promise<CommissionRule> => {
      const response = await fetch('/api/commission-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      if (!response.ok) throw new Error('Failed to create commission rule');
      const newRule = await response.json();
      setCommissionRules((prev) =>
        [...prev, newRule].sort((a, b) => a.minAmount - b.minAmount)
      );
      return newRule;
    },
    []
  );

  const updateCommissionRule = useCallback(
    async (id: string, updates: Partial<Omit<CommissionRule, 'id'>>): Promise<void> => {
      const response = await fetch(`/api/commission-rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update commission rule');
      const updated = await response.json();
      setCommissionRules((prev) =>
        prev
          .map((r) => (r.id === id ? updated : r))
          .sort((a, b) => a.minAmount - b.minAmount)
      );
    },
    []
  );

  const deleteCommissionRule = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/commission-rules/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete commission rule');
    setCommissionRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    commissionRules,
    loading,
    error,
    createCommissionRule,
    updateCommissionRule,
    deleteCommissionRule,
    refreshCommissionRules: fetchCommissionRules,
  };
}
