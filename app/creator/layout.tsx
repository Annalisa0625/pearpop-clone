// app/creator/layout.tsx
import { ReactNode } from "react";
import CreatorLayoutShell from "./CreatorLayoutShell";
import CreatorProfileVisualRefresh from "./_components/CreatorProfileVisualRefresh";

export default function CreatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <CreatorProfileVisualRefresh />
      <CreatorLayoutShell>{children}</CreatorLayoutShell>
    </>
  );
}
