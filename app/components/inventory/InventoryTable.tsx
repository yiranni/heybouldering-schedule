"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Edit2, PackagePlus, ArrowLeftRight, ShoppingCart, Tag, Archive } from "lucide-react";
import type { Product } from "../../hooks/useInventoryProducts";
import type { StockEntry } from "../../hooks/useInventoryStock";

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-10">
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
}

type Store = { id: string; name: string };

type InventoryTableProps = {
  products: Product[];
  stock: StockEntry[];
  stores: Store[];
  isManager: boolean;
  onStockIn: (product: Product) => void;
  onAdjust: (product: Product) => void;
  onRetailSale: (product: Product) => void;
  onStockSale?: (product: Product) => void;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
};

export default function InventoryTable({
  products,
  stock,
  stores,
  isManager,
  onStockIn,
  onAdjust,
  onRetailSale,
  onStockSale,
  onEdit,
  onArchive,
}: InventoryTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getStock = (variantId: string, storeId: string) =>
    stock.find((s) => s.variantId === variantId && s.storeId === storeId)?.quantity ?? 0;

  const getTotalStock = (variantId: string) =>
    stores.reduce((sum, s) => sum + getStock(variantId, s.id), 0);

  if (!products.length) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg">暂无产品</p>
        {isManager && <p className="text-sm mt-1">点击「新增产品」开始添加</p>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            <th className="text-left px-4 py-3 font-medium w-10"></th>
            <th className="text-left px-4 py-3 font-medium">品牌 / 产品</th>
            <th className="text-left px-4 py-3 font-medium">规格</th>
            <th className="text-right px-4 py-3 font-medium">售价（元）</th>
            {stores.map((s) => (
              <th key={s.id} className="text-right px-4 py-3 font-medium whitespace-nowrap">
                {s.name}
              </th>
            ))}
            <th className="text-right px-4 py-3 font-medium">合计</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => {
            const isOpen = expanded.has(product.id);
            const activeVariants = product.variants.filter((v) => !v.archived);

            return (
              <>
                <tr
                  key={product.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => toggle(product.id)}
                >
                  <td className="px-4 py-3 text-slate-400">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{product.name}</div>
                    <div className="text-xs text-slate-500">{product.brand}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {activeVariants.length} 个规格
                  </td>
                  <td className="px-4 py-3"></td>
                  {stores.map((s) => (
                    <td key={s.id} className="px-4 py-3 text-right text-slate-500">
                      {activeVariants.reduce((sum, v) => sum + getStock(v.id, s.id), 0)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {activeVariants.reduce(
                      (sum, v) => sum + stores.reduce((s2, s) => s2 + getStock(v.id, s.id), 0),
                      0
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip label="售卖">
                        <button
                          onClick={() => onRetailSale(product)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      {isManager && onStockSale && (
                        <Tooltip label="销货">
                          <button
                            onClick={() => onStockSale(product)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                          >
                            <Tag className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      )}
                      {isManager && (
                        <>
                          <Tooltip label="入库">
                            <button
                              onClick={() => onStockIn(product)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <PackagePlus className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip label="调货">
                            <button
                              onClick={() => onAdjust(product)}
                              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip label="编辑产品">
                            <button
                              onClick={() => onEdit(product)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip label="归档">
                            <button
                              onClick={() => {
                                if (confirm(`确认归档产品「${product.name}」？`)) onArchive(product);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </td>
                </tr>

                {isOpen &&
                  activeVariants.map((variant) => (
                    <tr key={variant.id} className="bg-slate-50/50">
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 pl-8 text-slate-500">└</td>
                      <td className="px-4 py-2 text-slate-700">{variant.spec}</td>
                      <td className="px-4 py-2 text-right text-slate-600">¥{variant.price.toFixed(2)}</td>
                      {stores.map((s) => {
                        const qty = getStock(variant.id, s.id);
                        return (
                          <td
                            key={s.id}
                            className={`px-4 py-2 text-right ${
                              qty <= 0 ? "text-red-500" : qty <= 3 ? "text-orange-500" : "text-slate-700"
                            }`}
                          >
                            {qty}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-medium text-slate-700">
                        {getTotalStock(variant.id)}
                      </td>
                      <td className="px-4 py-2"></td>
                    </tr>
                  ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
