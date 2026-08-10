import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/app/lib/prisma';
import { forbidden, getSessionFromRequest, unauthorized } from '@/app/lib/auth';
import { hashPassword } from '@/app/lib/password';

const DEFAULT_COACH_PASSWORD = '12345678';

function normalizeAccountBase(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, '');
  return normalized || 'coach';
}

async function generateUniqueAccountId(base: string): Promise<string> {
  let candidate = base;
  let index = 1;

  while (true) {
    const exists = await prisma.user.findUnique({
      where: { accountId: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    index += 1;
    candidate = `${base}${index}`;
  }
}

// GET /api/coaches - Get all non-archived coaches
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return unauthorized('请先登录');

    const coaches = await prisma.coach.findMany({
      where: {
        archived: false,
      },
      include: {
        stores: {
          include: {
            store: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Transform coaches to include availability in the expected format
    const transformedCoaches = coaches.map((coach: any) => ({
      ...coach,
      availability: coach.weekSchedule ? {
        weekSchedule: coach.weekSchedule
      } : null
    }));

    return NextResponse.json(transformedCoaches);
  } catch (error) {
    console.error('Error fetching coaches:', error);
    return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 });
  }
}

// POST /api/coaches - Create a new coach
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return unauthorized('请先登录');
    if (session.role !== 'ADMIN') return forbidden('仅管理员可编辑教练');

    const body = await request.json();
    const { name, color, avatar, employmentType, weekSchedule, availability } = body;

    if (!name || !color || !avatar) {
      return NextResponse.json(
        { error: 'Missing required fields: name, color, avatar' },
        { status: 400 }
      );
    }

    const accountBase = normalizeAccountBase(name);
    const accountId = await generateUniqueAccountId(accountBase);
    const passwordHash = await hashPassword(DEFAULT_COACH_PASSWORD);
    const userId = randomUUID();
    const coachId = randomUUID();
    const resolvedEmploymentType = employmentType || 'FULL_TIME';
    const resolvedWeekSchedule = weekSchedule ?? availability?.weekSchedule;

    const coach = await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          accountId,
          passwordHash,
          role: 'COACH',
          name,
        },
      });

      return tx.coach.create({
        data: {
          id: coachId,
          userId,
          name,
          color,
          avatar,
          employmentType: resolvedEmploymentType,
          ...(resolvedWeekSchedule !== undefined && { weekSchedule: resolvedWeekSchedule }),
        },
        include: {
          stores: {
            include: {
              store: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        ...coach,
        availability: coach.weekSchedule ? {
          weekSchedule: coach.weekSchedule,
        } : null,
        account: {
          accountId,
          defaultPassword: DEFAULT_COACH_PASSWORD,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating coach:', error);
    return NextResponse.json({ error: 'Failed to create coach' }, { status: 500 });
  }
}
