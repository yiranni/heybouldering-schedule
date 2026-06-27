"use client";

import { useEffect, useState } from "react";
import type { Product } from "../../hooks/useInventoryProducts";

type Store = { id: string; name: string };

type StockInModalProps = {
  isOpen: boolean;
  products: Product[];
  stores: Store[];
  onClose: () => void;
  onSubmit: (data: {
    variantId: string;
    storeId: string;
    quantityDelta: number;
    unitPrice: number;
    note?: string;
    performedAt: string;
  }) => Promise<void>;
};

export default function StockInModal({
  isOpen,
  products,
  stores,
  onClose,
  onSubmit,
}: StockInModalProps) {
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [note, setNote] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [saving, setSaving] = useState(false);

  const activeProducts = products.filter((p) => !p.archived);
  const selectedProduct = activeProducts.find((p) => p.id === productId);
  const activeVariants = selectedProduct?.variants.filter((v) => !v.archived) ?? [];
  const selectedVariant = activeVariants.find((v) => v.id === variantId);

  useEffect(() => {
    if (!isOpen) return;
    const firstProduct = activeProducts[0];
    setProductId(firstProduct?.id ?? "");
    setVariantId(firstProduct?.variants.filter((v) => !v.archived)[0]?.id ?? "");
    setStoreId(stores[0]?.id ?? "");
    setQuantity("1");
    setUnitPrice("");
    setNote("");
    const now = new Date();
    setPerformedAt(
      new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (selectedVariant && !unitPrice) {
      setUnitPrice(String(selectedVariant.price));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId]);

  useEffect(() => {
    const first = activeVariants[0];
    setVariantId(first?.id ?? "");
    if (first) setUnitPrice(String(first.price));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!variantId || !storeId || !performedAt) {
      alert("请填写完整必填信息");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      alert("入库数量必须大于 0");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        variantId,
        storeId,
        quantityDelta: qty,
        unitPrice: Number(unitPrice) || 0,
        note: note.trim() || undefined,
        performedAt: new Date(performedAt).toISOString(),
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "入库失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">入库</h3>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-sm text-slate-600 block mb-1">产品</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="" disabled>请选择产品</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} · {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">规格</label>
            <select
              value={variantId}
              onChange={(e) => {
                setVariantId(e.target.value);
                const v = activeVariants.find((v) => v.id === e.target.value);
                if (v) setUnitPrice(String(v.price));
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              disabled={!activeVariants.length}
            >
              <option value="" disabled>请选择规格</option>
              {activeVariants.map((v) => (
                <option key={v.id} value={v.id}>{v.spec}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">入库门店</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600 block mb-1">入库数量</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">入库单价（元）</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">入库时间</label>
            <input
              type="datetime-local"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">备注（选填）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 text-sm"
          >
            {saving ? "提交中..." : "确认入库"}
          </button>
        </div>
      </div>
    </div>
  );
}
