"use client";

import { useCallback, useEffect, useState } from "react";

export type StockEntry = {
  variantId: string;
  storeId: string;
  quantity: number;
};

export function useInventoryStock(storeId?: string, variantId?: string) {
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (storeId) params.set("storeId", storeId);
      if (variantId) params.set("variantId", variantId);
      const res = await fetch(`/api/inventory/stock?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      setStock(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载库存失败");
    } finally {
      setLoading(false);
    }
  }, [storeId, variantId]);

  useEffect(() => { load(); }, [load]);

  const getQuantity = useCallback(
    (vId: string, sId: string) =>
      stock.find((s) => s.variantId === vId && s.storeId === sId)?.quantity ?? 0,
    [stock]
  );

  return { stock, loading, error, reload: load, getQuantity };
}
