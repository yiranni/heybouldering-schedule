import { prisma } from "@/app/lib/prisma";

type PayrollSettingsDb = {
  findUnique(args: {
    where: { key: string };
    select: { value: true };
  }): Promise<{ value: unknown } | null>;
  upsert(args: {
    where: { key: string };
    create: { key: string; value: unknown };
    update: { value: unknown };
  }): Promise<unknown>;
};

const payrollSettingsDb = (prisma as unknown as { payrollSettings: PayrollSettingsDb })
  .payrollSettings;

export async function findPayrollSettingValue(key: string): Promise<unknown> {
  const row = await payrollSettingsDb.findUnique({
    where: { key },
    select: { value: true },
  });
  return row?.value;
}

export async function upsertPayrollSettingValue(key: string, value: unknown): Promise<void> {
  await payrollSettingsDb.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
