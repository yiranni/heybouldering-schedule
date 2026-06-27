import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionFromRequest, unauthorized } from "@/app/lib/auth";

export type StockEntry = {
  variantId: string;
  storeId: string;
  quantity: number;
};

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || undefined;
  const variantId = searchParams.get("variantId") || undefined;

  const where: { storeId?: string; variantId?: string } = {};
  if (storeId) where.storeId = storeId;
  if (variantId) where.variantId = variantId;

  const rows = await prisma.inventoryTransaction.groupBy({
    by: ["variantId", "storeId"],
    where,
    _sum: { quantityDelta: true },
  });

  const stock: StockEntry[] = rows.map((r) => ({
    variantId: r.variantId,
    storeId: r.storeId,
    quantity: r._sum.quantityDelta ?? 0,
  }));

  return NextResponse.json(stock);
}
