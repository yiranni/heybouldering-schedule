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
    const exists = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM users
      WHERE account_id = ${candidate}
      LIMIT 1
    `;
    if (exists.length === 0) return candidate;
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
    const { name, color, avatar, employmentType, weekSchedule } = body;

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
    const resolvedWeekSchedule = weekSchedule ? JSON.stringify(weekSchedule) : null;

    const coach = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO users (id, account_id, "passwordHash", role, name, "createdAt", "updatedAt")
        VALUES (${userId}, ${accountId}, ${passwordHash}, 'COACH'::"Role", ${name}, NOW(), NOW())
      `;

      await tx.$executeRaw`
        INSERT INTO coaches (
          id,
          user_id,
          name,
          color,
          avatar,
          archived,
          "employmentType",
          "weekSchedule",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${coachId},
          ${userId},
          ${name},
          ${color},
          ${avatar},
          false,
          ${resolvedEmploymentType},
          ${resolvedWeekSchedule}::jsonb,
          NOW(),
          NOW()
        )
      `;

      const coaches = await tx.$queryRaw<
        Array<{
          id: string;
          userId: string | null;
          name: string;
          color: string;
          avatar: string;
          archived: boolean;
          employmentType: string;
          weekSchedule: unknown;
          createdAt: Date;
          updatedAt: Date;
        }>
      >`
        SELECT
          id,
          user_id AS "userId",
          name,
          color,
          avatar,
          archived,
          "employmentType",
          "weekSchedule",
          "createdAt",
          "updatedAt"
        FROM coaches
        WHERE id = ${coachId}
      `;

      const createdCoach = coaches[0];
      if (!createdCoach) {
        throw new Error('Failed to create coach');
      }

      return createdCoach;
    });

    return NextResponse.json(
      {
        ...coach,
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
