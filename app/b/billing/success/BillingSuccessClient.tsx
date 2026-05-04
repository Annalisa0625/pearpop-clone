// app/b/billing/success/BillingSuccessClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppLocale } from "@/lib/i18n/locale";
import { supabase } from "@/lib/supabaseClient";

type SyncState = "syncing" | "success" | "error";

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useAppLocale();
  const hasStartedRef = useRef(false);

  const sessionId = searchParams.get("session_id");

  const [syncState, setSyncState] = useState<SyncState>("syncing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Checkout Complete",
            titleSyncing: "決済手続きが完了しました",
            bodySyncing:
              "Stripe 側でサブスクリプションの作成が完了しました。アプリ内のプラン状態を同期しています。通常は数秒で完了します。",
            titleSuccess: "プラン状態の同期が完了しました",
            bodySuccess:
              "このままダッシュボードへ移動します。手動で再読み込みしなくても最新のプラン状態が反映されます。",
            titleError: "決済は完了しましたが同期でつまずいています",
            bodyError:
              "Stripe 側では契約作成が完了している可能性があります。同期を再実行するか、料金ページまたはダッシュボードから最新状態をご確認ください。",
            retry: "もう一度同期する",
            backBilling: "料金ページへ戻る",
            toDashboard: "ダッシュボードへ",
            syncing: "同期中...",
            success: "同期完了",
          }
        : {
            badge: "Checkout Complete",
            titleSyncing: "Your checkout was completed",
            bodySyncing:
              "Stripe has completed your subscription. We are now syncing your in-app plan state. This usually finishes in a few seconds.",
            titleSuccess: "Your plan has been synced",
            bodySuccess:
              "You will be redirected to the dashboard shortly. The latest plan status should be reflected without a manual reload.",
            titleError: "Checkout completed, but sync needs attention",
            bodyError:
              "Your subscription may already exist on Stripe. Please retry the sync, or check the latest state from Billing or Dashboard.",
            retry: "Retry sync",
            backBilling: "Back to Billing",
            toDashboard: "Go to Dashboard",
            syncing: "Syncing...",
            success: "Synced",
          },
    [locale]
  );

  const runSync = async () => {
    setSyncState("syncing");
    setErrorMsg(null);

    try {
      if (!sessionId) {
        throw new Error(
          locale === "ja"
            ? "session_id を取得できませんでした"
            : "session_id was not found"
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token ?? null;

      if (!accessToken) {
        throw new Error(
          locale === "ja"
            ? "ログイン状態を確認できませんでした"
            : "Failed to verify your session"
        );
      }

      const res = await fetch("/api/stripe/sync-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error ??
            (locale === "ja"
              ? "Checkout Session の同期に失敗しました"
              : "Failed to sync the checkout session")
        );
      }

      setSyncState("success");

      window.setTimeout(() => {
        router.replace("/b/dashboard?billing=updated");
      }, 900);
    } catch (error: any) {
      console.error("billing success sync error", error);
      setSyncState("error");
      setErrorMsg(
        error?.message ??
          (locale === "ja"
            ? "同期中にエラーが発生しました"
            : "An error occurred during sync")
      );
    }
  };

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    void runSync();
  }, [sessionId]);

  const title =
    syncState === "syncing"
      ? copy.titleSyncing
      : syncState === "success"
      ? copy.titleSuccess
      : copy.titleError;

  const body =
    syncState === "syncing"
      ? copy.bodySyncing
      : syncState === "success"
      ? copy.bodySuccess
      : copy.bodyError;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">{copy.badge}</p>
        <h1 className="mt-3 text-3xl font-bold">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-gray-600">{body}</p>

        {syncState === "error" && errorMsg && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {syncState === "syncing" && (
          <div className="mt-6 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            {copy.syncing}
          </div>
        )}

        {syncState === "success" && (
          <div className="mt-6 inline-flex rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            {copy.success}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-4">
          {syncState === "error" && (
            <button
              onClick={() => void runSync()}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {copy.retry}
            </button>
          )}

          <Link
            href="/b/billing"
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {copy.backBilling}
          </Link>

          <Link
            href="/b/dashboard"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
          >
            {copy.toDashboard}
          </Link>
        </div>
      </div>
    </div>
  );
}