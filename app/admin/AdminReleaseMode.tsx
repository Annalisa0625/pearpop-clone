"use client";

import { createContext, useContext, type ReactNode } from "react";

const AdminCreatorOnlyReleaseContext = createContext(false);

export function AdminReleaseModeProvider({
  isCreatorOnly,
  children,
}: {
  isCreatorOnly: boolean;
  children: ReactNode;
}) {
  return (
    <AdminCreatorOnlyReleaseContext.Provider value={isCreatorOnly}>
      {children}
    </AdminCreatorOnlyReleaseContext.Provider>
  );
}

export function useAdminCreatorOnlyRelease() {
  return useContext(AdminCreatorOnlyReleaseContext);
}
