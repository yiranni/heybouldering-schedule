import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

type InventoryDb = {
  inventoryTransaction: {
    findMany: (
      args: Prisma.InventoryTransactionFindManyArgs
    ) => Prisma.PrismaPromise<Prisma.InventoryTransactionGetPayload<Prisma.InventoryTransactionDefaultArgs>[]>;
    aggregate: (
      args: Prisma.InventoryTransactionAggregateArgs
    ) => Prisma.PrismaPromise<Prisma.GetInventoryTransactionAggregateType<Prisma.InventoryTransactionAggregateArgs>>;
    create: <T extends Prisma.InventoryTransactionCreateArgs>(
      args: T
    ) => Prisma.PrismaPromise<Prisma.InventoryTransactionGetPayload<T>>;
  };
  salesRecord: {
    create: (args: { data: Prisma.SalesRecordUncheckedCreateInput }) => Prisma.PrismaPromise<unknown>;
  };
  $transaction: typeof prisma.$transaction;
};

const db = prisma as unknown as InventoryDb;

export type VariantWithProduct = {
  spec: string;
  brand: string;
  name: string;
  categoryId: string | null;
};

export type InventoryTransactionType =
  | "STOCK_IN"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "RETURN"
  | "ADJUSTMENT"
  | "SALE"
  | "WRITEOFF";

const inventoryTxInclude = {
  variant: { include: { product: { select: { id: true, brand: true, name: true, categoryId: true } } } },
  store: { select: { id: true, name: true } },
  performedBy: { select: { id: true, name: true, role: true } },
} satisfies Prisma.InventoryTransactionInclude;

export async function listInventoryTransactions(where: Prisma.InventoryTransactionWhereInput) {
  const transactions = await db.inventoryTransaction.findMany({
    where,
    include: {
      variant: { include: { product: { select: { id: true, brand: true, name: true } } } },
      store: { select: { id: true, name: true } },
      performedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  return transactions.map((tx) =>
    tx.type === "WRITEOFF" ? { ...tx, unitPrice: 0 } : tx
  );
}

export async function getVariantStoreStock(variantId: string, storeId: string): Promise<number> {
  const agg = await db.inventoryTransaction.aggregate({
    where: { variantId, storeId },
    _sum: { quantityDelta: true },
  });
  return agg._sum?.quantityDelta ?? 0;
}

type InventoryTxCreateData = {
  id?: string;
  variantId: string;
  type: InventoryTransactionType;
  quantityDelta: number;
  unitPrice: number;
  note: string | null;
  performedById: string;
  storeId: string;
  transferPairId?: string;
  performedAt: Date;
};

export async function createTransferPair(
  outData: InventoryTxCreateData,
  inData: InventoryTxCreateData
) {
  return db.$transaction([
    db.inventoryTransaction.create({ data: outData }),
    db.inventoryTransaction.create({ data: inData }),
  ]);
}

export async function createInventoryTransaction(data: InventoryTxCreateData) {
  return db.inventoryTransaction.create({
    data,
    include: inventoryTxInclude,
  });
}

export async function createInventoryTransactionWithSalesRecord(
  invData: InventoryTxCreateData,
  salesData: Prisma.SalesRecordUncheckedCreateInput
) {
  const invTxCreate = db.inventoryTransaction.create({
    data: invData,
    include: inventoryTxInclude,
  });
  const [invTx] = await db.$transaction([
    invTxCreate,
    db.salesRecord.create({ data: salesData }),
  ]);
  return invTx;
}

export async function getVariantWithProduct(
  variantId: string
): Promise<VariantWithProduct | null> {
  const rows = await prisma.$queryRaw<VariantWithProduct[]>`
    SELECT
      pv.spec,
      p.brand,
      p.name,
      p."categoryId" AS "categoryId"
    FROM product_variants pv
    INNER JOIN products p ON p.id = pv."productId"
    WHERE pv.id = ${variantId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findCoachIdByUserId(userId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM coaches
    WHERE "userId" = ${userId} AND archived = false
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}
