import { prisma } from "@/app/lib/prisma";
import { findPayrollSettingValue } from "@/app/lib/payrollSettings";
import {
  LESSON_FEE_CONFIG_KEY,
  buildLessonFeeByCoach,
  normalizeLessonFeeConfig,
  type LessonFeeConfigItem,
} from "@/app/lib/lessonFee";

type CoachForLessonFee = {
  id: string;
  employmentType: string;
};

export async function fetchLessonFeeConfig(): Promise<LessonFeeConfigItem[]> {
  const value = await findPayrollSettingValue(LESSON_FEE_CONFIG_KEY);
  return normalizeLessonFeeConfig(value);
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
