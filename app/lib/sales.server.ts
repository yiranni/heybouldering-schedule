import { prisma } from "@/app/lib/prisma";

const salesRecordInclude = {
  coach: {
    select: {
      id: true,
      name: true,
      color: true,
      avatar: true,
    },
  },
  productCategory: {
    select: {
      id: true,
      name: true,
    },
  },
  inventoryTransaction: {
    select: {
      quantityDelta: true,
    },
  },
} as const;

export type SalesRecordWhereInput = {
  soldAt?: { gte?: Date; lte?: Date };
  coachId?: string;
};

type SalesRecordWithRelations = {
  id: string;
  coachId: string | null;
  productCategoryId: string | null;
  productName: string;
  amount: number;
  soldAt: Date;
  note: string | null;
  inventoryTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  coach: {
    id: string;
    name: string;
    color: string;
    avatar: string;
  } | null;
  productCategory: {
    id: string;
    name: string;
  } | null;
  inventoryTransaction: {
    quantityDelta: number;
  } | null;
};

export type SalesRecordListItem = Omit<SalesRecordWithRelations, "inventoryTransaction"> & {
  quantity: number | null;
};

type SalesRecordCreateInput = {
  coachId: string;
  productCategoryId: string;
  productName: string;
  amount: number;
  soldAt: Date;
  note: string | null;
};

type SalesDb = {
  salesRecord: {
    findMany: (args: {
      where: SalesRecordWhereInput;
      include: typeof salesRecordInclude;
      orderBy: Array<{ soldAt: "desc" } | { createdAt: "desc" }>;
    }) => Promise<SalesRecordWithRelations[]>;
    create: (args: {
      data: SalesRecordCreateInput;
      include: {
        coach: { select: { id: true; name: true; color: true; avatar: true } };
        productCategory: { select: { id: true; name: true } };
      };
    }) => Promise<SalesRecordWithRelations>;
  };
  productCategory: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

const db = prisma as unknown as SalesDb;

export async function listSalesRecords(
  where: SalesRecordWhereInput
): Promise<SalesRecordListItem[]> {
  const records = await db.salesRecord.findMany({
    where,
    include: salesRecordInclude,
    orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }],
  });

  return records.map(({ inventoryTransaction, ...record }) => ({
    ...record,
    quantity: inventoryTransaction
      ? Math.abs(inventoryTransaction.quantityDelta)
      : null,
  }));
}

export async function findProductCategoryById(id: string) {
  return db.productCategory.findUnique({
    where: { id },
    select: { id: true },
  });
}

export async function createSalesRecord(data: SalesRecordCreateInput) {
  return db.salesRecord.create({
    data,
    include: {
      coach: {
        select: {
          id: true,
          name: true,
          color: true,
          avatar: true,
        },
      },
      productCategory: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}
