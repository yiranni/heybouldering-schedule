import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");

    const categories = await prisma.salesCategory.findMany({
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching sales categories:", error);
    return NextResponse.json({ error: "Failed to fetch sales categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可新增销售类别");

    const body = await request.json();
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "name 为必填字段" }, { status: 400 });
    }

    const created = await prisma.salesCategory.create({
      data: { name },
      select: { id: true, name: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating sales category:", error);
    return NextResponse.json({ error: "Failed to create sales category" }, { status: 500 });
  }
}
