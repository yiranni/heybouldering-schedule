import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");

    const rules = await prisma.commissionRule.findMany({
      where: { archived: false },
      orderBy: { minAmount: "asc" },
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching commission rules:", error);
    return NextResponse.json({ error: "Failed to fetch commission rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可编辑提成规则");

    const body = await request.json();
    const minAmount = Number(body?.minAmount);
    const commissionRate = Number(body?.commissionRate);

    if (Number.isNaN(minAmount) || Number.isNaN(commissionRate)) {
      return NextResponse.json(
        { error: "minAmount 和 commissionRate 为必填字段" },
        { status: 400 }
      );
    }
    if (minAmount < 0) {
      return NextResponse.json({ error: "minAmount 不能小于 0" }, { status: 400 });
    }
    if (commissionRate < 0 || commissionRate > 1) {
      return NextResponse.json({ error: "commissionRate 必须在 0~1 之间" }, { status: 400 });
    }

    const rule = await prisma.commissionRule.create({
      data: { minAmount, commissionRate },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Error creating commission rule:", error);
    return NextResponse.json({ error: "Failed to create commission rule" }, { status: 500 });
  }
}
