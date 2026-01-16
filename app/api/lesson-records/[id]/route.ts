import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/lesson-records/[id] - 获取单个课程记录
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lessonRecord = await prisma.lessonRecord.findUnique({
      where: { id: params.id },
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

    if (!lessonRecord) {
      return NextResponse.json(
        { error: 'Lesson record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(lessonRecord);
  } catch (error) {
    console.error('Error fetching lesson record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson record' },
      { status: 500 }
    );
  }
}

// PUT /api/lesson-records/[id] - 更新课程记录
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { dateStr, lessonTypeId, coachId, note } = body;

    const updateData: {
      dateStr?: string;
      lessonTypeId?: string;
      coachId?: string;
      note?: string | null;
    } = {};

    if (dateStr !== undefined) updateData.dateStr = dateStr;
    if (lessonTypeId !== undefined) updateData.lessonTypeId = lessonTypeId;
    if (coachId !== undefined) updateData.coachId = coachId;
    if (note !== undefined) updateData.note = note || null;

    const lessonRecord = await prisma.lessonRecord.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(lessonRecord);
  } catch (error) {
    console.error('Error updating lesson record:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson record' },
      { status: 500 }
    );
  }
}

// DELETE /api/lesson-records/[id] - 删除课程记录
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.lessonRecord.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lesson record:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson record' },
      { status: 500 }
    );
  }
}

