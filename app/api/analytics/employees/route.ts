import { NextRequest, NextResponse } from "next/server";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { resolveSalesAccess } from "@/app/lib/salesAccess";
import {
  buildEmployeePayrollTrends,
  currentYearMonth,
  EMPLOYEE_ANALYTICS_START_MONTH,
  enumerateMonthsInclusive,
} from "@/app/lib/employeeAnalytics.server";
import { isValidPayrollMonth as isValidMonth } from "@/app/lib/payrollCompute.server";

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可查看员工分析");

    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get("from") || EMPLOYEE_ANALYTICS_START_MONTH;
    const endMonth = searchParams.get("to") || currentYearMonth();

    if (!isValidMonth(startMonth) || !isValidMonth(endMonth)) {
      return NextResponse.json({ error: "from/to 格式应为 YYYY-MM" }, { status: 400 });
    }

    const span = enumerateMonthsInclusive(startMonth, endMonth);
    if (span.length === 0) {
      return NextResponse.json({ error: "结束月份不能早于开始月份" }, { status: 400 });
    }

    const data = await buildEmployeePayrollTrends(startMonth, endMonth);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching employee analytics:", error);
    return NextResponse.json({ error: "Failed to fetch employee analytics" }, { status: 500 });
  }
}
