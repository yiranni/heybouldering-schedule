import { Prisma } from '@prisma/client';

export const lessonRecordInclude = {
  coach: {
    select: {
      id: true,
      name: true,
      color: true,
      avatar: true,
    },
  },
  lessonType: {
    select: {
      id: true,
      name: true,
      commission: true,
      pricingType: true,
    },
  },
  store: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.LessonRecordInclude;

type LessonRecordCreateFields = {
  dateStr: string;
  lessonTypeId: string;
  coachId: string;
  studentCount: number;
  storeId?: string | null;
  note?: string | null;
};

export function buildLessonRecordCreateData(
  input: LessonRecordCreateFields
): Prisma.LessonRecordUncheckedCreateInput {
  return {
    dateStr: input.dateStr,
    lessonTypeId: input.lessonTypeId,
    coachId: input.coachId,
    studentCount: input.studentCount,
    storeId: input.storeId ?? null,
    note: input.note ?? null,
  };
}

type LessonRecordUpdateFields = {
  dateStr?: string;
  lessonTypeId?: string;
  coachId?: string;
  studentCount?: number;
  storeId?: string | null;
  note?: string | null;
};

export function buildLessonRecordUpdateData(
  input: LessonRecordUpdateFields
): Prisma.LessonRecordUncheckedUpdateInput {
  const data: Prisma.LessonRecordUncheckedUpdateInput = {};

  if (input.dateStr !== undefined) data.dateStr = input.dateStr;
  if (input.lessonTypeId !== undefined) data.lessonTypeId = input.lessonTypeId;
  if (input.coachId !== undefined) data.coachId = input.coachId;
  if (input.studentCount !== undefined) data.studentCount = input.studentCount;
  if (input.storeId !== undefined) data.storeId = input.storeId;
  if (input.note !== undefined) data.note = input.note;

  return data;
}
