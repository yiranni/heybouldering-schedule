"use client";

import { useEffect, useState } from "react";
import type { Product } from "../../hooks/useInventoryProducts";

type Store = { id: string; name: string };

type VariantRow = {
  variantId: string;
  spec: string;
  qty: string;
  unitPrice: string;
};

type StockInModalProps = {
  isOpen: boolean;
  products: Product[];
  stores: Store[];
  preselectedProductId?: string;
  preselectedVariantId?: string;
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
  preselectedProductId,
  preselectedVariantId,
  onClose,
  onSubmit,
}: StockInModalProps) {
  const [productId, setProductId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [note, setNote] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [saving, setSaving] = useState(false);

  const activeProducts = products.filter((p) => !p.archived);
  const selectedProduct = activeProducts.find((p) => p.id === productId);
  const activeVariants = selectedProduct?.variants.filter((v) => !v.archived) ?? [];

  const buildRows = (variants: typeof activeVariants): VariantRow[] =>
    variants.map((v) => ({
      variantId: v.id,
      spec: v.spec,
      qty: "",
      unitPrice: String(v.price),
    }));

  // Rebuild rows when product changes
  useEffect(() => {
    setRows(buildRows(activeVariants));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Init on open
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

  const updateRow = (variantId: string, field: "qty" | "unitPrice", value: string) => {
    setRows((prev) => prev.map((r) => (r.variantId === variantId ? { ...r, [field]: value } : r)));
  };

  if (!isOpen) return null;

  const toSubmit = rows.filter((r) => r.qty !== "" && Number(r.qty) > 0);

  const handleSubmit = async () => {
    if (!storeId || !performedAt) {
      alert("请选择门店和操作时间");
      return;
    }
    if (!toSubmit.length) {
      alert("请至少填写一个规格的入库数量");
      return;
    }
    for (const r of toSubmit) {
      const price = Number(r.unitPrice);
      if (Number.isNaN(price) || price < 0) {
        alert(`规格「${r.spec}」的入库单价无效`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const r of toSubmit) {
        await onSubmit({
          variantId: r.variantId,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 shrink-0">
          <h3 className="text-lg font-semibold text-slate-800">入库</h3>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
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

          {rows.length > 0 && (
            <div>
              <label className="text-sm text-slate-600 block mb-2">
                各规格入库数量
                <span className="text-slate-400 font-normal ml-1">（留空表示不入库）</span>
              </label>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs">
                      <th className="text-left px-3 py-2 font-medium">规格</th>
                      <th className="text-right px-3 py-2 font-medium w-28">入库单价（元）</th>
                      <th className="text-right px-3 py-2 font-medium w-24">入库数量</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => {
                      const isPreselected = row.variantId === preselectedVariantId;
                      return (
                        <tr
                          key={row.variantId}
                          className={isPreselected ? "bg-blue-50/60" : "hover:bg-slate-50/50"}
                        >
                          <td className="px-3 py-2 text-slate-700">
                            {row.spec}
                            {isPreselected && (
                              <span className="ml-1.5 text-xs text-blue-500">●</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.unitPrice}
                              onChange={(e) => updateRow(row.variantId, "unitPrice", e.target.value)}
                              min="0"
                              step="0.01"
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.qty}
                              onChange={(e) => updateRow(row.variantId, "qty", e.target.value)}
                              min="1"
                              placeholder="—"
                              className={`w-full px-2 py-1 border rounded text-sm text-right ${
                                row.qty !== "" && Number(row.qty) > 0
                                  ? "border-blue-400 bg-blue-50"
                                  : "border-slate-300"
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {toSubmit.length > 0 && (
                <p className="mt-1.5 text-xs text-blue-600">
                  将入库 {toSubmit.length} 个规格，合计{" "}
                  {toSubmit.reduce((s, r) => s + Number(r.qty), 0)} 件
                </p>
              )}
            </div>
          )}

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

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || toSubmit.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {saving
              ? "提交中..."
              : toSubmit.length > 0
              ? `确认入库（${toSubmit.length} 个规格）`
              : "确认入库"}
          </button>
        </div>
      </div>
    </div>
  );
}
