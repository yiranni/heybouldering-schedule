'use client';

import { SalesRecord, Coach, SalesRecordFilters } from '../types';

type SalesRecordTableProps = {
  records: SalesRecord[];
  coaches: Coach[];
  filters: SalesRecordFilters;
  loading: boolean;
  canFilterCoach: boolean;
  commissionRate?: number;
  onUpdateFilters: (filters: SalesRecordFilters) => void;
  onDeleteRecord: (id: string) => Promise<void>;
};

export default function SalesRecordTable({
  records,
  coaches,
  filters,
  loading,
  canFilterCoach,
  commissionRate,
  onUpdateFilters,
  onDeleteRecord,
}: SalesRecordTableProps) {
  const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalCommission = totalAmount * (commissionRate || 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">销售记录</h2>
            <p className="text-sm text-slate-500">
              共 {records.length} 条，销售额 ¥{totalAmount.toFixed(2)}
              {commissionRate !== undefined && (
                <>
                  ，提成 ¥{totalCommission.toFixed(2)}（{(commissionRate * 100).toFixed(1)}%）
                </>
              )}
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onUpdateFilters({ ...filters, startDate: e.target.value || undefined })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm lg:w-auto lg:py-1.5"
            />
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onUpdateFilters({ ...filters, endDate: e.target.value || undefined })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm lg:w-auto lg:py-1.5"
            />
            {canFilterCoach && (
              <select
                value={filters.coachId || ''}
                onChange={(e) => onUpdateFilters({ ...filters, coachId: e.target.value || undefined })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2 lg:w-auto lg:py-1.5"
              >
                <option value="">全部教练</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">销售时间</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">教练</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">销售类别</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">产品</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">数量</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">金额</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">备注</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  加载中...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  暂无销售记录
                </td>
              </tr>
            ) : (
              records.map((record) => {
                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {new Date(record.soldAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{record.coach?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{record.productCategory?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{record.productName}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">
                      {record.quantity ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">
                      ¥{record.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.note || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDeleteRecord(record.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {loading ? (
          <div className="px-4 py-10 text-center text-slate-500">加载中...</div>
        ) : records.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-400">暂无销售记录</div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-800">{record.productName}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {new Date(record.soldAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold text-slate-900">¥{record.amount.toFixed(2)}</div>
                  <button
                    onClick={() => onDeleteRecord(record.id)}
                    className="mt-1 text-sm text-red-500 hover:text-red-700"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-slate-400">教练</div>
                  <div className="text-slate-700">{record.coach?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">数量</div>
                  <div className="text-slate-700">{record.quantity ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">类别</div>
                  <div className="text-slate-700">{record.productCategory?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">备注</div>
                  <div className="truncate text-slate-700">{record.note || '-'}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
