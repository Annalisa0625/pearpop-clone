// app/creator/layout.tsx
import { ReactNode } from "react";
import { isCreatorOnlyRelease } from "@/lib/release-mode";
import CreatorLayoutShell from "./CreatorLayoutShell";
import { CreatorReleaseModeProvider } from "./CreatorReleaseMode";
import CreatorProfileVisualRefresh from "./_components/CreatorProfileVisualRefresh";

export default function CreatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const isCreatorOnly = isCreatorOnlyRelease();

  return (
    <CreatorReleaseModeProvider isCreatorOnly={isCreatorOnly}>
      <CreatorProfileVisualRefresh />
      <CreatorLayoutShell>{children}</CreatorLayoutShell>
    </CreatorReleaseModeProvider>
  );
}
