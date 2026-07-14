"use client";

import { Calendar, Clock, List, Plus, Settings, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import TopNavMenu from "../components/TopNavMenu";
import UserInfo from "../components/UserInfo";
import { useAuth } from "../components/AuthGuard";
import { usePayroll } from "../hooks/usePayroll";
import { useLessonTypes } from "../hooks/useLessonTypes";
import {
  getDefaultLessonFeeDraft,
  isNoviceLessonTypeForFreeQuota,
  isSingleNoviceLessonType,
  normalizeConfigItem,
  type LessonFeeConfigDraft,
  type LessonFeeDetailsResult,
  summarizeLessonSessionsByType,
} from "../lib/lessonFee";
import { formatMonthDay } from "../lib/scheduleHours";
import { LessonType } from "../types";

function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

type SalesDetailItem = {
  id: string;
  soldAt: string;
  productName: string;
  amount: number;
  quantity?: number | null;
  note?: string | null;
  productCategory?: { id: string; name: string } | null;
};

type LessonFeeConfigApiItem = LessonFeeConfigDraft & {
  lessonTypeId: string;
};

type PartTimeHourEntry = {
  id: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  hours: number;
  source: "schedule" | "manual";
};

type PartTimeHoursDetails = {
  items: PartTimeHourEntry[];
  scheduleHours: number;
  manualHours: number;
  totalHours: number;
};

function buildLessonFeeDraftByLessonTypes(
  lessonTypes: LessonType[],
  apiConfig: LessonFeeConfigApiItem[]
): Record<string, LessonFeeConfigDraft> {
  const apiConfigMap = new Map(apiConfig.map((item) => [item.lessonTypeId, item]));
  const mergedDraft: Record<string, LessonFeeConfigDraft> = {};
  lessonTypes.forEach((lessonType) => {
    const saved = apiConfigMap.get(lessonType.id);
    const defaults = getDefaultLessonFeeDraft(lessonType);
    mergedDraft[lessonType.id] = saved
      ? (() => {
          const normalized = normalizeConfigItem({ ...saved, lessonTypeId: lessonType.id }, lessonType.name);
          return {
            mode: normalized.mode,
            sessionRate: normalized.sessionRate,
            noviceSingleRate: saved.noviceSingleRate,
            noviceMultiRatePerPerson: saved.noviceMultiRatePerPerson,
            fullTimeFreeHeadcount: normalized.fullTimeFreeHeadcount,
          };
        })()
      : defaults;
  });
  return mergedDraft;
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

export default function PayrollPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const {
    month,
    rows,
    loading,
    error,
    changeMonth,
    saveSalaryConfig,
    refreshPayroll,
    savePayroll,
  } = usePayroll();
  const { lessonTypes, loading: lessonTypesLoading, refreshLessonTypes } = useLessonTypes();
  const partTimeRows = useMemo(
    () => rows.filter((row) => row.employmentType === "PART_TIME"),
    [rows]
  );
  const [selectedYearStr, selectedMonthStr] = month.split("-");
  const selectedYear = Number(selectedYearStr);
  const selectedMonth = Number(selectedMonthStr);
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, idx) => currentYear - 3 + idx);
  }, []);
  const [drawerMode, setDrawerMode] = useState<"sales" | "lessonFee" | "partTimeHours" | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerCoachId, setDrawerCoachId] = useState<string | null>(null);
  const [salesDetails, setSalesDetails] = useState<SalesDetailItem[]>([]);
  const [drawerCommissionRate, setDrawerCommissionRate] = useState(0);
  const [lessonFeeDetails, setLessonFeeDetails] = useState<LessonFeeDetailsResult | null>(null);
  const [partTimeHoursDetails, setPartTimeHoursDetails] = useState<PartTimeHoursDetails | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [manualHoursPopupOpen, setManualHoursPopupOpen] = useState(false);
  const [manualHoursSaving, setManualHoursSaving] = useState(false);
  const [manualHoursError, setManualHoursError] = useState<string | null>(null);
  const [manualHoursForm, setManualHoursForm] = useState({
    dateStr: "",
    startTime: "10:00",
    endTime: "20:00",
  });
  const [salaryConfigOpen, setSalaryConfigOpen] = useState(false);
  const [salaryConfigTab, setSalaryConfigTab] = useState<"fulltime" | "parttime" | "lessonFee">("fulltime");
  const [salaryDraft, setSalaryDraft] = useState<Record<string, number>>({});
  const [partTimeHourlyRateDraft, setPartTimeHourlyRateDraft] = useState(20);
  const [lessonFeeConfigDraft, setLessonFeeConfigDraft] = useState<Record<string, LessonFeeConfigDraft>>({});

  const totals = useMemo(() => {
    const totalLaborCost = rows.reduce((sum, row) => sum + row.totalSalary, 0);
    return {
      totalLaborCost: Number(totalLaborCost.toFixed(2)),
    };
  }, [rows]);

  const lessonFeeSessionSummary = useMemo(() => {
    if (!lessonFeeDetails?.items.length) return [];
    return summarizeLessonSessionsByType(lessonFeeDetails.items);
  }, [lessonFeeDetails]);

  const openSalesDetails = async (
    coachId: string,
    coachName: string,
    salesAmount: number,
    salesCommission: number
  ) => {
    setDrawerTitle(`${coachName} · ${month} 销售明细`);
    setDrawerCommissionRate(salesAmount > 0 ? salesCommission / salesAmount : 0);
    setDrawerMode("sales");
    setDrawerCoachId(coachId);
    setSalesDetails([]);
    setLessonFeeDetails(null);
    setPartTimeHoursDetails(null);
    setDrawerError(null);
    setDrawerLoading(true);
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
      setDrawerError(err instanceof Error ? err.message : "加载销售明细失败");
    } finally {
      setDrawerLoading(false);
    }
  };

  const openLessonFeeDetails = async (coachId: string, coachName: string) => {
    setDrawerTitle(`${coachName} · ${month} 课时费明细`);
    setDrawerMode("lessonFee");
    setDrawerCoachId(coachId);
    setSalesDetails([]);
    setLessonFeeDetails(null);
    setPartTimeHoursDetails(null);
    setDrawerError(null);
    setDrawerLoading(true);
    try {
      const params = new URLSearchParams({ coachId, month });
      const response = await fetch(`/api/payroll/lesson-fee-details?${params.toString()}`);
      if (!response.ok) throw new Error("加载课时费明细失败");
      const data = (await response.json()) as LessonFeeDetailsResult;
      setLessonFeeDetails(data);
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "加载课时费明细失败");
    } finally {
      setDrawerLoading(false);
    }
  };

  const openPartTimeHours = async (coachId: string, coachName: string) => {
    setDrawerTitle(`${coachName} · ${month} 兼职工时`);
    setDrawerMode("partTimeHours");
    setDrawerCoachId(coachId);
    setSalesDetails([]);
    setLessonFeeDetails(null);
    setPartTimeHoursDetails(null);
    setDrawerError(null);
    setManualHoursPopupOpen(false);
    setManualHoursError(null);
    const { startDate } = getMonthDateRange(month);
    setManualHoursForm({
      dateStr: startDate,
      startTime: "10:00",
      endTime: "20:00",
    });
    setDrawerLoading(true);
    try {
      const params = new URLSearchParams({ coachId, month });
      const response = await fetch(`/api/payroll/part-time-hours?${params.toString()}`);
      if (!response.ok) throw new Error("加载兼职工时失败");
      const data = (await response.json()) as PartTimeHoursDetails;
      setPartTimeHoursDetails(data);
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "加载兼职工时失败");
    } finally {
      setDrawerLoading(false);
    }
  };

  const saveManualHours = async () => {
    if (!drawerCoachId) return;
    setManualHoursSaving(true);
    setManualHoursError(null);
    try {
      const response = await fetch("/api/payroll/part-time-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          coachId: drawerCoachId,
          dateStr: manualHoursForm.dateStr,
          startTime: manualHoursForm.startTime,
          endTime: manualHoursForm.endTime,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "保存手动工时失败");
      }
      setPartTimeHoursDetails(data as PartTimeHoursDetails);
      setManualHoursPopupOpen(false);
      const nextRows = await refreshPayroll(month, { silent: true });
      if (nextRows) {
        await savePayroll(nextRows);
      }
    } catch (err) {
      setManualHoursError(err instanceof Error ? err.message : "保存手动工时失败");
    } finally {
      setManualHoursSaving(false);
    }
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setDrawerCoachId(null);
    setDrawerError(null);
    setManualHoursPopupOpen(false);
    setManualHoursError(null);
  };

  const fullTimeRows = useMemo(
    () => rows.filter((row) => row.employmentType === "FULL_TIME"),
    [rows]
  );

  const reloadLessonFeeConfigData = useCallback(async () => {
    const latestLessonTypes = await refreshLessonTypes();
    try {
      const response = await fetch("/api/payroll/lesson-fee-config");
      const apiConfig = response.ok ? ((await response.json()) as LessonFeeConfigApiItem[]) : [];
      setLessonFeeConfigDraft(buildLessonFeeDraftByLessonTypes(latestLessonTypes, apiConfig));
    } catch {
      setLessonFeeConfigDraft(buildLessonFeeDraftByLessonTypes(latestLessonTypes, []));
    }
  }, [refreshLessonTypes]);

  const openSalaryConfig = async () => {
    const initialSalaryDraft: Record<string, number> = {};
    fullTimeRows.forEach((row) => {
      initialSalaryDraft[row.coachId] = row.basicSalary;
    });
    const firstPartTime = partTimeRows[0];
    setSalaryDraft(initialSalaryDraft);
    setPartTimeHourlyRateDraft(firstPartTime?.hourlyRate ?? 20);
    await reloadLessonFeeConfigData();
    setSalaryConfigTab("fulltime");
    setSalaryConfigOpen(true);
  };

  useEffect(() => {
    if (!salaryConfigOpen) return;
    const handleFocusRefresh = () => {
      void reloadLessonFeeConfigData();
    };
    window.addEventListener("focus", handleFocusRefresh);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleFocusRefresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [salaryConfigOpen, reloadLessonFeeConfigData]);

  const applySalaryConfig = async () => {
    setSalaryConfigOpen(false);
    try {
      const latestLessonTypes = await refreshLessonTypes();
      const configResponse = await fetch("/api/payroll/lesson-fee-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: latestLessonTypes.map((lessonType) => {
            const draft = lessonFeeConfigDraft[lessonType.id] ?? getDefaultLessonFeeDraft(lessonType);
            return normalizeConfigItem(
              { lessonTypeId: lessonType.id, ...draft },
              lessonType.name
            );
          }),
        }),
      });
      if (!configResponse.ok) {
        throw new Error("课时费配置保存失败");
      }
      await saveSalaryConfig(salaryDraft, partTimeHourlyRateDraft);
      alert("工资配置已保存");
    } catch {
      alert("工资配置保存失败");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <TopNavMenu current="schedule" isAdmin={false} />
            </div>
            <UserInfo />
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
            <UserInfo />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">工资计算（按月）</h2>
            <p className="text-sm text-slate-500 mt-1">
              销售提成与课时费根据当月记录自动计算；全职基本工资与兼职时薪在「工资配置」中维护；兼职工时由班表与手动增加工时合计，保存后自动更新。
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
                              <span>兼职 · 本月工时 {row.monthHours}h</span>
                              <button
                                onClick={() => openPartTimeHours(row.coachId, row.coachName)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                title="查看兼职工时明细"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
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
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        <div className="inline-flex items-center gap-1">
                          <span>{formatCurrency(row.lessonFee)}</span>
                          <button
                            onClick={() => openLessonFeeDetails(row.coachId, row.coachName)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                            title="查看课时费明细"
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
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

      {drawerMode && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{drawerTitle}</h3>
              <button
                onClick={closeDrawer}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {drawerLoading ? (
                <div className="text-sm text-slate-500">加载中...</div>
              ) : drawerError ? (
                <div className="text-sm text-red-600">{drawerError}</div>
              ) : drawerMode === "partTimeHours" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      班表 {partTimeHoursDetails?.scheduleHours ?? 0}h + 手动{" "}
                      {partTimeHoursDetails?.manualHours ?? 0}h = 共{" "}
                      {partTimeHoursDetails?.totalHours ?? 0}h
                    </div>
                    <button
                      onClick={() => {
                        setManualHoursError(null);
                        setManualHoursPopupOpen(true);
                      }}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-emerald-700"
                      title="手动增加工时"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {!partTimeHoursDetails?.items.length ? (
                    <div className="text-sm text-slate-400">暂无工时记录</div>
                  ) : (
                    <div className="space-y-2">
                      {partTimeHoursDetails.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700"
                        >
                          {formatMonthDay(item.dateStr)}：{item.startTime}-{item.endTime} (共
                          {item.hours}小时)
                          {item.source === "manual" && (
                            <span className="ml-2 text-xs text-amber-600">手动</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : drawerMode === "sales" ? (
                salesDetails.length === 0 ? (
                  <div className="text-sm text-slate-400">暂无销售记录</div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">时间</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">类别</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">产品</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">数量</th>
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
                            <td className="px-3 py-2 text-slate-600">{item.productCategory?.name || "其他"}</td>
                            <td className="px-3 py-2 text-slate-800">{item.productName}</td>
                            <td className="px-3 py-2 text-right text-slate-700">
                              {item.quantity ?? "—"}
                            </td>
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
                )
              ) : lessonFeeDetails && lessonFeeDetails.items.length > 0 ? (
                <div className="space-y-4">
                  {lessonFeeSessionSummary.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold text-slate-500 mb-2">上课统计</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-slate-700">
                        {lessonFeeSessionSummary.map((item) => (
                          <div key={item.lessonTypeName}>
                            {item.lessonTypeName}：{item.sessionCount}节，{item.studentCount}人
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {lessonFeeDetails.noviceFreeSummary && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="font-medium">全职新手课免计</div>
                      <div className="mt-1 text-amber-800">
                        本月已免计 {lessonFeeDetails.noviceFreeSummary.used} /{" "}
                        {lessonFeeDetails.noviceFreeSummary.quota} 人
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">日期</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">课程类型</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">人数</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">免计</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">计算方式</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">课时费</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lessonFeeDetails.items.map((item) => (
                          <tr
                            key={item.id}
                            className={item.freeStudentCount > 0 ? "bg-amber-50/60" : undefined}
                          >
                            <td className="px-3 py-2 text-slate-600">{item.dateStr}</td>
                            <td className="px-3 py-2 text-slate-800">{item.lessonTypeName}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{item.studentCount}</td>
                            <td className="px-3 py-2 text-right text-amber-700">
                              {item.freeStudentCount > 0 ? `${item.freeStudentCount} 人` : "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{item.calculationNote}</td>
                            <td className="px-3 py-2 text-right text-emerald-700 font-medium">
                              {formatCurrency(item.fee)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                            合计
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-emerald-700">
                            {formatCurrency(lessonFeeDetails.totalFee)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">暂无课程记录</div>
              )}
            </div>
          </aside>
        </div>
      )}

      {manualHoursPopupOpen && drawerMode === "partTimeHours" && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">手动增加工时</h3>
              <button
                onClick={() => {
                  setManualHoursPopupOpen(false);
                  setManualHoursError(null);
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
                <input
                  type="date"
                  value={manualHoursForm.dateStr}
                  min={getMonthDateRange(month).startDate}
                  max={getMonthDateRange(month).endDate}
                  onChange={(e) =>
                    setManualHoursForm((prev) => ({ ...prev, dateStr: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">开始时间</label>
                  <input
                    type="time"
                    value={manualHoursForm.startTime}
                    onChange={(e) =>
                      setManualHoursForm((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">结束时间</label>
                  <input
                    type="time"
                    value={manualHoursForm.endTime}
                    onChange={(e) =>
                      setManualHoursForm((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
              </div>
              {manualHoursError && (
                <div className="text-sm text-red-600">{manualHoursError}</div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setManualHoursPopupOpen(false);
                  setManualHoursError(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={saveManualHours}
                disabled={manualHoursSaving || !manualHoursForm.dateStr}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50"
              >
                {manualHoursSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {salaryConfigOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">工资配置</h3>
              <button
                onClick={() => setSalaryConfigOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 pt-3 border-b border-slate-200 flex gap-1">
              <button
                type="button"
                onClick={() => setSalaryConfigTab("fulltime")}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                  salaryConfigTab === "fulltime"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                全职基本工资
              </button>
              <button
                type="button"
                onClick={() => setSalaryConfigTab("parttime")}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                  salaryConfigTab === "parttime"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                兼职时薪
              </button>
              <button
                type="button"
                onClick={() => setSalaryConfigTab("lessonFee")}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                  salaryConfigTab === "lessonFee"
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                课时费配置
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {salaryConfigTab === "fulltime" ? (
                fullTimeRows.length === 0 ? (
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
                )
              ) : salaryConfigTab === "parttime" ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-700">兼职统一时薪</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={partTimeHourlyRateDraft}
                      onChange={(e) => setPartTimeHourlyRateDraft(Number(e.target.value || 0))}
                      className="w-32 px-3 py-2 border border-slate-300 rounded-md text-right text-sm"
                    />
                    <span className="text-sm text-slate-500">元/小时</span>
                  </div>
                </div>
              ) : lessonTypesLoading ? (
                <div className="text-sm text-slate-500">课程类型加载中...</div>
              ) : lessonTypes.length === 0 ? (
                <div className="text-sm text-slate-500">暂无课程类型，请先在课程管理中维护</div>
              ) : (
                <div className="space-y-3">
                  {lessonTypes.map((lessonType) => {
                    const config =
                      lessonFeeConfigDraft[lessonType.id] ?? getDefaultLessonFeeDraft(lessonType);
                    return (
                      <div key={lessonType.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                        <div className="text-sm font-semibold text-slate-800">{lessonType.name}</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-slate-600">
                              {isSingleNoviceLessonType(lessonType.name) || config.mode === "PER_SESSION"
                                ? "每节课时费"
                                : "每人课时费"}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={config.sessionRate}
                                onChange={(e) =>
                                  setLessonFeeConfigDraft((prev) => ({
                                    ...prev,
                                    [lessonType.id]: {
                                      ...config,
                                      sessionRate: Number(e.target.value || 0),
                                    },
                                  }))
                                }
                                className="w-28 px-3 py-1.5 border border-slate-300 rounded-md text-right text-sm"
                              />
                              <span className="text-sm text-slate-500">
                                元/
                                {isSingleNoviceLessonType(lessonType.name) || config.mode === "PER_SESSION"
                                  ? "节"
                                  : "人"}
                              </span>
                            </div>
                          </div>
                          {isNoviceLessonTypeForFreeQuota(lessonType.name) && (
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm text-slate-600">
                                全职免计人数
                                <span className="block text-xs text-slate-400">
                                  与所有新手课类型合并计算
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  step="1"
                                  value={config.fullTimeFreeHeadcount}
                                  onChange={(e) =>
                                    setLessonFeeConfigDraft((prev) => ({
                                      ...prev,
                                      [lessonType.id]: {
                                        ...config,
                                        fullTimeFreeHeadcount: Number(e.target.value || 0),
                                      },
                                    }))
                                  }
                                  className="w-28 px-3 py-1.5 border border-slate-300 rounded-md text-right text-sm"
                                />
                                <span className="text-sm text-slate-500">人</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
