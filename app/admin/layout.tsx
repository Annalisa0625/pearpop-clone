// app/admin/layout.tsx
import { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admin/guard";
import { isCreatorOnlyRelease } from "@/lib/release-mode";
import { AdminReleaseModeProvider } from "./AdminReleaseMode";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPage();

  const isCreatorOnly = isCreatorOnlyRelease();

  return (
    <AdminReleaseModeProvider isCreatorOnly={isCreatorOnly}>
      {children}
    </AdminReleaseModeProvider>
  );
}
