// app/admin/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/checkRole";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const res = await requireRole(["admin"]);

  if (!res.ok) {
    if (res.reason === "not_logged_in") {
      redirect("/login");
    }
    redirect("/");
  }

  return <>{children}</>;
}