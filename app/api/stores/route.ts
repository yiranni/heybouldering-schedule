import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/stores - Get all non-archived stores
export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      where: {
        archived: false,
      },
      include: {
        coaches: {
          include: {
            coach: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return NextResponse.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

// POST /api/stores - Create a new store
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, shifts } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const store = await prisma.store.create({
      data: {
        name,
        shifts: shifts || [],
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}
