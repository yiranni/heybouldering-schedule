"use client";

import { Calendar } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import TopNavMenu from "@/app/components/TopNavMenu";
import UserInfo from "@/app/components/UserInfo";
import { useAuth } from "@/app/components/AuthGuard";
import EmployeePayrollTrendChart from "@/app/components/EmployeePayrollTrendChart";
import type { EmployeeTrendSeries } from "@/app/types";

const ANALYTICS_START_LABEL = "2026/5";

type AnalyticsResponse = {
  startMonth: string;
  endMonth: string;
  monthLabels: Array<{ month: string; label: string }>;
  employees: EmployeeTrendSeries[];
};

export default function EmployeeAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analytics/employees");
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "加载员工分析失败");
      }
      const json = (await response.json()) as AnalyticsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载员工分析失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    void load();
  }, [authLoading, isAdmin, load]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        加载中…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <TopNavMenu current="schedule" isAdmin={false} />
            <UserInfo />
          </div>
        </header>
        <main className="max-w-4xl mx-auto p-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            仅管理员可查看员工分析。
          </div>
        </main>
      </div>
    );
  }

  const rangeLabel = data
    ? `${data.monthLabels[0]?.label ?? ANALYTICS_START_LABEL} — ${
        data.monthLabels[data.monthLabels.length - 1]?.label ?? ""
      }`
    : "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-3 shadow-lg sticky top-0 z-50 sm:p-4">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 bg-emerald-500 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <TopNavMenu current="employeeAnalytics" isAdmin={isAdmin} />
          </div>
          <UserInfo />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4 md:p-6">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <h2 className="text-lg font-semibold text-slate-800">员工分析</h2>
          <p className="mt-1 text-sm text-slate-500">
            按月对比各员工的销售金额、总工资及差额（销售 − 工资，可为负）。时间范围：{rangeLabel || "加载中…"}
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
            加载中…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : !data?.employees.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
            暂无员工数据
          </div>
        ) : (
          <div className="space-y-4">
            {data.employees.map((employee) => (
              <EmployeePayrollTrendChart
                key={employee.coachId}
                coachName={employee.coachName}
                points={employee.points}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
