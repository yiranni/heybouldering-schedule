// 雇佣类型
export type EmploymentType = "FULL_TIME" | "PART_TIME";

// 班次类型（兼容旧代码）
export type ShiftType = "MORNING" | "EVENING";

// 班次定义
export type Shift = {
  id: string;
  name: string;
  start: string; // HH:mm format
  end: string;   // HH:mm format
  daysOfWeek?: number[] | null; // 0=周日, 1=周一, ..., 6=周六。null或空表示全周适用
  minCoaches?: number; // 最少需要的教练人数，默认为1
  maxCoaches?: number; // 最多需要的教练人数，默认为2
};

export type Store = {
  id: string;
  name: string;
  shifts?: Shift[] | null;
  archived?: boolean;
  // 兼容旧代码的字段
  morningShiftStart?: string;
  morningShiftEnd?: string;
  eveningShiftStart?: string;
  eveningShiftEnd?: string;
  eveningExtendedEnd?: string | null;
};

export type CoachStore = {
  id: string;
  coachId: string;
  storeId: string;
  isPrimary: boolean;
  store: Store;
};

// 每天的班次可用性 - 现在使用班次ID
export type DayShiftAvailability = {
  [shiftId: string]: boolean; // shiftId -> 是否可工作
};

export type CoachAvailability = {
  // 每个星期几的班次可用性 (0 = 周日, 1 = 周一, ..., 6 = 周六)
  weekSchedule: {
    [dayOfWeek: number]: DayShiftAvailability;
  };
};

export type Coach = {
  id: string;
  userId?: string | null;
  name: string;
  color: string;
  avatar: string;
  employmentType?: EmploymentType; // 雇佣类型：全职或兼职
  stores?: CoachStore[];
  availability?: CoachAvailability;
};

export type ScheduleItem = {
  id: string;
  dateStr: string; // ISO Format YYYY-MM-DD
  coachId: string;
  storeId: string;
  shiftId: string; // 班次ID
  shiftName: string; // 班次名称
  // 兼容旧代码的字段
  shiftType?: ShiftType;
  isExtended?: boolean;
};

export type WorkloadStats = {
  totalShifts: number;
  totalHours: number;
  daysWorked: Set<string>;
  extended?: number; // 兼容旧代码
};

// 计价方式
export type PricingType = "PER_SESSION" | "PER_PERSON";

// 课程类型
export type LessonType = {
  id: string;
  name: string;
  commission: number; // 提成价格
  pricingType: PricingType; // 计价方式：每节计价 或 每人计价
};

// 课程记录
export type LessonRecord = {
  id: string;
  dateStr: string; // ISO Format YYYY-MM-DD
  lessonTypeId: string;
  coachId: string;
  studentCount: number; // 学员人数（用于按人计价的课程）
  note?: string | null;
  lessonType?: {
    id: string;
    name: string;
    commission: number;
    pricingType: PricingType;
  };
  coach?: {
    id: string;
    name: string;
    color: string;
    avatar: string;
  };
};

// 课程记录筛选条件
export type LessonRecordFilters = {
  startDate?: string;
  endDate?: string;
  coachId?: string;
  lessonTypeId?: string;
};

export type SalesRecord = {
  id: string;
  coachId: string;
  productName: string;
  amount: number;
  soldAt: string; // ISO datetime
  note?: string | null;
  coach?: {
    id: string;
    name: string;
    color: string;
    avatar: string;
  };
};

export type SalesRecordFilters = {
  startDate?: string;
  endDate?: string;
  coachId?: string;
};

export type CommissionRule = {
  id: string;
  minAmount: number;
  commissionRate: number; // 0~1
};
