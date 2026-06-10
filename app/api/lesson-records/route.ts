import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { forbidden, unauthorized } from '@/app/lib/auth';
import { resolveSalesAccess } from '@/app/lib/salesAccess';

// GET /api/lesson-records - 获取课程记录列表（支持筛选）
export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized('请先登录');
    if (!access.isAdmin && !access.coachId) {
      return forbidden('当前账号未绑定教练档案，请联系管理员');
    }

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

    if (access.isAdmin) {
      if (coachId) where.coachId = coachId;
    } else {
      where.coachId = access.coachId || undefined;
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
            pricingType: true,
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
export async function POST(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized('请先登录');
    if (!access.isAdmin && !access.coachId) {
      return forbidden('当前账号未绑定教练档案，请联系管理员');
    }

    const body = await request.json();
    const dateStr = String(body?.dateStr || '');
    const lessonTypeId = String(body?.lessonTypeId || '');
    const note = body?.note ? String(body.note) : null;
    const studentCount = Number(body?.studentCount ?? 1);
    const coachId = access.isAdmin ? String(body?.coachId || '') : (access.coachId || '');

    if (!dateStr || !lessonTypeId || !coachId) {
      return NextResponse.json(
        { error: 'Missing required fields: dateStr, lessonTypeId, coachId' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(studentCount) || studentCount < 1) {
      return NextResponse.json({ error: '人数必须大于等于 1' }, { status: 400 });
    }

    const lessonRecord = await prisma.lessonRecord.create({
      data: {
        dateStr,
        lessonTypeId,
        coachId,
        studentCount,
        note,
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
            pricingType: true,
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

