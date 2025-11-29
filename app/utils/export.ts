import { Coach, Store, ScheduleItem } from '../types';

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function exportScheduleToDoc(
  schedules: ScheduleItem[],
  coaches: Coach[],
  stores: Store[],
  weekDays: string[]
): string {
  // 按门店和日期组织排班数据 - 支持动态班次
  const scheduleByStoreAndDate: {
    [storeId: string]: {
      [date: string]: {
        [shiftId: string]: Coach[];
      };
    };
  } = {};

  // 初始化数据结构
  stores.forEach(store => {
    scheduleByStoreAndDate[store.id] = {};
    weekDays.forEach(date => {
      scheduleByStoreAndDate[store.id][date] = {};
    });
  });

  // 填充排班数据
  schedules
    .filter(s => weekDays.includes(s.dateStr))
    .forEach(schedule => {
      const coach = coaches.find(c => c.id === schedule.coachId);
      if (!coach || !scheduleByStoreAndDate[schedule.storeId]) return;

      const shiftId = schedule.shiftId || (schedule.shiftType === 'MORNING' ? 'morning' : 'evening');

      if (!scheduleByStoreAndDate[schedule.storeId][schedule.dateStr][shiftId]) {
        scheduleByStoreAndDate[schedule.storeId][schedule.dateStr][shiftId] = [];
      }

      scheduleByStoreAndDate[schedule.storeId][schedule.dateStr][shiftId].push(coach);
    });

  // 生成文档内容
  let content = `排班表\n`;
  content += `时间范围: ${weekDays[0]} 至 ${weekDays[weekDays.length - 1]}\n`;
  content += `\n${'='.repeat(50)}\n\n`;

  // 按门店输出
  stores.forEach(store => {
    content += `【${store.name}】\n`;

    // 显示班次配置
    if (store.shifts && store.shifts.length > 0) {
      // 新系统：显示所有配置的班次
      content += `班次配置:\n`;
      store.shifts.forEach(shift => {
        content += `  ${shift.name}: ${shift.start} - ${shift.end}`;
        if (shift.daysOfWeek && shift.daysOfWeek.length > 0) {
          const days = shift.daysOfWeek.map(d => WEEKDAY_NAMES[d]).join('、');
          content += ` (仅${days})`;
        }
        content += `\n`;
      });
    } else {
      // 旧系统：显示固定班次
      content += `早班时间: ${store.morningShiftStart} - ${store.morningShiftEnd}\n`;
      content += `晚班时间: ${store.eveningShiftStart} - ${store.eveningShiftEnd}`;
      if (store.eveningExtendedEnd) {
        content += ` (周五/周六延时至 ${store.eveningExtendedEnd})`;
      }
      content += `\n`;
    }
    content += `\n`;

    weekDays.forEach(date => {
      const dateObj = new Date(date);
      const weekday = WEEKDAY_NAMES[dateObj.getDay()];
      const formattedDate = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

      content += `${weekday} (${formattedDate}):\n`;

      const daySchedule = scheduleByStoreAndDate[store.id][date];

      // 获取这一天的所有班次(按时间排序)
      const dayShifts = store.shifts && store.shifts.length > 0
        ? store.shifts
            .filter(shift => {
              // 检查班次是否在这一天适用
              if (!shift.daysOfWeek || shift.daysOfWeek.length === 0) return true;
              return shift.daysOfWeek.includes(dateObj.getDay());
            })
            .sort((a, b) => {
              const [aH, aM] = a.start.split(':').map(Number);
              const [bH, bM] = b.start.split(':').map(Number);
              return (aH * 60 + aM) - (bH * 60 + bM);
            })
        : [
            { id: 'morning', name: '早班', start: '', end: '', daysOfWeek: null },
            { id: 'evening', name: '晚班', start: '', end: '', daysOfWeek: null }
          ];

      // 输出每个班次的教练
      dayShifts.forEach(shift => {
        const shiftCoaches = daySchedule[shift.id] || [];
        const coachNames = shiftCoaches.map(c => c.name).join(' ');
        content += `  ${shift.name}: ${coachNames || '无'}\n`;
      });

      content += `\n`;
    });

    content += `${'-'.repeat(50)}\n\n`;
  });

  // 添加教练工作统计
  content += `\n${'='.repeat(50)}\n`;
  content += `教练工作统计\n\n`;

  const coachStats: {
    [coachId: string]: {
      name: string;
      shifts: number;
      days: Set<string>;
    };
  } = {};

  schedules
    .filter(s => weekDays.includes(s.dateStr))
    .forEach(schedule => {
      const coach = coaches.find(c => c.id === schedule.coachId);
      if (!coach) return;

      if (!coachStats[coach.id]) {
        coachStats[coach.id] = {
          name: coach.name,
          shifts: 0,
          days: new Set()
        };
      }

      coachStats[coach.id].shifts += 1;
      coachStats[coach.id].days.add(schedule.dateStr);
    });

  Object.values(coachStats)
    .sort((a, b) => b.shifts - a.shifts)
    .forEach(stat => {
      const restDays = 7 - stat.days.size;
      content += `${stat.name}: ${stat.shifts}个班次, 工作${stat.days.size}天, 休息${restDays}天\n`;
    });

  return content;
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
