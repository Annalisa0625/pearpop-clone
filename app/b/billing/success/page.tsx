// app/b/billing/success/page.tsx

import { Suspense } from "react";
import BillingSuccessClient from "./BillingSuccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-blue-600">
              Checkout Complete
            </p>
            <h1 className="mt-3 text-3xl font-bold">
              決済手続きが完了しました
            </h1>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              プラン状態を同期しています...
            </p>
          </div>
        </div>
      }
    >
      <BillingSuccessClient />
    </Suspense>
  );
}