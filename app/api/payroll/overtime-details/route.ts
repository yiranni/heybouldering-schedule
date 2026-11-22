import { NextRequest, NextResponse } from "next/server";
import { forbidden, unauthorized } from "@/app/lib/auth";
import {
  calcOvertimePay,
  fetchOvertimeHourlyRate,
  listOvertimeRequestsForCoachMonth,
} from "@/app/lib/overtime.server";
import {
  canAccessCoachPayrollDetail,
  resolvePayrollAccess,
} from "@/app/lib/payrollSelfAccess.server";

function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

export async function GET(request: NextRequest) {
  try {
    const access = await resolvePayrollAccess(request);
    if (!access) return forbidden("无权查看加班明细");

    const params = new URL(request.url).searchParams;
    const month = params.get("month") || "";
    const coachId = params.get("coachId") || "";
    if (!isValidMonth(month) || !coachId) {
      return NextResponse.json({ error: "month 与 coachId 为必填项" }, { status: 400 });
    }
    if (!canAccessCoachPayrollDetail(access, coachId)) {
      return forbidden("仅能查看本人的加班明细");
    }

    const [items, hourlyRate] = await Promise.all([
      listOvertimeRequestsForCoachMonth(coachId, month),
      fetchOvertimeHourlyRate(),
    ]);
    const totalHours = Math.round(items.reduce((sum, item) => sum + item.hours, 0) * 100) / 100;
    const overtimePay = calcOvertimePay(totalHours, hourlyRate);

    return NextResponse.json({ items, totalHours, hourlyRate, overtimePay });
  } catch (error) {
    console.error("Error fetching overtime details:", error);
    return NextResponse.json({ error: "Failed to fetch overtime details" }, { status: 500 });
  }
}
