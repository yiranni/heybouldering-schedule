import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/app/lib/auth";

export async function POST() {
  const response = NextResponse.json({ message: "退出登录成功" });
  clearSessionCookie(response);
  return response;
}
