import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../app/lib/password";

const prisma = new PrismaClient();

async function main() {
  const emailArg = process.argv[2];
  const passwordArg = process.argv[3];
  const nameArg = process.argv[4];
  const roleArg = process.argv[5];

  const email = (emailArg || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = passwordArg || process.env.ADMIN_PASSWORD || "";
  const name = nameArg || process.env.ADMIN_NAME || "管理员";
  const roleInput = (roleArg || process.env.ADMIN_ROLE || "ADMIN").toUpperCase();
  const role: Role = roleInput === "COACH" ? "COACH" : "ADMIN";

  if (!email || !password) {
    console.error("用法: npm run user:create-admin -- <email> <password> [name] [role]");
    console.error("或在 .env 中设置 ADMIN_EMAIL 和 ADMIN_PASSWORD");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, name },
    create: { email, passwordHash, role, name },
  });

  console.log(`用户已创建/更新: ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
