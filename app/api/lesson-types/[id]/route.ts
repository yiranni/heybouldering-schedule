import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/lesson-types/[id] - 获取单个课程类型
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lessonType = await prisma.lessonType.findUnique({
      where: { id: params.id },
    });

    if (!lessonType) {
      return NextResponse.json(
        { error: 'Lesson type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(lessonType);
  } catch (error) {
    console.error('Error fetching lesson type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson type' },
      { status: 500 }
    );
  }
}

// PUT /api/lesson-types/[id] - 更新课程类型
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, commission } = body;

    const updateData: { name?: string; commission?: number } = {};
    if (name !== undefined) updateData.name = name;
    if (commission !== undefined) updateData.commission = parseFloat(commission);

    const lessonType = await prisma.lessonType.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(lessonType);
  } catch (error) {
    console.error('Error updating lesson type:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson type' },
      { status: 500 }
    );
  }
}

// DELETE /api/lesson-types/[id] - 删除课程类型（软删除）
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.lessonType.update({
      where: { id: params.id },
      data: { archived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lesson type:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson type' },
      { status: 500 }
    );
  }
}

