"use client";

import { createContext, useContext, type ReactNode } from "react";

const CreatorOnlyReleaseContext = createContext(false);

export function CreatorReleaseModeProvider({
  isCreatorOnly,
  children,
}: {
  isCreatorOnly: boolean;
  children: ReactNode;
}) {
  return (
    <CreatorOnlyReleaseContext.Provider value={isCreatorOnly}>
      {children}
    </CreatorOnlyReleaseContext.Provider>
  );
}

export function useCreatorOnlyRelease() {
  return useContext(CreatorOnlyReleaseContext);
}
