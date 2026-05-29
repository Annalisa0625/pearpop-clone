// app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f9fb]">
          <p className="text-sm font-bold text-slate-400">読み込み中...</p>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}