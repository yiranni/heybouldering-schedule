import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { forbidden, unauthorized } from '@/app/lib/auth';
import { resolveSalesAccess } from '@/app/lib/salesAccess';
import { lessonRecordInclude, buildLessonRecordUpdateData } from '@/app/lib/lessonRecord.server';

// GET /api/lesson-records/[id] - 获取单个课程记录
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized('请先登录');

    const lessonRecord = await prisma.lessonRecord.findUnique({
      where: { id: params.id },
      include: lessonRecordInclude,
    });

    if (!lessonRecord) {
      return NextResponse.json(
        { error: 'Lesson record not found' },
        { status: 404 }
      );
    }
    if (!access.isAdmin && lessonRecord.coachId !== access.coachId) {
      return forbidden('无权限查看他人课程记录');
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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized('请先登录');

    const existing = await prisma.lessonRecord.findUnique({
      where: { id: params.id },
      select: { id: true, coachId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Lesson record not found' }, { status: 404 });
    }
    if (!access.isAdmin && existing.coachId !== access.coachId) {
      return forbidden('无权限修改他人课程记录');
    }

    const body = await request.json();
    const { dateStr, lessonTypeId, coachId, studentCount, storeId, note } = body;

    const lessonRecord = await prisma.lessonRecord.update({
      where: { id: params.id },
      data: buildLessonRecordUpdateData({
        ...(dateStr !== undefined ? { dateStr } : {}),
        ...(lessonTypeId !== undefined ? { lessonTypeId } : {}),
        ...(coachId !== undefined && access.isAdmin ? { coachId } : {}),
        ...(studentCount !== undefined ? { studentCount } : {}),
        ...(storeId !== undefined ? { storeId: storeId || null } : {}),
        ...(note !== undefined ? { note: note || null } : {}),
      }),
      include: lessonRecordInclude,
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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized('请先登录');

    const existing = await prisma.lessonRecord.findUnique({
      where: { id: params.id },
      select: { id: true, coachId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Lesson record not found' }, { status: 404 });
    }
    if (!access.isAdmin && existing.coachId !== access.coachId) {
      return forbidden('无权限删除他人课程记录');
    }

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

