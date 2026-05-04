// File: app/b/orders/success/page.tsx

import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl p-6">
          <section className="rounded-3xl border bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-blue-600">
              Trendre Orders
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              注文内容を確認しています
            </h1>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Stripeで支払い方法の確認が完了したか確認しています。画面を閉じずにお待ちください。
            </p>
          </section>
        </div>
      }
    >
      <OrderSuccessClient />
    </Suspense>
  );
}