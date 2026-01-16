import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/lesson-records - 获取课程记录列表（支持筛选）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const coachId = searchParams.get('coachId');
    const lessonTypeId = searchParams.get('lessonTypeId');

    const where: {
      dateStr?: { gte?: string; lte?: string };
      coachId?: string;
      lessonTypeId?: string;
    } = {};

    if (startDate || endDate) {
      where.dateStr = {};
      if (startDate) where.dateStr.gte = startDate;
      if (endDate) where.dateStr.lte = endDate;
    }

    if (coachId) {
      where.coachId = coachId;
    }

    if (lessonTypeId) {
      where.lessonTypeId = lessonTypeId;
    }

    const lessonRecords = await prisma.lessonRecord.findMany({
      where,
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            color: true,
            avatar: true,
          },
        },
        lessonType: {
          select: {
            id: true,
            name: true,
            commission: true,
          },
        },
      },
      orderBy: [
        { dateStr: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(lessonRecords);
  } catch (error) {
    console.error('Error fetching lesson records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson records' },
      { status: 500 }
    );
  }
}

// POST /api/lesson-records - 创建课程记录
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dateStr, lessonTypeId, coachId, note } = body;

    if (!dateStr || !lessonTypeId || !coachId) {
      return NextResponse.json(
        { error: 'Missing required fields: dateStr, lessonTypeId, coachId' },
        { status: 400 }
      );
    }

    const lessonRecord = await prisma.lessonRecord.create({
      data: {
        dateStr,
        lessonTypeId,
        coachId,
        note: note || null,
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            color: true,
            avatar: true,
          },
        },
        lessonType: {
          select: {
            id: true,
            name: true,
            commission: true,
          },
        },
      },
    });

    return NextResponse.json(lessonRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson record:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson record' },
      { status: 500 }
    );
  }
}

