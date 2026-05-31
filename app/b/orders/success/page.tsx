// File: app/b/orders/success/page.tsx

import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
          <section className="relative overflow-hidden rounded-[34px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-100/45 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-16 h-64 w-64 rounded-full bg-emerald-100/35 blur-3xl" />

            <div className="relative">
              <p className="text-sm font-black text-[#ff5f67]">
                確認中です
              </p>
              <h1 className="mt-3 text-[32px] font-black leading-tight tracking-[-0.06em] text-slate-950 md:text-[44px]">
                注文内容を確認しています
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                支払い方法の確認結果を反映しています。画面を閉じずに少しだけお待ちください。
              </p>
            </div>
          </section>
        </div>
      }
    >
      <OrderSuccessClient />
    </Suspense>
  );
}