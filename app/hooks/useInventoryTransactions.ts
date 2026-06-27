"use client";

import { useCallback, useEffect, useState } from "react";

export type TransactionType =
  | "STOCK_IN"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "RETURN"
  | "ADJUSTMENT"
  | "SALE"
  | "WRITEOFF";

export type InventoryTransaction = {
  id: string;
  variantId: string;
  type: TransactionType;
  quantityDelta: number;
  unitPrice: number;
  note: string | null;
  performedById: string;
  storeId: string;
  transferPairId: string | null;
  performedAt: string;
  createdAt: string;
  variant: {
    id: string;
    spec: string;
    price: number;
    product: { id: string; brand: string; name: string };
  };
  store: { id: string; name: string };
  performedBy: { id: string; name: string | null; role: string };
};

export type TransactionFilters = {
  storeId?: string;
  variantId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
};

export function useInventoryTransactions(initialFilters: TransactionFilters = {}) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.storeId) params.set("storeId", filters.storeId);
      if (filters.variantId) params.set("variantId", filters.variantId);
      if (filters.type) params.set("type", filters.type);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      const res = await fetch(`/api/inventory/transactions?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      setTransactions(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const updateFilters = useCallback((patch: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const createTransaction = useCallback(
    async (data: {
      variantId: string;
      type: TransactionType;
      quantityDelta: number;
      unitPrice: number;
      storeId: string;
      toStoreId?: string;
      note?: string;
      performedAt?: string;
    }) => {
      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "操作失败");
      await load();
      return res.json();
    },
    [load]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/inventory/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "删除失败");
      await load();
    },
    [load]
  );

  return {
    transactions,
    filters,
    loading,
    error,
    reload: load,
    updateFilters,
    createTransaction,
    deleteTransaction,
  };
}
