"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PayrollRow } from "@/app/types";
import { summarizeLessonSessionsByType, type LessonFeeDetailsResult } from "@/app/lib/lessonFee";
import { formatMonthDay } from "@/app/lib/scheduleHours";

function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

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

type SalesLine = {
  id: string;
  soldAt: string;
  productName: string;
  amount: number;
  quantity?: number | null;
  productCategory?: { name: string } | null;
  store?: { name: string } | null;
};

type OvertimeDetails = {
  items: Array<{
    id: string;
    dateStr: string;
    startTime: string;
    endTime: string;
    hours: number;
    storeName: string | null;
  }>;
  totalHours: number;
  hourlyRate: number;
  overtimePay: number;
};

type PayrollSelfViewProps = {
  month: string;
  coachId: string;
  coachName: string;
  onMonthChange: (month: string) => void;
  yearOptions: number[];
  selectedYear: number;
  selectedMonth: number;
};

export default function PayrollSelfView({
  month,
  coachId,
  coachName,
  onMonthChange,
  yearOptions,
  selectedYear,
  selectedMonth,
}: PayrollSelfViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<PayrollRow | null>(null);
  const [sales, setSales] = useState<SalesLine[]>([]);
  const [lessonFee, setLessonFee] = useState<LessonFeeDetailsResult | null>(null);
  const [overtime, setOvertime] = useState<OvertimeDetails | null>(null);

  const commissionRate = useMemo(() => {
    if (!row || row.salesAmount <= 0) return 0;
    return row.salesCommission / row.salesAmount;
  }, [row]);

  const lessonSummary = useMemo(() => {
    if (!lessonFee?.items.length) return [];
    return summarizeLessonSessionsByType(lessonFee.items);
  }, [lessonFee]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getMonthDateRange(month);
      const salesParams = new URLSearchParams({ coachId, startDate, endDate });
      const detailParams = new URLSearchParams({ coachId, month });

      const [payrollRes, salesRes, lessonRes, overtimeRes] = await Promise.all([
        fetch(`/api/payroll?month=${encodeURIComponent(month)}`),
        fetch(`/api/sales-records?${salesParams.toString()}`),
        fetch(`/api/payroll/lesson-fee-details?${detailParams.toString()}`),
        fetch(`/api/payroll/overtime-details?${detailParams.toString()}`),
      ]);

      if (!payrollRes.ok) {
        const body = await payrollRes.json().catch(() => ({}));
        throw new Error(body.error || "加载工资失败");
      }
      const payrollData = await payrollRes.json();
      const myRow = (payrollData.rows || [])[0] as PayrollRow | undefined;
      if (!myRow) throw new Error("本月暂无你的工资数据");
      setRow(myRow);

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSales(Array.isArray(salesData) ? salesData : []);
      } else {
        setSales([]);
      }

      if (lessonRes.ok) {
        setLessonFee((await lessonRes.json()) as LessonFeeDetailsResult);
      } else {
        setLessonFee(null);
      }

      if (overtimeRes.ok) {
        setOvertime((await overtimeRes.json()) as OvertimeDetails);
      } else {
        setOvertime(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [month, coachId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-3 sm:p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <h2 className="text-lg font-semibold text-slate-800">{coachName} · {month} 工资明细</h2>
        <p className="mt-1 text-sm text-slate-500">
          以下为本人当月工资构成与明细。总工资 = 基本工资 + 销售提成 + 课时费；加班费另计。
        </p>
        <div className="mt-3 flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 w-fit">
          <select
            value={selectedYear}
            onChange={(e) =>
              onMonthChange(`${e.target.value}-${String(selectedMonth).padStart(2, "0")}`)
            }
            className="bg-transparent text-slate-700 outline-none text-sm"
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
            onChange={(e) =>
              onMonthChange(`${selectedYear}-${String(e.target.value).padStart(2, "0")}`)
            }
            className="bg-transparent text-slate-700 outline-none text-sm"
          >
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <span className="text-slate-500 text-sm">月</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          加载中…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : row ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "基本工资", value: row.basicSalary },
              { label: "销售提成", value: row.salesCommission },
              { label: "课时费", value: row.lessonFee },
              { label: "加班费", value: row.overtimePay ?? 0 },
              { label: "总工资", value: row.totalSalary, emphasize: true },
              { label: "本月销售额", value: row.salesAmount },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border px-3 py-3 ${
                  item.emphasize
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="text-xs text-slate-500">{item.label}</div>
                <div
                  className={`mt-1 text-base font-semibold ${
                    item.emphasize ? "text-emerald-800" : "text-slate-800"
                  }`}
                >
                  {formatCurrency(item.value)}
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">销售明细</h3>
              <p className="text-xs text-slate-500 mt-0.5">销售额 {formatCurrency(row.salesAmount)}，提成 {formatCurrency(row.salesCommission)}</p>
            </div>
            {sales.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-400 text-center">暂无销售记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">时间</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">门店</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">产品</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">金额</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">提成</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                          {new Date(item.soldAt).toLocaleString("zh-CN")}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{item.store?.name || "—"}</td>
                        <td className="px-3 py-2 text-slate-800">{item.productName}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(item.amount)}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">
                          {formatCurrency(Number((item.amount * commissionRate).toFixed(2)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">课时费明细</h3>
              <p className="text-xs text-slate-500 mt-0.5">合计 {formatCurrency(lessonFee?.totalFee ?? row.lessonFee)}</p>
            </div>
            {lessonSummary.length > 0 && (
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 grid grid-cols-2 gap-2">
                {lessonSummary.map((item) => (
                  <div key={item.lessonTypeName}>
                    {item.lessonTypeName}：{item.sessionCount} 节，{item.studentCount} 人
                  </div>
                ))}
              </div>
            )}
            {lessonFee?.noviceFreeSummary && (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="font-medium">全职新手课免计</div>
                <div className="mt-1 text-amber-800">
                  本月已免计 {lessonFee.noviceFreeSummary.used} / {lessonFee.noviceFreeSummary.quota} 人
                  （免计课时仍列在下方明细，课时费为 ¥0）
                </div>
              </div>
            )}
            {!lessonFee?.items.length ? (
              <div className="px-4 py-8 text-sm text-slate-400 text-center">暂无课程记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">日期</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">门店</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">课程</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">人数</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">免计</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">计算方式</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">课时费</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lessonFee.items.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.freeStudentCount > 0 || item.fee === 0
                            ? "bg-amber-50/60"
                            : undefined
                        }
                      >
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{item.dateStr}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{item.storeName || "—"}</td>
                        <td className="px-3 py-2 text-slate-800">{item.lessonTypeName}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{item.studentCount}</td>
                        <td className="px-3 py-2 text-right text-amber-700 whitespace-nowrap">
                          {item.freeStudentCount > 0 ? `${item.freeStudentCount} 人` : "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{item.calculationNote}</td>
                        <td className="px-3 py-2 text-right text-emerald-700 font-medium whitespace-nowrap">
                          {formatCurrency(item.fee)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">加班明细</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {overtime?.totalHours ?? 0} 小时 × {formatCurrency(overtime?.hourlyRate ?? 0)} ={" "}
                {formatCurrency(overtime?.overtimePay ?? row.overtimePay ?? 0)}
              </p>
            </div>
            {!overtime?.items.length ? (
              <div className="px-4 py-8 text-sm text-slate-400 text-center">暂无加班记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">日期</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">门店</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">时间</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">时长</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overtime.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-slate-800">{formatMonthDay(item.dateStr)}</td>
                        <td className="px-3 py-2 text-slate-600">{item.storeName || "—"}</td>
                        <td className="px-3 py-2 text-slate-600 font-mono text-xs sm:text-sm">
                          {item.startTime && item.endTime ? `${item.startTime}-${item.endTime}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">{item.hours} 小时</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}