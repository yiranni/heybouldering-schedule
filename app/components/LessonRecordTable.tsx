'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Check,
  X,
  Calendar,
  ChevronDown,
  Filter,
  Search,
} from 'lucide-react';
import { LessonRecord, LessonRecordFilters, Coach, LessonType } from '../types';

type EditingRecord = {
  id: string | null; // null for new record
  dateStr: string;
  lessonTypeId: string;
  coachId: string;
  note: string;
};

type Props = {
  lessonRecords: LessonRecord[];
  coaches: Coach[];
  lessonTypes: LessonType[];
  filters: LessonRecordFilters;
  loading: boolean;
  onUpdateFilters: (filters: LessonRecordFilters) => void;
  onCreateRecord: (record: Omit<LessonRecord, 'id' | 'lessonType' | 'coach'>) => Promise<LessonRecord>;
  onUpdateRecord: (id: string, updates: Partial<Omit<LessonRecord, 'id' | 'lessonType' | 'coach'>>) => Promise<LessonRecord>;
  onDeleteRecord: (id: string) => Promise<void>;
};

export default function LessonRecordTable({
  lessonRecords,
  coaches,
  lessonTypes,
  filters,
  loading,
  onUpdateFilters,
  onCreateRecord,
  onUpdateRecord,
  onDeleteRecord,
}: Props) {
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);
  const [showLessonTypeDropdown, setShowLessonTypeDropdown] = useState(false);
  const [showFilterCoachDropdown, setShowFilterCoachDropdown] = useState(false);
  const [showFilterLessonTypeDropdown, setShowFilterLessonTypeDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const coachDropdownRef = useRef<HTMLDivElement>(null);
  const lessonTypeDropdownRef = useRef<HTMLDivElement>(null);
  const filterCoachDropdownRef = useRef<HTMLDivElement>(null);
  const filterLessonTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (coachDropdownRef.current && !coachDropdownRef.current.contains(event.target as Node)) {
        setShowCoachDropdown(false);
      }
      if (lessonTypeDropdownRef.current && !lessonTypeDropdownRef.current.contains(event.target as Node)) {
        setShowLessonTypeDropdown(false);
      }
      if (filterCoachDropdownRef.current && !filterCoachDropdownRef.current.contains(event.target as Node)) {
        setShowFilterCoachDropdown(false);
      }
      if (filterLessonTypeDropdownRef.current && !filterLessonTypeDropdownRef.current.contains(event.target as Node)) {
        setShowFilterLessonTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startAddNew = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingRecord({
      id: null,
      dateStr: today,
      lessonTypeId: lessonTypes[0]?.id || '',
      coachId: coaches[0]?.id || '',
      note: '',
    });
  };

  const startEdit = (record: LessonRecord) => {
    setEditingRecord({
      id: record.id,
      dateStr: record.dateStr,
      lessonTypeId: record.lessonTypeId,
      coachId: record.coachId,
      note: record.note || '',
    });
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setShowDatePicker(false);
    setShowCoachDropdown(false);
    setShowLessonTypeDropdown(false);
  };

  const saveRecord = async () => {
    if (!editingRecord) return;
    if (!editingRecord.dateStr || !editingRecord.lessonTypeId || !editingRecord.coachId) {
      return;
    }

    setSaving(true);
    try {
      if (editingRecord.id === null) {
        await onCreateRecord({
          dateStr: editingRecord.dateStr,
          lessonTypeId: editingRecord.lessonTypeId,
          coachId: editingRecord.coachId,
          note: editingRecord.note || null,
        });
      } else {
        await onUpdateRecord(editingRecord.id, {
          dateStr: editingRecord.dateStr,
          lessonTypeId: editingRecord.lessonTypeId,
          coachId: editingRecord.coachId,
          note: editingRecord.note || null,
        });
      }
      setEditingRecord(null);
    } catch (error) {
      console.error('Failed to save record:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await onDeleteRecord(id);
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
  };

  const getCoachName = (coachId: string) => {
    const coach = coaches.find((c) => c.id === coachId);
    return coach?.name || '未知教练';
  };

  const getLessonTypeName = (lessonTypeId: string) => {
    const lessonType = lessonTypes.find((lt) => lt.id === lessonTypeId);
    return lessonType?.name || '未知课程';
  };

  const getCoachColor = (coachId: string) => {
    const coach = coaches.find((c) => c.id === coachId);
    return coach?.color || '#6b7280';
  };

  // Calculate summary stats
  const totalRecords = lessonRecords.length;
  const totalCommission = lessonRecords.reduce((sum, record) => {
    return sum + (record.lessonType?.commission || 0);
  }, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">课程记录</h2>
              <p className="text-sm text-slate-500">
                共 {totalRecords} 条记录，总提成 ¥{totalCommission.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              筛选
            </button>
            <button
              onClick={startAddNew}
              disabled={editingRecord !== null}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              添加记录
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">日期范围:</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) =>
                  onUpdateFilters({ ...filters, startDate: e.target.value || undefined })
                }
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-slate-400">至</span>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) =>
                  onUpdateFilters({ ...filters, endDate: e.target.value || undefined })
                }
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Coach Filter */}
            <div className="relative" ref={filterCoachDropdownRef}>
              <label className="text-sm text-slate-600 font-medium mr-2">教练:</label>
              <button
                onClick={() => setShowFilterCoachDropdown(!showFilterCoachDropdown)}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {filters.coachId ? getCoachName(filters.coachId) : '全部教练'}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {showFilterCoachDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onUpdateFilters({ ...filters, coachId: undefined });
                      setShowFilterCoachDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    全部教练
                  </button>
                  {coaches.map((coach) => (
                    <button
                      key={coach.id}
                      onClick={() => {
                        onUpdateFilters({ ...filters, coachId: coach.id });
                        setShowFilterCoachDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: coach.color }}
                      />
                      {coach.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lesson Type Filter */}
            <div className="relative" ref={filterLessonTypeDropdownRef}>
              <label className="text-sm text-slate-600 font-medium mr-2">课程类型:</label>
              <button
                onClick={() => setShowFilterLessonTypeDropdown(!showFilterLessonTypeDropdown)}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {filters.lessonTypeId ? getLessonTypeName(filters.lessonTypeId) : '全部类型'}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {showFilterLessonTypeDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onUpdateFilters({ ...filters, lessonTypeId: undefined });
                      setShowFilterLessonTypeDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    全部类型
                  </button>
                  {lessonTypes.map((lt) => (
                    <button
                      key={lt.id}
                      onClick={() => {
                        onUpdateFilters({ ...filters, lessonTypeId: lt.id });
                        setShowFilterLessonTypeDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      {lt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {(filters.startDate || filters.endDate || filters.coachId || filters.lessonTypeId) && (
              <button
                onClick={() => onUpdateFilters({})}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-visible">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                课程类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                教练
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                提成
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                备注
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* New Record Row */}
            {editingRecord?.id === null && (
              <tr className="bg-emerald-50">
                <td className="px-6 py-3">
                  <div className="relative" ref={datePickerRef}>
                    <input
                      type="date"
                      value={editingRecord.dateStr}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, dateStr: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="relative" ref={lessonTypeDropdownRef}>
                    <button
                      onClick={() => setShowLessonTypeDropdown(!showLessonTypeDropdown)}
                      className="w-full flex items-center justify-between px-3 py-1.5 border border-emerald-300 rounded-lg text-sm bg-white hover:bg-slate-50"
                    >
                      <span>{getLessonTypeName(editingRecord.lessonTypeId)}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                    {showLessonTypeDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 max-h-48 overflow-y-auto">
                        {lessonTypes.map((lt) => (
                          <button
                            key={lt.id}
                            onClick={() => {
                              setEditingRecord({ ...editingRecord, lessonTypeId: lt.id });
                              setShowLessonTypeDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            {lt.name} (¥{lt.commission})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="relative" ref={coachDropdownRef}>
                    <button
                      onClick={() => setShowCoachDropdown(!showCoachDropdown)}
                      className="w-full flex items-center justify-between px-3 py-1.5 border border-emerald-300 rounded-lg text-sm bg-white hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCoachColor(editingRecord.coachId) }}
                        />
                        {getCoachName(editingRecord.coachId)}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                    {showCoachDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 max-h-48 overflow-y-auto">
                        {coaches.map((coach) => (
                          <button
                            key={coach.id}
                            onClick={() => {
                              setEditingRecord({ ...editingRecord, coachId: coach.id });
                              setShowCoachDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: coach.color }}
                            />
                            {coach.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  ¥{lessonTypes.find((lt) => lt.id === editingRecord.lessonTypeId)?.commission?.toFixed(2) || '0.00'}
                </td>
                <td className="px-6 py-3">
                  <input
                    type="text"
                    value={editingRecord.note}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, note: e.target.value })
                    }
                    placeholder="添加备注..."
                    className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={saveRecord}
                      disabled={saving}
                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Loading State */}
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    <span className="text-slate-500">加载中...</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty State */}
            {!loading && lessonRecords.length === 0 && editingRecord?.id !== null && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500">暂无课程记录</p>
                    <button
                      onClick={startAddNew}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                    >
                      添加第一条记录
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {!loading &&
              lessonRecords.map((record) => (
                <tr
                  key={record.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    editingRecord?.id === record.id ? 'bg-amber-50' : ''
                  }`}
                >
                  {editingRecord?.id === record.id ? (
                    // Editing Mode
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="date"
                          value={editingRecord.dateStr}
                          onChange={(e) =>
                            setEditingRecord({ ...editingRecord, dateStr: e.target.value })
                          }
                          className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="relative" ref={lessonTypeDropdownRef}>
                          <button
                            onClick={() => setShowLessonTypeDropdown(!showLessonTypeDropdown)}
                            className="w-full flex items-center justify-between px-3 py-1.5 border border-amber-300 rounded-lg text-sm bg-white hover:bg-slate-50"
                          >
                            <span>{getLessonTypeName(editingRecord.lessonTypeId)}</span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          </button>
                          {showLessonTypeDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 max-h-48 overflow-y-auto">
                              {lessonTypes.map((lt) => (
                                <button
                                  key={lt.id}
                                  onClick={() => {
                                    setEditingRecord({ ...editingRecord, lessonTypeId: lt.id });
                                    setShowLessonTypeDropdown(false);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                                >
                                  {lt.name} (¥{lt.commission})
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="relative" ref={coachDropdownRef}>
                          <button
                            onClick={() => setShowCoachDropdown(!showCoachDropdown)}
                            className="w-full flex items-center justify-between px-3 py-1.5 border border-amber-300 rounded-lg text-sm bg-white hover:bg-slate-50"
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getCoachColor(editingRecord.coachId) }}
                              />
                              {getCoachName(editingRecord.coachId)}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          </button>
                          {showCoachDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 max-h-48 overflow-y-auto">
                              {coaches.map((coach) => (
                                <button
                                  key={coach.id}
                                  onClick={() => {
                                    setEditingRecord({ ...editingRecord, coachId: coach.id });
                                    setShowCoachDropdown(false);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: coach.color }}
                                  />
                                  {coach.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        ¥{lessonTypes.find((lt) => lt.id === editingRecord.lessonTypeId)?.commission?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editingRecord.note}
                          onChange={(e) =>
                            setEditingRecord({ ...editingRecord, note: e.target.value })
                          }
                          placeholder="添加备注..."
                          className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={saveRecord}
                            disabled={saving}
                            className="p-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // Display Mode
                    <>
                      <td className="px-6 py-3">
                        <span className="text-sm text-slate-700">{formatDate(record.dateStr)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {record.lessonType?.name || getLessonTypeName(record.lessonTypeId)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: record.coach?.color || getCoachColor(record.coachId),
                            }}
                          />
                          <span className="text-sm text-slate-700">
                            {record.coach?.name || getCoachName(record.coachId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm font-medium text-emerald-600">
                          ¥{record.lessonType?.commission?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-slate-500">{record.note || '-'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(record)}
                            disabled={editingRecord !== null}
                            className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

