'use client';

import { Coach } from '../types';

interface ShiftCardProps {
  coach: Coach;
  scheduleId: string;
  onRemove: (id: string) => void;
  isExtended?: boolean;
  canEdit: boolean;
  needsLesson?: boolean;
  onToggleNeedsLesson?: (scheduleId: string) => void;
}

export default function ShiftCard({
  coach,
  scheduleId,
  onRemove,
  isExtended,
  canEdit,
  needsLesson = false,
  onToggleNeedsLesson,
}: ShiftCardProps) {
  const showLessonBadge = canEdit || needsLesson;

  return (
    <div className="group flex items-center gap-1">
      {showLessonBadge && (
        <button
          type="button"
          onClick={() => onToggleNeedsLesson?.(scheduleId)}
          disabled={!canEdit}
          className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
            needsLesson
              ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
              : canEdit
              ? 'bg-white border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500'
              : 'bg-white border-slate-200 text-slate-300'
          }`}
          title={needsLesson ? '当天需要上课' : '标注上课'}
        >
          <span className="leading-none relative -top-0.5">课</span>
        </button>
      )}
      <div className="relative flex-1 min-w-0 bg-white px-1.5 py-1 rounded border border-slate-100 shadow-sm hover:shadow-md transition-all">
        <div className={`flex items-center gap-1.5 ${canEdit ? 'pr-4' : ''}`}>
          <div
            className={`w-5 h-5 rounded-full ${coach.color} flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0`}
          >
            {coach.avatar}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-700 whitespace-nowrap">
              {coach.name}
            </div>
            {isExtended && (
              <div className="text-[9px] text-amber-600 leading-none">加时</div>
            )}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => onRemove(scheduleId)}
            className="absolute top-0.5 right-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 leading-none"
            title="移除排班"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
