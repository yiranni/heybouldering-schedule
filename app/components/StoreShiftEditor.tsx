'use client';

import { useState, useRef } from 'react';
import { Plus, X, Trash2, GripVertical } from 'lucide-react';
import { Shift } from '../types';

interface StoreShiftEditorProps {
  shifts: Shift[];
  onChange: (shifts: Shift[]) => void;
}

const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

export default function StoreShiftEditor({ shifts, onChange }: StoreShiftEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // 添加延迟以确保拖拽效果正确显示
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const newShifts = [...shifts];
    const [draggedItem] = newShifts.splice(draggedIndex, 1);
    newShifts.splice(dropIndex, 0, draggedItem);
    onChange(newShifts);

    // 更新 editingIndex 如果需要
    if (editingIndex !== null) {
      if (editingIndex === draggedIndex) {
        setEditingIndex(dropIndex);
      } else if (draggedIndex < editingIndex && dropIndex >= editingIndex) {
        setEditingIndex(editingIndex - 1);
      } else if (draggedIndex > editingIndex && dropIndex <= editingIndex) {
        setEditingIndex(editingIndex + 1);
      }
    }

    handleDragEnd();
  };

  const addShift = () => {
    const newShift: Shift = {
      id: `shift_${Date.now()}`,
      name: '新班次',
      start: '09:00',
      end: '18:00',
      daysOfWeek: null, // 全周适用
      minCoaches: 1,
      maxCoaches: 2,
    };
    onChange([...shifts, newShift]);
    setEditingIndex(shifts.length);
  };

  const updateShift = (index: number, updates: Partial<Shift>) => {
    const newShifts = [...shifts];
    newShifts[index] = { ...newShifts[index], ...updates };
    onChange(newShifts);
  };

  const deleteShift = (index: number) => {
    if (!confirm('确定删除这个班次吗？')) return;
    const newShifts = shifts.filter((_, i) => i !== index);
    onChange(newShifts);
    if (editingIndex === index) setEditingIndex(null);
  };

  const toggleDayOfWeek = (index: number, day: number) => {
    const shift = shifts[index];
    let newDaysOfWeek: number[] | null;

    if (shift.daysOfWeek === null || shift.daysOfWeek === undefined) {
      // 从全周改为只选择这一天以外的其他天
      newDaysOfWeek = WEEKDAYS.map(d => d.value).filter(d => d !== day);
    } else {
      const currentDays = [...shift.daysOfWeek];
      if (currentDays.includes(day)) {
        // 移除这一天
        newDaysOfWeek = currentDays.filter(d => d !== day);
        // 如果选中了所有天，设为null
        if (newDaysOfWeek.length === 7) {
          newDaysOfWeek = null;
        }
      } else {
        // 添加这一天
        newDaysOfWeek = [...currentDays, day].sort();
        // 如果选中了所有天，设为null
        if (newDaysOfWeek.length === 7) {
          newDaysOfWeek = null;
        }
      }
    }

    updateShift(index, { daysOfWeek: newDaysOfWeek });
  };

  const isDaySelected = (shift: Shift, day: number) => {
    if (shift.daysOfWeek === null || shift.daysOfWeek === undefined) {
      return true; // 全周适用
    }
    return shift.daysOfWeek.includes(day);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-slate-600 font-medium">班次配置</label>
        <button
          onClick={addShift}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          添加班次
        </button>
      </div>

      {shifts.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-300 rounded">
          暂无班次，点击上方按钮添加
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift, index) => (
            <div
              key={shift.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`border rounded-lg p-3 transition-all ${
                editingIndex === index
                  ? 'border-blue-300 bg-blue-50'
                  : dragOverIndex === index
                  ? 'border-emerald-400 bg-emerald-50 border-dashed'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${draggedIndex === index ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-2">
                <div className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0 hover:text-slate-600" />
                </div>

                <div className="flex-1 space-y-2">
                  {/* 班次名称 */}
                  <div>
                    <input
                      type="text"
                      value={shift.name}
                      onChange={(e) => updateShift(index, { name: e.target.value })}
                      onFocus={() => setEditingIndex(index)}
                      className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="班次名称"
                    />
                  </div>

                  {/* 时间段 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 mb-0.5 block">开始时间</label>
                      <input
                        type="time"
                        value={shift.start}
                        onChange={(e) => updateShift(index, { start: e.target.value })}
                        onFocus={() => setEditingIndex(index)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-0.5 block">结束时间</label>
                      <input
                        type="time"
                        value={shift.end}
                        onChange={(e) => updateShift(index, { end: e.target.value })}
                        onFocus={() => setEditingIndex(index)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 教练人数配置 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 mb-0.5 block">最少教练数</label>
                      <input
                        type="number"
                        min="1"
                        max={shift.maxCoaches || 10}
                        value={shift.minCoaches ?? 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateShift(index, { minCoaches: Math.max(1, val) });
                        }}
                        onFocus={() => setEditingIndex(index)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-0.5 block">最多教练数</label>
                      <input
                        type="number"
                        min={shift.minCoaches || 1}
                        max="10"
                        value={shift.maxCoaches ?? 2}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 2;
                          updateShift(index, { maxCoaches: Math.max(shift.minCoaches || 1, val) });
                        }}
                        onFocus={() => setEditingIndex(index)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 工作日选择 */}
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">
                      适用日期 {(shift.daysOfWeek === null || shift.daysOfWeek === undefined) && '(全周)'}
                    </label>
                    <div className="flex gap-1">
                      {WEEKDAYS.map((weekday) => (
                        <button
                          key={weekday.value}
                          onClick={() => toggleDayOfWeek(index, weekday.value)}
                          className={`flex-1 px-1 py-1 text-[10px] rounded transition-colors ${
                            isDaySelected(shift, weekday.value)
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                          }`}
                        >
                          {weekday.label.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteShift(index)}
                  className="p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                  title="删除班次"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-[10px] text-slate-500 bg-blue-50 p-2 rounded mt-2">
        💡 提示：拖拽左侧图标可调整班次顺序，每个班次可以设置不同的时间段和适用日期
      </div>
    </div>
  );
}
