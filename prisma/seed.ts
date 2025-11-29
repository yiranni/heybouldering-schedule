import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Clear existing data
  await prisma.coach.deleteMany();

  // Create initial coaches
  const coaches = await Promise.all([
    prisma.coach.create({
      data: {
        name: '教练A',
        color: 'bg-blue-500',
        avatar: 'A',
      },
    }),
    prisma.coach.create({
      data: {
        name: '教练B',
        color: 'bg-emerald-500',
        avatar: 'B',
      },
    }),
    prisma.coach.create({
      data: {
        name: '教练C',
        color: 'bg-purple-500',
        avatar: 'C',
      },
    }),
    prisma.coach.create({
      data: {
        name: '教练D',
        color: 'bg-amber-500',
        avatar: 'D',
      },
    }),
  ]);

  console.log('Created coaches:', coaches);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
