import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { calcCoachLessonFeeDetails, resolveLessonFeeConfigMap } from "@/app/lib/lessonFee";
import { fetchLessonFeeConfig } from "@/app/lib/lessonFee.server";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可查看课时费明细");

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || "";
    const coachId = searchParams.get("coachId") || "";

    if (!isValidMonth(month)) {
      return NextResponse.json({ error: "month 格式应为 YYYY-MM" }, { status: 400 });
    }
    if (!coachId) {
      return NextResponse.json({ error: "coachId 为必填项" }, { status: 400 });
    }

    const [coach, lessonTypes, savedFeeConfig, lessonRecords] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; employmentType: string }>>`
        SELECT id, "employmentType" AS "employmentType"
        FROM coaches
        WHERE id = ${coachId} AND archived = false
        LIMIT 1
      `,
      prisma.lessonType.findMany({
        where: { archived: false },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      }),
      fetchLessonFeeConfig(),
      prisma.lessonRecord.findMany({
        where: {
          coachId,
          dateStr: {
            gte: `${month}-01`,
            lte: `${month}-31`,
          },
        },
        select: {
          id: true,
          dateStr: true,
          lessonTypeId: true,
          studentCount: true,
          lessonType: {
            select: { name: true },
          },
        },
        orderBy: [{ dateStr: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    if (coach.length === 0) {
      return NextResponse.json({ error: "教练不存在" }, { status: 404 });
    }

    const employmentType =
      coach[0].employmentType === "PART_TIME" ? "PART_TIME" : "FULL_TIME";
    const feeConfigMap = resolveLessonFeeConfigMap(lessonTypes, savedFeeConfig);
    const lessonTypeNameById = new Map(lessonTypes.map((item) => [item.id, item.name]));

    const details = calcCoachLessonFeeDetails(
      lessonRecords.map((record) => ({
        id: record.id,
        dateStr: record.dateStr,
        lessonTypeId: record.lessonTypeId,
        studentCount: record.studentCount,
        lessonTypeName: record.lessonType.name,
      })),
      feeConfigMap,
      employmentType,
      lessonTypeNameById
    );

    return NextResponse.json(details);
  } catch (error) {
    console.error("Error fetching lesson fee details:", error);
    return NextResponse.json({ error: "Failed to fetch lesson fee details" }, { status: 500 });
  }
}
