"use client";

import { useEffect, useState } from "react";
import type { Product } from "../../hooks/useInventoryProducts";

type Store = { id: string; name: string };

type SaleModalProps = {
  isOpen: boolean;
  title?: string;
  products: Product[];
  stores: Store[];
  getQuantity: (variantId: string, storeId: string) => number;
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

export default function SaleModal({
  isOpen,
  title = "销货",
  products,
  stores,
  getQuantity,
  onClose,
  onSubmit,
}: SaleModalProps) {
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

  const currentStock = variantId && storeId ? getQuantity(variantId, storeId) : null;
  const qty = Number(quantity);
  const stockInsufficient = currentStock !== null && qty > currentStock;
  const outOfStock = currentStock !== null && currentStock <= 0;

  useEffect(() => {
    if (!isOpen) return;
    const firstProduct = activeProducts[0];
    setProductId(firstProduct?.id ?? "");
    const firstVariant = firstProduct?.variants.filter((v) => !v.archived)[0];
    setVariantId(firstVariant?.id ?? "");
    setUnitPrice(firstVariant ? String(firstVariant.price) : "");
    setStoreId(stores[0]?.id ?? "");
    setQuantity("1");
    setNote("");
    const now = new Date();
    setPerformedAt(
      new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    if (!qty || qty <= 0) { alert("销售数量必须大于 0"); return; }
    if (outOfStock) { alert(`当前库存为 0，无法${title}`); return; }
    if (stockInsufficient) { alert(`库存不足，当前库存 ${currentStock}`); return; }
    const price = Number(unitPrice);
    if (Number.isNaN(price) || price < 0) { alert("请填写有效价格"); return; }

    setSaving(true);
    try {
      await onSubmit({
        variantId,
        storeId,
        quantityDelta: qty,
        unitPrice: price,
        note: note.trim() || undefined,
        performedAt: new Date(performedAt).toISOString(),
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : `${title}失败`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-slate-600">销售门店</label>
              {currentStock !== null && (
                <span className={`text-xs font-medium ${outOfStock ? "text-red-500" : "text-slate-500"}`}>
                  当前库存：{currentStock}
                </span>
              )}
            </div>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {outOfStock && (
              <p className="mt-1 text-xs text-red-500">该门店此规格库存为 0，无法{title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600 block mb-1">数量</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                max={currentStock ?? undefined}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  stockInsufficient ? "border-red-400 bg-red-50" : "border-slate-300"
                }`}
              />
              {stockInsufficient && (
                <p className="mt-1 text-xs text-red-500">超出库存 {currentStock}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">实际售价（元）</label>
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
            <label className="text-sm text-slate-600 block mb-1">销售时间</label>
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
            disabled={saving || outOfStock || stockInsufficient}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {saving ? "提交中..." : `确认${title}`}
          </button>
        </div>
      </div>
    </div>
  );
}
