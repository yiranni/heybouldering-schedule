import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerSession, isAdminSession } from "@/app/lib/auth.server";

export default function EmployeeAnalyticsLayout({ children }: { children: ReactNode }) {
  const session = getServerSession();
  if (!isAdminSession(session)) {
    redirect("/");
  }
  return children;
}
