export type LessonFeeMode = "PER_SESSION" | "PER_PERSON" | "NOVICE";

export type LessonFeeConfigItem = {
  lessonTypeId: string;
  mode: LessonFeeMode;
  sessionRate: number;
  noviceSingleRate: number;
  noviceMultiRatePerPerson: number;
  fullTimeFreeHeadcount: number;
};

export type LessonFeeConfigDraft = Omit<LessonFeeConfigItem, "lessonTypeId">;

export type LessonRecordForFee = {
  dateStr: string;
  lessonTypeId: string;
  studentCount: number;
  lessonTypeName?: string;
};

export const LESSON_FEE_CONFIG_KEY = "lesson_fee_config_v1";

/** 参与全职免计合并统计的新手课类型 */
export const NOVICE_LESSON_TYPE_NAMES = ["单人新手课", "多人新手课", "新手课"] as const;

export const SINGLE_NOVICE_LESSON_TYPE_NAME = "单人新手课";
export const MULTI_NOVICE_LESSON_TYPE_NAME = "多人新手课";

export function isNoviceLessonTypeForFreeQuota(name: string): boolean {
  const trimmed = name.trim();
  return NOVICE_LESSON_TYPE_NAMES.includes(trimmed as (typeof NOVICE_LESSON_TYPE_NAMES)[number]);
}

/** @deprecated use isNoviceLessonTypeForFreeQuota */
export function isNoviceLessonTypeName(name: string): boolean {
  return isNoviceLessonTypeForFreeQuota(name);
}

export function isSingleNoviceLessonType(name: string): boolean {
  return name.trim() === SINGLE_NOVICE_LESSON_TYPE_NAME;
}

export function normalizeLessonFeeConfig(input: unknown): LessonFeeConfigItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const value = (item || {}) as Record<string, unknown>;
      const modeRaw = String(value.mode || "");
      const mode: LessonFeeMode =
        modeRaw === "PER_PERSON" || modeRaw === "NOVICE" ? modeRaw : "PER_SESSION";
      return {
        lessonTypeId: String(value.lessonTypeId || ""),
        mode,
        sessionRate: Number(value.sessionRate ?? 0),
        noviceSingleRate: Number(value.noviceSingleRate ?? 0),
        noviceMultiRatePerPerson: Number(value.noviceMultiRatePerPerson ?? 0),
        fullTimeFreeHeadcount: Number(value.fullTimeFreeHeadcount ?? 0),
      } satisfies LessonFeeConfigItem;
    })
    .filter(
      (item) =>
        item.lessonTypeId &&
        !Number.isNaN(item.sessionRate) &&
        !Number.isNaN(item.noviceSingleRate) &&
        !Number.isNaN(item.noviceMultiRatePerPerson) &&
        !Number.isNaN(item.fullTimeFreeHeadcount)
    );
}

function resolveEffectiveMode(
  config: Pick<LessonFeeConfigItem, "mode" | "sessionRate" | "noviceSingleRate" | "noviceMultiRatePerPerson">,
  lessonTypeName: string
): Exclude<LessonFeeMode, "NOVICE"> {
  if (config.mode !== "NOVICE") {
    return config.mode === "PER_PERSON" ? "PER_PERSON" : "PER_SESSION";
  }
  return isSingleNoviceLessonType(lessonTypeName) ? "PER_SESSION" : "PER_PERSON";
}

function resolveEffectiveSessionRate(
  config: Pick<
    LessonFeeConfigItem,
    "mode" | "sessionRate" | "noviceSingleRate" | "noviceMultiRatePerPerson"
  >,
  lessonTypeName: string
): number {
  if (config.mode !== "NOVICE") return config.sessionRate;
  return isSingleNoviceLessonType(lessonTypeName)
    ? config.noviceSingleRate
    : config.noviceMultiRatePerPerson;
}

export function normalizeConfigItem(
  config: LessonFeeConfigItem,
  lessonTypeName: string
): LessonFeeConfigItem {
  const mode = resolveEffectiveMode(config, lessonTypeName);
  const sessionRate = resolveEffectiveSessionRate(config, lessonTypeName);
  return {
    ...config,
    mode,
    sessionRate,
    fullTimeFreeHeadcount: isNoviceLessonTypeForFreeQuota(lessonTypeName)
      ? config.fullTimeFreeHeadcount
      : 0,
  };
}

export function getDefaultLessonFeeDraft(
  lessonType: Pick<{ name: string }, "name">
): LessonFeeConfigDraft {
  const name = lessonType.name.trim();
  if (isSingleNoviceLessonType(name)) {
    return {
      mode: "PER_SESSION",
      sessionRate: 50,
      noviceSingleRate: 0,
      noviceMultiRatePerPerson: 0,
      fullTimeFreeHeadcount: 20,
    };
  }
  if (isNoviceLessonTypeForFreeQuota(name)) {
    return {
      mode: "PER_PERSON",
      sessionRate: 35,
      noviceSingleRate: 0,
      noviceMultiRatePerPerson: 0,
      fullTimeFreeHeadcount: 20,
    };
  }
  return {
    mode: "PER_PERSON",
    sessionRate: 0,
    noviceSingleRate: 0,
    noviceMultiRatePerPerson: 0,
    fullTimeFreeHeadcount: 0,
  };
}

export function resolveLessonFeeConfigMap(
  lessonTypes: Array<{ id: string; name: string }>,
  savedConfig: LessonFeeConfigItem[]
): Map<string, LessonFeeConfigItem> {
  const savedMap = new Map(savedConfig.map((item) => [item.lessonTypeId, item]));
  const result = new Map<string, LessonFeeConfigItem>();
  lessonTypes.forEach((lessonType) => {
    const saved = savedMap.get(lessonType.id);
    if (saved) {
      result.set(lessonType.id, normalizeConfigItem(saved, lessonType.name));
      return;
    }
    const defaults = getDefaultLessonFeeDraft(lessonType);
    result.set(lessonType.id, { lessonTypeId: lessonType.id, ...defaults });
  });
  return result;
}

export type LessonFeeRecordDetail = {
  id: string;
  dateStr: string;
  lessonTypeId: string;
  lessonTypeName: string;
  studentCount: number;
  freeStudentCount: number;
  billableStudentCount: number;
  fee: number;
  calculationNote: string;
};

export type LessonFeeDetailsResult = {
  totalFee: number;
  employmentType: "FULL_TIME" | "PART_TIME";
  noviceFreeSummary: {
    quota: number;
    used: number;
  } | null;
  items: LessonFeeRecordDetail[];
};

type RecordLessonFeeBreakdown = {
  fee: number;
  freeStudentCount: number;
  billableStudentCount: number;
  calculationNote: string;
};

function roundFee(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveLessonTypeName(
  record: LessonRecordForFee,
  lessonTypeNameById: Map<string, string>
): string {
  return record.lessonTypeName || lessonTypeNameById.get(record.lessonTypeId) || "";
}

export function calcRecordLessonFeeDetail(
  record: LessonRecordForFee,
  config: LessonFeeConfigItem,
  employmentType: "FULL_TIME" | "PART_TIME",
  noviceFreeUsed: { count: number },
  lessonTypeNameById: Map<string, string> = new Map()
): RecordLessonFeeBreakdown {
  const lessonTypeName = resolveLessonTypeName(record, lessonTypeNameById);
  const effective = normalizeConfigItem(config, lessonTypeName);
  const studentCount = Math.max(1, record.studentCount || 1);
  let freeStudentCount = 0;
  let billableCount = studentCount;

  const appliesNoviceFree =
    employmentType === "FULL_TIME" &&
    isNoviceLessonTypeForFreeQuota(lessonTypeName) &&
    effective.fullTimeFreeHeadcount > 0;

  if (appliesNoviceFree) {
    const remainingFree = Math.max(0, effective.fullTimeFreeHeadcount - noviceFreeUsed.count);
    freeStudentCount = Math.min(studentCount, remainingFree);
    noviceFreeUsed.count += freeStudentCount;
    billableCount = studentCount - freeStudentCount;
  }

  if (billableCount <= 0) {
    return {
      fee: 0,
      freeStudentCount,
      billableStudentCount: 0,
      calculationNote:
        freeStudentCount > 0 ? `全职免计 ${freeStudentCount} 人` : "不计课时费",
    };
  }

  if (effective.mode === "PER_PERSON") {
    const fee = roundFee(billableCount * effective.sessionRate);
    const note =
      freeStudentCount > 0
        ? `${billableCount} 人 × ¥${effective.sessionRate}（免计 ${freeStudentCount} 人）`
        : `${billableCount} 人 × ¥${effective.sessionRate}`;
    return {
      fee,
      freeStudentCount,
      billableStudentCount: billableCount,
      calculationNote: note,
    };
  }

  const fee = effective.sessionRate;
  const note =
    freeStudentCount > 0
      ? `每节 ¥${effective.sessionRate}（免计 ${freeStudentCount} 人）`
      : `每节 ¥${effective.sessionRate}`;
  return {
    fee,
    freeStudentCount,
    billableStudentCount: billableCount,
    calculationNote: note,
  };
}

export function calcRecordLessonFee(
  record: LessonRecordForFee,
  config: LessonFeeConfigItem,
  employmentType: "FULL_TIME" | "PART_TIME",
  noviceFreeUsed: { count: number },
  lessonTypeNameById: Map<string, string> = new Map()
): number {
  return calcRecordLessonFeeDetail(
    record,
    config,
    employmentType,
    noviceFreeUsed,
    lessonTypeNameById
  ).fee;
}

export function calcCoachLessonFee(
  records: LessonRecordForFee[],
  configByLessonTypeId: Map<string, LessonFeeConfigItem>,
  employmentType: "FULL_TIME" | "PART_TIME",
  lessonTypeNameById: Map<string, string> = new Map()
): number {
  return calcCoachLessonFeeDetails(
    records,
    configByLessonTypeId,
    employmentType,
    lessonTypeNameById
  ).totalFee;
}

type LessonRecordWithMeta = LessonRecordForFee & {
  id?: string;
  lessonTypeName?: string;
};

export function calcCoachLessonFeeDetails(
  records: LessonRecordWithMeta[],
  configByLessonTypeId: Map<string, LessonFeeConfigItem>,
  employmentType: "FULL_TIME" | "PART_TIME",
  lessonTypeNameById: Map<string, string>
): LessonFeeDetailsResult {
  const sorted = [...records].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  const noviceFreeUsed = { count: 0 };
  let noviceFreeQuota = 0;
  if (employmentType === "FULL_TIME") {
    for (const [lessonTypeId, config] of configByLessonTypeId) {
      const lessonTypeName = lessonTypeNameById.get(lessonTypeId) || "";
      if (!isNoviceLessonTypeForFreeQuota(lessonTypeName)) continue;
      const effective = normalizeConfigItem(config, lessonTypeName);
      noviceFreeQuota = Math.max(noviceFreeQuota, effective.fullTimeFreeHeadcount);
    }
  }
  const items: LessonFeeRecordDetail[] = [];

  for (const record of sorted) {
    const config = configByLessonTypeId.get(record.lessonTypeId);
    if (!config) continue;

    const lessonTypeName =
      record.lessonTypeName || lessonTypeNameById.get(record.lessonTypeId) || "";

    const breakdown = calcRecordLessonFeeDetail(
      record,
      config,
      employmentType,
      noviceFreeUsed,
      lessonTypeNameById
    );
    items.push({
      id: record.id || `${record.dateStr}-${record.lessonTypeId}-${items.length}`,
      dateStr: record.dateStr,
      lessonTypeId: record.lessonTypeId,
      lessonTypeName: lessonTypeName || "未知课程",
      studentCount: Math.max(1, record.studentCount || 1),
      freeStudentCount: breakdown.freeStudentCount,
      billableStudentCount: breakdown.billableStudentCount,
      fee: breakdown.fee,
      calculationNote: breakdown.calculationNote,
    });
  }

  const totalFee = roundFee(items.reduce((sum, item) => sum + item.fee, 0));
  const noviceFreeSummary =
    employmentType === "FULL_TIME" && noviceFreeQuota > 0
      ? { quota: noviceFreeQuota, used: noviceFreeUsed.count }
      : null;

  return {
    totalFee,
    employmentType,
    noviceFreeSummary,
    items,
  };
}

type CoachForLessonFee = {
  id: string;
  employmentType: string;
};

type LessonRecordRowForFee = {
  coachId: string;
  dateStr: string;
  lessonTypeId: string;
  studentCount: number;
};

export function buildLessonFeeByCoach(
  coaches: CoachForLessonFee[],
  lessonTypes: Array<{ id: string; name: string }>,
  lessonRecords: LessonRecordRowForFee[],
  savedFeeConfig: LessonFeeConfigItem[]
): Map<string, number> {
  const lessonTypeNameById = new Map(lessonTypes.map((item) => [item.id, item.name]));
  const feeConfigMap = resolveLessonFeeConfigMap(lessonTypes, savedFeeConfig);
  const lessonRecordsByCoach = new Map<string, LessonRecordForFee[]>();

  for (const record of lessonRecords) {
    const coachRecords = lessonRecordsByCoach.get(record.coachId) || [];
    coachRecords.push({
      dateStr: record.dateStr,
      lessonTypeId: record.lessonTypeId,
      studentCount: record.studentCount,
      lessonTypeName: lessonTypeNameById.get(record.lessonTypeId),
    });
    lessonRecordsByCoach.set(record.coachId, coachRecords);
  }

  const result = new Map<string, number>();
  for (const coach of coaches) {
    const employmentType = coach.employmentType === "PART_TIME" ? "PART_TIME" : "FULL_TIME";
    result.set(
      coach.id,
      calcCoachLessonFee(
        lessonRecordsByCoach.get(coach.id) || [],
        feeConfigMap,
        employmentType,
        lessonTypeNameById
      )
    );
  }
  return result;
}
