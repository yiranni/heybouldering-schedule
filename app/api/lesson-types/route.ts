import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/lesson-types - 获取所有课程类型
export async function GET() {
  try {
    const lessonTypes = await prisma.lessonType.findMany({
      where: { archived: false },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(lessonTypes);
  } catch (error) {
    console.error('Error fetching lesson types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson types' },
      { status: 500 }
    );
  }
}

// POST /api/lesson-types - 创建新课程类型
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, commission } = body;

    if (!name || commission === undefined) {
      return NextResponse.json(
        { error: 'Name and commission are required' },
        { status: 400 }
      );
    }

    const lessonType = await prisma.lessonType.create({
      data: {
        name,
        commission: parseFloat(commission),
      },
    });

    return NextResponse.json(lessonType, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson type:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson type' },
      { status: 500 }
    );
  }
}

