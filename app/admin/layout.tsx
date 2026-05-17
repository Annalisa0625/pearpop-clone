// app/admin/layout.tsx
import { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPage();

  return <>{children}</>;
}