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

    const existing = await prisma.salesRecord.findUnique({
      where: { id: params.id },
      select: { id: true, coachId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    if (!access.isAdmin && existing.coachId !== access.coachId) {
      return forbidden("无权限修改他人销售记录");
    }

    const body = await request.json();
    const updateData: {
      coachId?: string;
      salesCategoryId?: string | null;
      productName?: string;
      amount?: number;
      soldAt?: Date;
      note?: string | null;
    } = {};

    if (body?.salesCategoryId !== undefined) {
      const salesCategoryId = String(body.salesCategoryId).trim();
      if (!salesCategoryId) {
        return NextResponse.json({ error: "salesCategoryId 不能为空" }, { status: 400 });
      }
      const categoryExists = await prisma.salesCategory.findUnique({
        where: { id: salesCategoryId },
        select: { id: true },
      });
      if (!categoryExists) {
        return NextResponse.json({ error: "salesCategoryId 无效" }, { status: 400 });
      }
      updateData.salesCategoryId = salesCategoryId;
    }
    if (body?.productName !== undefined) updateData.productName = String(body.productName).trim();
    if (body?.soldAt !== undefined) updateData.soldAt = new Date(String(body.soldAt));
    if (body?.amount !== undefined) {
      const amount = Number(body.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: "amount 必须大于 0" }, { status: 400 });
      }
      updateData.amount = amount;
    }
    if (body?.note !== undefined) updateData.note = body.note ? String(body.note) : null;

    if (access.isAdmin && body?.coachId !== undefined) {
      updateData.coachId = String(body.coachId);
    }

    const record = await prisma.salesRecord.update({
      where: { id: params.id },
      data: updateData,
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            color: true,
            avatar: true,
          },
        },
        salesCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error updating sales record:", error);
    return NextResponse.json({ error: "Failed to update sales record" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");

    const existing = await prisma.salesRecord.findUnique({
      where: { id: params.id },
      select: { id: true, coachId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    if (!access.isAdmin && existing.coachId !== access.coachId) {
      return forbidden("无权限删除他人销售记录");
    }

    await prisma.salesRecord.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sales record:", error);
    return NextResponse.json({ error: "Failed to delete sales record" }, { status: 500 });
  }
}
