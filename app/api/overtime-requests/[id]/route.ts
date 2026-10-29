import { NextRequest, NextResponse } from "next/server";
import { forbidden, unauthorized } from "@/app/lib/auth";
import { deleteOvertimeRequest } from "@/app/lib/overtime.server";
import { resolveSalesAccess } from "@/app/lib/salesAccess";

type RouteContext = { params: { id: string } };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const access = await resolveSalesAccess(request);
    if (!access) return unauthorized("请先登录");
    if (!access.isAdmin) return forbidden("仅管理员可删除加班记录");

    const id = String(context.params?.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "无效的记录 ID" }, { status: 400 });
    }

    const deleted = await deleteOvertimeRequest(id);
    if (!deleted) {
      return NextResponse.json({ error: "记录不存在或已删除" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting overtime request:", error);
    return NextResponse.json({ error: "Failed to delete overtime request" }, { status: 500 });
  }
}
