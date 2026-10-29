import { NextRequest, NextResponse } from "next/server";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { fetchOvertimeHourlyRate, saveOvertimeHourlyRate } from "@/app/lib/overtime.server";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可查看加班费配置");

    const hourlyRate = await fetchOvertimeHourlyRate();
    return NextResponse.json({ hourlyRate });
  } catch (error) {
    console.error("Error fetching overtime config:", error);
    return NextResponse.json({ error: "Failed to fetch overtime config" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可编辑加班费配置");

    const body = await request.json();
    const hourlyRate = Number(body?.hourlyRate);
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      return NextResponse.json({ error: "hourlyRate 无效" }, { status: 400 });
    }

    const saved = await saveOvertimeHourlyRate(hourlyRate);
    return NextResponse.json({ success: true, hourlyRate: saved });
  } catch (error) {
    console.error("Error saving overtime config:", error);
    return NextResponse.json({ error: "Failed to save overtime config" }, { status: 500 });
  }
}
