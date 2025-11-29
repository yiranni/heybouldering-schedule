'use client';

import { Coach, ShiftType, ScheduleItem, Store } from '../types';
import { getDayOfWeek } from '../utils/date';
import ShiftDropZone from './ShiftDropZone';

interface ScheduleCalendarProps {
  weekDays: string[];
  schedules: ScheduleItem[];
  coaches: Coach[];
  stores: Store[];
  onAddShift: (dateStr: string, type: ShiftType, coachId: string, storeId: string, shiftId?: string, shiftName?: string) => void;
  onRemoveShift: (scheduleId: string) => void;
  onOpenModal: (date: string, type: ShiftType, storeId: string, shiftId?: string, shiftName?: string) => void;
}

export default function ScheduleCalendar({
  weekDays,
  schedules,
  coaches,
  stores,
  onAddShift,
  onRemoveShift,
  onOpenModal,
}: ScheduleCalendarProps) {
  const activeStores = stores.filter(s => !s.archived);

  const getShiftData = (dateStr: string, type: ShiftType, storeId: string, shiftId?: string) => {
    // 支持新旧两种系统
    return schedules.filter((s) => {
      if (s.dateStr !== dateStr || s.storeId !== storeId) return false;

      // 如果指定了 shiftId,优先使用精确匹配
      if (shiftId && s.shiftId) {
        return s.shiftId === shiftId;
      }

      // 优先使用 shiftType(旧系统)
      if (s.shiftType) {
        return s.shiftType === type;
      }

      // 否则根据 shiftId 映射到 ShiftType(新系统)
      const shiftIdLower = s.shiftId?.toLowerCase();
      if (type === 'MORNING') {
        return shiftIdLower === 'morning';
      } else if (type === 'EVENING') {
        return shiftIdLower === 'evening';
      }

      return false;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Date Header Row */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-600">
        <div className="grid grid-cols-8 gap-px bg-slate-500">
          {/* Store name column header */}
          <div className="bg-slate-700 p-3">
            <div className="text-sm font-bold text-white">门店</div>
          </div>

          {/* Date columns */}
          {weekDays.map((dateStr) => {
            const dayOfWeek = getDayOfWeek(dateStr);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            // JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
            // Map to Chinese labels
            const dayLabel = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek];

            return (
              <div
                key={dateStr}
                className={`p-3 text-center ${
                  isWeekend ? 'bg-emerald-700' : 'bg-slate-700'
                }`}
              >
                <div className="text-xs text-slate-200 font-mono">
                  {dateStr.slice(5)}
                </div>
                <div className="text-sm font-bold text-white">
                  周{dayLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Store Rows */}
      <div className="divide-y divide-slate-200">
        {activeStores.map((store) => (
          <div key={store.id} className="grid grid-cols-8 gap-px bg-slate-200">
            {/* Store Info Column */}
            <div className="bg-white p-4 flex flex-col justify-center">
              <h3 className="text-base font-bold text-slate-800 mb-2">{store.name}</h3>
              <div className="space-y-1 text-[10px] text-slate-600">
                {/* 支持新旧两种系统 */}
                {store.shifts && store.shifts.length > 0 ? (
                  // 新系统：使用 shifts 配置
                  store.shifts.map((shift) => (
                    <div key={shift.id}>
                      {shift.name}: {shift.start}-{shift.end}
                    </div>
                  ))
                ) : (
                  // 旧系统：使用固定字段
                  <>
                    <div>早: {store.morningShiftStart}-{store.morningShiftEnd}</div>
                    <div>晚: {store.eveningShiftStart}-{store.eveningShiftEnd}</div>
                    {store.eveningExtendedEnd && (
                      <div className="text-emerald-600 font-medium">周五/六: {store.eveningExtendedEnd}</div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Day Columns */}
            {weekDays.map((dateStr) => {
              const dayOfWeek = getDayOfWeek(dateStr);
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              // 获取今天适用的班次
              const applicableShifts = (store.shifts && store.shifts.length > 0)
                ? store.shifts.filter(shift => {
                    // 如果 daysOfWeek 为空或 null,则全周适用
                    if (!shift.daysOfWeek || shift.daysOfWeek.length === 0) {
                      return true;
                    }
                    // 否则检查今天是否在适用日期中
                    return shift.daysOfWeek.includes(dayOfWeek);
                  })
                : [
                    // 旧系统回退:使用默认的早晚班
                    { id: 'morning', name: '早班', start: store.morningShiftStart || '10:00', end: store.morningShiftEnd || '20:00', daysOfWeek: null },
                    { id: 'evening', name: '晚班', start: store.eveningShiftStart || '13:00', end: store.eveningShiftEnd || '23:00', daysOfWeek: null }
                  ];

              return (
                <div
                  key={dateStr}
                  className={`bg-white p-2 min-h-[200px] ${
                    isWeekend ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="flex flex-col gap-2 h-full">
                    {/* 动态显示所有适用的班次 */}
                    {applicableShifts.map((shift) => {
                      // 将 shiftId 映射到 ShiftType (为了兼容旧系统)
                      let shiftType: ShiftType = 'MORNING';
                      if (shift.id === 'evening' || shift.id.includes('evening')) {
                        shiftType = 'EVENING';
                      } else if (shift.id === 'morning' || shift.id.includes('morning')) {
                        shiftType = 'MORNING';
                      } else {
                        // 对于自定义班次,根据时间判断是早班还是晚班
                        const startHour = parseInt(shift.start.split(':')[0]);
                        shiftType = startHour < 13 ? 'MORNING' : 'EVENING';
                      }

                      const isExtended = (dayOfWeek === 5 || dayOfWeek === 6) &&
                                        shift.id === 'evening' &&
                                        !!store.eveningExtendedEnd;

                      const shiftSchedules = getShiftData(dateStr, shiftType, store.id, shift.id);

                      return (
                        <ShiftDropZone
                          key={shift.id}
                          dateStr={dateStr}
                          type={shiftType}
                          isExtended={isExtended}
                          shifts={shiftSchedules}
                          coaches={coaches}
                          storeId={store.id}
                          shiftStart={shift.start}
                          shiftEnd={isExtended && shift.id === 'evening' ? store.eveningExtendedEnd || shift.end : shift.end}
                          shiftId={shift.id}
                          shiftName={shift.name}
                          minCoaches={shift.minCoaches}
                          maxCoaches={shift.maxCoaches}
                          onAdd={(dateStr, type, coachId, shiftId, shiftName) =>
                            onAddShift(dateStr, type, coachId, store.id, shiftId, shiftName)
                          }
                          onRemove={onRemoveShift}
                          onOpenModal={() => onOpenModal(dateStr, shiftType, store.id, shift.id, shift.name)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
