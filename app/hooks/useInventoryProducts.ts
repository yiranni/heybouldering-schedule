"use client";

import { useCallback, useEffect, useState } from "react";

export type ProductVariant = {
  id: string;
  productId: string;
  spec: string;
  price: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  brand: string;
  name: string;
  archived: boolean;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export function useInventoryProducts(includeArchived = false) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/inventory/products${includeArchived ? "?includeArchived=true" : ""}`
      );
      if (!res.ok) throw new Error(await res.text());
      setProducts(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => { load(); }, [load]);

  const createProduct = useCallback(
    async (data: { brand: string; name: string; variants: { spec: string; price: number }[] }) => {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "创建失败");
      const product: Product = await res.json();
      setProducts((prev) => [...prev, product]);
      return product;
    },
    []
  );

  const updateProduct = useCallback(
    async (id: string, data: { brand?: string; name?: string; archived?: boolean }) => {
      const res = await fetch(`/api/inventory/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "更新失败");
      const updated: Product = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    []
  );

  const archiveProduct = useCallback(async (id: string) => {
    const res = await fetch(`/api/inventory/products/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).error || "归档失败");
    setProducts((prev) =>
      includeArchived
        ? prev.map((p) => (p.id === id ? { ...p, archived: true } : p))
        : prev.filter((p) => p.id !== id)
    );
  }, [includeArchived]);

  const addVariant = useCallback(
    async (productId: string, data: { spec: string; price: number }) => {
      const res = await fetch(`/api/inventory/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "添加规格失败");
      const variant: ProductVariant = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, variants: [...p.variants, variant] } : p))
      );
      return variant;
    },
    []
  );

  const updateVariant = useCallback(
    async (variantId: string, data: { spec?: string; price?: number; archived?: boolean }) => {
      const res = await fetch(`/api/inventory/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "更新规格失败");
      const updated: ProductVariant = await res.json();
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) => (v.id === variantId ? updated : v)),
        }))
      );
      return updated;
    },
    []
  );

  const archiveVariant = useCallback(async (variantId: string) => {
    const res = await fetch(`/api/inventory/variants/${variantId}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).error || "归档规格失败");
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        variants: p.variants.filter((v) => v.id !== variantId),
      }))
    );
  }, []);

  return {
    products,
    loading,
    error,
    reload: load,
    createProduct,
    updateProduct,
    archiveProduct,
    addVariant,
    updateVariant,
    archiveVariant,
  };
}
