import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { forbidden, getSessionFromRequest, unauthorized } from '@/app/lib/auth';

// GET /api/stores - Get all non-archived stores
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return unauthorized('请先登录');

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
    const session = getSessionFromRequest(request);
    if (!session) return unauthorized('请先登录');
    if (session.role !== 'ADMIN') return forbidden('仅管理员可编辑门店');

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
