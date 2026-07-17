"use client";

import { useEffect, useState } from "react";
import type { Product } from "../../hooks/useInventoryProducts";

type Store = { id: string; name: string };
type AdjustSubtype = "transfer" | "return" | "adjust";

type AdjustmentModalProps = {
  isOpen: boolean;
  products: Product[];
  stores: Store[];
  getQuantity: (variantId: string, storeId: string) => number;
  preselectedProductId?: string;
  preselectedVariantId?: string;
  onClose: () => void;
  onSubmit: (data: {
    type: "TRANSFER_OUT" | "RETURN" | "ADJUSTMENT";
    variantId: string;
    storeId: string;
    toStoreId?: string;
    quantityDelta: number;
    unitPrice: number;
    note?: string;
    performedAt: string;
  }) => Promise<void>;
};

export default function AdjustmentModal({
  isOpen,
  products,
  stores,
  getQuantity,
  preselectedProductId,
  preselectedVariantId,
  onClose,
  onSubmit,
}: AdjustmentModalProps) {
  const [subtype, setSubtype] = useState<AdjustSubtype>("transfer");
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [unitPrice, setUnitPrice] = useState("0");
  const [note, setNote] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [saving, setSaving] = useState(false);

  const activeProducts = products.filter((p) => !p.archived);
  const selectedProduct = activeProducts.find((p) => p.id === productId);
  const activeVariants = selectedProduct?.variants.filter((v) => !v.archived) ?? [];

  // 转出门店的当前库存（用于 transfer 和 adjust 负数校验）
  const sourceStock = variantId && storeId ? getQuantity(variantId, storeId) : null;
  const qty = Number(quantity);
  const delta = Number(adjustDelta);

  const transferInsufficient = subtype === "transfer" && sourceStock !== null && qty > sourceStock;
  const transferOutOfStock = subtype === "transfer" && sourceStock !== null && sourceStock <= 0;
  const adjustInsufficient =
    subtype === "adjust" && adjustDelta !== "" && delta < 0 && sourceStock !== null && Math.abs(delta) > sourceStock;

  const canSubmit = !transferOutOfStock && !transferInsufficient && !adjustInsufficient;

  useEffect(() => {
    if (!isOpen) return;
    const initProductId = preselectedProductId ?? activeProducts[0]?.id ?? "";
    const initProduct = activeProducts.find((p) => p.id === initProductId) ?? activeProducts[0];
    const initVariantId =
      preselectedVariantId ??
      initProduct?.variants.filter((v) => !v.archived)[0]?.id ?? "";
    setSubtype("transfer");
    setProductId(initProductId);
    setVariantId(initVariantId);
    setStoreId(stores[0]?.id ?? "");
    setToStoreId(stores[1]?.id ?? stores[0]?.id ?? "");
    setQuantity("1");
    setAdjustDelta("");
    setUnitPrice("0");
    setNote("");
    const now = new Date();
    setPerformedAt(
      new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (preselectedVariantId) return;
    const first = activeVariants[0];
    setVariantId(first?.id ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, preselectedVariantId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!variantId || !storeId || !performedAt) {
      alert("请填写完整必填信息");
      return;
    }
    if (!canSubmit) return;

    setSaving(true);
    try {
      if (subtype === "transfer") {
        if (!toStoreId || toStoreId === storeId) {
          alert("请选择不同的目标门店");
          return;
        }
        if (!qty || qty <= 0) { alert("数量必须大于 0"); return; }
        await onSubmit({
          type: "TRANSFER_OUT",
          variantId,
          storeId,
          toStoreId,
          quantityDelta: qty,
          unitPrice: Number(unitPrice) || 0,
          note: note.trim() || undefined,
          performedAt: new Date(performedAt).toISOString(),
        });
      } else if (subtype === "return") {
        if (!qty || qty <= 0) { alert("数量必须大于 0"); return; }
        await onSubmit({
          type: "RETURN",
          variantId,
          storeId,
          quantityDelta: qty,
          unitPrice: Number(unitPrice) || 0,
          note: note.trim() || undefined,
          performedAt: new Date(performedAt).toISOString(),
        });
      } else {
        if (!adjustDelta || delta === 0) { alert("调整数量不能为 0"); return; }
        await onSubmit({
          type: "ADJUSTMENT",
          variantId,
          storeId,
          quantityDelta: delta,
          unitPrice: Number(unitPrice) || 0,
          note: note.trim() || undefined,
          performedAt: new Date(performedAt).toISOString(),
        });
      }
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "操作失败");
    } finally {
      setSaving(false);
    }
  };

  const subtypes: { id: AdjustSubtype; label: string }[] = [
    { id: "transfer", label: "门店间转移" },
    { id: "return", label: "退货回库" },
    { id: "adjust", label: "手动修正" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <div className="px-5 py-4 border-b border-slate-200 sm:px-6">
          <h3 className="text-lg font-semibold text-slate-800">调货</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 sm:px-6">
          <div>
            <label className="text-sm text-slate-600 block mb-2">调货类型</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {subtypes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubtype(s.id)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                    subtype === s.id
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">产品</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={!!preselectedProductId}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50 disabled:text-slate-500"
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
            {preselectedVariantId ? (
              <div className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-700">
                {activeVariants.find((v) => v.id === variantId)?.spec || "—"}
              </div>
            ) : (
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                disabled={!activeVariants.length}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="" disabled>请选择规格</option>
                {activeVariants.map((v) => (
                  <option key={v.id} value={v.id}>{v.spec}</option>
                ))}
              </select>
            )}
          </div>

          {subtype === "transfer" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-slate-600">转出门店</label>
                  {sourceStock !== null && (
                    <span className={`text-xs font-medium ${transferOutOfStock ? "text-red-500" : "text-slate-500"}`}>
                      库存：{sourceStock}
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
                {transferOutOfStock && (
                  <p className="mt-1 text-xs text-red-500">库存为 0，无法转出</p>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-600 block mb-1">转入门店</label>
                <select
                  value={toStoreId}
                  onChange={(e) => setToStoreId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-slate-600">
                  {subtype === "return" ? "退货门店" : "门店"}
                </label>
                {subtype === "adjust" && sourceStock !== null && (
                  <span className="text-xs text-slate-500 font-medium">当前库存：{sourceStock}</span>
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
            </div>
          )}

          {subtype === "adjust" ? (
            <div>
              <label className="text-sm text-slate-600 block mb-1">
                调整数量（正数增加，负数减少）
              </label>
              <input
                type="number"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                placeholder="例如：+5 或 -3"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  adjustInsufficient ? "border-red-400 bg-red-50" : "border-slate-300"
                }`}
              />
              {adjustInsufficient && (
                <p className="mt-1 text-xs text-red-500">
                  减少量超出库存，当前库存 {sourceStock}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="text-sm text-slate-600 block mb-1">数量</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                max={subtype === "transfer" && sourceStock !== null ? sourceStock : undefined}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  transferInsufficient ? "border-red-400 bg-red-50" : "border-slate-300"
                }`}
              />
              {transferInsufficient && (
                <p className="mt-1 text-xs text-red-500">
                  超出转出门店库存 {sourceStock}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm text-slate-600 block mb-1">操作时间</label>
            <input
              type="datetime-local"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">
              {subtype === "adjust" ? "修正原因（选填）" : "备注（选填）"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {saving ? "提交中..." : "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}
