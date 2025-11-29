import { Coach, ScheduleItem, Store, Shift } from '../types';

// 时间段类型
type TimeRange = {
  start: number; // 分钟数（从0点开始）
  end: number;
};

// 将时间字符串转换为分钟数
const timeToMinutes = (time: string): number => {
  const [hour, min] = time.split(':').map(Number);
  return hour * 60 + min;
};

// 将班次转换为时间段，处理跨午夜的情况
const shiftToTimeRange = (shift: Shift): TimeRange => {
  const start = timeToMinutes(shift.start);
  let end = timeToMinutes(shift.end);

  // 如果结束时间小于开始时间，说明跨午夜（如 14:00-01:00）
  if (end < start) {
    end += 24 * 60; // 加上24小时
  }

  return { start, end };
};

// 合并重叠的时间段，返回总工作时长（小时）
const mergeTimeRangesAndCalculateDuration = (ranges: TimeRange[]): number => {
  if (ranges.length === 0) return 0;
  if (ranges.length === 1) {
    return (ranges[0].end - ranges[0].start) / 60;
  }

  // 按开始时间排序
  const sorted = [...ranges].sort((a, b) => a.start - b.start);

  // 合并重叠的时间段
  const merged: TimeRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      // 有重叠，合并
      last.end = Math.max(last.end, current.end);
    } else {
      // 无重叠，添加新段
      merged.push(current);
    }
  }

  // 计算总时长
  const totalMinutes = merged.reduce((sum, range) => sum + (range.end - range.start), 0);
  return totalMinutes / 60;
};

// 检查班次是否在指定日期适用
const isShiftApplicableOnDate = (shift: Shift, dateStr: string): boolean => {
  if (!shift.daysOfWeek || shift.daysOfWeek.length === 0) {
    return true; // 全周适用
  }

  const dayOfWeek = new Date(dateStr).getDay();
  return shift.daysOfWeek.includes(dayOfWeek);
};

/**
 * 从教练池中选择指定数量的教练
 *
 * 可用性规则:
 * 1. 如果教练没有设置可用性(weekSchedule为空): 默认全天全班次可用
 * 2. 如果教练设置了可用性但某天没有配置: 该天明确不可用,不会被分配
 * 3. 如果教练某天有配置但某班次为false: 该班次不可用
 */
export const pickCoaches = (
  pool: Coach[],
  workload: Record<string, number>,
  count: number,
  excludeIds: string[],
  dateStr: string,
  workDaysMap: Record<string, Set<string>>,
  isWeekend: boolean,
  weekendDays: string[],
  shiftId: string,
  storeName: string = '',
  storeId: string = '' // 新增参数：用于判断教练是否为主门店
): Coach[] => {
  let candidates = pool.filter((c) => !excludeIds.includes(c.id));

  // 第一次过滤：严格约束
  const strictCandidates = candidates.filter((c) => {
    // 检查教练是否在这一天的这个班次可用
    const dayOfWeek = new Date(dateStr).getDay();
    const isFullTime = c.employmentType === 'FULL_TIME';

    // 如果没有设置可用性，默认全部可用
    if (!c.availability || !c.availability.weekSchedule) {
      console.log(`    ${c.name} [${isFullTime ? '全职' : '兼职'}]: 无可用性配置 -> 默认可用`);
      return true;
    }

    const daySchedule = c.availability.weekSchedule[dayOfWeek];

    // 如果这一天没有配置，表示这一天不可用
    // 对于兼职教练，这个约束更严格
    if (!daySchedule) {
      console.log(`    ${c.name} [${isFullTime ? '全职' : '兼职'}]: 该天没有配置 -> 不可用${!isFullTime ? '（兼职严格按可用性）' : ''}`);
      return false;
    }

    // 检查这个班次是否可用（使用班次ID）
    // 兼容旧格式：如果使用了 canWorkMorning/canWorkEvening
    let shiftAvailable = false;

    if (daySchedule[shiftId] !== undefined) {
      // 新格式：直接使用班次ID
      if (daySchedule[shiftId] === true) {
        console.log(`    ${c.name}: 班次 ${shiftId} 可用`);
        shiftAvailable = true;
      } else {
        console.log(`    ${c.name}: 班次 ${shiftId} 明确设为不可用 -> 不可用`);
        return false; // 明确不可用
      }
    } else {
      // 旧格式兼容：映射到 canWorkMorning/canWorkEvening
      const legacyField = shiftId === 'morning' ? 'canWorkMorning' :
                          shiftId === 'evening' ? 'canWorkEvening' : null;

      if (legacyField && (daySchedule as any)[legacyField] !== undefined) {
        if ((daySchedule as any)[legacyField] === true) {
          console.log(`    ${c.name}: 旧格式 ${legacyField} 可用`);
          shiftAvailable = true;
        } else {
          console.log(`    ${c.name}: 旧格式 ${legacyField} 不可用 -> 不可用`);
          return false;
        }
      } else {
        // 如果某天有配置，但该班次未定义，表示该班次不可用
        console.log(`    ${c.name}: 该天有配置但班次 ${shiftId} 未设置 -> 不可用`);
        return false;
      }
    }

    // 班次可用，继续检查工作天数限制
    if (!shiftAvailable) {
      return false;
    }

    const daysWorked = workDaysMap[c.id].size;
    const worksToday = workDaysMap[c.id].has(dateStr);

    // 工作天数限制：仅对全职教练应用（建议最多5天，双休）
    // 兼职教练完全按照可用性设置，不受工作天数限制
    if (isFullTime) {
      const maxWorkDays = 5;
      if (daysWorked >= maxWorkDays && !worksToday) {
        console.log(`    ${c.name} [全职]: 已工作 ${daysWorked} 天 -> 需要休息（建议最多${maxWorkDays}天）`);
        return false;
      }
    }

    return true;
  });

  // 如果严格过滤后候选人不足，尝试放宽约束
  let finalCandidates = strictCandidates;

  if (strictCandidates.length < count) {
    console.warn(`⚠️  门店 ${storeName}, ${dateStr}, 班次 ${shiftId}: 严格约束下只有 ${strictCandidates.length} 个候选人，需要 ${count} 个`);
    console.log(`  尝试放宽约束(兼职可放宽工作天数,全职必须保障双休)...`);

    // 放宽约束：只检查可用性和班次冲突
    // 全职教练：仍然严格限制工作天数（确保双休）
    // 兼职教练：可以忽略工作天数限制
    const relaxedCandidates = candidates.filter((c) => {
      const dayOfWeek = new Date(dateStr).getDay();
      const isFullTime = c.employmentType === 'FULL_TIME';

      // 如果教练没有配置可用性，默认全部可用
      if (!c.availability || !c.availability.weekSchedule) {
        // 但全职教练仍需检查工作天数
        if (isFullTime) {
          const daysWorked = workDaysMap[c.id].size;
          const worksToday = workDaysMap[c.id].has(dateStr);
          const maxWorkDays = 5;

          if (daysWorked >= maxWorkDays && !worksToday) {
            console.log(`    ${c.name} [全职]: 已工作 ${daysWorked} 天 -> 必须保障双休，即使放宽约束也不可用`);
            return false;
          }
        }
        return true;
      }

      // 如果教练有配置可用性，必须严格检查
      const daySchedule = c.availability.weekSchedule[dayOfWeek];

      // ⚠️ 关键规则：如果这一天没有配置，表示这一天明确不可用
      if (!daySchedule) {
        console.log(`    ${c.name}: 该天没有配置 -> 即使放宽约束也不可用`);
        return false;
      }

      // 检查班次可用性
      if (daySchedule[shiftId] !== undefined) {
        // 新格式
        if (daySchedule[shiftId] === false) {
          console.log(`    ${c.name}: 班次 ${shiftId} 明确不可用 -> 不可用`);
          return false;
        }
      } else {
        // 旧格式兼容
        const legacyField = shiftId === 'morning' ? 'canWorkMorning' :
                            shiftId === 'evening' ? 'canWorkEvening' : null;

        if (legacyField && (daySchedule as any)[legacyField] !== undefined) {
          if ((daySchedule as any)[legacyField] === false) {
            console.log(`    ${c.name}: 旧格式 ${legacyField} 不可用 -> 不可用`);
            return false;
          }
        } else {
          // 该班次未定义，不可用
          console.log(`    ${c.name}: 该天有配置但班次 ${shiftId} 未设置 -> 不可用`);
          return false;
        }
      }

      // 全职教练必须检查工作天数，即使在放宽约束的情况下
      if (isFullTime) {
        const daysWorked = workDaysMap[c.id].size;
        const worksToday = workDaysMap[c.id].has(dateStr);
        const maxWorkDays = 5;

        if (daysWorked >= maxWorkDays && !worksToday) {
          console.log(`    ${c.name} [全职]: 已工作 ${daysWorked} 天 -> 必须保障双休，即使放宽约束也不可用`);
          return false;
        }
      }

      return true;
    });

    finalCandidates = relaxedCandidates;
    console.log(`ℹ️  放宽约束后有 ${relaxedCandidates.length} 个候选人: ${relaxedCandidates.map(c => c.name).join(', ')}`);
  }

  // 排序：优先主门店教练，然后按工时少的，周末未工作的，完全按可用性和公平性原则
  finalCandidates.sort((a, b) => {
    // 第一优先级：主门店教练优先（如果提供了storeId）
    if (storeId) {
      const aIsPrimary = a.stores?.some(cs => cs.storeId === storeId && cs.isPrimary) || false;
      const bIsPrimary = b.stores?.some(cs => cs.storeId === storeId && cs.isPrimary) || false;

      if (aIsPrimary !== bIsPrimary) {
        return aIsPrimary ? -1 : 1; // 主门店教练排前面
      }
    }

    // 第二优先级：如果是周末，优先分配给还没有周末班的教练
    if (isWeekend) {
      const aHasWeekend = weekendDays.some(day => workDaysMap[a.id].has(day));
      const bHasWeekend = weekendDays.some(day => workDaysMap[b.id].has(day));

      // 如果一个有周末班，一个没有，优先选择没有周末班的
      if (aHasWeekend !== bHasWeekend) {
        return aHasWeekend ? 1 : -1; // 没有周末班的排前面
      }
    }

    // 第三优先级：按工时排序（公平性原则）
    const loadDiff = (workload[a.id] || 0) - (workload[b.id] || 0);
    if (loadDiff !== 0) return loadDiff;

    // 工时相同时随机
    return Math.random() - 0.5;
  });

  const selected = finalCandidates.slice(0, count);

  if (selected.length < count) {
    console.error(`❌ 门店 ${storeName}, ${dateStr}, 班次 ${shiftId}: 无法分配足够教练！需要 ${count} 个，只有 ${selected.length} 个可用`);
  }

  return selected;
};

export const generateWeekSchedule = (
  coaches: Coach[],
  stores: Store[],
  weekDays: string[]
): ScheduleItem[] => {
  const newSchedule: ScheduleItem[] = [];
  const tempWorkload: Record<string, number> = {};
  const workDaysMap: Record<string, Set<string>> = {};
  const coachDailyStoreAssignment: Record<string, Record<string, string>> = {}; // coachId -> dateStr -> storeId
  const coachDailyShifts: Record<string, Record<string, Set<string>>> = {}; // coachId -> dateStr -> Set<shiftId>
  const coachDailyShiftDetails: Record<string, Record<string, Shift[]>> = {}; // coachId -> dateStr -> Shift[]

  coaches.forEach((c) => {
    tempWorkload[c.id] = 0;
    workDaysMap[c.id] = new Set();
    coachDailyStoreAssignment[c.id] = {};
    coachDailyShifts[c.id] = {};
    coachDailyShiftDetails[c.id] = {};
  });

  const activeStores = stores.filter(s => !s.archived);

  // 识别周末日期（周五、周六、周日）
  const weekendDays = weekDays.filter((dateStr) => {
    const dayOfWeek = new Date(dateStr).getDay();
    return dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
  });

  // Generate schedules for each store
  activeStores.forEach((store) => {
    const storeShifts = store.shifts || [];

    if (storeShifts.length === 0) {
      console.warn(`警告：门店 ${store.name} 没有配置班次`);
      return;
    }

    // Get coaches whose PRIMARY store is this store
    const primaryCoaches = coaches.filter(coach =>
      coach.stores?.some(cs => cs.storeId === store.id && cs.isPrimary)
    );

    // Get coaches who have this store as a secondary store (can be transferred)
    const secondaryCoaches = coaches.filter(coach =>
      coach.stores?.some(cs => cs.storeId === store.id && !cs.isPrimary)
    );

    // Combine: primary coaches first, then secondary coaches for backup
    const storeCoaches = [...primaryCoaches, ...secondaryCoaches];

    console.log(`\n🏪 门店 ${store.name} 教练池: 主门店教练 ${primaryCoaches.length} 人 (${primaryCoaches.map(c => c.name).join(', ')}), 关联教练 ${secondaryCoaches.length} 人 (${secondaryCoaches.map(c => c.name).join(', ')})`);

    if (storeCoaches.length === 0) {
      console.warn(`警告：门店 ${store.name} 没有关联的教练（既无主门店教练，也无关联教练）`);
      return;
    }

    // 为该门店的每一天分配班次
    weekDays.forEach((dateStr) => {
      const dayOfWeek = new Date(dateStr).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5;

      // 获取这一天适用的班次
      const applicableShifts = storeShifts.filter(shift =>
        isShiftApplicableOnDate(shift, dateStr)
      );

      if (applicableShifts.length > 0) {
        console.log(`\n📆 ${dateStr} (周${['日','一','二','三','四','五','六'][dayOfWeek]}) 适用的班次: ${applicableShifts.map(s => s.name).join(', ')}`);
      }

      // 按班次时间排序（早到晚）
      applicableShifts.sort((a, b) => {
        const [aH, aM] = a.start.split(':').map(Number);
        const [bH, bM] = b.start.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });

      const dailyAssignedCoaches = new Set<string>();

      applicableShifts.forEach((shift) => {
        // 每个班次需要的人数：使用配置的人数范围，如果没配置则使用周末2人，平日1人的默认值
        const defaultStaffNeeded = isWeekend ? 2 : 1;
        const minStaff = shift.minCoaches ?? defaultStaffNeeded;
        const maxStaff = shift.maxCoaches ?? defaultStaffNeeded;

        // 优先使用最大值，但不超过可用教练数
        const staffNeeded = maxStaff;

        console.log(`\n📅 门店 ${store.name}, ${dateStr}, 班次 ${shift.name} (${shift.id}), 需要 ${staffNeeded} 人 (范围: ${minStaff}-${maxStaff})`);

        // Filter coaches who are already assigned to a DIFFERENT store on this date
        const availableCoaches = storeCoaches.filter(c => {
          const assignedStore = coachDailyStoreAssignment[c.id][dateStr];
          // 如果教练当天已经被分配到其他门店，不可用
          if (assignedStore && assignedStore !== store.id) {
            return false;
          }
          return true;
        });

        console.log(`  可用教练池 (未被其他门店占用): ${availableCoaches.map(c => c.name).join(', ')} (${availableCoaches.length}个)`);

        // 检查班次时间冲突
        const nonConflictingCoaches = availableCoaches.filter(c => {
          if (!coachDailyShifts[c.id][dateStr]) {
            return true; // 当天还没有班次
          }

          const assignedShiftIds = coachDailyShifts[c.id][dateStr];

          // 检查时间是否冲突
          for (const assignedShiftId of assignedShiftIds) {
            // 找到已分配的班次
            const assignedShift = storeShifts.find(s => s.id === assignedShiftId);
            if (!assignedShift) continue;

            // 检查时间段是否重叠
            const [s1H, s1M] = shift.start.split(':').map(Number);
            const [e1H, e1M] = shift.end.split(':').map(Number);
            const [s2H, s2M] = assignedShift.start.split(':').map(Number);
            const [e2H, e2M] = assignedShift.end.split(':').map(Number);

            const s1 = s1H * 60 + s1M;
            const e1 = e1H * 60 + e1M;
            const s2 = s2H * 60 + s2M;
            const e2 = e2H * 60 + e2M;

            // 检查重叠（简化版，不考虑跨午夜）
            if (!(e1 <= s2 || s1 >= e2)) {
              return false; // 有冲突
            }
          }

          return true;
        });

        console.log(`  无冲突教练: ${nonConflictingCoaches.map(c => c.name).join(', ')} (${nonConflictingCoaches.length}个)`);

        const selectedCoaches = pickCoaches(
          nonConflictingCoaches,
          tempWorkload,
          staffNeeded,
          [],
          dateStr,
          workDaysMap,
          isWeekend,
          weekendDays,
          shift.id,
          store.name,
          store.id // 传入门店ID，用于优先选择主门店教练
        );

        console.log(`  ✅ 最终选择: ${selectedCoaches.map(c => c.name).join(', ')} (${selectedCoaches.length}个)`);

        // 检查是否有可用教练
        // 优先确保班次有人，即使人数不足最小要求也分配
        if (selectedCoaches.length === 0) {
          console.warn(`⚠️  警告：门店 ${store.name}, ${dateStr}, 班次 ${shift.name}: 没有可用教练 -> 班次保持空缺`);
          return; // 完全没有教练时才跳过此班次
        }

        // 人数不足时给出警告，但仍然分配
        if (selectedCoaches.length < minStaff) {
          console.warn(`⚠️  警告：门店 ${store.name}, ${dateStr}, 班次 ${shift.name}: 只找到 ${selectedCoaches.length} 人，少于最小需求 ${minStaff} 人（仍然分配）`);
        }

        selectedCoaches.forEach((c) => {
          newSchedule.push({
            id: crypto.randomUUID(),
            dateStr,
            coachId: c.id,
            storeId: store.id,
            shiftId: shift.id,
            shiftName: shift.name,
          });

          // 记录班次详情，并立即更新工时（去除重叠）
          if (!coachDailyShiftDetails[c.id][dateStr]) {
            coachDailyShiftDetails[c.id][dateStr] = [];
          }
          coachDailyShiftDetails[c.id][dateStr].push(shift);

          // 立即计算该教练当天的实际工时（去除重叠时间）
          const shiftsToday = coachDailyShiftDetails[c.id][dateStr];
          const timeRanges: TimeRange[] = shiftsToday.map(s => shiftToTimeRange(s));
          const dailyHours = mergeTimeRangesAndCalculateDuration(timeRanges);

          // 更新总工时：移除之前该天的工时，加上新的合并后工时
          // （因为可能已经有该天的其他班次）
          const previousDayHours = shiftsToday.length > 1 ?
            mergeTimeRangesAndCalculateDuration(
              shiftsToday.slice(0, -1).map(s => shiftToTimeRange(s))
            ) : 0;

          tempWorkload[c.id] = tempWorkload[c.id] - previousDayHours + dailyHours;

          workDaysMap[c.id].add(dateStr);
          coachDailyStoreAssignment[c.id][dateStr] = store.id;

          if (!coachDailyShifts[c.id][dateStr]) {
            coachDailyShifts[c.id][dateStr] = new Set();
          }
          coachDailyShifts[c.id][dateStr].add(shift.id);

          dailyAssignedCoaches.add(c.id);
        });
      });
    });
  });

  // 验证约束
  coaches.forEach((coach) => {
    if (!coach.stores || coach.stores.length === 0) return;

    const isFullTime = coach.employmentType === 'FULL_TIME';
    const daysWorked = workDaysMap[coach.id].size;
    const restDays = 7 - daysWorked;

    // 工作天数检查：仅对全职教练检查（建议最多5天，休2天）
    // 兼职教练不检查工作天数，完全按可用性设置
    if (isFullTime) {
      const recommendedMaxDays = 5;
      const recommendedMinRestDays = 2;

      if (daysWorked > recommendedMaxDays || restDays < recommendedMinRestDays) {
        console.warn(`警告：全职教练 ${coach.name} 工作了 ${daysWorked} 天，休息 ${restDays} 天（建议工作${recommendedMaxDays}天，休息${recommendedMinRestDays}天）`);
      }
    }

    // 记录每个教练的工作天数用于调试
    console.log(`教练 ${coach.name} [${isFullTime ? '全职' : '兼职'}]: 工作 ${daysWorked} 天，休息 ${restDays} 天，总工时 ${tempWorkload[coach.id].toFixed(1)}h`);
  });

  return newSchedule;
};
