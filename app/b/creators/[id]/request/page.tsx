// File: app/b/creators/[id]/request/page.tsx
import { Suspense } from "react";
import CreatorRequestClient from "./CreatorRequestClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CreatorRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-[28px] border border-slate-100 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              読み込み中...
            </p>
          </div>
        </div>
      }
    >
      <CreatorRequestClient />
    </Suspense>
  );
}