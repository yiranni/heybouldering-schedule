"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Calendar, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import TopNavMenu from "../components/TopNavMenu";
import LessonAnalytics from "../components/LessonAnalytics";
import UserInfo from "../components/UserInfo";
import { useAuth } from "../components/AuthGuard";
import { useCoaches } from "../hooks/useCoaches";
import { useLessonRecords } from "../hooks/useLessonRecords";
import { useLessonTypes } from "../hooks/useLessonTypes";
import { useStores } from "../hooks/useStores";
import { resolveDefaultStoreId, EMPTY_STORE_FILTER, matchesStoreFilter } from "../lib/lessonStore";
import { LessonRecord, LessonType, ScheduleItem } from "../types";

type RecordFormState = {
  id?: string;
  dateStr: string;
  lessonTypeId: string;
  coachId?: string;
  storeId: string;
  studentCount: number;
};

function toDateTimeLocalInput(value?: string): string {
  const d = value ? new Date(value) : new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoStringFromLocal(value: string): string {
  return new Date(value).toISOString();
}

function getCurrentMonthDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  return { startDate: toDateStr(start), endDate: toDateStr(end) };
}

export default function LessonsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const defaultDateRange = useMemo(() => getCurrentMonthDateRange(), []);
  const { coaches } = useCoaches();
  const { stores } = useStores();
  const { lessonTypes, createLessonType, updateLessonType, deleteLessonType } = useLessonTypes();
  const {
    lessonRecords,
    loading,
    filters,
    updateFilters,
    createLessonRecord,
    updateLessonRecord,
    deleteLessonRecord,
  } = useLessonRecords(defaultDateRange);

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordFormState>({
    dateStr: toDateTimeLocalInput(),
    lessonTypeId: "",
    coachId: "",
    storeId: "",
    studentCount: 1,
  });

  const [modalSchedules, setModalSchedules] = useState<ScheduleItem[]>([]);

  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState<LessonType | null>(null);
  const [lessonTypeFilter, setLessonTypeFilter] = useState<string | undefined>();
  const [storeFilter, setStoreFilter] = useState<string | undefined>();

  const filteredRecords = useMemo(() => {
    return lessonRecords.filter((record) => {
      if (lessonTypeFilter && record.lessonTypeId !== lessonTypeFilter) return false;
      if (!matchesStoreFilter(record, storeFilter)) return false;
      return true;
    });
  }, [lessonRecords, lessonTypeFilter, storeFilter]);

  const sortedRecords = useMemo(
    () => [...filteredRecords].sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime()),
    [filteredRecords]
  );

  const effectiveCoachId = useMemo(() => {
    if (isAdmin) return recordForm.coachId || coaches[0]?.id || "";
    return coaches.find((coach) => coach.userId === user?.id)?.id || lessonRecords[0]?.coachId || "";
  }, [isAdmin, recordForm.coachId, coaches, user?.id, lessonRecords]);

  const scheduleDay = useMemo(() => recordForm.dateStr.slice(0, 10), [recordForm.dateStr]);

  useEffect(() => {
    if (!showRecordModal) {
      setModalSchedules([]);
      return;
    }

    if (!scheduleDay) {
      setModalSchedules([]);
      return;
    }

    setModalSchedules([]);

    let cancelled = false;
    fetch(`/api/schedules?startDate=${scheduleDay}&endDate=${scheduleDay}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data: ScheduleItem[]) => {
        if (!cancelled) setModalSchedules(data);
      })
      .catch(() => {
        if (!cancelled) setModalSchedules([]);
      });

    return () => {
      cancelled = true;
    };
  }, [showRecordModal, scheduleDay]);

  useEffect(() => {
    if (!showRecordModal || recordForm.id || stores.length === 0 || !scheduleDay) return;

    const defaultStoreId = resolveDefaultStoreId(
      effectiveCoachId,
      recordForm.dateStr,
      modalSchedules,
      stores
    );

    if (!defaultStoreId) return;

    setRecordForm((prev) => (prev.storeId === defaultStoreId ? prev : { ...prev, storeId: defaultStoreId }));
  }, [
    showRecordModal,
    recordForm.id,
    scheduleDay,
    effectiveCoachId,
    modalSchedules,
    stores,
  ]);

  const openCreateModal = () => {
    const coachId = isAdmin ? coaches[0]?.id || "" : effectiveCoachId;
    const dateStr = toDateTimeLocalInput();
    setRecordForm({
      dateStr,
      lessonTypeId: lessonTypes[0]?.id || "",
      coachId,
      storeId: resolveDefaultStoreId(coachId, dateStr, [], stores),
      studentCount: 1,
    });
    setShowRecordModal(true);
  };

  const openEditModal = (record: LessonRecord) => {
    setRecordForm({
      id: record.id,
      dateStr: toDateTimeLocalInput(record.dateStr),
      lessonTypeId: record.lessonTypeId,
      coachId: record.coachId,
      storeId: record.storeId || "",
      studentCount: record.studentCount || 1,
    });
    setShowRecordModal(true);
  };

  const saveRecord = async () => {
    if (!recordForm.dateStr || !recordForm.lessonTypeId) {
      alert("请填写上课时间和课程类型");
      return;
    }
    setSavingRecord(true);
    try {
      const payload = {
        dateStr: toIsoStringFromLocal(recordForm.dateStr),
        lessonTypeId: recordForm.lessonTypeId,
        ...(recordForm.storeId ? { storeId: recordForm.storeId } : {}),
        studentCount: Math.max(1, Number(recordForm.studentCount || 1)),
        ...(isAdmin ? { coachId: recordForm.coachId } : {}),
      } as any;

      if (recordForm.id) {
        await updateLessonRecord(recordForm.id, payload);
      } else {
        await createLessonRecord(payload);
      }
      setShowRecordModal(false);
    } catch {
      alert("保存课程记录失败");
    } finally {
      setSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("确定删除这条课程记录吗？")) return;
    try {
      await deleteLessonRecord(id);
    } catch {
      alert("删除失败");
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    try {
      await createLessonType({
        name: newTypeName.trim(),
        commission: 0,
        pricingType: "PER_SESSION",
      });
      setNewTypeName("");
    } catch {
      alert("新增课程类型失败");
    }
  };

  const handleUpdateType = async () => {
    if (!editingType || !editingType.name.trim()) return;
    try {
      await updateLessonType(editingType.id, { name: editingType.name.trim() });
      setEditingType(null);
    } catch {
      alert("更新课程类型失败");
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm("确定删除这个课程类型吗？")) return;
    try {
      await deleteLessonType(id);
    } catch {
      alert("删除课程类型失败");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <TopNavMenu current="lessons" isAdmin={isAdmin} />
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowTypeModal(true)}
                className="px-3 py-2 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                课程类型配置
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增课程记录
            </button>
            <UserInfo />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">课程记录</h2>
                <p className="text-sm text-slate-500">共 {sortedRecords.length} 条</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) => updateFilters({ ...filters, startDate: e.target.value || undefined })}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                />
                <input
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) => updateFilters({ ...filters, endDate: e.target.value || undefined })}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                />
                {isAdmin && (
                  <select
                    value={filters.coachId || ""}
                    onChange={(e) => updateFilters({ ...filters, coachId: e.target.value || undefined })}
                    className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="">全部教练</option>
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.name}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={lessonTypeFilter || ""}
                  onChange={(e) => setLessonTypeFilter(e.target.value || undefined)}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">全部课程类型</option>
                  {lessonTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
                <select
                  value={storeFilter || ""}
                  onChange={(e) => setStoreFilter(e.target.value || undefined)}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">全部上课地点</option>
                  <option value={EMPTY_STORE_FILTER}>未填写地点</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isAdmin && (
            <LessonAnalytics
              records={lessonRecords}
              coaches={coaches}
              lessonTypes={lessonTypes}
              coachId={filters.coachId}
              lessonTypeId={lessonTypeFilter}
              storeFilter={storeFilter}
              startDate={filters.startDate}
              endDate={filters.endDate}
            />
          )}

          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">教练</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">上课时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">上课地点</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">课程类型</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">人数</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">加载中...</td>
                </tr>
              ) : sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">暂无课程记录</td>
                </tr>
              ) : (
                sortedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{record.coach?.name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{new Date(record.dateStr).toLocaleString("zh-CN")}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{record.store?.name ?? ""}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{record.lessonType?.name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">{record.studentCount || 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(record)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">
                {recordForm.id ? "编辑课程记录" : "新增课程记录"}
              </h3>
              <button onClick={() => setShowRecordModal(false)} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {isAdmin && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">教练</label>
                  <select
                    value={recordForm.coachId || ""}
                    onChange={(e) =>
                      setRecordForm((prev) => ({
                        ...prev,
                        coachId: e.target.value,
                        storeId: resolveDefaultStoreId(
                          e.target.value,
                          prev.dateStr,
                          modalSchedules,
                          stores
                        ),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>{coach.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-600 mb-1">上课时间</label>
                <input
                  type="datetime-local"
                  value={recordForm.dateStr}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, dateStr: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">上课地点</label>
                <select
                  value={recordForm.storeId}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, storeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="">未选择</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">课程类型</label>
                <select
                  value={recordForm.lessonTypeId}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, lessonTypeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  {lessonTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">人数</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={recordForm.studentCount}
                  onChange={(e) =>
                    setRecordForm((prev) => ({ ...prev, studentCount: Math.max(1, Number(e.target.value || 1)) }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button onClick={() => setShowRecordModal(false)} className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">
                取消
              </button>
              <button
                onClick={saveRecord}
                disabled={savingRecord}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingRecord ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTypeModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">课程类型配置</h3>
              <button onClick={() => setShowTypeModal(false)} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {lessonTypes.map((type) => (
                  <div key={type.id} className="flex items-center gap-2 border border-slate-200 rounded-md p-2">
                    {editingType?.id === type.id ? (
                      <>
                        <input
                          type="text"
                          value={editingType.name}
                          onChange={(e) => setEditingType((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                          className="flex-1 px-2 py-1.5 border border-slate-300 rounded-md text-sm"
                        />
                        <button onClick={handleUpdateType} className="px-2 py-1.5 text-sm rounded bg-blue-600 text-white">保存</button>
                        <button onClick={() => setEditingType(null)} className="px-2 py-1.5 text-sm rounded border border-slate-300">取消</button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 text-sm text-slate-700 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-slate-400" />
                          {type.name}
                        </div>
                        <button onClick={() => setEditingType(type)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteType(type.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="新增课程类型名称"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                />
                <button
                  onClick={handleCreateType}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500"
                >
                  新增
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

