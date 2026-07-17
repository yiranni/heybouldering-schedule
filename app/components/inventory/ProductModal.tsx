"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Product, ProductVariant } from "../../hooks/useInventoryProducts";
import type { ProductCategory } from "../../types";

type VariantRow = { id?: string; spec: string; price: string };

const NEW_CATEGORY_VALUE = "__new__";

type ProductModalProps = {
  isOpen: boolean;
  product?: Product | null;
  categories: ProductCategory[];
  canManageCategories?: boolean;
  onCreateCategory?: (name: string) => Promise<ProductCategory>;
  onClose: () => void;
  onSave: (data: {
    brand: string;
    name: string;
    categoryId?: string | null;
    variants: { spec: string; price: number }[];
    updatedVariants?: { id: string; spec: string; price: number }[];
    archivedVariantIds?: string[];
  }) => Promise<void>;
};

function variantToRow(v: ProductVariant): VariantRow {
  return { id: v.id, spec: v.spec, price: String(v.price) };
}

export default function ProductModal({
  isOpen,
  product,
  categories,
  canManageCategories = false,
  onCreateCategory,
  onClose,
  onSave,
}: ProductModalProps) {
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [hasSpecs, setHasSpecs] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([
    { spec: "", price: "" },
  ]);
  const [bulkPrice, setBulkPrice] = useState("");
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setBrand(product?.brand ?? "");
    setName(product?.name ?? "");
    setCategoryId(product?.categoryId ?? categories[0]?.id ?? "");
    setShowNewCategory(false);
    setNewCategoryName("");
    setArchivedIds([]);
    setBulkPrice("");

    if (product) {
      const rows = product.variants.length
        ? product.variants.map(variantToRow)
        : [{ spec: "", price: "" }];
      setVariants(rows);
      const activeVariants = product.variants.filter((v) => !v.archived);
      const isSingleNoSpec =
        activeVariants.length === 1 && !activeVariants[0].spec.trim();
      setHasSpecs(!isSingleNoSpec && activeVariants.length > 0);
    } else {
      setVariants([{ spec: "", price: "" }]);
      setHasSpecs(false);
    }
  }, [isOpen, product, categories]);

  if (!isOpen) return null;

  const setVariantField = (
    idx: number,
    field: keyof VariantRow,
    value: string,
  ) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
    );
  };

  const addVariant = () => {
    setHasSpecs(true);
    setVariants((prev) => [...prev, { spec: "", price: "" }]);
  };

  const removeVariant = (idx: number) => {
    const row = variants[idx];
    if (row.id) setArchivedIds((prev) => [...prev, row.id!]);
    setVariants((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setHasSpecs(false);
        return [{ spec: "", price: "" }];
      }
      return next;
    });
  };

  const applyBulkPrice = () => {
    if (!bulkPrice) return;
    setVariants((prev) => prev.map((v) => ({ ...v, price: bulkPrice })));
  };

  const handleCategoryChange = (value: string) => {
    if (value === NEW_CATEGORY_VALUE) {
      setShowNewCategory(true);
      setCategoryId("");
      return;
    }
    setShowNewCategory(false);
    setNewCategoryName("");
    setCategoryId(value);
  };

  const handleCreateCategory = async () => {
    if (!onCreateCategory) return;
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      alert("请输入种类名称");
      return;
    }
    setCreatingCategory(true);
    try {
      const created = await onCreateCategory(trimmed);
      setCategoryId(created.id);
      setShowNewCategory(false);
      setNewCategoryName("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "新增种类失败");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async () => {
    if (!brand.trim() || !name.trim()) {
      alert("品牌和产品名称为必填");
      return;
    }
    if (!categoryId) {
      alert("请选择产品种类");
      return;
    }

    let validVariants: VariantRow[];
    if (!hasSpecs) {
      validVariants = variants.slice(0, 1);
    } else {
      validVariants = variants.filter((v) => v.spec.trim());
      if (!validVariants.length) {
        alert("请至少填写一个规格名称");
        return;
      }
    }

    setSaving(true);
    try {
      const newVariants = validVariants
        .filter((v) => !v.id)
        .map((v) => ({ spec: v.spec.trim(), price: Number(v.price) || 0 }));
      const updatedVariants = validVariants
        .filter((v) => !!v.id)
        .map((v) => ({
          id: v.id!,
          spec: v.spec.trim(),
          price: Number(v.price) || 0,
        }));

      await onSave({
        brand: brand.trim(),
        name: name.trim(),
        categoryId,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h3 className="text-lg font-semibold text-slate-800">
            {product ? "编辑产品" : "新增产品"}
          </h3>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <div>
            <label className="text-sm text-slate-600 block mb-1">种类</label>
            <select
              value={showNewCategory ? NEW_CATEGORY_VALUE : categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="" disabled>
                请选择种类
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {canManageCategories && (
                <option value={NEW_CATEGORY_VALUE}>+ 新增种类...</option>
              )}
            </select>
            {canManageCategories && showNewCategory && (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="输入新种类名称"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCategory}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
                >
                  {creatingCategory ? "添加中..." : "添加"}
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <label className="text-sm text-slate-600 block mb-1">
                产品名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：Spider"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          {!hasSpecs ? (
            <div>
              <label className="text-sm text-slate-600 block mb-1">
                售价（元）
              </label>
              <input
                type="number"
                value={variants[0]?.price ?? ""}
                onChange={(e) => setVariantField(0, "price", e.target.value)}
                placeholder="单价"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          ) : (
            <div>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-medium text-slate-700">
                  规格列表
                </label>
                <div className="flex flex-wrap items-center gap-2">
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
                  <div key={idx} className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:items-center">
                    <input
                      type="text"
                      value={v.spec}
                      onChange={(e) =>
                        setVariantField(idx, "spec", e.target.value)
                      }
                      placeholder="规格名称（如 39码 / 大包）"
                      className="col-span-2 w-full px-3 py-2 border border-slate-300 rounded-md text-sm sm:col-span-1 sm:flex-1"
                    />
                    <input
                      type="number"
                      value={v.price}
                      onChange={(e) =>
                        setVariantField(idx, "price", e.target.value)
                      }
                      placeholder="单价（元）"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm sm:w-32"
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
            </div>
          )}

          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-500"
          >
            <Plus className="w-4 h-4" />
            添加规格
          </button>
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
