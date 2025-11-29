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
} from "lucide-react";
import { ShiftType, ScheduleItem, WorkloadStats } from "./types";
import { addDays, getWeekDays, getMonthDays, getDayOfWeek } from "./utils/date";
import { generateWeekSchedule } from "./utils/schedule";
import { exportScheduleToDoc, downloadTextFile } from "./utils/export";
import { HOURS_CONFIG } from "./constants";
import { useCoaches } from "./hooks/useCoaches";
import { useStores } from "./hooks/useStores";
import { useSchedules } from "./hooks/useSchedules";
import CoachList from "./components/CoachList";
import StoreList from "./components/StoreList";
import WeeklyStats from "./components/WeeklyStats";
import ScheduleCalendar from "./components/ScheduleCalendar";
import ShiftModal from "./components/ShiftModal";
import CollapsiblePanel from "./components/CollapsiblePanel";

export default function RockGymScheduler() {
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
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    type: ShiftType;
    storeId: string;
    shiftId?: string;
    shiftName?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>([]); // 空数组表示显示所有教练

  // Load schedules from database when they change
  useEffect(() => {
    if (dbSchedules.length > 0) {
      setSchedules(dbSchedules);
      setHasUnsavedChanges(false);
    }
  }, [dbSchedules]);

  const generateSchedule = () => {
    const newSchedule = generateWeekSchedule(coaches, stores, weekDays);
    setSchedules((prev) => {
      const filtered = prev.filter((s) => !weekDays.includes(s.dateStr));
      return [...filtered, ...newSchedule];
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveSchedule = async () => {
    try {
      setIsSaving(true);
      // Get only the schedules for the current week
      const weekSchedules = schedules.filter((s) =>
        weekDays.includes(s.dateStr)
      );
      console.log('Saving schedules:', {
        weekDays,
        weekSchedulesCount: weekSchedules.length,
        weekSchedulesDates: weekSchedules.map(s => s.dateStr).sort(),
        startDate: weekDays[0],
        endDate: weekDays[weekDays.length - 1],
      });
      await saveSchedules(weekSchedules, weekDays[0], weekDays[weekDays.length - 1]);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save schedules:", error);
      alert("保存排班失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  // 辅助函数：将时间字符串转换为分钟数
  const timeToMinutes = useCallback((time: string): number => {
    const [hour, min] = time.split(':').map(Number);
    return hour * 60 + min;
  }, []);

  // 辅助函数：合并重叠的时间段并返回总分钟数
  const mergeTimeRanges = useCallback((ranges: Array<{ start: number; end: number }>): number => {
    if (ranges.length === 0) return 0;
    if (ranges.length === 1) return ranges[0].end - ranges[0].start;

    // 按开始时间排序
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    
    // 合并重叠的时间段
    const merged: Array<{ start: number; end: number }> = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      
      if (current.start <= last.end) {
        // 有重叠，合并
        last.end = Math.max(last.end, current.end);
      } else {
        // 没有重叠，添加新的时间段
        merged.push(current);
      }
    }
    
    // 计算总分钟数
    return merged.reduce((total, range) => total + (range.end - range.start), 0);
  }, []);

  // 辅助函数：计算班次时长
  const calculateShiftDuration = useCallback((start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    let startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // 如果结束时间小于开始时间，说明跨天了（如 13:00 到 01:00）
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // 加上24小时
    }
    
    const durationMinutes = endMinutes - startMinutes;
    return durationMinutes / 60; // 转换为小时
  }, []);

  // 辅助函数：使用旧系统计算时长
  const calculateHoursFromOldSystem = useCallback((schedule: ScheduleItem): number => {
    if (schedule.shiftType === "MORNING") {
      return HOURS_CONFIG.MORNING.duration;
    } else {
      return schedule.isExtended
        ? HOURS_CONFIG.EVENING_EXTENDED.duration
        : HOURS_CONFIG.EVENING.duration;
    }
  }, []);

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

    // 按教练和日期分组，以便检测重叠
    const schedulesByCoachAndDate: Record<string, ScheduleItem[]> = {};
    
    schedules
      .filter((s) => dateRange.includes(s.dateStr))
      .forEach((s) => {
        const key = `${s.coachId}-${s.dateStr}`;
        if (!schedulesByCoachAndDate[key]) {
          schedulesByCoachAndDate[key] = [];
        }
        schedulesByCoachAndDate[key].push(s);
      });

    // 计算每个教练每天的实际工作时长（考虑重叠）
    Object.entries(schedulesByCoachAndDate).forEach(([key, daySchedules]) => {
      const coachId = key.split('-')[0];
      const dateStr = key.split('-').slice(1).join('-');
      
      if (!data[coachId]) return;

      data[coachId].totalShifts += daySchedules.length;
      data[coachId].daysWorked.add(dateStr);

      // 获取所有班次的时间段
      const timeRanges: Array<{ start: number; end: number }> = [];
      
      daySchedules.forEach((s) => {
        const store = stores.find(st => st.id === s.storeId);
        let startTime: string;
        let endTime: string;

        if (store && store.shifts && store.shifts.length > 0) {
          const shift = store.shifts.find(sh => sh.id === s.shiftId);
          if (shift) {
            startTime = shift.start;
            endTime = shift.end;
          } else {
            // 使用旧系统的默认值
            if (s.shiftType === "MORNING") {
              startTime = HOURS_CONFIG.MORNING.start;
              endTime = HOURS_CONFIG.MORNING.end;
            } else {
              startTime = HOURS_CONFIG.EVENING.start;
              endTime = s.isExtended ? HOURS_CONFIG.EVENING_EXTENDED.end : HOURS_CONFIG.EVENING.end;
            }
          }
        } else {
          // 旧系统
          if (s.shiftType === "MORNING") {
            startTime = HOURS_CONFIG.MORNING.start;
            endTime = HOURS_CONFIG.MORNING.end;
          } else {
            startTime = HOURS_CONFIG.EVENING.start;
            endTime = s.isExtended ? HOURS_CONFIG.EVENING_EXTENDED.end : HOURS_CONFIG.EVENING.end;
          }
        }

        // 转换为分钟数（从当天00:00开始）
        const startMinutes = timeToMinutes(startTime);
        let endMinutes = timeToMinutes(endTime);
        
        // 如果结束时间小于开始时间，说明跨天了
        if (endMinutes < startMinutes) {
          endMinutes += 24 * 60;
        }

        timeRanges.push({ start: startMinutes, end: endMinutes });

        if (s.isExtended && data[coachId].extended !== undefined) {
          data[coachId].extended! += 1;
        }
      });

      // 合并重叠的时间段并计算总时长
      const totalMinutes = mergeTimeRanges(timeRanges);
      data[coachId].totalHours += totalMinutes / 60;
    });

    return Object.entries(data).sort(
      ([, a], [, b]) => b.totalHours - a.totalHours
    );
  }, [coaches, schedules, stores, timeToMinutes, mergeTimeRanges]);

  const weekStats = useMemo(
    () => calculateStats(weekDays),
    [calculateStats, weekDays]
  );
  const monthStats = useMemo(
    () => calculateStats(monthDays),
    [calculateStats, monthDays]
  );

  const handleRemoveShift = (scheduleId: string) => {
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
    e.dataTransfer.setData("coachId", coachId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleUpdateCoachStores = async (
    coachId: string,
    storeIds: string[],
    primaryStoreId?: string
  ) => {
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
            <div>
              <h1 className="text-xl font-bold tracking-tight">嘿抱排班系统</h1>
            </div>
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
            <button
              onClick={generateSchedule}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-medium transition-all shadow-lg active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              开始排班
            </button>
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-all shadow-lg active:scale-95"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "保存中..." : "保存排班"}
              </button>
            )}
            <button
              onClick={handleExportSchedule}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-medium transition-all shadow-lg active:scale-95"
              title="导出排班表"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <WeeklyStats
            weekStats={weekStats}
            monthStats={monthStats}
            coaches={coaches}
          />
          <CoachList
            coaches={coaches}
            stores={stores}
            onDragStart={handleDragStart}
            onDeleteCoach={deleteCoach}
            onAddCoach={createCoach}
            onUpdateCoach={updateCoach}
            onUpdateCoachStores={handleUpdateCoachStores}
          />
          <StoreList
            stores={stores}
            onDeleteStore={deleteStore}
            onAddStore={createStore}
            onUpdateStore={updateStore}
          />
        </div>

        <div className="lg:col-span-4 space-y-4">
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
        onClose={() => setSelectedSlot(null)}
        onAddShift={handleAddShift}
      />
    </div>
  );
}
