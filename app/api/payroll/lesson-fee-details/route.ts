import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, unauthorized } from "@/app/lib/auth";
import {
  calcCoachLessonFeeDetails,
  filterLessonFeeDetailsByStores,
  resolveLessonFeeConfigMap,
} from "@/app/lib/lessonFee";
import { fetchLessonFeeConfig } from "@/app/lib/lessonFee.server";
import { resolvePrimaryStoreId } from "@/app/lib/payrollStoreAttribution.server";
import { getLessonRecordMonthDateFilter } from "@/app/lib/scheduleHours";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

function parseStoreIds(searchParams: URLSearchParams): string[] | null {
  const raw = searchParams.get("storeIds");
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : null;
}

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可查看课时费明细");

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || "";
    const coachId = searchParams.get("coachId") || "";
    const filterStoreIds = parseStoreIds(searchParams);

    if (!isValidMonth(month)) {
      return NextResponse.json({ error: "month 格式应为 YYYY-MM" }, { status: 400 });
    }
    if (!coachId) {
      return NextResponse.json({ error: "coachId 为必填项" }, { status: 400 });
    }

    const [coach, coachStoreLinks, lessonTypes, savedFeeConfig, lessonRecords] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; employmentType: string }>>`
        SELECT id, "employmentType" AS "employmentType"
        FROM coaches
        WHERE id = ${coachId} AND archived = false
        LIMIT 1
      `,
      prisma.coachStore.findMany({
        where: { coachId },
        select: { coachId: true, storeId: true, isPrimary: true },
      }),
      prisma.lessonType.findMany({
        where: { archived: false },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      }),
      fetchLessonFeeConfig(),
      prisma.lessonRecord.findMany({
        where: {
          coachId,
          ...getLessonRecordMonthDateFilter(month),
        },
        select: {
          id: true,
          dateStr: true,
          lessonTypeId: true,
          studentCount: true,
          storeId: true,
          lessonType: {
            select: { name: true },
          },
          store: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ dateStr: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    if (coach.length === 0) {
      return NextResponse.json({ error: "教练不存在" }, { status: 404 });
    }

    const primaryStoreId = resolvePrimaryStoreId(coachStoreLinks, coachId);
    const employmentType =
      coach[0].employmentType === "PART_TIME" ? "PART_TIME" : "FULL_TIME";
    const feeConfigMap = resolveLessonFeeConfigMap(lessonTypes, savedFeeConfig);
    const lessonTypeNameById = new Map(lessonTypes.map((item) => [item.id, item.name]));

    let details = calcCoachLessonFeeDetails(
      lessonRecords.map((record) => ({
        id: record.id,
        dateStr: record.dateStr,
        lessonTypeId: record.lessonTypeId,
        studentCount: record.studentCount,
        lessonTypeName: record.lessonType.name,
        storeId: record.storeId,
        storeName: record.store?.name ?? null,
        effectiveStoreId: record.storeId || primaryStoreId,
      })),
      feeConfigMap,
      employmentType,
      lessonTypeNameById
    );

    if (filterStoreIds) {
      details = filterLessonFeeDetailsByStores(details, filterStoreIds);
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error("Error fetching lesson fee details:", error);
    return NextResponse.json({ error: "Failed to fetch lesson fee details" }, { status: 500 });
  }
}
