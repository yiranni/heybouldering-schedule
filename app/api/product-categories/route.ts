import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, getSessionFromRequest, isManagerOrAdmin, unauthorized } from "@/app/lib/auth";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");

    const categories = await prisma.productCategory.findMany({
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching product categories:", error);
    return NextResponse.json({ error: "Failed to fetch product categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return unauthorized("请先登录");
    if (!isManagerOrAdmin(session.role)) return forbidden("需要管理员或经理权限");

    const body = await request.json();
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "name 为必填字段" }, { status: 400 });
    }

    const created = await prisma.productCategory.create({
      data: { name },
      select: { id: true, name: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating product category:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "种类名称已存在" }, { status: 409 });
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return NextResponse.json(
        { error: "数据库结构未更新，请运行 npx prisma db push" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to create product category" }, { status: 500 });
  }
}
