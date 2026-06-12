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

function randomDateInMonth(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const day = randomInt(1, lastDay);
  return `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
}

function parseArgs() {
  const monthArg = process.argv.find((arg) => arg.startsWith("--month="));
  const month = monthArg?.slice("--month=".length);
  const append = process.argv.includes("--append") || Boolean(month);
  const countArg = process.argv.find((arg) => arg.startsWith("--count="));
  const count = countArg ? Number(countArg.slice("--count=".length)) : RECORD_COUNT;

  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("month 格式应为 YYYY-MM，例如 2026-06");
  }
  if (!Number.isFinite(count) || count < 1) {
    throw new Error("count 必须为正整数");
  }

  return { month, append, count };
}

function buildStudentCount(lessonTypeName: string): number {
  const isSingleNovice = lessonTypeName === "单人新手课";
  const isMultiNovice = lessonTypeName === "多人新手课";
  const isLegacyNovice = lessonTypeName === "新手课";
  if (isSingleNovice) return 1;
  if (isMultiNovice) return randomInt(2, 8);
  if (isLegacyNovice) return randomInt(1, 6);
  return randomInt(1, 12);
}

async function main() {
  const { month, append, count } = parseArgs();
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

  if (!append) {
    const deleted = await prisma.lessonRecord.deleteMany();
    console.log(`已清除 ${deleted.count} 条课程记录`);
  }

  const records = Array.from({ length: count }, () => {
    const lessonType = randomItem(lessonTypes);
    return {
      dateStr: month ? randomDateInMonth(month) : randomDateInLastMonths(3),
      lessonTypeId: lessonType.id,
      coachId: randomItem(coaches).id,
      studentCount: buildStudentCount(lessonType.name),
      note: Math.random() < 0.2 ? "测试数据" : null,
    };
  });

  const result = await prisma.lessonRecord.createMany({ data: records });

  console.log(
    `已${append ? "追加" : "生成"} ${result.count} 条课程记录${month ? `（${month}）` : ""}`
  );
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
