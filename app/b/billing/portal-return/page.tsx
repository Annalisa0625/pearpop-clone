// app/b/billing/portal-return/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function BillingPortalReturnPage() {
  const router = useRouter();
  const startedRef = useRef(false);

  const [message, setMessage] = useState("契約状態を確認しています...");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token ?? null;

        if (!accessToken) {
          router.replace("/login");
          return;
        }

        // Portal 帰りは Stripe 側の状態反映が少し遅れることがあるので数回見る
        for (let i = 0; i < 6; i += 1) {
          setMessage(
            i === 0
              ? "契約状態を確認しています..."
              : `契約状態を再確認しています... (${i + 1}/6)`
          );

          const res = await fetch("/api/stripe/sync-current-subscription", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const json = await res.json().catch(() => null);

          if (res.ok && json?.ok) {
            // 期間終了時解約 / Free戻り / canceled のどれかに寄ったら終了
            if (
              json?.stripe_cancel_at_period_end === true ||
              json?.company_plan_code === "free" ||
              json?.company_subscription_status === "canceled"
            ) {
              router.replace("/b/dashboard?from=portal&synced=1");
              return;
            }
          }

          await sleep(1500);
        }

        router.replace("/b/dashboard?from=portal&synced=1");
      } catch (error) {
        console.error("portal return sync error", error);
        router.replace("/b/dashboard?from=portal&synced=1");
      }
    };

    void run();
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">Billing Portal</p>
        <h1 className="mt-3 text-3xl font-bold">プラン状態を反映しています</h1>
        <p className="mt-4 text-sm leading-7 text-gray-600">
          Stripe 側の最新の契約状態をアプリへ同期しています。数秒後にダッシュボードへ戻ります。
        </p>

        <div className="mt-6 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
          {message}
        </div>
      </div>
    </div>
  );
}