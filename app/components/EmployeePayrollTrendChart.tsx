"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EmployeeTrendPoint } from "@/app/types";

type ChartRow = EmployeeTrendPoint & {
  gapPositive: number | null;
  gapNegative: number | null;
};

function splitGapSeries(points: EmployeeTrendPoint[]): ChartRow[] {
  return points.map((p) => ({
    ...p,
    gapPositive: p.gap >= 0 ? p.gap : null,
    gapNegative: p.gap < 0 ? p.gap : null,
  }));
}

type EmployeePayrollTrendChartProps = {
  coachName: string;
  points: EmployeeTrendPoint[];
};

function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const gapColor = row.gap < 0 ? "#dc2626" : "#d97706";
  const items = [
    { name: "总工资", value: row.totalSalary, color: "#059669" },
    { name: "销售金额", value: row.salesAmount, color: "#2563eb" },
    { name: "差额（销售−工资）", value: row.gap, color: gapColor },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-medium text-slate-800">{label}</div>
      {items.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-slate-600">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium text-slate-800">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function EmployeePayrollTrendChart({ coachName, points }: EmployeePayrollTrendChartProps) {
  const chartData = useMemo(() => splitGapSeries(points), [points]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-slate-800">{coachName}</h2>
      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              tickFormatter={(v) => `¥${v}`}
              width={72}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => <span className="text-slate-600">{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="totalSalary"
              name="总工资"
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="salesAmount"
              name="销售金额"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="gapPositive"
              name="差额（销售−工资）"
              stroke="#d97706"
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 3, strokeWidth: 2, fill: "#d97706" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="gapNegative"
              stroke="#dc2626"
              strokeWidth={2}
              connectNulls={false}
              legendType="none"
              dot={{ r: 3, strokeWidth: 2, fill: "#dc2626" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
