'use client';

import { Coach, ShiftType, ScheduleItem } from '../types';

interface ShiftModalProps {
  slot: { date: string; type: ShiftType; storeId: string; shiftId?: string; shiftName?: string } | null;
  coaches: Coach[];
  schedules: ScheduleItem[];
  onClose: () => void;
  onAddShift: (dateStr: string, type: ShiftType, coachId: string, storeId: string, shiftId?: string, shiftName?: string) => void;
}

export default function ShiftModal({
  slot,
  coaches,
  schedules,
  onClose,
  onAddShift,
}: ShiftModalProps) {
  if (!slot) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm m-4 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            调整排班: {slot.date.slice(5)} {slot.shiftName || (slot.type === 'MORNING' ? '早班' : '晚班')}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {coaches.map((coach) => {
            // 检查该教练是否已经在当前班次
            const isAssigned = schedules.some((s) => {
              if (s.dateStr !== slot.date || s.coachId !== coach.id || s.storeId !== slot.storeId) {
                return false;
              }

              // 如果有精确的 shiftId，优先使用精确匹配
              if (slot.shiftId && s.shiftId) {
                return s.shiftId === slot.shiftId;
              }

              // 支持新旧两种系统
              if (s.shiftType) {
                return s.shiftType === slot.type;
              }

              // 使用 shiftId 映射
              const shiftIdLower = s.shiftId?.toLowerCase();
              if (slot.type === 'MORNING') {
                return shiftIdLower === 'morning';
              } else if (slot.type === 'EVENING') {
                return shiftIdLower === 'evening';
              }

              return false;
            });
            const isWorkingSameDayAtThisStore = schedules.some(
              (s) => s.dateStr === slot.date && s.coachId === coach.id && s.storeId === slot.storeId
            );
            const isWorkingAtDifferentStore = schedules.some(
              (s) => s.dateStr === slot.date && s.coachId === coach.id && s.storeId !== slot.storeId
            );

            return (
              <button
                key={coach.id}
                disabled={isAssigned || isWorkingAtDifferentStore}
                onClick={() => onAddShift(slot.date, slot.type, coach.id, slot.storeId, slot.shiftId, slot.shiftName)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                  isAssigned || isWorkingAtDifferentStore
                    ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                    : 'hover:bg-emerald-50 hover:border-emerald-200 border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full ${coach.color} text-white flex items-center justify-center text-xs`}
                  >
                    {coach.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{coach.name}</div>
                  </div>
                </div>
                {isWorkingAtDifferentStore && (
                  <span className="text-[10px] px-2 py-1 bg-red-100 text-red-700 rounded-full">
                    他店排班
                  </span>
                )}
                {isWorkingSameDayAtThisStore && !isAssigned && (
                  <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                    已排班
                  </span>
                )}
                {isAssigned && (
                  <span className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                    当前
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
