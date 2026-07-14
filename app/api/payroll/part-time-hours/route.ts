import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, unauthorized } from "@/app/lib/auth";
import {
  buildPartTimeHoursDetails,
  createManualPartTimeHours,
} from "@/app/lib/payrollManualHours.server";
import { resolveSalesAccess } from "@/app/lib/salesAccess";
import {
  calcHoursFromTimes,
  getMonthDateStrBounds,
} from "@/app/lib/scheduleHours";

function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

function isValidDateStr(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function isValidTime(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

async function loadScheduleContext(month: string) {
  const { startDate, endDate } = getMonthDateStrBounds(month);
  const schedulesInMonth = await prisma.schedule.findMany({
    where: {
      dateStr: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      coachId: true,
      dateStr: true,
      storeId: true,
      shiftId: true,
      shiftName: true,
    },
  });
  const scheduleStoreIds = [...new Set(schedulesInMonth.map((schedule) => schedule.storeId))];
  const stores =
    scheduleStoreIds.length > 0
      ? await prisma.store.findMany({
          where: { id: { in: scheduleStoreIds } },
          select: { id: true, shifts: true },
        })
      : [];
  const storeMap = new Map(stores.map((store) => [store.id, store]));
  return { schedulesInMonth, storeMap };
}

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可查看兼职工时");

    const params = new URL(request.url).searchParams;
    const month = params.get("month") || "";
    const coachId = params.get("coachId") || "";
    if (!isValidMonth(month) || !coachId) {
      return NextResponse.json({ error: "month 与 coachId 为必填项" }, { status: 400 });
    }

    const { schedulesInMonth, storeMap } = await loadScheduleContext(month);
    const details = await buildPartTimeHoursDetails(month, coachId, schedulesInMonth, storeMap);
    return NextResponse.json(details);
  } catch (error) {
    console.error("Error fetching part-time hours:", error);
    return NextResponse.json({ error: "Failed to fetch part-time hours" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可编辑兼职工时");

    const body = await request.json();
    const month = String(body?.month || "");
    const coachId = String(body?.coachId || "");
    const dateStr = String(body?.dateStr || "");
    const startTime = String(body?.startTime || "");
    const endTime = String(body?.endTime || "");

    if (!isValidMonth(month) || !coachId) {
      return NextResponse.json({ error: "month 与 coachId 为必填项" }, { status: 400 });
    }
    if (!isValidDateStr(dateStr) || !isValidTime(startTime) || !isValidTime(endTime)) {
      return NextResponse.json({ error: "日期或时间格式无效" }, { status: 400 });
    }

    const { startDate, endDate } = getMonthDateStrBounds(month);
    if (dateStr < startDate || dateStr > endDate) {
      return NextResponse.json({ error: "日期必须属于所选月份" }, { status: 400 });
    }

    const hours = calcHoursFromTimes(startTime, endTime);
    if (hours <= 0) {
      return NextResponse.json({ error: "结束时间必须晚于开始时间" }, { status: 400 });
    }

    const coach = await prisma.coach.findFirst({
      where: { id: coachId, archived: false },
      select: { id: true, employmentType: true },
    });
    if (!coach) {
      return NextResponse.json({ error: "教练不存在" }, { status: 404 });
    }
    if (coach.employmentType !== "PART_TIME") {
      return NextResponse.json({ error: "仅兼职教练可手动增加工时" }, { status: 400 });
    }

    await createManualPartTimeHours({
      month,
      coachId,
      dateStr,
      startTime,
      endTime,
    });

    const { schedulesInMonth, storeMap } = await loadScheduleContext(month);
    const details = await buildPartTimeHoursDetails(month, coachId, schedulesInMonth, storeMap);
    return NextResponse.json(details);
  } catch (error) {
    console.error("Error creating manual part-time hours:", error);
    return NextResponse.json({ error: "Failed to create manual part-time hours" }, { status: 500 });
  }
}
