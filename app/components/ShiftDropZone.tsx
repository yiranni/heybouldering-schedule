"use client";

import { useState } from "react";
import { Sun, Moon, Clock, MoreHorizontal } from "lucide-react";
import { Coach, ShiftType, ScheduleItem } from "../types";
import { HOURS_CONFIG } from "../constants";
import ShiftCard from "./ShiftCard";
import EmptySlot from "./EmptySlot";

interface ShiftDropZoneProps {
  dateStr: string;
  type: ShiftType;
  isExtended: boolean;
  shifts: ScheduleItem[];
  coaches: Coach[];
  storeId: string;
  shiftStart?: string;
  shiftEnd?: string;
  shiftId?: string; // 新增:实际的班次ID
  shiftName?: string; // 新增:班次名称
  minCoaches?: number; // 最少需要的教练数
  maxCoaches?: number; // 最多需要的教练数
  onAdd: (
    dateStr: string,
    type: ShiftType,
    coachId: string,
    shiftId?: string,
    shiftName?: string
  ) => void;
  onRemove: (scheduleId: string) => void;
  onOpenModal: () => void;
}

export default function ShiftDropZone({
  dateStr,
  type,
  isExtended,
  shifts,
  coaches,
  storeId,
  shiftStart,
  shiftEnd,
  shiftId,
  shiftName,
  minCoaches,
  maxCoaches,
  onAdd,
  onRemove,
  onOpenModal,
}: ShiftDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const coachId = e.dataTransfer.getData("coachId");
    if (coachId) {
      onAdd(dateStr, type, coachId, shiftId, shiftName);
    }
  };

  return (
    <div
      className={`flex-1 rounded-lg p-2 border relative group/slot transition-all duration-200
                ${
                  type === "MORNING"
                    ? isDragOver
                      ? "bg-sky-100 border-sky-400 border-dashed"
                      : "bg-sky-50 border-sky-100"
                    : isExtended
                    ? isDragOver
                      ? "bg-indigo-100 border-indigo-400 border-dashed"
                      : "bg-indigo-50 border-indigo-100"
                    : isDragOver
                    ? "bg-slate-100 border-slate-400 border-dashed"
                    : "bg-slate-50 border-slate-100"
                }
            `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col mb-2 pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto">
          <div
            className={`flex items-center gap-1 ${
              type === "MORNING"
                ? "text-sky-700"
                : isExtended
                ? "text-indigo-700"
                : "text-slate-600"
            }`}
          >
            <span className="text-xs font-bold">
              {shiftName ||
                (type === "MORNING" ? "早班" : `晚班${isExtended ? "★" : ""}`)}
            </span>
          </div>
          <button
            onClick={onOpenModal}
            className={`opacity-0 group-hover/slot:opacity-100 transition-opacity ${
              type === "MORNING"
                ? "text-sky-400 hover:text-sky-600"
                : "text-indigo-400 hover:text-indigo-600"
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`text-[10px] flex items-center gap-1 ${
              type === "MORNING"
                ? "text-sky-500"
                : isExtended
                ? "text-indigo-500 font-medium"
                : "text-slate-400"
            }`}
          >
            {shiftStart && shiftEnd
              ? `${shiftStart}-${shiftEnd}`
              : type === "MORNING"
              ? `${HOURS_CONFIG.MORNING.start}-${HOURS_CONFIG.MORNING.end}`
              : isExtended
              ? `${HOURS_CONFIG.EVENING_EXTENDED.start}-${HOURS_CONFIG.EVENING_EXTENDED.end}`
              : `${HOURS_CONFIG.EVENING.start}-${HOURS_CONFIG.EVENING.end}`}
          </div>
          {(minCoaches !== undefined || maxCoaches !== undefined) && (
            <div
              className={`text-[9px] px-1.5 py-0.5 rounded ${
                shifts.length < (minCoaches || 1)
                  ? 'bg-red-100 text-red-600 font-medium'
                  : shifts.length >= (maxCoaches || 2)
                  ? 'bg-green-100 text-green-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
              title={`需要 ${minCoaches || 1}-${maxCoaches || 2} 人`}
            >
              {shifts.length}/{minCoaches !== maxCoaches ? `${minCoaches || 1}-${maxCoaches || 2}` : (maxCoaches || 2)}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1.5 min-h-[30px]">
        {shifts.map((s) => {
          const c = coaches.find((coach) => coach.id === s.coachId);
          if (!c) return null;
          return (
            <ShiftCard
              key={s.id}
              coach={c}
              scheduleId={s.id}
              onRemove={onRemove}
              isExtended={isExtended}
            />
          );
        })}
        {shifts.length === 0 && <EmptySlot isDragOver={isDragOver} />}
      </div>
    </div>
  );
}
