import { NextRequest, NextResponse } from "next/server";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { createOvertimeRequest, coachCanUseStoreForOvertime } from "@/app/lib/overtime.server";
import { resolveSalesAccess } from "@/app/lib/salesAccess";
import { calcHoursFromTimes } from "@/app/lib/scheduleHours";
import { prisma } from "@/app/lib/prisma";

function isValidDateStr(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function isValidTime(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) {
      return forbidden("仅管理员可录入加班记录");
    }

    const body = await request.json();
    const coachId = String(body?.coachId || "").trim();
    const dateStr = String(body?.dateStr || "");
    const startTime = String(body?.startTime || "");
    const endTime = String(body?.endTime || "");
    const storeId = String(body?.storeId || "").trim();
    let hours = Number(body?.hours);

    if (!coachId) {
      return NextResponse.json({ error: "coachId 为必填项" }, { status: 400 });
    }

    const coach = await prisma.coach.findFirst({
      where: { id: coachId, archived: false },
      select: { id: true },
    });
    if (!coach) {
      return NextResponse.json({ error: "教练不存在" }, { status: 400 });
    }

    if (!storeId) {
      return NextResponse.json({ error: "请选择加班门店" }, { status: 400 });
    }

    const storeExists = await prisma.store.findFirst({
      where: { id: storeId, archived: false },
      select: { id: true },
    });
    if (!storeExists) {
      return NextResponse.json({ error: "门店无效" }, { status: 400 });
    }

    const canUseStore = await coachCanUseStoreForOvertime(coachId, storeId);
    if (!canUseStore) {
      return NextResponse.json({ error: "该教练未关联所选门店" }, { status: 400 });
    }

    if (!isValidDateStr(dateStr)) {
      return NextResponse.json({ error: "日期格式无效" }, { status: 400 });
    }
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return NextResponse.json({ error: "开始/结束时间格式无效" }, { status: 400 });
    }
    const hoursFromTimes = calcHoursFromTimes(startTime, endTime);
    if (hoursFromTimes <= 0) {
      return NextResponse.json({ error: "结束时间须晚于开始时间" }, { status: 400 });
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      hours = hoursFromTimes;
    }

    const created = await createOvertimeRequest({
      coachId,
      storeId,
      dateStr,
      startTime,
      endTime,
      hours: Math.round(hours * 100) / 100,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating overtime request:", error);
    return NextResponse.json({ error: "Failed to create overtime request" }, { status: 500 });
  }
}
