// File: app/creator/payouts/page.tsx
import { Suspense } from "react";
import PayoutsClient from "./PayoutsClient";

export const dynamic = "force-dynamic";

export default function CreatorPayoutsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
          <p className="text-sm font-bold text-slate-400">読み込み中...</p>
        </div>
      }
    >
      <PayoutsClient />
    </Suspense>
  );
}