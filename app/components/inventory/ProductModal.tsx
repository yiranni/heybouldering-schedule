"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Product, ProductVariant } from "../../hooks/useInventoryProducts";

type VariantRow = { id?: string; spec: string; price: string };

type ProductModalProps = {
  isOpen: boolean;
  product?: Product | null;
  onClose: () => void;
  onSave: (data: {
    brand: string;
    name: string;
    variants: { spec: string; price: number }[];
    updatedVariants?: { id: string; spec: string; price: number }[];
    archivedVariantIds?: string[];
  }) => Promise<void>;
};

function variantToRow(v: ProductVariant): VariantRow {
  return { id: v.id, spec: v.spec, price: String(v.price) };
}

export default function ProductModal({ isOpen, product, onClose, onSave }: ProductModalProps) {
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([{ spec: "", price: "" }]);
  const [bulkPrice, setBulkPrice] = useState("");
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setBrand(product?.brand ?? "");
    setName(product?.name ?? "");
    setVariants(
      product?.variants.length
        ? product.variants.map(variantToRow)
        : [{ spec: "", price: "" }]
    );
    setArchivedIds([]);
    setBulkPrice("");
  }, [isOpen, product]);

  if (!isOpen) return null;

  const setVariantField = (idx: number, field: keyof VariantRow, value: string) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const addVariant = () => setVariants((prev) => [...prev, { spec: "", price: "" }]);

  const removeVariant = (idx: number) => {
    const row = variants[idx];
    if (row.id) setArchivedIds((prev) => [...prev, row.id!]);
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const applyBulkPrice = () => {
    if (!bulkPrice) return;
    setVariants((prev) => prev.map((v) => ({ ...v, price: bulkPrice })));
  };

  const handleSubmit = async () => {
    if (!brand.trim() || !name.trim()) {
      alert("品牌和产品名称为必填");
      return;
    }
    const validVariants = variants.filter((v) => v.spec.trim());
    if (!validVariants.length) {
      alert("请至少添加一个规格");
      return;
    }

    setSaving(true);
    try {
      const newVariants = validVariants
        .filter((v) => !v.id)
        .map((v) => ({ spec: v.spec.trim(), price: Number(v.price) || 0 }));
      const updatedVariants = validVariants
        .filter((v) => !!v.id)
        .map((v) => ({ id: v.id!, spec: v.spec.trim(), price: Number(v.price) || 0 }));

      await onSave({
        brand: brand.trim(),
        name: name.trim(),
        variants: newVariants,
        updatedVariants,
        archivedVariantIds: archivedIds,
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            {product ? "编辑产品" : "新增产品"}
          </h3>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600 block mb-1">品牌</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="例如：Butora"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">产品名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：Spider"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">规格列表</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">批量设价：</span>
                <input
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder="统一价格"
                  min="0"
                  step="0.01"
                  className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                />
                <button
                  type="button"
                  onClick={applyBulkPrice}
                  className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                >
                  应用
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={v.spec}
                    onChange={(e) => setVariantField(idx, "spec", e.target.value)}
                    placeholder="规格（如 39码 / 大包）"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                  <input
                    type="number"
                    value={v.price}
                    onChange={(e) => setVariantField(idx, "price", e.target.value)}
                    placeholder="单价（元）"
                    min="0"
                    step="0.01"
                    className="w-32 px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    disabled={variants.length === 1 && !v.id}
                    className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addVariant}
              className="mt-2 flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-500"
            >
              <Plus className="w-4 h-4" />
              添加规格
            </button>
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
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50 text-sm"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
