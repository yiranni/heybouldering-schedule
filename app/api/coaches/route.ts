import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/coaches - Get all non-archived coaches
export async function GET() {
  try {
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
    const body = await request.json();
    const { name, color, avatar, employmentType, weekSchedule } = body;

    if (!name || !color || !avatar) {
      return NextResponse.json(
        { error: 'Missing required fields: name, color, avatar' },
        { status: 400 }
      );
    }

    const coach = await prisma.coach.create({
      data: {
        name,
        color,
        avatar,
        employmentType: employmentType || 'FULL_TIME',
        weekSchedule: weekSchedule || null,
      },
    });

    return NextResponse.json(coach, { status: 201 });
  } catch (error) {
    console.error('Error creating coach:', error);
    return NextResponse.json({ error: 'Failed to create coach' }, { status: 500 });
  }
}
