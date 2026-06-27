"use client";

import type { InventoryTransaction, TransactionType } from "../../hooks/useInventoryTransactions";

type TransactionHistoryProps = {
  transactions: InventoryTransaction[];
  isManager: boolean;
  onDelete?: (id: string) => void;
};

const TYPE_LABELS: Record<TransactionType, string> = {
  STOCK_IN: "入库",
  TRANSFER_OUT: "调货-转出",
  TRANSFER_IN: "调货-转入",
  RETURN: "退货",
  ADJUSTMENT: "手动修正",
  SALE: "销货",
};

const TYPE_COLORS: Record<TransactionType, string> = {
  STOCK_IN: "bg-blue-100 text-blue-700",
  TRANSFER_OUT: "bg-orange-100 text-orange-700",
  TRANSFER_IN: "bg-amber-100 text-amber-700",
  RETURN: "bg-purple-100 text-purple-700",
  ADJUSTMENT: "bg-slate-100 text-slate-700",
  SALE: "bg-emerald-100 text-emerald-700",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function TransactionHistory({
  transactions,
  isManager,
  onDelete,
}: TransactionHistoryProps) {
  if (!transactions.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>暂无操作记录</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            <th className="text-left px-4 py-3 font-medium">时间</th>
            <th className="text-left px-4 py-3 font-medium">类型</th>
            <th className="text-left px-4 py-3 font-medium">产品 / 规格</th>
            <th className="text-left px-4 py-3 font-medium">门店</th>
            <th className="text-right px-4 py-3 font-medium">数量变动</th>
            <th className="text-right px-4 py-3 font-medium">单价（元）</th>
            <th className="text-left px-4 py-3 font-medium">操作人</th>
            <th className="text-left px-4 py-3 font-medium">备注</th>
            {isManager && <th className="px-4 py-3"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                {formatDate(tx.performedAt)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[tx.type]}`}
                >
                  {TYPE_LABELS[tx.type]}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="text-slate-800">
                  {tx.variant.product.brand} · {tx.variant.product.name}
                </div>
                <div className="text-xs text-slate-500">{tx.variant.spec}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{tx.store.name}</td>
              <td
                className={`px-4 py-3 text-right font-medium ${
                  tx.quantityDelta > 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : tx.quantityDelta}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                ¥{tx.unitPrice.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {tx.performedBy.name ?? tx.performedBy.id}
              </td>
              <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate">
                {tx.note ?? "—"}
              </td>
              {isManager && (
                <td className="px-4 py-3">
                  {onDelete && (
                    <button
                      onClick={() => {
                        if (confirm("确认删除这条记录？此操作会同时删除配对的调货记录。")) {
                          onDelete(tx.id);
                        }
                      }}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      删除
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
