"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  Filter,
  Image as ImageIcon,
  ChevronDown,
  FileText,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { ShiftType, ScheduleItem, WorkloadStats } from "./types";
import { addDays, getWeekDays, getMonthDays, getDayOfWeek } from "./utils/date";
import { generateWeekSchedule } from "./utils/schedule";
import { exportScheduleToDoc, downloadTextFile } from "./utils/export";
import { calcMonthlyHoursByCoach } from "./lib/scheduleHours";
import { useCoaches } from "./hooks/useCoaches";
import { useStores } from "./hooks/useStores";
import { useSchedules } from "./hooks/useSchedules";
import CoachList from "./components/CoachList";
import StoreList from "./components/StoreList";
import WeeklyStats from "./components/WeeklyStats";
import ScheduleCalendar from "./components/ScheduleCalendar";
import ShiftModal from "./components/ShiftModal";
import CollapsiblePanel from "./components/CollapsiblePanel";
import ExportImageModal from "./components/ExportImageModal";
import DateRangeModal from "./components/DateRangeModal";
import { useAuth } from "./components/AuthGuard";
import TopNavMenu from "./components/TopNavMenu";
import UserInfo from "./components/UserInfo";

export default function RockGymScheduler() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN";
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const {
    coaches,
    loading: coachesLoading,
    error: coachesError,
    createCoach,
    updateCoach,
    deleteCoach,
    refreshCoaches,
  } = useCoaches();
  const {
    stores,
    loading: storesLoading,
    error: storesError,
    createStore,
    updateStore,
    deleteStore,
  } = useStores();

  const weekDays = useMemo(() => {
    const days = getWeekDays(new Date(currentDate));
    return days;
  }, [currentDate]);
  const monthDays = useMemo(
    () => getMonthDays(new Date(currentDate)),
    [currentDate]
  );

  // Calculate the date range for fetching schedules
  // We need to fetch data that covers both the month view and the current week
  const fetchDateRange = useMemo(() => {
    const allDates = [...monthDays, ...weekDays];
    const sortedDates = allDates.sort();
    return {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1]
    };
  }, [monthDays, weekDays]);

  // Load schedules for the entire month to support both week and month views
  const {
    schedules: dbSchedules,
    loading: schedulesLoading,
    error: schedulesError,
    saveSchedules,
    deleteSchedule: deleteDbSchedule,
    setSchedules: setDbSchedules,
  } = useSchedules(fetchDateRange.start, fetchDateRange.end);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    type: ShiftType;
    storeId: string;
    shiftId?: string;
    shiftName?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>([]); // 空数组表示显示所有教练
  const [showExportImageModal, setShowExportImageModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);

  // Load schedules from database - merge with existing schedules to avoid losing unsaved changes
  useEffect(() => {
    if (dbSchedules.length > 0) {
      setSchedules((prev) => {
        // If we have unsaved changes, merge db schedules with local changes
        if (hasUnsavedChanges && !isInitialLoad) {
          // Create a map of existing schedules by date
          const localScheduleMap = new Map(prev.map(s => [`${s.dateStr}-${s.storeId}-${s.shiftId || s.shiftType}-${s.coachId}`, s]));
          // Merge: keep local changes, add db schedules that don't exist locally
          const merged = [...prev];
          dbSchedules.forEach(dbSchedule => {
            const key = `${dbSchedule.dateStr}-${dbSchedule.storeId}-${dbSchedule.shiftId || dbSchedule.shiftType}-${dbSchedule.coachId}`;
            if (!localScheduleMap.has(key)) {
              merged.push(dbSchedule);
            }
          });
          return merged;
        }
        // Otherwise, use db schedules
        setIsInitialLoad(false);
        return dbSchedules;
      });
      if (isInitialLoad) {
        setHasUnsavedChanges(false);
      }
    }
  }, [dbSchedules, hasUnsavedChanges, isInitialLoad]);

  const generateSchedule = () => {
    if (!canEdit) return;
    const newSchedule = generateWeekSchedule(coaches, stores, weekDays);
    setSchedules((prev) => {
      const filtered = prev.filter((s) => !weekDays.includes(s.dateStr));
      return [...filtered, ...newSchedule];
    });
    setHasUnsavedChanges(true);
  };

  // 为指定日期范围生成排班（会覆盖已有排班）
  const generateScheduleForRange = (dateRange: string[]) => {
    if (!canEdit) return;
    // 生成新的排班
    const newSchedule = generateWeekSchedule(coaches, stores, dateRange);
    
    // 移除该日期范围内的旧排班，保留其他日期的排班
    setSchedules((prev) => {
      const filtered = prev.filter((s) => !dateRange.includes(s.dateStr));
      return [...filtered, ...newSchedule];
    });
    setHasUnsavedChanges(true);
  };

  // 生成本周排班
  const handleGenerateThisWeek = () => {
    generateScheduleForRange(weekDays);
    setShowScheduleDropdown(false);
  };

  // 生成本月排班
  const handleGenerateThisMonth = () => {
    generateScheduleForRange(monthDays);
    setShowScheduleDropdown(false);
  };

  // 打开自定义日期范围选择
  const handleGenerateCustomRange = () => {
    setShowScheduleDropdown(false);
    setShowDateRangeModal(true);
  };

  // 处理自定义日期范围生成排班
  const handleCustomRangeConfirm = (startDate: string, endDate: string) => {
    // 生成日期范围数组
    const dateRange: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let currentDate = new Date(start);
    while (currentDate <= end) {
      dateRange.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    generateScheduleForRange(dateRange);
  };

  const handleSaveSchedule = async () => {
    if (!canEdit) return;
    try {
      setIsSaving(true);
      // Save all schedules in the current date range
      const schedulesToSave = schedules.filter((s) =>
        s.dateStr >= fetchDateRange.start && s.dateStr <= fetchDateRange.end
      );

      if (schedulesToSave.length === 0) {
        alert("没有需要保存的排班");
        return;
      }

      console.log('Saving schedules:', {
        dateRange: fetchDateRange,
        schedulesCount: schedulesToSave.length,
        dates: [...new Set(schedulesToSave.map(s => s.dateStr))].sort(),
      });

      await saveSchedules(schedulesToSave, fetchDateRange.start, fetchDateRange.end);
      setHasUnsavedChanges(false);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Failed to save schedules:", error);
      alert("保存排班失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateStats = useCallback((dateRange: string[]) => {
    const data: Record<string, WorkloadStats> = {};
    coaches.forEach(
      (c) =>
        (data[c.id] = {
          totalShifts: 0,
          totalHours: 0,
          daysWorked: new Set(),
          extended: 0,
        })
    );

    const filteredSchedules = schedules.filter((s) => dateRange.includes(s.dateStr));
    const storeMap = new Map(stores.map((store) => [store.id, store]));
    const hoursByCoach = calcMonthlyHoursByCoach(filteredSchedules, storeMap);

    filteredSchedules.forEach((schedule) => {
      if (!data[schedule.coachId]) return;
      data[schedule.coachId].totalShifts += 1;
      data[schedule.coachId].daysWorked.add(schedule.dateStr);
      if (schedule.isExtended && data[schedule.coachId].extended !== undefined) {
        data[schedule.coachId].extended! += 1;
      }
    });

    for (const [coachId, totalHours] of hoursByCoach.entries()) {
      if (data[coachId]) {
        data[coachId].totalHours = totalHours;
      }
    }

    return Object.entries(data).sort(
      ([, a], [, b]) => b.totalHours - a.totalHours
    );
  }, [coaches, schedules, stores]);

  const weekStats = useMemo(
    () => calculateStats(weekDays),
    [calculateStats, weekDays]
  );
  const monthStats = useMemo(
    () => calculateStats(monthDays),
    [calculateStats, monthDays]
  );

  const handleRemoveShift = (scheduleId: string) => {
    if (!canEdit) return;
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    setHasUnsavedChanges(true);
  };

  const handleAddShift = (
    dateStr: string,
    type: ShiftType,
    coachId: string,
    storeId: string,
    providedShiftId?: string,
    providedShiftName?: string
  ) => {
    if (!canEdit) return;
    // 使用提供的 shiftId/shiftName,如果没有提供则从 type 转换
    const shiftId = providedShiftId || type.toLowerCase();
    const shiftName = providedShiftName || (type === "MORNING" ? "早班" : "晚班");

    // Check if this exact shift already exists
    const exists = schedules.some(
      (s) =>
        s.dateStr === dateStr && s.shiftId === shiftId && s.coachId === coachId && s.storeId === storeId
    );
    if (exists) return;

    // CRITICAL CONSTRAINT: Check if coach is already scheduled at a different store on the same date
    const coachAlreadyScheduledAtDifferentStore = schedules.some(
      (s) =>
        s.dateStr === dateStr && s.coachId === coachId && s.storeId !== storeId
    );
    if (coachAlreadyScheduledAtDifferentStore) {
      const storeName = stores.find((st) => st.id === storeId)?.name || "该门店";
      alert(`该教练在 ${dateStr} 已在其他门店排班，无法在 ${storeName} 再次排班`);
      return;
    }

    const dayOfWeek = getDayOfWeek(dateStr);
    const store = stores.find((s) => s.id === storeId);
    const isExtended =
      (dayOfWeek === 5 || dayOfWeek === 6) && type === "EVENING" && !!store?.eveningExtendedEnd;

    const newShift: ScheduleItem = {
      id: crypto.randomUUID(),
      dateStr,
      shiftId,
      shiftName,
      coachId,
      storeId,
      shiftType: type,
      isExtended,
    };
    setSchedules((prev) => [...prev, newShift]);
    setHasUnsavedChanges(true);
    setSelectedSlot(null);
  };

  const handleDragStart = (e: React.DragEvent, coachId: string) => {
    if (!canEdit) return;
    e.dataTransfer.setData("coachId", coachId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleUpdateCoachStores = async (
    coachId: string,
    storeIds: string[],
    primaryStoreId?: string
  ) => {
    if (!canEdit) return;
    try {
      const response = await fetch(`/api/coaches/${coachId}/stores`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeIds, primaryStoreId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update coach stores");
      }

      // Refresh coaches to get updated store associations
      await refreshCoaches();
    } catch (error) {
      console.error("Error updating coach stores:", error);
      throw error;
    }
  };

  const handleExportSchedule = () => {
    const content = exportScheduleToDoc(schedules, coaches, stores, weekDays);
    const filename = `排班表_${weekDays[0]}_至_${weekDays[weekDays.length - 1]}.txt`;
    downloadTextFile(content, filename);
  };

  const handleToggleCoachFilter = (coachId: string) => {
    setSelectedCoachIds((prev) => {
      if (prev.includes(coachId)) {
        // 取消选择
        return prev.filter((id) => id !== coachId);
      } else {
        // 添加选择
        return [...prev, coachId];
      }
    });
  };

  const handleSelectAllCoaches = () => {
    if (selectedCoachIds.length === coaches.length) {
      // 全部取消
      setSelectedCoachIds([]);
    } else {
      // 全选
      setSelectedCoachIds(coaches.map((c) => c.id));
    }
  };

  // 根据筛选条件过滤排班
  const filteredSchedules = useMemo(() => {
    if (selectedCoachIds.length === 0) {
      // 没有选择任何教练，显示所有
      return schedules;
    }
    // 只显示选中的教练
    return schedules.filter((s) => selectedCoachIds.includes(s.coachId));
  }, [schedules, selectedCoachIds]);

  const loading = coachesLoading || schedulesLoading || storesLoading;
  const error = coachesError || schedulesError || storesError;

  if (loading && !coaches.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !coaches.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">错误</div>
          <p className="text-slate-600">{error}</p>
          <p className="text-sm text-slate-500 mt-4">
            请确保 PostgreSQL 正在运行且数据库已设置。
          </p>
        </div>
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
            <TopNavMenu current="schedule" isAdmin={canEdit} />
          </div>

          <div className="flex items-center gap-4 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-2 hover:bg-slate-700 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-mono text-sm min-w-[140px] text-center font-medium">
              {weekDays[0]} 至 {weekDays[6].slice(5)}
            </span>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-2 hover:bg-slate-700 rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            {canEdit && (
              <div className="relative">
                <button
                  onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-medium transition-all shadow-lg active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  开始排班
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showScheduleDropdown && (
                  <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px] z-50">
                    <button
                      onClick={handleGenerateThisWeek}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <Calendar className="w-4 h-4" />
                      本周
                    </button>
                    <button
                      onClick={handleGenerateThisMonth}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <CalendarDays className="w-4 h-4" />
                      本月
                    </button>
                    <button
                      onClick={handleGenerateCustomRange}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <CalendarRange className="w-4 h-4" />
                      自定义范围
                    </button>
                  </div>
                )}
              </div>
            )}
            {canEdit && hasUnsavedChanges && (
              <button
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-all shadow-lg active:scale-95"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "保存中..." : "保存排班"}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-md font-medium transition-all shadow-lg active:scale-95"
                title="导出"
              >
                <Download className="w-4 h-4" />
                导出
                <ChevronDown className="w-4 h-4" />
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px] z-50">
                  <button
                    onClick={() => {
                      setShowExportImageModal(true);
                      setShowExportDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <ImageIcon className="w-4 h-4" />
                    导出为图片
                  </button>
                  <button
                    onClick={() => {
                      handleExportSchedule();
                      setShowExportDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileText className="w-4 h-4" />
                    导出为文本
                  </button>
                </div>
              )}
            </div>
            <UserInfo />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {canEdit && (
          <div className="space-y-6 lg:col-span-1">
            <WeeklyStats
              weekStats={weekStats}
              monthStats={monthStats}
              coaches={coaches}
            />
            <CoachList
              coaches={coaches}
              stores={stores}
              canEdit={canEdit}
              onDragStart={handleDragStart}
              onDeleteCoach={deleteCoach}
              onAddCoach={createCoach}
              onUpdateCoach={updateCoach}
              onUpdateCoachStores={handleUpdateCoachStores}
            />
            <StoreList
              stores={stores}
              canEdit={canEdit}
              onDeleteStore={deleteStore}
              onAddStore={createStore}
              onUpdateStore={updateStore}
            />
          </div>
        )}

        <div className={`${canEdit ? "lg:col-span-4" : "lg:col-span-5"} space-y-4`}>
          {/* 教练筛选器 */}
          <CollapsiblePanel
            title="筛选教练"
            icon={<Filter className="w-4 h-4" />}
            defaultOpen={false}
          >
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-slate-500">
                  {selectedCoachIds.length === 0 
                    ? '显示所有教练' 
                    : selectedCoachIds.length === coaches.length
                    ? '已选择所有教练'
                    : `已选择 ${selectedCoachIds.length} / ${coaches.length} 位教练`
                  }
                </div>
                <button
                  onClick={handleSelectAllCoaches}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {selectedCoachIds.length === coaches.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {coaches.map((coach) => {
                  const isSelected = selectedCoachIds.length === 0 || selectedCoachIds.includes(coach.id);
                  return (
                    <button
                      key={coach.id}
                      onClick={() => handleToggleCoachFilter(coach.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? `${coach.color} text-white shadow-sm`
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-white/20' : 'bg-slate-200'
                        }`}
                      >
                        {coach.avatar}
                      </div>
                      {coach.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </CollapsiblePanel>

          <ScheduleCalendar
            weekDays={weekDays}
            schedules={filteredSchedules}
            coaches={coaches}
            stores={stores}
            canEdit={canEdit}
            onAddShift={handleAddShift}
            onRemoveShift={handleRemoveShift}
            onOpenModal={(date, type, storeId, shiftId, shiftName) => setSelectedSlot({ date, type, storeId, shiftId, shiftName })}
          />
        </div>
      </main>

      <ShiftModal
        slot={selectedSlot}
        coaches={coaches}
        schedules={schedules}
        canEdit={canEdit}
        onClose={() => setSelectedSlot(null)}
        onAddShift={handleAddShift}
      />

      <ExportImageModal
        isOpen={showExportImageModal}
        onClose={() => setShowExportImageModal(false)}
        weekDays={weekDays}
        schedules={schedules}
        coaches={coaches}
        stores={stores}
      />

      <DateRangeModal
        isOpen={showDateRangeModal}
        onClose={() => setShowDateRangeModal(false)}
        onConfirm={handleCustomRangeConfirm}
      />
    </div>
  );
}
