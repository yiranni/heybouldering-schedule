import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/coaches/[id] - Get a single coach
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const coach = await prisma.coach.findUnique({
      where: { id: params.id },
    });

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    return NextResponse.json(coach);
  } catch (error) {
    console.error('Error fetching coach:', error);
    return NextResponse.json({ error: 'Failed to fetch coach' }, { status: 500 });
  }
}

// PUT /api/coaches/[id] - Update a coach
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, color, avatar, employmentType, availability } = body;

    const coach = await prisma.coach.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(avatar && { avatar }),
        ...(employmentType && { employmentType }),
        ...(availability?.weekSchedule !== undefined && { weekSchedule: availability.weekSchedule }),
      },
      include: {
        stores: {
          include: {
            store: true,
          },
        },
      },
    });

    // Transform to include availability in the expected format
    const transformedCoach = {
      ...coach,
      availability: coach.weekSchedule ? {
        weekSchedule: coach.weekSchedule
      } : null
    };

    return NextResponse.json(transformedCoach);
  } catch (error) {
    console.error('Error updating coach:', error);
    return NextResponse.json({ error: 'Failed to update coach' }, { status: 500 });
  }
}

// DELETE /api/coaches/[id] - Soft delete a coach (archive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.coach.update({
      where: { id: params.id },
      data: { archived: true },
    });

    return NextResponse.json({ message: 'Coach archived successfully' });
  } catch (error) {
    console.error('Error archiving coach:', error);
    return NextResponse.json({ error: 'Failed to archive coach' }, { status: 500 });
  }
}
