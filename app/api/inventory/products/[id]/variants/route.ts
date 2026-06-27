import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, getSessionFromRequest, isManagerOrAdmin, unauthorized } from "@/app/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");
  if (!isManagerOrAdmin(session.role)) return forbidden("需要管理员或经理权限");

  const body = await request.json();
  const spec = String(body?.spec || "").trim();
  const price = Number(body?.price);

  if (!spec) return NextResponse.json({ error: "spec 为必填字段" }, { status: 400 });
  if (Number.isNaN(price) || price < 0) {
    return NextResponse.json({ error: "price 必须为非负数" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "产品不存在" }, { status: 404 });

  const variant = await prisma.productVariant.create({
    data: { productId: params.id, spec, price },
  });

  return NextResponse.json(variant, { status: 201 });
}
