// app/b/layout.tsx
import { ReactNode } from "react";
import BLayoutShell from "./BLayoutShell";

export default function BLayout({ children }: { children: ReactNode }) {
  return <BLayoutShell>{children}</BLayoutShell>;
}