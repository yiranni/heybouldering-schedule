"use client";

import { Calendar, Save } from "lucide-react";
import { useMemo } from "react";
import TopNavMenu from "../components/TopNavMenu";
import { useAuth } from "../components/AuthGuard";
import { usePayroll } from "../hooks/usePayroll";

function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
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

  const totals = useMemo(() => {
    const totalLaborCost = rows.reduce((sum, row) => sum + row.totalSalary, 0);
    return {
      totalLaborCost: Number(totalLaborCost.toFixed(2)),
    };
  }, [rows]);

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
              销售提成自动计算；全职基本工资支持按上月自动带入；兼职基本工资按当月工时自动计算（可编辑，时薪：
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
                        <input
                          type="number"
                          value={row.basicSalary}
                          min={0}
                          step="0.01"
                          onChange={(e) =>
                            updateRow(row.coachId, {
                              basicSalary: Number(e.target.value || 0),
                            })
                          }
                          className="w-36 px-2 py-1 border border-slate-300 rounded-md text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {formatCurrency(row.salesCommission)}
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
    </div>
  );
}
