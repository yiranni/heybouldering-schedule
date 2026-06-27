import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, getSessionFromRequest, isManagerOrAdmin, unauthorized } from "@/app/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");
  if (!isManagerOrAdmin(session.role)) return forbidden("需要管理员或经理权限");

  const body = await request.json();
  const data: { spec?: string; price?: number; archived?: boolean } = {};
  if (body?.spec !== undefined) data.spec = String(body.spec).trim();
  if (body?.price !== undefined) data.price = Number(body.price);
  if (body?.archived !== undefined) data.archived = Boolean(body.archived);

  const variant = await prisma.productVariant.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(variant);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");
  if (!isManagerOrAdmin(session.role)) return forbidden("需要管理员或经理权限");

  await prisma.productVariant.update({ where: { id: params.id }, data: { archived: true } });
  return NextResponse.json({ success: true });
}
