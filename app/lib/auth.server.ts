import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, type AuthSession } from "@/app/lib/auth";

export function getServerSession(): AuthSession | null {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function isAdminSession(session: AuthSession | null): boolean {
  return session?.role === "ADMIN";
}
