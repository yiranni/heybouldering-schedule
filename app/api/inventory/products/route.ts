import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, getSessionFromRequest, isManagerOrAdmin, unauthorized } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("includeArchived") === "true";

  const products = await prisma.product.findMany({
    where: includeArchived ? undefined : { archived: false },
    include: {
      variants: {
        where: includeArchived ? undefined : { archived: false },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");
  if (!isManagerOrAdmin(session.role)) return forbidden("需要管理员或经理权限");

  const body = await request.json();
  const brand = String(body?.brand || "").trim();
  const name = String(body?.name || "").trim();
  const variants: Array<{ spec: string; price: number }> = Array.isArray(body?.variants)
    ? body.variants
    : [];

  if (!brand || !name) {
    return NextResponse.json({ error: "brand 和 name 为必填字段" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      brand,
      name,
      variants: {
        create: variants.map((v) => ({
          spec: String(v.spec || "").trim(),
          price: Number(v.price) || 0,
        })),
      },
    },
    include: {
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(product, { status: 201 });
}
