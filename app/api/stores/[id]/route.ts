import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/stores/[id] - Get a single store
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { id: params.id },
      include: {
        coaches: {
          include: {
            coach: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 });
  }
}

// PUT /api/stores/[id] - Update a store
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, shifts } = body;

    const store = await prisma.store.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(shifts !== undefined && { shifts }),
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}

// DELETE /api/stores/[id] - Soft delete a store (archive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.store.update({
      where: { id: params.id },
      data: { archived: true },
    });

    return NextResponse.json({ message: 'Store archived successfully' });
  } catch (error) {
    console.error('Error archiving store:', error);
    return NextResponse.json({ error: 'Failed to archive store' }, { status: 500 });
  }
}
