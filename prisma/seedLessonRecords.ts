import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RECORD_COUNT = 50;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function randomDateInLastMonths(months: number): string {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const randomMs = startMs + Math.random() * (endMs - startMs);
  return toDateStr(new Date(randomMs));
}

async function main() {
  const [coaches, lessonTypes] = await Promise.all([
    prisma.coach.findMany({
      where: { archived: false },
      select: { id: true, name: true },
    }),
    prisma.lessonType.findMany({
      where: { archived: false },
      select: { id: true, name: true },
    }),
  ]);

  if (coaches.length === 0) {
    throw new Error("没有可用教练，请先创建教练数据");
  }
  if (lessonTypes.length === 0) {
    throw new Error("没有可用课程类型，请先在课程管理中维护");
  }

  const records = Array.from({ length: RECORD_COUNT }, () => {
    const lessonType = randomItem(lessonTypes);
    const isNovice = lessonType.name === "新手课";
    const studentCount = isNovice ? randomInt(1, 6) : randomInt(1, 12);

    return {
      dateStr: randomDateInLastMonths(3),
      lessonTypeId: lessonType.id,
      coachId: randomItem(coaches).id,
      studentCount,
      note: Math.random() < 0.2 ? "测试数据" : null,
    };
  });

  const result = await prisma.lessonRecord.createMany({ data: records });

  console.log(`已随机生成 ${result.count} 条课程记录`);
  console.log(`教练数: ${coaches.length}，课程类型数: ${lessonTypes.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
