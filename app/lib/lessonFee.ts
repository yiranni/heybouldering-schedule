import { prisma } from "@/app/lib/prisma";

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
};

export const LESSON_FEE_CONFIG_KEY = "lesson_fee_config_v1";
export const NOVICE_LESSON_TYPE_NAME = "单人新手课";

export function isNoviceLessonTypeName(name: string): boolean {
  return name.trim() === NOVICE_LESSON_TYPE_NAME;
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

export function getDefaultLessonFeeDraft(
  lessonType: Pick<{ name: string }, "name">
): LessonFeeConfigDraft {
  if (isNoviceLessonTypeName(lessonType.name)) {
    return {
      mode: "NOVICE",
      sessionRate: 0,
      noviceSingleRate: 50,
      noviceMultiRatePerPerson: 35,
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
      result.set(lessonType.id, {
        ...saved,
        mode: isNoviceLessonTypeName(lessonType.name) ? "NOVICE" : "PER_PERSON",
      });
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

export function calcRecordLessonFeeDetail(
  record: LessonRecordForFee,
  config: LessonFeeConfigItem,
  employmentType: "FULL_TIME" | "PART_TIME",
  noviceFreeUsed: { count: number }
): RecordLessonFeeBreakdown {
  const studentCount = Math.max(1, record.studentCount || 1);
  let freeStudentCount = 0;
  let billableCount = studentCount;

  if (config.mode === "NOVICE") {
    if (employmentType === "FULL_TIME" && config.fullTimeFreeHeadcount > 0) {
      const remainingFree = Math.max(0, config.fullTimeFreeHeadcount - noviceFreeUsed.count);
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
    if (studentCount === 1) {
      const note =
        freeStudentCount > 0
          ? `单人课（全职免计 ${freeStudentCount} 人）`
          : `单人课 ¥${config.noviceSingleRate}`;
      return {
        fee: config.noviceSingleRate,
        freeStudentCount,
        billableStudentCount: billableCount,
        calculationNote: note,
      };
    }
    const fee = roundFee(billableCount * config.noviceMultiRatePerPerson);
    const note =
      freeStudentCount > 0
        ? `${billableCount} 人 × ¥${config.noviceMultiRatePerPerson}（免计 ${freeStudentCount} 人）`
        : `${billableCount} 人 × ¥${config.noviceMultiRatePerPerson}`;
    return {
      fee,
      freeStudentCount,
      billableStudentCount: billableCount,
      calculationNote: note,
    };
  }

  if (config.mode === "PER_PERSON") {
    return {
      fee: roundFee(studentCount * config.sessionRate),
      freeStudentCount: 0,
      billableStudentCount: studentCount,
      calculationNote: `${studentCount} 人 × ¥${config.sessionRate}`,
    };
  }

  return {
    fee: config.sessionRate,
    freeStudentCount: 0,
    billableStudentCount: 1,
    calculationNote: `每节 ¥${config.sessionRate}`,
  };
}

export function calcRecordLessonFee(
  record: LessonRecordForFee,
  config: LessonFeeConfigItem,
  employmentType: "FULL_TIME" | "PART_TIME",
  noviceFreeUsed: { count: number }
): number {
  return calcRecordLessonFeeDetail(record, config, employmentType, noviceFreeUsed).fee;
}

export function calcCoachLessonFee(
  records: LessonRecordForFee[],
  configByLessonTypeId: Map<string, LessonFeeConfigItem>,
  employmentType: "FULL_TIME" | "PART_TIME"
): number {
  return calcCoachLessonFeeDetails(records, configByLessonTypeId, employmentType, new Map()).totalFee;
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
  const items: LessonFeeRecordDetail[] = [];

  for (const record of sorted) {
    const config = configByLessonTypeId.get(record.lessonTypeId);
    if (!config) continue;

    if (config.mode === "NOVICE" && employmentType === "FULL_TIME") {
      noviceFreeQuota = Math.max(noviceFreeQuota, config.fullTimeFreeHeadcount);
    }

    const breakdown = calcRecordLessonFeeDetail(record, config, employmentType, noviceFreeUsed);
    items.push({
      id: record.id || `${record.dateStr}-${record.lessonTypeId}-${items.length}`,
      dateStr: record.dateStr,
      lessonTypeId: record.lessonTypeId,
      lessonTypeName:
        record.lessonTypeName || lessonTypeNameById.get(record.lessonTypeId) || "未知课程",
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

async function ensurePayrollSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS payroll_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

export async function fetchLessonFeeConfig(): Promise<LessonFeeConfigItem[]> {
  await ensurePayrollSettingsTable();
  const rows = await prisma.$queryRaw<Array<{ value: unknown }>>`
    SELECT value
    FROM payroll_settings
    WHERE key = ${LESSON_FEE_CONFIG_KEY}
    LIMIT 1
  `;
  return normalizeLessonFeeConfig(rows[0]?.value);
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
  const feeConfigMap = resolveLessonFeeConfigMap(lessonTypes, savedFeeConfig);
  const lessonRecordsByCoach = new Map<string, LessonRecordForFee[]>();

  for (const record of lessonRecords) {
    const coachRecords = lessonRecordsByCoach.get(record.coachId) || [];
    coachRecords.push({
      dateStr: record.dateStr,
      lessonTypeId: record.lessonTypeId,
      studentCount: record.studentCount,
    });
    lessonRecordsByCoach.set(record.coachId, coachRecords);
  }

  const result = new Map<string, number>();
  for (const coach of coaches) {
    const employmentType = coach.employmentType === "PART_TIME" ? "PART_TIME" : "FULL_TIME";
    result.set(
      coach.id,
      calcCoachLessonFee(lessonRecordsByCoach.get(coach.id) || [], feeConfigMap, employmentType)
    );
  }
  return result;
}

export async function calcLessonFeesByCoachForMonth(month: string): Promise<Map<string, number>> {
  const [lessonTypes, lessonRecordsInMonth, savedFeeConfig, coaches] = await Promise.all([
    prisma.lessonType.findMany({
      where: { archived: false },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.lessonRecord.findMany({
      where: {
        dateStr: {
          gte: `${month}-01`,
          lte: `${month}-31`,
        },
      },
      select: {
        coachId: true,
        dateStr: true,
        lessonTypeId: true,
        studentCount: true,
      },
    }),
    fetchLessonFeeConfig(),
    prisma.$queryRaw<CoachForLessonFee[]>`
      SELECT id, "employmentType" AS "employmentType"
      FROM coaches
      WHERE archived = false
    `,
  ]);

  return buildLessonFeeByCoach(coaches, lessonTypes, lessonRecordsInMonth, savedFeeConfig);
}
