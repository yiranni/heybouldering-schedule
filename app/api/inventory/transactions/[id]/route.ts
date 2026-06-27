import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, getSessionFromRequest, isManagerOrAdmin, unauthorized } from "@/app/lib/auth";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");
  if (!isManagerOrAdmin(session.role)) return forbidden("需要管理员或经理权限");

  const tx = await prisma.inventoryTransaction.findUnique({ where: { id: params.id } });
  if (!tx) return NextResponse.json({ error: "记录不存在" }, { status: 404 });

  if (tx.transferPairId) {
    await prisma.inventoryTransaction.deleteMany({ where: { transferPairId: tx.transferPairId } });
  } else {
    // Delete linked SalesRecord first (if this was a SALE)
    await prisma.salesRecord.deleteMany({ where: { inventoryTransactionId: params.id } });
    await prisma.inventoryTransaction.delete({ where: { id: params.id } });
  }

  return NextResponse.json({ success: true });
}
