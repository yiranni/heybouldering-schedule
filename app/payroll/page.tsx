"use client";

import { Calendar, List, Save, Settings, X } from "lucide-react";
import { useMemo, useState } from "react";
import TopNavMenu from "../components/TopNavMenu";
import { useAuth } from "../components/AuthGuard";
import { usePayroll } from "../hooks/usePayroll";

function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

type SalesDetailItem = {
  id: string;
  soldAt: string;
  productName: string;
  amount: number;
  note?: string | null;
  salesCategory?: { id: string; name: string } | null;
};

function getMonthDateRange(month: string): { startDate: string; endDate: string } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  const toDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  return { startDate: toDateStr(start), endDate: toDateStr(end) };
}

export default function PayrollPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const {
    month,
    rows,
    loading,
    saving,
    error,
    changeMonth,
    updateRow,
    updatePartTimeHourlyRate,
    savePayroll,
  } = usePayroll();
  const partTimeHourlyRate = useMemo(() => {
    const firstPartTime = rows.find((row) => row.employmentType === "PART_TIME");
    return firstPartTime?.hourlyRate ?? 20;
  }, [rows]);
  const [selectedYearStr, selectedMonthStr] = month.split("-");
  const selectedYear = Number(selectedYearStr);
  const selectedMonth = Number(selectedMonthStr);
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, idx) => currentYear - 3 + idx);
  }, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [salesDetails, setSalesDetails] = useState<SalesDetailItem[]>([]);
  const [drawerCommissionRate, setDrawerCommissionRate] = useState(0);
  const [salesDetailsLoading, setSalesDetailsLoading] = useState(false);
  const [salesDetailsError, setSalesDetailsError] = useState<string | null>(null);
  const [salaryConfigOpen, setSalaryConfigOpen] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState<Record<string, number>>({});

  const totals = useMemo(() => {
    const totalLaborCost = rows.reduce((sum, row) => sum + row.totalSalary, 0);
    return {
      totalLaborCost: Number(totalLaborCost.toFixed(2)),
    };
  }, [rows]);

  const openSalesDetails = async (
    coachId: string,
    coachName: string,
    salesAmount: number,
    salesCommission: number
  ) => {
    setDrawerTitle(`${coachName} · ${month} 销售明细`);
    setDrawerCommissionRate(salesAmount > 0 ? salesCommission / salesAmount : 0);
    setDrawerOpen(true);
    setSalesDetails([]);
    setSalesDetailsError(null);
    setSalesDetailsLoading(true);
    try {
      const { startDate, endDate } = getMonthDateRange(month);
      const params = new URLSearchParams({
        coachId,
        startDate,
        endDate,
      });
      const response = await fetch(`/api/sales-records?${params.toString()}`);
      if (!response.ok) throw new Error("加载销售明细失败");
      const data = await response.json();
      setSalesDetails(Array.isArray(data) ? data : []);
    } catch (err) {
      setSalesDetailsError(err instanceof Error ? err.message : "加载销售明细失败");
    } finally {
      setSalesDetailsLoading(false);
    }
  };

  const fullTimeRows = useMemo(
    () => rows.filter((row) => row.employmentType === "FULL_TIME"),
    [rows]
  );

  const openSalaryConfig = () => {
    const initialDraft: Record<string, number> = {};
    fullTimeRows.forEach((row) => {
      initialDraft[row.coachId] = row.basicSalary;
    });
    setSalaryDraft(initialDraft);
    setSalaryConfigOpen(true);
  };

  const applySalaryConfig = async () => {
    fullTimeRows.forEach((row) => {
      updateRow(row.coachId, {
        basicSalary: Number(salaryDraft[row.coachId] ?? row.basicSalary),
      });
    });
    setSalaryConfigOpen(false);
    try {
      await savePayroll();
      alert("工资配置已保存");
    } catch {
      alert("工资配置保存失败");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <TopNavMenu current="schedule" isAdmin={false} />
          </div>
        </header>
        <main className="max-w-4xl mx-auto p-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            仅管理员可查看工资计算页面。
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <TopNavMenu current="payroll" isAdmin />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5">
              <select
                value={selectedYear}
                onChange={(e) => changeMonth(`${e.target.value}-${String(selectedMonth).padStart(2, "0")}`)}
                className="text-slate-700 bg-transparent outline-none"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <span className="text-slate-500 text-sm">年</span>
              <select
                value={selectedMonth}
                onChange={(e) => changeMonth(`${selectedYear}-${String(e.target.value).padStart(2, "0")}`)}
                className="text-slate-700 bg-transparent outline-none"
              >
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-slate-500 text-sm">月</span>
            </div>
            <button
              onClick={openSalaryConfig}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
            >
              <Settings className="w-4 h-4" />
              工资配置
            </button>
            <button
              onClick={async () => {
                try {
                  await savePayroll();
                  alert("工资数据已保存");
                } catch {
                  alert("保存失败");
                }
              }}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">工资计算（按月）</h2>
            <p className="text-sm text-slate-500 mt-1">
              销售提成自动计算；全职基本工资在“工资配置”中维护；兼职基本工资按当月工时自动计算（时薪：
              <input
                type="number"
                value={partTimeHourlyRate}
                min={0}
                step="0.1"
                onChange={(e) => updatePartTimeHourlyRate(Number(e.target.value || 0))}
                onBlur={() => {
                  savePayroll().catch(() => {});
                }}
                className="mx-1 w-20 px-1.5 py-0.5 border border-slate-300 rounded text-right text-xs bg-white align-middle"
              />
              元/小时）；课时费可手动编辑。
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">教练</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">基本工资</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">销售提成</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">课时费</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">总工资</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      加载中...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      暂无可计算的教练数据
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.coachId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="font-medium">{row.coachName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {row.employmentType === "PART_TIME" ? (
                            <span className="inline-flex items-center gap-1">
                              <span>兼职 · 本月工时</span>
                              <input
                                type="number"
                                value={row.monthHours}
                                min={0}
                                step="0.1"
                                onChange={(e) =>
                                  updateRow(row.coachId, {
                                    monthHours: Number(e.target.value || 0),
                                  })
                                }
                                className="w-20 px-1.5 py-0.5 border border-slate-300 rounded text-right text-xs bg-white"
                              />
                              <span>h</span>
                            </span>
                          ) : (
                            "全职"
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-slate-800">
                          {formatCurrency(row.basicSalary)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        <div className="inline-flex items-center gap-1">
                          <span>{formatCurrency(row.salesCommission)}</span>
                          <button
                            onClick={() =>
                              openSalesDetails(
                                row.coachId,
                                row.coachName,
                                row.salesAmount,
                                row.salesCommission
                              )
                            }
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                            title="查看销售明细"
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={row.lessonFee}
                          min={0}
                          step="0.01"
                          onChange={(e) =>
                            updateRow(row.coachId, {
                              lessonFee: Number(e.target.value || 0),
                            })
                          }
                          className="w-36 px-2 py-1 border border-slate-300 rounded-md text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(row.totalSalary)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                    总人工成本
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                    {formatCurrency(totals.totalLaborCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </main>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{drawerTitle}</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {salesDetailsLoading ? (
                <div className="text-sm text-slate-500">加载中...</div>
              ) : salesDetailsError ? (
                <div className="text-sm text-red-600">{salesDetailsError}</div>
              ) : salesDetails.length === 0 ? (
                <div className="text-sm text-slate-400">暂无销售记录</div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">时间</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">类别</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">产品</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">金额</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">提成</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesDetails.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-slate-600">
                            {new Date(item.soldAt).toLocaleString("zh-CN")}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{item.salesCategory?.name || "其他"}</td>
                          <td className="px-3 py-2 text-slate-800">{item.productName}</td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-700 font-medium">
                            {formatCurrency(Number((item.amount * drawerCommissionRate).toFixed(2)))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {salaryConfigOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">全职基本工资配置</h3>
              <button
                onClick={() => setSalaryConfigOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {fullTimeRows.length === 0 ? (
                <div className="text-sm text-slate-500">暂无全职教练</div>
              ) : (
                fullTimeRows.map((row) => (
                  <div key={row.coachId} className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-700">{row.coachName}</div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={salaryDraft[row.coachId] ?? 0}
                      onChange={(e) =>
                        setSalaryDraft((prev) => ({
                          ...prev,
                          [row.coachId]: Number(e.target.value || 0),
                        }))
                      }
                      className="w-44 px-3 py-2 border border-slate-300 rounded-md text-right text-sm"
                    />
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setSalaryConfigOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={applySalaryConfig}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
