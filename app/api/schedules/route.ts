import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/schedules - Get all schedules (optionally filtered by date range)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where = startDate && endDate
      ? {
          dateStr: {
            gte: startDate,
            lte: endDate,
          },
        }
      : {};

    const schedules = await prisma.schedule.findMany({
      where,
      orderBy: { dateStr: 'asc' },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

// POST /api/schedules - Create multiple schedules (batch)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schedules } = body;

    if (!Array.isArray(schedules)) {
      return NextResponse.json({ error: 'schedules must be an array' }, { status: 400 });
    }

    // Validate each schedule
    for (const schedule of schedules) {
      if (!schedule.dateStr || !schedule.shiftId || !schedule.shiftName || !schedule.coachId || !schedule.storeId) {
        return NextResponse.json(
          { error: 'Each schedule must have dateStr, shiftId, shiftName, coachId, and storeId' },
          { status: 400 }
        );
      }
    }

    console.log('POST schedules - creating', schedules.length, 'schedules');
    console.log('Date range:', {
      min: Math.min(...schedules.map((s: any) => s.dateStr)),
      max: Math.max(...schedules.map((s: any) => s.dateStr))
    });

    // Create all schedules
    const createdSchedules = await prisma.schedule.createMany({
      data: schedules.map((s: any) => ({
        dateStr: s.dateStr,
        shiftId: s.shiftId,
        shiftName: s.shiftName,
        coachId: s.coachId,
        storeId: s.storeId,
      })),
    });

    console.log('Created schedules count:', createdSchedules.count);

    return NextResponse.json({ count: createdSchedules.count }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedules:', error);
    return NextResponse.json({ error: 'Failed to create schedules' }, { status: 500 });
  }
}

// DELETE /api/schedules - Delete schedules by date range
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('DELETE schedules called with:', { startDate, endDate });

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const deleted = await prisma.schedule.deleteMany({
      where: {
        dateStr: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    console.log('Deleted schedules count:', deleted.count);

    return NextResponse.json({ count: deleted.count });
  } catch (error) {
    console.error('Error deleting schedules:', error);
    return NextResponse.json({ error: 'Failed to delete schedules' }, { status: 500 });
  }
}
