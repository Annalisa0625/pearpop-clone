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

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className={`max-w-[60%] truncate text-right text-sm ${
          strong ? "font-black text-slate-950" : "font-bold text-slate-800"
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );
}

function StepCard({
  number,
  title,
  body,
  active,
}: {
  number: string;
  title: string;
  body: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-5 ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-100 bg-white text-slate-950"
      }`}
    >
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black ${
          active ? "bg-white text-slate-950" : "bg-slate-100 text-slate-950"
        }`}
      >
        {number}
      </div>
      <h3 className="text-base font-black">{title}</h3>
      <p
        className={`mt-2 text-sm leading-6 ${
          active ? "text-white/70" : "text-slate-500"
        }`}
      >
        {body}
      </p>
    </div>
  );
}

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            eyebrow: "Order Submitted",
            syncingTitle: "注文内容を確認しています",
            syncingBody:
              "Stripeで支払い方法の確認が完了したか確認しています。画面を閉じずにお待ちください。",
            successTitle: "注文が送信されました",
            successBody:
              "支払い方法の確認が完了しました。クリエイターが72時間以内に承認すると決済が確定し、案件が開始されます。",
            pendingTitle: "注文確認中です",
            pendingBody:
              "Stripeの確認結果を取得しましたが、まだ注文状態の確定待ちです。しばらくしてから再度確認してください。",
            errorTitle: "注文確認に失敗しました",
            noSession:
              "Checkout session id が見つかりませんでした。注文画面からやり直してください。",
            loginError: "ログイン情報を取得できませんでした。",
            genericError: "注文確認に失敗しました。",
            orderId: "注文ID",
            orderStatus: "注文ステータス",
            paymentStatus: "支払いステータス",
            paymentIntentStatus: "Stripe状態",
            creatorDeadline: "クリエイター承認期限",
            backToCreators: "クリエイター検索へ戻る",
            goDashboard: "ダッシュボードへ戻る",
            goRequests: "承認待ちを見る",
            stepTitle: "次の流れ",
            step1Title: "クリエイター承認待ち",
            step1Body:
              "クリエイターが72時間以内に承認または辞退します。",
            step2Title: "承認後に決済確定",
            step2Body:
              "承認されるとStripeで決済が確定し、案件が開始されます。",
            step3Title: "納品確認",
            step3Body:
              "クリエイターが納品URLを提出したら、内容を確認して完了できます。",
            currentNoticeTitle: "現在の状態",
            currentNoticeBody:
              "今はクリエイターの承認待ちです。承認待ち一覧から進行状況を確認できます。",
          }
        : {
            eyebrow: "Order Submitted",
            syncingTitle: "Checking your order",
            syncingBody:
              "We are confirming whether Stripe completed the payment authorization. Please keep this page open.",
            successTitle: "Order submitted",
            successBody:
              "Your payment method has been authorized. If the creator accepts within 72 hours, the payment will be captured and the job will start.",
            pendingTitle: "Order is being checked",
            pendingBody:
              "We received the Stripe result, but the order status is not finalized yet. Please check again later.",
            errorTitle: "Failed to confirm order",
            noSession:
              "Checkout session id was not found. Please try again from the order page.",
            loginError: "Could not retrieve your login session.",
            genericError: "Failed to confirm order.",
            orderId: "Order ID",
            orderStatus: "Order Status",
            paymentStatus: "Payment Status",
            paymentIntentStatus: "Stripe Status",
            creatorDeadline: "Creator Acceptance Deadline",
            backToCreators: "Back to Creator Search",
            goDashboard: "Back to Dashboard",
            goRequests: "Pending List",
            stepTitle: "What happens next",
            step1Title: "Creator approval",
            step1Body:
              "The creator has up to 72 hours to accept or decline.",
            step2Title: "Payment capture",
            step2Body:
              "If accepted, Stripe captures the payment and the job starts.",
            step3Title: "Delivery review",
            step3Body:
              "Review the delivery URL when the creator submits it.",
            currentNoticeTitle: "Current status",
            currentNoticeBody:
              "This order is waiting for creator approval. You can track it from the pending list.",
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
        setError(copy.loginError);
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
          setError(json?.error ?? copy.genericError);
          setResult(json);
          setLoading(false);
          return;
        }

        setResult(json);
        setLoading(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : copy.genericError);
        setLoading(false);
      }
    };

    void sync();
  }, [copy.genericError, copy.loginError, copy.noSession, sessionId, supabase]);

  const isAuthorized =
    result?.status === "authorized_pending_creator" ||
    result?.payment_status === "authorized" ||
    result?.payment_intent_status === "requires_capture";

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 py-10 md:p-6">
        <section className="rounded-[32px] bg-slate-950 p-7 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
            Trendre Orders
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            {copy.syncingTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
            {copy.syncingBody}
          </p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 py-10 md:p-6">
        <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-7 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-500">
            Trendre Orders
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-rose-900 md:text-4xl">
            {copy.errorTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-rose-700">
            {error}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/b/creators"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
            >
              {copy.backToCreators}
            </Link>

            <Link
              href="/b/dashboard"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition active:scale-[0.98]"
            >
              {copy.goDashboard}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 py-10 md:p-6">
      <section
        className={`rounded-[32px] p-7 shadow-sm ${
          isAuthorized
            ? "bg-slate-950 text-white"
            : "border border-amber-200 bg-amber-50 text-slate-950"
        }`}
      >
        <p
          className={`text-xs font-black uppercase tracking-[0.24em] ${
            isAuthorized ? "text-white/50" : "text-amber-700"
          }`}
        >
          {copy.eyebrow}
        </p>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {isAuthorized ? copy.successTitle : copy.pendingTitle}
            </h1>
            <p
              className={`mt-3 max-w-2xl text-sm leading-7 ${
                isAuthorized ? "text-white/65" : "text-amber-800"
              }`}
            >
              {isAuthorized
                ? copy.successBody
                : result?.message ?? copy.pendingBody}
            </p>
          </div>

          <Link
            href="/b/requests"
            className={`w-fit rounded-full px-5 py-3 text-sm font-black transition active:scale-[0.98] ${
              isAuthorized
                ? "border border-white/15 bg-white text-slate-950"
                : "bg-slate-950 text-white"
            }`}
          >
            {copy.goRequests}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StepCard
          number="1"
          title={copy.step1Title}
          body={copy.step1Body}
          active
        />
        <StepCard number="2" title={copy.step2Title} body={copy.step2Body} />
        <StepCard number="3" title={copy.step3Title} body={copy.step3Body} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            {copy.currentNoticeTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {copy.currentNoticeBody}
          </p>

          <div className="mt-6 rounded-[24px] bg-slate-50 p-4">
            <DetailRow label={copy.orderId} value={result?.order_id ?? "-"} />
            <DetailRow
              label={copy.orderStatus}
              value={result?.status ?? "-"}
              strong
            />
            <DetailRow
              label={copy.paymentStatus}
              value={result?.payment_status ?? "-"}
            />
            <DetailRow
              label={copy.paymentIntentStatus}
              value={result?.payment_intent_status ?? "-"}
            />
            <DetailRow
              label={copy.creatorDeadline}
              value={formatDateTime(result?.creator_accept_deadline, safeLocale)}
            />
          </div>
        </div>

        <aside className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            {copy.stepTitle}
          </h2>

          <div className="mt-5 grid gap-3">
            <Link
              href="/b/requests"
              className="rounded-2xl bg-slate-950 px-5 py-4 text-center text-sm font-black text-white transition active:scale-[0.98]"
            >
              {copy.goRequests}
            </Link>

            <Link
              href="/b/creators"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition active:scale-[0.98]"
            >
              {copy.backToCreators}
            </Link>

            <Link
              href="/b/dashboard"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition active:scale-[0.98]"
            >
              {copy.goDashboard}
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}