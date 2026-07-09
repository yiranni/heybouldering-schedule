import { NextRequest, NextResponse } from 'next/server';
import { unauthorized } from '@/app/lib/auth';
import { getFeatureFlagBoolean } from '@/app/lib/featureFlags.server';
import { resolveSalesAccess } from '@/app/lib/salesAccess';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized('请先登录');

    const value = await getFeatureFlagBoolean(params.id, false);
    return NextResponse.json({ id: params.id, value });
  } catch (error) {
    console.error('Error fetching feature flag:', error);
    return NextResponse.json({ error: 'Failed to fetch feature flag' }, { status: 500 });
  }
}
