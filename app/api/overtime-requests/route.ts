import { NextRequest, NextResponse } from "next/server";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { createOvertimeRequest } from "@/app/lib/overtime.server";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

function isValidDateStr(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (access.isAdmin) return forbidden("管理员无需提交加班申请");
    if (access.session.role !== "MANAGER" && access.session.role !== "COACH") {
      return forbidden("无权限提交加班申请");
    }
    if (!access.coachId) {
      return NextResponse.json({ error: "当前账号未关联教练，无法提交加班申请" }, { status: 400 });
    }

    const body = await request.json();
    const dateStr = String(body?.dateStr || "");
    const hours = Number(body?.hours);

    if (!isValidDateStr(dateStr)) {
      return NextResponse.json({ error: "日期格式无效" }, { status: 400 });
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      return NextResponse.json({ error: "时长必须大于 0" }, { status: 400 });
    }

    const created = await createOvertimeRequest({
      coachId: access.coachId,
      dateStr,
      hours: Math.round(hours * 100) / 100,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating overtime request:", error);
    return NextResponse.json({ error: "Failed to create overtime request" }, { status: 500 });
  }
}
