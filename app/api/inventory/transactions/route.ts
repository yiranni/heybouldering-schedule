import { NextRequest, NextResponse } from "next/server";
import {
  createInventoryTransaction,
  createInventoryTransactionWithSalesRecord,
  createTransferPair,
  findCoachIdByUserId,
  getVariantStoreStock,
  getVariantWithProduct,
  listInventoryTransactions,
  type InventoryTransactionType,
} from "@/app/lib/inventory.server";
import { forbidden, getSessionFromRequest, isManagerOrAdmin, unauthorized } from "@/app/lib/auth";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || undefined;
  const variantId = searchParams.get("variantId") || undefined;
  const type = searchParams.get("type") as InventoryTransactionType | null;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: Record<string, unknown> = {};
  if (storeId) where.storeId = storeId;
  if (variantId) where.variantId = variantId;
  if (type) where.type = type;
  if (startDate || endDate) {
    where.performedAt = {};
    if (startDate) (where.performedAt as Record<string, Date>).gte = new Date(`${startDate}T00:00:00`);
    if (endDate) (where.performedAt as Record<string, Date>).lte = new Date(`${endDate}T23:59:59`);
  }

  const transactions = await listInventoryTransactions(where);

  return NextResponse.json(transactions);
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return unauthorized("请先登录");

  const body = await request.json();
  const type = String(body?.type || "") as InventoryTransactionType;
  const validTypes: InventoryTransactionType[] = [
    "STOCK_IN", "TRANSFER_OUT", "RETURN", "ADJUSTMENT", "SALE", "WRITEOFF",
  ];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "无效的 type" }, { status: 400 });
  }

  // SALE (售卖) is open to all users; everything else requires manager/admin
  if (type !== "SALE" && !isManagerOrAdmin(session.role)) {
    return forbidden("入库/调货操作需要管理员或经理权限");
  }

  const variantId = String(body?.variantId || "").trim();
  const storeId = String(body?.storeId || "").trim();
  const quantityDelta = Number(body?.quantityDelta);
  const unitPrice = type === "WRITEOFF" ? 0 : Number(body?.unitPrice ?? 0);
  const note = body?.note ? String(body.note).trim() : null;
  const performedAt = body?.performedAt ? new Date(body.performedAt) : new Date();

  if (!variantId || !storeId) {
    return NextResponse.json({ error: "variantId 和 storeId 为必填字段" }, { status: 400 });
  }
  if (Number.isNaN(quantityDelta) || quantityDelta === 0) {
    return NextResponse.json({ error: "quantityDelta 不能为 0" }, { status: 400 });
  }

  // 门店间转移：body 中传 toStoreId，创建两条配对的流水
  if (type === "TRANSFER_OUT") {
    const toStoreId = String(body?.toStoreId || "").trim();
    if (!toStoreId) {
      return NextResponse.json({ error: "门店间转移需要 toStoreId" }, { status: 400 });
    }
    if (toStoreId === storeId) {
      return NextResponse.json({ error: "转出和转入门店不能相同" }, { status: 400 });
    }

    const qty = Math.abs(quantityDelta);
    const available = await getVariantStoreStock(variantId, storeId);
    if (available < qty) {
      return NextResponse.json(
        { error: `库存不足，当前库存 ${available}` },
        { status: 400 }
      );
    }

    const transferPairId = randomUUID();
    const [txOut, txIn] = await createTransferPair(
      {
        variantId,
        type: "TRANSFER_OUT",
        quantityDelta: -qty,
        unitPrice,
        note,
        performedById: session.userId,
        storeId,
        transferPairId,
        performedAt,
      },
      {
        variantId,
        type: "TRANSFER_IN",
        quantityDelta: qty,
        unitPrice,
        note,
        performedById: session.userId,
        storeId: toStoreId,
        transferPairId,
        performedAt,
      }
    );

    return NextResponse.json({ transferOut: txOut, transferIn: txIn }, { status: 201 });
  }

  const delta = (type === "SALE" || type === "WRITEOFF") ? -Math.abs(quantityDelta) : quantityDelta;

  if (type === "SALE" || type === "WRITEOFF" || (type === "ADJUSTMENT" && delta < 0)) {
    const available = await getVariantStoreStock(variantId, storeId);
    const needed = Math.abs(delta);
    if (available < needed) {
      return NextResponse.json(
        { error: `库存不足，当前库存 ${available}` },
        { status: 400 }
      );
    }
  }

  const invTxId = randomUUID();
  const needsSalesRecord = type === "SALE";

  let coachId: string | null = null;
  let productCategoryId: string | null = null;
  let productName = "";

  if (needsSalesRecord) {
    const variant = await getVariantWithProduct(variantId);
    if (!variant) {
      return NextResponse.json({ error: "variantId 无效" }, { status: 400 });
    }

    coachId = await findCoachIdByUserId(session.userId);
    productCategoryId = variant.categoryId;
    productName = [variant.brand, variant.name, variant.spec || null]
      .filter(Boolean)
      .join(" · ");
  }

  const invData = {
    id: invTxId,
    variantId,
    type,
    quantityDelta: delta,
    unitPrice,
    note,
    performedById: session.userId,
    storeId,
    performedAt,
  };

  const tx = needsSalesRecord
    ? await createInventoryTransactionWithSalesRecord(invData, {
        coachId,
        productCategoryId,
        productName,
        amount: unitPrice * Math.abs(delta),
        soldAt: performedAt,
        note: note ?? null,
        inventoryTransactionId: invTxId,
      })
    : await createInventoryTransaction(invData);

  return NextResponse.json(tx, { status: 201 });
}
