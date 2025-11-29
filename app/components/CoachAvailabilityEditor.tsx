'use client';

import { useState, useMemo } from 'react';
import { Coach, DayShiftAvailability, Shift } from '../types';
import { Calendar } from 'lucide-react';

interface CoachAvailabilityEditorProps {
  coach: Coach;
  onUpdate: (id: string, updates: Partial<Coach>) => Promise<void>;
}

const DAYS_OF_WEEK = [
  { value: 1, label: '周一', shortLabel: '一' },
  { value: 2, label: '周二', shortLabel: '二' },
  { value: 3, label: '周三', shortLabel: '三' },
  { value: 4, label: '周四', shortLabel: '四' },
  { value: 5, label: '周五', shortLabel: '五' },
  { value: 6, label: '周六', shortLabel: '六' },
  { value: 0, label: '周日', shortLabel: '日' },
];

export default function CoachAvailabilityEditor({ coach, onUpdate }: CoachAvailabilityEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  // 获取教练所有门店的所有班次
  const allShifts = useMemo(() => {
    const shiftsMap = new Map<string, Shift>();

    console.log(`[CoachAvailabilityEditor] ${coach.name} 的门店:`, coach.stores?.map(cs => cs.store.name));

    coach.stores?.forEach(cs => {
      console.log(`  门店 ${cs.store.name} 的班次:`, cs.store.shifts?.map(s => s.name));
      cs.store.shifts?.forEach(shift => {
        if (!shiftsMap.has(shift.id)) {
          shiftsMap.set(shift.id, shift);
        }
      });
    });

    const shifts = Array.from(shiftsMap.values());
    console.log(`[CoachAvailabilityEditor] ${coach.name} 可用的所有班次:`, shifts.map(s => `${s.name}(${s.id})`));

    return shifts;
  }, [coach.stores, coach.name]);

  // 初始化每天的班次配置
  const getInitialWeekSchedule = () => {
    if (coach.availability?.weekSchedule) {
      return { ...coach.availability.weekSchedule };
    }
    // 默认全部可用
    const schedule: { [key: number]: DayShiftAvailability } = {};
    [0, 1, 2, 3, 4, 5, 6].forEach(day => {
      const dayConfig: DayShiftAvailability = {};
      // 为所有班次设置默认值为true
      allShifts.forEach(shift => {
        dayConfig[shift.id] = true;
      });
      schedule[day] = dayConfig;
    });
    return schedule;
  };

  const [weekSchedule, setWeekSchedule] = useState<{ [key: number]: DayShiftAvailability }>(
    getInitialWeekSchedule()
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleDayShift = (day: number, shiftId: string) => {
    setWeekSchedule(prev => {
      const newSchedule = { ...prev };

      if (!newSchedule[day]) {
        // 如果这天不存在，创建它并设置指定班次为可用
        const dayConfig: DayShiftAvailability = {};
        dayConfig[shiftId] = true;
        newSchedule[day] = dayConfig;
      } else {
        // 切换指定班次
        const currentDay = { ...newSchedule[day] };
        currentDay[shiftId] = !currentDay[shiftId];

        // 如果所有班次都不可用，删除这一天
        const hasAnyShift = Object.values(currentDay).some(val => val === true);
        if (!hasAnyShift) {
          delete newSchedule[day];
        } else {
          newSchedule[day] = currentDay;
        }
      }

      return newSchedule;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log(`[CoachAvailabilityEditor] 保存 ${coach.name} 的可用性:`, weekSchedule);
      // 更新 availability 对象
      await onUpdate(coach.id, {
        availability: {
          weekSchedule
        }
      });
      console.log(`[CoachAvailabilityEditor] ${coach.name} 可用性保存成功`);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update availability:', error);
      alert('更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setWeekSchedule(getInitialWeekSchedule());
    setIsEditing(false);
  };

  if (!isEditing) {
    const currentSchedule = coach.availability?.weekSchedule || {};
    const hasSchedule = Object.keys(currentSchedule).length > 0;

    // 生成简洁的描述
    const getScheduleDescription = () => {
      if (!hasSchedule) {
        return `全周可工作 (${allShifts.map(s => s.name).join('/')})`;
      }

      const days = DAYS_OF_WEEK.filter(d => currentSchedule[d.value]);
      if (days.length === 0) {
        return '未设置可用时间';
      }

      return days.map(d => {
        const day = currentSchedule[d.value];
        const shifts: string[] = [];

        // 检查新格式（使用班次ID）
        allShifts.forEach(shift => {
          if (day[shift.id] === true) {
            shifts.push(shift.name.charAt(0)); // 取班次名称首字符
          }
        });

        // 兼容旧格式
        if (shifts.length === 0) {
          if ((day as any).canWorkMorning) shifts.push('早');
          if ((day as any).canWorkEvening) shifts.push('晚');
        }

        return `${d.shortLabel}:${shifts.join('/')}`;
      }).join(' ');
    };

    return (
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3 h-3" />
          <span className="font-mono">{getScheduleDescription()}</span>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          编辑可工作时间
        </button>
      </div>
    );
  }

  // 班次颜色映射
  const getShiftColor = (shiftId: string) => {
    if (shiftId === 'morning') return { active: 'bg-amber-500', inactive: 'bg-slate-200' };
    if (shiftId === 'evening') return { active: 'bg-indigo-500', inactive: 'bg-slate-200' };
    return { active: 'bg-purple-500', inactive: 'bg-slate-200' }; // 自定义班次使用紫色
  };

  return (
    <div className="mt-2 p-3 bg-slate-50 rounded-md space-y-3">
      <div className="text-xs font-medium text-slate-700 mb-2">每天可上的班次</div>

      <div className="space-y-1.5">
        {DAYS_OF_WEEK.map((day) => {
          const dayConfig = weekSchedule[day.value];

          // 过滤出适用于当天的班次
          const applicableShifts = allShifts.filter(shift => {
            // 如果 daysOfWeek 为空或 null，则全周适用
            if (!shift.daysOfWeek || shift.daysOfWeek.length === 0) {
              return true;
            }
            // 否则检查今天是否在适用日期中
            return shift.daysOfWeek.includes(day.value);
          });

          const hasAnyShift = dayConfig && Object.values(dayConfig).some(val => val === true);

          return (
            <div key={day.value} className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-12 flex-shrink-0">{day.label}</span>
              <div className="flex gap-1 flex-wrap">
                {applicableShifts.map(shift => {
                  const isActive = dayConfig?.[shift.id] === true;
                  const colors = getShiftColor(shift.id);

                  return (
                    <button
                      key={shift.id}
                      onClick={() => toggleDayShift(day.value, shift.id)}
                      className={`px-2 py-1 text-[10px] rounded transition-colors ${
                        isActive
                          ? `${colors.active} text-white`
                          : `${colors.inactive} text-slate-400`
                      }`}
                      title={`${shift.name} (${shift.start}-${shift.end})`}
                    >
                      {shift.name}
                    </button>
                  );
                })}
              </div>
              {applicableShifts.length === 0 && (
                <span className="text-[10px] text-slate-400 ml-auto">本店无班次</span>
              )}
              {applicableShifts.length > 0 && !hasAnyShift && (
                <span className="text-[10px] text-slate-400 ml-auto">休息</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-500 bg-blue-50 p-2 rounded">
        💡 点击班次按钮切换该天的可用性。如果某天所有班次都不选，表示该天休息。
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs rounded font-medium"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="flex-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs rounded border border-slate-300 font-medium"
        >
          取消
        </button>
      </div>
    </div>
  );
}
