"use client";

import { Calendar, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useCoaches } from "../hooks/useCoaches";
import { useStores } from "../hooks/useStores";
import { useLessonTypes } from "../hooks/useLessonTypes";
import { useLessonRecords } from "../hooks/useLessonRecords";
import CoachList from "../components/CoachList";
import LessonTypeList from "../components/LessonTypeList";
import LessonRecordTable from "../components/LessonRecordTable";

export default function LessonsPage() {
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const navDropdownRef = useRef<HTMLDivElement>(null);

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
  } = useStores();

  const {
    lessonTypes,
    loading: lessonTypesLoading,
    error: lessonTypesError,
    createLessonType,
    updateLessonType,
    deleteLessonType,
  } = useLessonTypes();

  const {
    lessonRecords,
    loading: lessonRecordsLoading,
    error: lessonRecordsError,
    filters,
    updateFilters,
    createLessonRecord,
    updateLessonRecord,
    deleteLessonRecord,
  } = useLessonRecords();

  // 处理教练门店关联更新
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

      await refreshCoaches();
    } catch (error) {
      console.error("Error updating coach stores:", error);
      throw error;
    }
  };

  // 空的拖拽处理函数（课程统计页面不需要拖拽功能）
  const handleDragStart = () => {};

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target as Node)) {
        setShowNavDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loading = coachesLoading || storesLoading || lessonTypesLoading || lessonRecordsLoading;
  const error = coachesError || storesError || lessonTypesError || lessonRecordsError;

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">嘿抱工作后台</h1>
              <span className="text-slate-400">·</span>
              <div className="relative" ref={navDropdownRef}>
                <button
                  onClick={() => setShowNavDropdown(!showNavDropdown)}
                  className="flex items-center gap-1 text-lg font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  课程统计
                  <ChevronDown className={`w-4 h-4 transition-transform ${showNavDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showNavDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 min-w-[120px] z-50">
                    <Link
                      href="/"
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      排班
                    </Link>
                    <Link
                      href="/lessons"
                      className="block px-4 py-2 text-sm text-emerald-400 bg-slate-700/50"
                    >
                      课程统计
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左侧：团队成员列表和课程类型 */}
        <div className="space-y-6 lg:col-span-1">
          <CoachList
            coaches={coaches}
            stores={stores}
            onDragStart={handleDragStart}
            onDeleteCoach={deleteCoach}
            onAddCoach={createCoach}
            onUpdateCoach={updateCoach}
            onUpdateCoachStores={handleUpdateCoachStores}
          />
          <LessonTypeList
            lessonTypes={lessonTypes}
            onAddLessonType={createLessonType}
            onUpdateLessonType={updateLessonType}
            onDeleteLessonType={deleteLessonType}
          />
        </div>

        {/* 右侧：课程记录表格 */}
        <div className="lg:col-span-4 space-y-4">
          <LessonRecordTable
            lessonRecords={lessonRecords}
            coaches={coaches}
            lessonTypes={lessonTypes}
            filters={filters}
            loading={lessonRecordsLoading}
            onUpdateFilters={updateFilters}
            onCreateRecord={createLessonRecord}
            onUpdateRecord={updateLessonRecord}
            onDeleteRecord={deleteLessonRecord}
          />
        </div>
      </main>
    </div>
  );
}
