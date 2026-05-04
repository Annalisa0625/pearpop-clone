// File: app/b/dashboard/page.tsx

import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CompanyDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-7">
            <p className="text-base text-slate-600">読み込み中...</p>
          </section>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}