import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { resolveSalesAccess } from "@/app/lib/salesAccess";
import {
  LESSON_FEE_CONFIG_KEY,
  fetchLessonFeeConfig,
  normalizeLessonFeeConfig,
} from "@/app/lib/lessonFee";

async function ensurePayrollSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS payroll_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

export async function GET(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可查看课时费配置");

    const config = await fetchLessonFeeConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching lesson fee config:", error);
    return NextResponse.json({ error: "Failed to fetch lesson fee config" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可编辑课时费配置");

    const body = await request.json();
    const config = normalizeLessonFeeConfig(body?.config);
    if (!Array.isArray(body?.config)) {
      return NextResponse.json({ error: "config 必须为数组" }, { status: 400 });
    }

    await ensurePayrollSettingsTable();
    await prisma.$executeRaw`
      INSERT INTO payroll_settings (key, value, "createdAt", "updatedAt")
      VALUES (${LESSON_FEE_CONFIG_KEY}, ${JSON.stringify(config)}::jsonb, NOW(), NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error saving lesson fee config:", error);
    return NextResponse.json({ error: "Failed to save lesson fee config" }, { status: 500 });
  }
}
