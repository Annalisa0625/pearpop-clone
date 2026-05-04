// File: app/b/orders/success/OrderSuccessClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type SyncResult = {
  ok?: boolean;
  order_id?: string;
  status?: string;
  payment_status?: string;
  payment_intent_status?: string;
  creator_accept_deadline?: string | null;
  message?: string;
  error?: string;
};

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US");
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            syncingTitle: "注文内容を確認しています",
            syncingBody:
              "Stripeで支払い方法の確認が完了したか確認しています。画面を閉じずにお待ちください。",
            successTitle: "注文が送信されました",
            successBody:
              "支払い方法の確認が完了しました。クリエイターが48時間以内に承認すると決済が確定し、案件が開始されます。",
            pendingTitle: "注文確認中です",
            pendingBody:
              "Stripeの確認結果を取得しましたが、まだ注文状態の確定待ちです。しばらくしてから再度確認してください。",
            errorTitle: "注文確認に失敗しました",
            noSession:
              "Checkout session id が見つかりませんでした。注文画面からやり直してください。",
            orderId: "注文ID",
            orderStatus: "注文ステータス",
            paymentStatus: "支払いステータス",
            paymentIntentStatus: "Stripe状態",
            creatorDeadline: "クリエイター承認期限",
            backToCreators: "クリエイター検索へ戻る",
            goDashboard: "ダッシュボードへ戻る",
            goRequests: "承認待ち一覧へ",
          }
        : {
            syncingTitle: "Checking your order",
            syncingBody:
              "We are confirming whether Stripe completed the payment authorization. Please keep this page open.",
            successTitle: "Order submitted",
            successBody:
              "Your payment method has been authorized. If the creator accepts within 48 hours, the payment will be captured and the job will start.",
            pendingTitle: "Order is being checked",
            pendingBody:
              "We received the Stripe result, but the order status is not finalized yet. Please check again later.",
            errorTitle: "Failed to confirm order",
            noSession:
              "Checkout session id was not found. Please try again from the order page.",
            orderId: "Order ID",
            orderStatus: "Order Status",
            paymentStatus: "Payment Status",
            paymentIntentStatus: "Stripe Status",
            creatorDeadline: "Creator Acceptance Deadline",
            backToCreators: "Back to Creator Search",
            goDashboard: "Back to Dashboard",
            goRequests: "Pending List",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = async () => {
      setLoading(true);
      setError(null);

      if (!sessionId) {
        setError(copy.noSession);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token ?? null;

      if (!accessToken) {
        setError("ログイン情報を取得できませんでした。");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/orders/sync-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
          }),
        });

        const json = (await res.json().catch(() => ({}))) as SyncResult;

        if (!res.ok) {
          setError(json?.error ?? "注文確認に失敗しました。");
          setResult(json);
          setLoading(false);
          return;
        }

        setResult(json);
        setLoading(false);
      } catch (e: any) {
        setError(e?.message ?? "注文確認に失敗しました。");
        setLoading(false);
      }
    };

    void sync();
  }, [copy.noSession, sessionId, supabase]);

  const isAuthorized =
    result?.status === "authorized_pending_creator" ||
    result?.payment_status === "authorized" ||
    result?.payment_intent_status === "requires_capture";

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <section className="rounded-3xl border bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Trendre Orders</p>
          <h1 className="mt-2 text-3xl font-bold">{copy.syncingTitle}</h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {copy.syncingBody}
          </p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8">
          <p className="text-sm font-semibold text-red-600">Trendre Orders</p>
          <h1 className="mt-2 text-3xl font-bold">{copy.errorTitle}</h1>
          <p className="mt-3 text-sm leading-7 text-red-700">{error}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/b/creators"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {copy.backToCreators}
            </Link>

            <Link
              href="/b/dashboard"
              className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {copy.goDashboard}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <section
        className={`rounded-3xl border p-8 shadow-sm ${
          isAuthorized
            ? "border-green-200 bg-green-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <p
          className={`text-sm font-semibold ${
            isAuthorized ? "text-green-700" : "text-amber-700"
          }`}
        >
          Trendre Orders
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          {isAuthorized ? copy.successTitle : copy.pendingTitle}
        </h1>

        <p
          className={`mt-3 text-sm leading-7 ${
            isAuthorized ? "text-green-800" : "text-amber-800"
          }`}
        >
          {isAuthorized ? copy.successBody : result?.message ?? copy.pendingBody}
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border bg-white p-5 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">{copy.orderId}</span>
            <span className="font-semibold text-gray-900">
              {result?.order_id ?? "-"}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">{copy.orderStatus}</span>
            <span className="font-semibold text-gray-900">
              {result?.status ?? "-"}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">{copy.paymentStatus}</span>
            <span className="font-semibold text-gray-900">
              {result?.payment_status ?? "-"}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">{copy.paymentIntentStatus}</span>
            <span className="font-semibold text-gray-900">
              {result?.payment_intent_status ?? "-"}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">{copy.creatorDeadline}</span>
            <span className="font-semibold text-gray-900">
              {formatDateTime(result?.creator_accept_deadline, safeLocale)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/b/requests"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {copy.goRequests}
          </Link>

          <Link
            href="/b/creators"
            className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {copy.backToCreators}
          </Link>

          <Link
            href="/b/dashboard"
            className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {copy.goDashboard}
          </Link>
        </div>
      </section>
    </div>
  );
}