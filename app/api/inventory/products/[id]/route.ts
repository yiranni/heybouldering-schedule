import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, getSessionFromRequest, isManagerOrAdmin, unauthorized } from "@/app/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: { select: { id: true, name: true } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!product) return NextResponse.json({ error: "产品不存在" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");
  if (!isManagerOrAdmin(session.role)) return forbidden("需要管理员或经理权限");

  const body = await request.json();
  const data: { brand?: string; name?: string; archived?: boolean; categoryId?: string | null } = {};
  if (body?.brand !== undefined) data.brand = String(body.brand).trim();
  if (body?.name !== undefined) data.name = String(body.name).trim();
  if (body?.archived !== undefined) data.archived = Boolean(body.archived);
  if (body?.categoryId !== undefined) {
    const categoryId = body.categoryId ? String(body.categoryId).trim() : null;
    if (categoryId) {
      const category = await prisma.productCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json({ error: "categoryId 无效" }, { status: 400 });
      }
    }
    data.categoryId = categoryId;
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data,
    include: {
      category: { select: { id: true, name: true } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(product);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");
  if (!isManagerOrAdmin(session.role)) return forbidden("需要管理员或经理权限");

  await prisma.product.update({ where: { id: params.id }, data: { archived: true } });
  return NextResponse.json({ success: true });
}
