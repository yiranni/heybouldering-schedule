"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Product, ProductVariant } from "../../hooks/useInventoryProducts";

type Store = { id: string; name: string };

type VariantRow = {
  key: string;
  variantId: string | null;  // null = new, not in DB yet
  spec: string;
  qty: string;
  unitPrice: string;
  isNew: boolean;
  pendingRemove: boolean;
};

type StockInModalProps = {
  isOpen: boolean;
  products: Product[];
  stores: Store[];
  preselectedProductId?: string;
  preselectedVariantId?: string;
  onClose: () => void;
  onAddVariant?: (productId: string, data: { spec: string; price: number }) => Promise<ProductVariant>;
  onRemoveVariant?: (variantId: string) => Promise<void>;
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
  preselectedProductId,
  preselectedVariantId,
  onClose,
  onAddVariant,
  onRemoveVariant,
  onSubmit,
}: StockInModalProps) {
  const [productId, setProductId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [note, setNote] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const newRowCounter = useRef(0);

  const activeProducts = products.filter((p) => !p.archived);
  const selectedProduct = activeProducts.find((p) => p.id === productId);
  const activeVariants = selectedProduct?.variants.filter((v) => !v.archived) ?? [];

  const buildRows = (variants: typeof activeVariants): VariantRow[] =>
    variants.map((v) => ({
      key: v.id,
      variantId: v.id,
      spec: v.spec,
      qty: "",
      unitPrice: String(v.price),
      isNew: false,
      pendingRemove: false,
    }));

  useEffect(() => {
    if (preselectedVariantId) {
      const variant = activeVariants.find((v) => v.id === preselectedVariantId);
      setRows(
        variant
          ? [
              {
                key: variant.id,
                variantId: variant.id,
                spec: variant.spec,
                qty: "",
                unitPrice: String(variant.price),
                isNew: false,
                pendingRemove: false,
              },
            ]
          : []
      );
      return;
    }
    setRows(buildRows(activeVariants));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, preselectedVariantId]);

  useEffect(() => {
    if (!isOpen) return;
    const initProductId = preselectedProductId ?? activeProducts[0]?.id ?? "";
    setProductId(initProductId);
    setStoreId(stores[0]?.id ?? "");
    setNote("");
    const now = new Date();
    setPerformedAt(
      new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const updateRow = (key: string, patch: Partial<VariantRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string, isNew: boolean) => {
    if (isNew) {
      setRows((prev) => prev.filter((r) => r.key !== key));
    } else {
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, pendingRemove: true } : r)));
    }
  };

  const addNewRow = () => {
    const key = `new-${++newRowCounter.current}`;
    setRows((prev) => [
      ...prev,
      { key, variantId: null, spec: "", qty: "", unitPrice: "", isNew: true, pendingRemove: false },
    ]);
  };

  if (!isOpen) return null;

  const visibleRows = rows.filter((r) => !r.pendingRemove);
  const toSubmitRows = visibleRows.filter((r) => r.qty !== "" && Number(r.qty) > 0);
  const toRemoveRows = rows.filter((r) => r.pendingRemove && r.variantId);
  const canEditVariants = !!(onAddVariant || onRemoveVariant);

  const handleSubmit = async () => {
    if (!storeId || !performedAt) {
      alert("请选择门店和操作时间");
      return;
    }
    for (const r of toSubmitRows.filter((r) => r.isNew)) {
      if (!r.spec.trim()) {
        alert("新增规格的规格名不能为空");
        return;
      }
    }
    if (!toSubmitRows.length && !toRemoveRows.length) {
      alert("请至少填写一个规格的入库数量，或删除一个规格");
      return;
    }
    for (const r of toSubmitRows) {
      const price = Number(r.unitPrice);
      if (Number.isNaN(price) || price < 0) {
        alert(`规格「${r.spec || "新规格"}」的入库单价无效`);
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Archive removed variants
      for (const r of toRemoveRows) {
        if (r.variantId && onRemoveVariant) await onRemoveVariant(r.variantId);
      }

      // 2. Create new variants and record their real IDs
      const newVariantIds = new Map<string, string>();
      for (const r of toSubmitRows.filter((r) => r.isNew)) {
        if (onAddVariant && selectedProduct) {
          const created = await onAddVariant(selectedProduct.id, {
            spec: r.spec.trim(),
            price: Number(r.unitPrice) || 0,
          });
          newVariantIds.set(r.key, created.id);
        }
      }

      // 3. Submit stock-in transactions
      for (const r of toSubmitRows) {
        const variantId = r.variantId ?? newVariantIds.get(r.key);
        if (!variantId) continue;
        await onSubmit({
          variantId,
          storeId,
          quantityDelta: Number(r.qty),
          unitPrice: Number(r.unitPrice) || 0,
          note: note.trim() || undefined,
          performedAt: new Date(performedAt).toISOString(),
        });
      }

      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "入库失败");
    } finally {
      setSaving(false);
    }
  };

  const submitLabel = (() => {
    const parts: string[] = [];
    if (toSubmitRows.length > 0) parts.push(`入库 ${toSubmitRows.length} 个规格`);
    if (toRemoveRows.length > 0) parts.push(`删除 ${toRemoveRows.length} 个规格`);
    return parts.length > 0 ? `确认（${parts.join("，")}）` : "确认入库";
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-6">
          <h3 className="text-lg font-semibold text-slate-800">入库</h3>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
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

          <div>
            <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm text-slate-600">
                各规格入库数量
                <span className="text-slate-400 font-normal ml-1">（留空表示不入库）</span>
              </label>
              {onAddVariant && !preselectedVariantId && (
                <button
                  onClick={addNewRow}
                  type="button"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  添加规格
                </button>
              )}
            </div>

            <div className="mobile-scrollbar overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs">
                    <th className="text-left px-3 py-2 font-medium">规格</th>
                    <th className="text-right px-3 py-2 font-medium w-28">入库单价（元）</th>
                    <th className="text-right px-3 py-2 font-medium w-24">入库数量</th>
                    {canEditVariants && !preselectedVariantId && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => {
                    const isPreselected = row.variantId === preselectedVariantId;
                    return (
                      <tr
                        key={row.key}
                        className={
                          row.isNew
                            ? "bg-emerald-50/50"
                            : isPreselected
                            ? "bg-blue-50/60"
                            : "hover:bg-slate-50/50"
                        }
                      >
                        <td className="px-3 py-2 text-slate-700">
                          {row.isNew ? (
                            <input
                              type="text"
                              value={row.spec}
                              onChange={(e) => updateRow(row.key, { spec: e.target.value })}
                              placeholder="规格名称"
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          ) : (
                            <>
                              {row.spec || "—"}
                              {isPreselected && (
                                <span className="ml-1.5 text-xs text-blue-500">●</span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.unitPrice}
                            onChange={(e) => updateRow(row.key, { unitPrice: e.target.value })}
                            min="0"
                            step="0.01"
                            placeholder={row.isNew ? "售价" : undefined}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.qty}
                            onChange={(e) => updateRow(row.key, { qty: e.target.value })}
                            min="1"
                            placeholder="—"
                            className={`w-full px-2 py-1 border rounded text-sm text-right ${
                              row.qty !== "" && Number(row.qty) > 0
                                ? "border-blue-400 bg-blue-50"
                                : "border-slate-300"
                            }`}
                          />
                        </td>
                        {canEditVariants && !preselectedVariantId && (
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(row.key, row.isNew)}
                              className="text-slate-300 hover:text-red-500"
                              title="删除规格"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleRows.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  暂无规格，点击上方「添加规格」
                </div>
              )}
            </div>

            <div className="mt-1.5 space-y-0.5">
              {toRemoveRows.length > 0 && (
                <p className="text-xs text-red-500">将删除 {toRemoveRows.length} 个规格</p>
              )}
              {toSubmitRows.length > 0 && (
                <p className="text-xs text-blue-600">
                  将入库 {toSubmitRows.length} 个规格，合计{" "}
                  {toSubmitRows.reduce((s, r) => s + Number(r.qty), 0)} 件
                </p>
              )}
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

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || (toSubmitRows.length === 0 && toRemoveRows.length === 0)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {saving ? "提交中..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
