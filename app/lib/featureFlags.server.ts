import { prisma } from '@/app/lib/prisma';

type FeatureFlagDb = {
  findUnique(args: {
    where: { id: string };
    select: { value: true };
  }): Promise<{ value: unknown } | null>;
};

const featureFlagDb = (prisma as unknown as { featureFlag: FeatureFlagDb }).featureFlag;

export async function getFeatureFlagBoolean(id: string, defaultValue = false): Promise<boolean> {
  const flag = await featureFlagDb.findUnique({
    where: { id },
    select: { value: true },
  });

  if (!flag) return defaultValue;

  const { value } = flag;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;

  return defaultValue;
}
