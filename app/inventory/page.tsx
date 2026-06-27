"use client";

import { useMemo, useState } from "react";
import { Package, Plus, PackagePlus, ArrowLeftRight, ShoppingCart, Search, X } from "lucide-react";
import { useAuth } from "../components/AuthGuard";
import TopNavMenu from "../components/TopNavMenu";
import { useStores } from "../hooks/useStores";
import { useInventoryProducts, type Product } from "../hooks/useInventoryProducts";
import { useInventoryStock } from "../hooks/useInventoryStock";
import { useInventoryTransactions } from "../hooks/useInventoryTransactions";
import InventoryTable from "../components/inventory/InventoryTable";
import TransactionHistory from "../components/inventory/TransactionHistory";
import ProductModal from "../components/inventory/ProductModal";
import StockInModal from "../components/inventory/StockInModal";
import AdjustmentModal from "../components/inventory/AdjustmentModal";
import SaleModal from "../components/inventory/SaleModal";

type Tab = "stock" | "history";

export default function InventoryPage() {
  const { user } = useAuth();
  const isManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const { stores } = useStores();
  const activeStores = stores.filter((s) => !s.archived);

  const {
    products,
    loading: productsLoading,
    createProduct,
    updateProduct,
    archiveProduct,
    addVariant,
    updateVariant,
    archiveVariant,
  } = useInventoryProducts();

  const { stock, reload: reloadStock, getQuantity } = useInventoryStock();
  const {
    transactions,
    loading: txLoading,
    filters,
    updateFilters,
    createTransaction,
    deleteTransaction,
  } = useInventoryTransactions();

  const [tab, setTab] = useState<Tab>("stock");

  // 库存总览 filters（客户端）
  const [stockSearch, setStockSearch] = useState("");
  const [stockBrand, setStockBrand] = useState("");
  const [hideZeroStock, setHideZeroStock] = useState(false);

  // 操作记录 client-side 过滤
  const [txSearch, setTxSearch] = useState("");
  const [txPerformer, setTxPerformer] = useState("");

  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand))].sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = products;
    if (stockBrand) list = list.filter((p) => p.brand === stockBrand);
    if (stockSearch) {
      const q = stockSearch.toLowerCase();
      list = list.filter(
        (p) => p.brand.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      );
    }
    if (hideZeroStock) {
      list = list
        .map((p) => ({
          ...p,
          variants: p.variants.filter(
            (v) => !v.archived && stock.some((s) => s.variantId === v.id && s.quantity > 0)
          ),
        }))
        .filter((p) => p.variants.length > 0);
    }
    return list;
  }, [products, stockSearch, stockBrand, hideZeroStock, stock]);

  const txPerformers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of transactions) {
      if (!seen.has(t.performedBy.id)) {
        seen.set(t.performedBy.id, t.performedBy.name ?? t.performedBy.id);
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (txSearch) {
      const q = txSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.variant.product.brand.toLowerCase().includes(q) ||
          t.variant.product.name.toLowerCase().includes(q) ||
          t.variant.spec.toLowerCase().includes(q)
      );
    }
    if (txPerformer) {
      list = list.filter((t) => t.performedBy.id === txPerformer);
    }
    return list;
  }, [transactions, txSearch, txPerformer]);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showRetailSale, setShowRetailSale] = useState(false);
  const [showStockSale, setShowStockSale] = useState(false);
  const [preselectedProduct, setPreselectedProduct] = useState<Product | null>(null);
  const [preselectedVariantId, setPreselectedVariantId] = useState<string | undefined>();

  const openStockIn = (product?: Product, variantId?: string) => {
    setPreselectedProduct(product ?? null);
    setPreselectedVariantId(variantId);
    setShowStockIn(true);
  };

  const openAdjust = (product?: Product, variantId?: string) => {
    setPreselectedProduct(product ?? null);
    setPreselectedVariantId(variantId);
    setShowAdjust(true);
  };

  const openRetailSale = (product?: Product, variantId?: string) => {
    setPreselectedProduct(product ?? null);
    setPreselectedVariantId(variantId);
    setShowRetailSale(true);
  };

  const openStockSale = (product?: Product, variantId?: string) => {
    setPreselectedProduct(product ?? null);
    setPreselectedVariantId(variantId);
    setShowStockSale(true);
  };

  const handleSaveProduct = async (data: {
    brand: string;
    name: string;
    variants: { spec: string; price: number }[];
    updatedVariants?: { id: string; spec: string; price: number }[];
    archivedVariantIds?: string[];
  }) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, { brand: data.brand, name: data.name });
      for (const v of data.updatedVariants ?? []) {
        await updateVariant(v.id, { spec: v.spec, price: v.price });
      }
      for (const id of data.archivedVariantIds ?? []) {
        await archiveVariant(id);
      }
      for (const v of data.variants) {
        await addVariant(editingProduct.id, v);
      }
    } else {
      await createProduct(data);
    }
    setEditingProduct(null);
  };

  const handleTransaction = async (txData: Parameters<typeof createTransaction>[0]) => {
    await createTransaction(txData);
    await reloadStock();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <TopNavMenu current="inventory" isAdmin={isManager} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openRetailSale()}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-md text-sm font-medium transition-all shadow-lg active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              售卖
            </button>
            {isManager && (
              <>
                <button
                  onClick={() => openStockSale()}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-md text-sm font-medium transition-all shadow-lg active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  销货
                </button>
                <button
                  onClick={() => openStockIn()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-md text-sm font-medium transition-all shadow-lg active:scale-95"
                >
                  <PackagePlus className="w-4 h-4" />
                  入库
                </button>
                <button
                  onClick={() => openAdjust()}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-all shadow-lg active:scale-95"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  调货
                </button>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setShowProductModal(true);
                  }}
                  className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-md text-sm font-medium transition-all shadow-lg active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  新增产品
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-sm w-fit">
          {(["stock", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t === "stock" ? "库存总览" : "操作记录"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {tab === "stock" ? (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="搜索品牌或产品名"
                    className="pl-8 pr-7 py-1.5 border border-slate-300 rounded text-sm w-44"
                  />
                  {stockSearch && (
                    <button onClick={() => setStockSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <select
                  value={stockBrand}
                  onChange={(e) => setStockBrand(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm"
                >
                  <option value="">全部品牌</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideZeroStock}
                    onChange={(e) => setHideZeroStock(e.target.checked)}
                    className="rounded"
                  />
                  隐藏零库存
                </label>
                <span className="text-xs text-slate-400 ml-auto">
                  共 {filteredProducts.length} 个产品
                </span>
              </div>
              {productsLoading ? (
                <div className="text-center py-16 text-slate-400">加载中...</div>
              ) : (
                <InventoryTable
                  products={filteredProducts}
                  stock={stock}
                  stores={activeStores}
                  isManager={isManager}
                  onStockIn={(p) => openStockIn(p)}
                  onAdjust={(p) => openAdjust(p)}
                  onRetailSale={(p) => openRetailSale(p)}
                  onStockSale={isManager ? (p) => openStockSale(p) : undefined}
                  onEdit={(p) => {
                    setEditingProduct(p);
                    setShowProductModal(true);
                  }}
                  onArchive={(p) => archiveProduct(p.id)}
                />
              )}
            </>
          ) : (
            <div>
              <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="搜索产品名或规格"
                    className="pl-8 pr-7 py-1.5 border border-slate-300 rounded text-sm w-44"
                  />
                  {txSearch && (
                    <button onClick={() => setTxSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <select
                  value={filters.storeId ?? ""}
                  onChange={(e) => updateFilters({ storeId: e.target.value || undefined })}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm"
                >
                  <option value="">全部门店</option>
                  {activeStores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select
                  value={txPerformer}
                  onChange={(e) => setTxPerformer(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm"
                >
                  <option value="">全部操作人</option>
                  {txPerformers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={filters.type ?? ""}
                  onChange={(e) =>
                    updateFilters({ type: (e.target.value || undefined) as typeof filters.type })
                  }
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm"
                >
                  <option value="">全部类型</option>
                  <option value="STOCK_IN">入库</option>
                  <option value="TRANSFER_OUT">调货-转出</option>
                  <option value="TRANSFER_IN">调货-转入</option>
                  <option value="RETURN">退货</option>
                  <option value="ADJUSTMENT">手动修正</option>
                  <option value="SALE">销货</option>
                </select>
                <input
                  type="date"
                  value={filters.startDate ?? ""}
                  onChange={(e) => updateFilters({ startDate: e.target.value || undefined })}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm"
                />
                <span className="text-slate-400 text-sm">至</span>
                <input
                  type="date"
                  value={filters.endDate ?? ""}
                  onChange={(e) => updateFilters({ endDate: e.target.value || undefined })}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm"
                />
                {(txSearch || txPerformer || filters.storeId || filters.type || filters.startDate || filters.endDate) && (
                  <button
                    onClick={() => {
                      setTxSearch("");
                      setTxPerformer("");
                      updateFilters({ storeId: undefined, type: undefined, startDate: undefined, endDate: undefined });
                    }}
                    className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    清除筛选
                  </button>
                )}
                <span className="text-xs text-slate-400 ml-auto">
                  {filteredTransactions.length} 条记录
                </span>
              </div>
              {txLoading ? (
                <div className="text-center py-12 text-slate-400">加载中...</div>
              ) : (
                <TransactionHistory
                  transactions={filteredTransactions}
                  isManager={isManager}
                  onDelete={isManager ? deleteTransaction : undefined}
                />
              )}
            </div>
          )}
        </div>
      </main>

      <ProductModal
        isOpen={showProductModal}
        product={editingProduct}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
      />

      <StockInModal
        isOpen={showStockIn}
        products={products}
        stores={activeStores}
        preselectedProductId={preselectedProduct?.id}
        preselectedVariantId={preselectedVariantId}
        onClose={() => { setShowStockIn(false); setPreselectedVariantId(undefined); }}
        onSubmit={(data) =>
          handleTransaction({ ...data, type: "STOCK_IN" })
        }
      />

      <AdjustmentModal
        isOpen={showAdjust}
        products={products}
        stores={activeStores}
        getQuantity={getQuantity}
        preselectedProductId={preselectedProduct?.id}
        preselectedVariantId={preselectedVariantId}
        onClose={() => { setShowAdjust(false); setPreselectedVariantId(undefined); }}
        onSubmit={(data) => handleTransaction(data)}
      />

      <SaleModal
        isOpen={showRetailSale}
        title="售卖"
        products={products}
        stores={activeStores}
        getQuantity={getQuantity}
        preselectedProductId={preselectedProduct?.id}
        preselectedVariantId={preselectedVariantId}
        onClose={() => { setShowRetailSale(false); setPreselectedVariantId(undefined); }}
        onSubmit={(data) =>
          handleTransaction({ ...data, type: "SALE" })
        }
      />

      <SaleModal
        isOpen={showStockSale}
        title="销货"
        products={products}
        stores={activeStores}
        getQuantity={getQuantity}
        preselectedProductId={preselectedProduct?.id}
        preselectedVariantId={preselectedVariantId}
        onClose={() => { setShowStockSale(false); setPreselectedVariantId(undefined); }}
        onSubmit={(data) =>
          handleTransaction({ ...data, type: "SALE" })
        }
      />
    </div>
  );
}
