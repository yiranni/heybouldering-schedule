import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin && !access.coachId) {
      return forbidden("当前账号未绑定教练档案，请联系管理员");
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const coachId = searchParams.get("coachId");

    const where: {
      soldAt?: { gte?: Date; lte?: Date };
      coachId?: string;
    } = {};

    if (startDate || endDate) {
      where.soldAt = {};
      if (startDate) where.soldAt.gte = new Date(`${startDate}T00:00:00`);
      if (endDate) where.soldAt.lte = new Date(`${endDate}T23:59:59`);
    }

    if (access.isAdmin) {
      if (coachId) where.coachId = coachId;
    } else {
      where.coachId = access.coachId || undefined;
    }

    const records = await prisma.salesRecord.findMany({
      where,
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
      orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching sales records:", error);
    return NextResponse.json({ error: "Failed to fetch sales records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin && !access.coachId) {
      return forbidden("当前账号未绑定教练档案，请联系管理员");
    }

    const body = await request.json();
    const salesCategoryId = String(body?.salesCategoryId || "").trim();
    const productName = String(body?.productName || "").trim();
    const soldAt = String(body?.soldAt || "");
    const amount = Number(body?.amount);
    const note = body?.note ? String(body.note) : null;

    if (!salesCategoryId || !productName || !soldAt || Number.isNaN(amount)) {
      return NextResponse.json(
        { error: "salesCategoryId/productName/soldAt/amount 为必填字段" },
        { status: 400 }
      );
    }
    if (amount <= 0) {
      return NextResponse.json({ error: "amount 必须大于 0" }, { status: 400 });
    }

    const createCoachId = access.isAdmin
      ? String(body?.coachId || "")
      : access.coachId || "";

    if (!createCoachId) {
      return NextResponse.json({ error: "coachId 无效" }, { status: 400 });
    }

    const categoryExists = await prisma.salesCategory.findUnique({
      where: { id: salesCategoryId },
      select: { id: true },
    });
    if (!categoryExists) {
      return NextResponse.json({ error: "salesCategoryId 无效" }, { status: 400 });
    }

    const record = await prisma.salesRecord.create({
      data: {
        coachId: createCoachId,
        salesCategoryId,
        productName,
        amount,
        soldAt: new Date(soldAt),
        note,
      },
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

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Error creating sales record:", error);
    return NextResponse.json({ error: "Failed to create sales record" }, { status: 500 });
  }
}
