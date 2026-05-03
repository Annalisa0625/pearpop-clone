// app/creator/layout.tsx
import { ReactNode } from "react";
import CreatorLayoutShell from "./CreatorLayoutShell";

export default function CreatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <CreatorLayoutShell>{children}</CreatorLayoutShell>;
}