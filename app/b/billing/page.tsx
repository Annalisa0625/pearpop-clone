// app/b/billing/page.tsx

import { Suspense } from "react";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm text-slate-500">読み込み中...</p>
            </div>
          </div>
        </main>
      }
    >
      <BillingClient />
    </Suspense>
  );
}