import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// PUT /api/coaches/[id]/stores - Update coach's store associations
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { storeIds, primaryStoreId } = body;

    if (!Array.isArray(storeIds)) {
      return NextResponse.json(
        { error: 'storeIds must be an array' },
        { status: 400 }
      );
    }

    // Validate that at least one store is selected
    if (storeIds.length === 0) {
      return NextResponse.json(
        { error: 'Coach must be associated with at least one store' },
        { status: 400 }
      );
    }

    // If primaryStoreId is provided, ensure it's in the storeIds list
    if (primaryStoreId && !storeIds.includes(primaryStoreId)) {
      return NextResponse.json(
        { error: 'Primary store must be in the selected stores list' },
        { status: 400 }
      );
    }

    // Delete existing associations
    await prisma.coachStore.deleteMany({
      where: { coachId: params.id },
    });

    // Create new associations
    await prisma.coachStore.createMany({
      data: storeIds.map((storeId: string) => ({
        coachId: params.id,
        storeId,
        isPrimary: storeId === primaryStoreId || (storeIds.length === 1),
      })),
    });

    // Fetch and return updated coach with stores
    const coach = await prisma.coach.findUnique({
      where: { id: params.id },
      include: {
        stores: {
          include: {
            store: true,
          },
        },
      },
    });

    return NextResponse.json(coach);
  } catch (error) {
    console.error('Error updating coach stores:', error);
    return NextResponse.json({ error: 'Failed to update coach stores' }, { status: 500 });
  }
}
