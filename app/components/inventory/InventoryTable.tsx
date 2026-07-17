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
  onStockIn: (product: Product, variantId?: string) => void;
  onAdjust: (product: Product, variantId?: string) => void;
  onRetailSale: (product: Product, variantId?: string) => void;
  onStockSale?: (product: Product, variantId?: string) => void;
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
    <div>
      <div className="divide-y divide-slate-100 md:hidden">
        {products.map((product) => {
          const activeVariants = product.variants.filter((v) => !v.archived);
          const isOpen = expanded.has(product.id);
          const isSingleVariant = activeVariants.length <= 1;
          const singleVariant = isSingleVariant ? activeVariants[0] : null;
          const total = activeVariants.reduce(
            (sum, v) => sum + stores.reduce((s2, s) => s2 + getStock(v.id, s.id), 0),
            0
          );

          return (
            <div key={product.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={isSingleVariant ? undefined : () => toggle(product.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {!isSingleVariant && (
                      isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-800">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.brand}</div>
                    </div>
                  </div>
                </button>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-400">合计</div>
                  <div className="font-semibold text-slate-800">{total}</div>
                </div>
              </div>

              {singleVariant && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">售价</div>
                    <div className="text-slate-700">¥{singleVariant.price.toFixed(2)}</div>
                  </div>
                  {stores.map((s) => (
                    <div key={s.id}>
                      <div className="text-xs text-slate-400">{s.name}</div>
                      <div className="text-slate-700">{getStock(singleVariant.id, s.id)}</div>
                    </div>
                  ))}
                </div>
              )}

              {!isSingleVariant && isOpen && (
                <div className="mt-3 space-y-3">
                  {activeVariants.map((variant) => (
                    <div key={variant.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-slate-700">{variant.spec}</div>
                        <div className="text-sm text-slate-600">¥{variant.price.toFixed(2)}</div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        {stores.map((s) => (
                          <div key={s.id}>
                            <div className="text-xs text-slate-400">{s.name}</div>
                            <div className="text-slate-700">{getStock(variant.id, s.id)}</div>
                          </div>
                        ))}
                        <div>
                          <div className="text-xs text-slate-400">合计</div>
                          <div className="font-medium text-slate-800">{getTotalStock(variant.id)}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-1">
                        <button onClick={() => onRetailSale(product, variant.id)} className="rounded px-2 py-1.5 text-xs text-emerald-700 bg-emerald-50">售卖</button>
                        {isManager && onStockSale && <button onClick={() => onStockSale(product, variant.id)} className="rounded px-2 py-1.5 text-xs text-purple-700 bg-purple-50">销货</button>}
                        {isManager && <button onClick={() => onStockIn(product, variant.id)} className="rounded px-2 py-1.5 text-xs text-blue-700 bg-blue-50">入库</button>}
                        {isManager && <button onClick={() => onAdjust(product, variant.id)} className="rounded px-2 py-1.5 text-xs text-orange-700 bg-orange-50">调货</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap justify-end gap-1">
                <button onClick={() => onRetailSale(product, singleVariant?.id)} className="rounded px-2 py-1.5 text-xs text-emerald-700 bg-emerald-50">售卖</button>
                {isManager && onStockSale && <button onClick={() => onStockSale(product, singleVariant?.id)} className="rounded px-2 py-1.5 text-xs text-purple-700 bg-purple-50">销货</button>}
                {isManager && <button onClick={() => onStockIn(product, singleVariant?.id)} className="rounded px-2 py-1.5 text-xs text-blue-700 bg-blue-50">入库</button>}
                {isManager && <button onClick={() => onAdjust(product, singleVariant?.id)} className="rounded px-2 py-1.5 text-xs text-orange-700 bg-orange-50">调货</button>}
                {isManager && <button onClick={() => onEdit(product)} className="rounded px-2 py-1.5 text-xs text-slate-700 bg-slate-100">编辑</button>}
                {isManager && (
                  <button
                    onClick={() => {
                      if (confirm(`确认归档产品「${product.name}」？`)) onArchive(product);
                    }}
                    className="rounded px-2 py-1.5 text-xs text-red-700 bg-red-50"
                  >
                    归档
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    <div className="hidden overflow-x-auto md:block">
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

            const isSingleVariant = activeVariants.length <= 1;
            const singleVariant = isSingleVariant ? activeVariants[0] : null;

            return (
              <>
                <tr
                  key={product.id}
                  className={isSingleVariant ? "" : "hover:bg-slate-50 cursor-pointer"}
                  onClick={isSingleVariant ? undefined : () => toggle(product.id)}
                >
                  <td className="px-4 py-3 text-slate-400">
                    {!isSingleVariant && (
                      isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{product.name}</div>
                    <div className="text-xs text-slate-500">{product.brand}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {isSingleVariant
                      ? <span className="text-slate-300">—</span>
                      : `${activeVariants.length} 个规格`}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {singleVariant ? `¥${singleVariant.price.toFixed(2)}` : ""}
                  </td>
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
                          onClick={() => onRetailSale(product, singleVariant?.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      {isManager && onStockSale && (
                        <Tooltip label="销货">
                          <button
                            onClick={() => onStockSale(product, singleVariant?.id)}
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
                              onClick={() => onStockIn(product, singleVariant?.id)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <PackagePlus className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip label="调货">
                            <button
                              onClick={() => onAdjust(product, singleVariant?.id)}
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

                {!isSingleVariant && isOpen &&
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
                      <td className="px-4 py-2">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip label="售卖">
                            <button
                              onClick={() => onRetailSale(product, variant.id)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                          {isManager && onStockSale && (
                            <Tooltip label="销货">
                              <button
                                onClick={() => onStockSale(product, variant.id)}
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                              >
                                <Tag className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                          )}
                          {isManager && (
                            <>
                              <Tooltip label="入库">
                                <button
                                  onClick={() => onStockIn(product, variant.id)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <PackagePlus className="w-3.5 h-3.5" />
                                </button>
                              </Tooltip>
                              <Tooltip label="调货">
                                <button
                                  onClick={() => onAdjust(product, variant.id)}
                                  className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                </button>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}
