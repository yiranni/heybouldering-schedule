import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可编辑提成规则");

    const body = await request.json();
    const updateData: { minAmount?: number; commissionRate?: number } = {};

    if (body?.minAmount !== undefined) {
      const minAmount = Number(body.minAmount);
      if (Number.isNaN(minAmount) || minAmount < 0) {
        return NextResponse.json({ error: "minAmount 必须是 >= 0 的数字" }, { status: 400 });
      }
      updateData.minAmount = minAmount;
    }

    if (body?.commissionRate !== undefined) {
      const commissionRate = Number(body.commissionRate);
      if (Number.isNaN(commissionRate) || commissionRate < 0 || commissionRate > 1) {
        return NextResponse.json(
          { error: "commissionRate 必须在 0~1 之间" },
          { status: 400 }
        );
      }
      updateData.commissionRate = commissionRate;
    }

    const rule = await prisma.commissionRule.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Error updating commission rule:", error);
    return NextResponse.json({ error: "Failed to update commission rule" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可编辑提成规则");

    await prisma.commissionRule.update({
      where: { id: params.id },
      data: { archived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting commission rule:", error);
    return NextResponse.json({ error: "Failed to delete commission rule" }, { status: 500 });
  }
}
