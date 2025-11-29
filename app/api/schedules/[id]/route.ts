import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// DELETE /api/schedules/[id] - Delete a single schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.schedule.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
