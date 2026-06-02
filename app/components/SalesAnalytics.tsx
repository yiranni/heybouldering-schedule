'use client';

import { useMemo } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Coach, SalesRecord } from '../types';

type SalesAnalyticsProps = {
  records: SalesRecord[];
  coaches: Coach[];
  commissionRate?: number;
  hideCoachBarChart?: boolean;
};

const PIE_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6', '#f97316'];

function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export default function SalesAnalytics({
  records,
  coaches,
  commissionRate = 0,
  hideCoachBarChart = false,
}: SalesAnalyticsProps) {
  const coachBarData = useMemo(() => {
    const byCoach = new Map<string, { coachName: string; totalAmount: number; totalCommission: number }>();

    for (const record of records) {
      const coachId = record.coachId;
      const coachName =
        record.coach?.name || coaches.find((coach) => coach.id === coachId)?.name || '未知教练';
      const amount = Number(record.amount) || 0;
      const existing = byCoach.get(coachId) || {
        coachName,
        totalAmount: 0,
        totalCommission: 0,
      };
      existing.totalAmount = roundTo2(existing.totalAmount + amount);
      existing.totalCommission = roundTo2(existing.totalCommission + amount * commissionRate);
      byCoach.set(coachId, existing);
    }

    return Array.from(byCoach.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [records, coaches, commissionRate]);

  const pieData = useMemo(() => {
    const byCategory = new Map<string, number>();

    for (const record of records) {
      const rawCategoryName = record.salesCategory?.name?.trim() || '';
      const categoryName = rawCategoryName || '其他';
      byCategory.set(
        categoryName,
        roundTo2((byCategory.get(categoryName) || 0) + (Number(record.amount) || 0))
      );
    }

    return Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  return (
    <div className={`grid grid-cols-1 ${hideCoachBarChart ? '' : 'xl:grid-cols-2'} gap-4`}>
      {!hideCoachBarChart && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-800 mb-3">各教练销售额</h3>
          <div className="h-72">
            {coachBarData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coachBarData} margin={{ top: 8, right: 8, left: 8, bottom: 36 }}>
                  <XAxis
                    dataKey="coachName"
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={48}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(value: number) => `¥${Number(value).toFixed(0)}`} width={70} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const item = payload[0]?.payload as
                        | { totalAmount: number; totalCommission: number }
                        | undefined;
                      if (!item) return null;
                      return (
                        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm text-sm">
                          <div className="font-medium text-slate-800 mb-1">{label}</div>
                          <div className="text-slate-600">销售额：{formatCurrency(item.totalAmount)}</div>
                          <div className="text-slate-600">提成：{formatCurrency(item.totalCommission)}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="totalAmount" name="销售额" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-800 mb-3">各品类销售额分布</h3>
        <div className="h-72">
          {pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label={({ value }) => Number(value).toFixed(2)}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
