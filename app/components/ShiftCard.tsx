'use client';

import { Coach } from '../types';

interface ShiftCardProps {
  coach: Coach;
  scheduleId: string;
  onRemove: (id: string) => void;
  isExtended?: boolean;
}

export default function ShiftCard({
  coach,
  scheduleId,
  onRemove,
  isExtended,
}: ShiftCardProps) {
  return (
    <div className="group flex items-center justify-between bg-white p-1.5 rounded border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-2 overflow-hidden">
        <div
          className={`w-6 h-6 rounded-full ${coach.color} flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0`}
        >
          {coach.avatar}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-700 truncate">
            {coach.name}
          </div>
          {isExtended && (
            <div className="text-[9px] text-amber-600 leading-none">加时</div>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(scheduleId)}
        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
        title="移除排班"
      >
        ✕
      </button>
    </div>
  );
}
