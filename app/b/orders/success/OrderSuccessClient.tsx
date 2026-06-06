// File: app/b/orders/success/OrderSuccessClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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

const SESSION_TIMEOUT_MS = 8000;
const SYNC_TIMEOUT_MS = 30000;

function withTimeout<T = any>(
  promiseLike: PromiseLike<T> | T,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = Promise.resolve(promiseLike);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "rose" | "green" | "amber";
}) {
  const className =
    tone === "rose"
      ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : tone === "amber"
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : "bg-slate-50 text-slate-600 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function ActionLink({
  href,
  children,
  primary,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "flex w-full items-center justify-center rounded-full bg-[#ff5f67] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,95,103,0.22)] transition active:scale-[0.98]"
          : "flex w-full items-center justify-center rounded-full bg-white px-5 py-4 text-sm font-black text-slate-800 ring-1 ring-slate-200 transition active:scale-[0.98]"
      }
    >
      {children}
    </Link>
  );
}

function NextStepRow({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 rounded-[24px] bg-slate-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950 ring-1 ring-slate-100">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          {body}
        </p>
      </div>
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
            syncingTitle: "注文内容を確認しています",
            syncingBody:
              "支払い方法の確認結果を反映しています。画面を閉じずに少しだけお待ちください。",

            successTitle: "注文を受け付けました",
            successBody:
              "支払い方法の確認が完了しました。インフルエンサーが返答すると、注文が開始されます。",

            pendingTitle: "注文は作成されています",
            pendingBody:
              "反映に少し時間がかかっています。注文一覧から状況を確認できます。",

            errorTitle: "注文確認に失敗しました",
            noSession:
              "注文情報が見つかりませんでした。もう一度、注文画面からお試しください。",
            loginError: "ログイン情報を取得できませんでした。",
            genericError: "注文確認に失敗しました。",
            sessionTimeout:
              "ログイン情報の取得に時間がかかっています。注文一覧から状況を確認してください。",
            syncTimeout:
              "注文の反映に時間がかかっています。注文一覧から状況を確認してください。",

            paymentReady: "支払い方法確認済み",
            waitingInfluencer: "インフルエンサーの返答待ち",
            replyDeadline: "返答期限",
            reflectedSoon: "反映中",

            nextTitle: "このあと",
            step1Title: "返答を待つ",
            step1Body:
              "インフルエンサーが内容を確認し、受けるか辞退するかを選びます。",
            step2Title: "受けたら開始",
            step2Body:
              "インフルエンサーが受けると支払いが確定し、チャットで進行できます。",
            step3Title: "納品を確認",
            step3Body:
              "投稿URLや納品URLが届いたら、内容を確認して完了できます。",

            orderList: "注文を見る",
            searchInfluencer: "インフルエンサーを探す",
            dashboard: "ホームへ戻る",
            retry: "注文一覧を見る",
          }
        : {
            syncingTitle: "Checking your order",
            syncingBody:
              "We are confirming your payment authorization. Please keep this page open.",

            successTitle: "Order received",
            successBody:
              "Your payment method has been confirmed. The order will start once the influencer accepts.",

            pendingTitle: "Order created",
            pendingBody:
              "It may take a moment to reflect the order. You can check the status from your orders.",

            errorTitle: "Failed to confirm order",
            noSession:
              "Order information was not found. Please try again from the order page.",
            loginError: "Could not retrieve your login session.",
            genericError: "Failed to confirm order.",
            sessionTimeout:
              "Loading your login session is taking too long. Please check your orders.",
            syncTimeout:
              "Order sync is taking too long. Please check your orders.",

            paymentReady: "Payment method confirmed",
            waitingInfluencer: "Waiting for influencer",
            replyDeadline: "Reply by",
            reflectedSoon: "Syncing",

            nextTitle: "What happens next",
            step1Title: "Wait for reply",
            step1Body:
              "The influencer reviews the order and chooses whether to accept or decline.",
            step2Title: "Starts after acceptance",
            step2Body:
              "Once accepted, payment is captured and you can continue by chat.",
            step3Title: "Review delivery",
            step3Body:
              "When the delivery URL is submitted, review it and complete the order.",

            orderList: "View orders",
            searchInfluencer: "Find influencers",
            dashboard: "Back home",
            retry: "View orders",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const sync = async () => {
      setLoading(true);
      setError(null);
      setTimedOut(false);

      if (!sessionId) {
        setError(copy.noSession);
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          copy.sessionTimeout
        );

        const accessToken = session?.access_token ?? null;

        if (!accessToken) {
          if (!isMounted) return;
          setError(copy.loginError);
          setLoading(false);
          return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
          controller.abort();
        }, SYNC_TIMEOUT_MS);

        try {
          const res = await fetch("/api/orders/sync-checkout-session", {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              session_id: sessionId,
            }),
          });

          const json = (await res.json().catch(() => ({}))) as SyncResult;

          if (!isMounted) return;

          if (!res.ok) {
            setError(json?.error ?? copy.genericError);
            setResult(json);
            setLoading(false);
            return;
          }

          setResult(json);
          setLoading(false);
        } finally {
          window.clearTimeout(timer);
        }
      } catch (e: unknown) {
        if (!isMounted) return;

        const isAbort =
          e instanceof DOMException && e.name === "AbortError"
            ? true
            : e instanceof Error &&
              e.message.toLowerCase().includes("abort");

        if (isAbort) {
          setTimedOut(true);
          setResult({
            ok: true,
            status: "sync_pending",
            payment_status: "sync_pending",
            message: copy.syncTimeout,
          });
          setError(null);
          setLoading(false);
          return;
        }

        setError(e instanceof Error ? e.message : copy.genericError);
        setLoading(false);
      }
    };

    void sync();

    return () => {
      isMounted = false;
    };
  }, [
    copy.genericError,
    copy.loginError,
    copy.noSession,
    copy.sessionTimeout,
    copy.syncTimeout,
    sessionId,
    supabase,
  ]);

  const isAuthorized =
    result?.status === "authorized_pending_creator" ||
    result?.payment_status === "authorized" ||
    result?.payment_intent_status === "requires_capture";

  const deadlineText = formatDateTime(
    result?.creator_accept_deadline,
    safeLocale
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <section className="relative overflow-hidden rounded-[34px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-100/45 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-16 h-64 w-64 rounded-full bg-emerald-100/35 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-black text-[#ff5f67]">
              {copy.reflectedSoon}
            </p>
            <h1 className="mt-3 text-[32px] font-black leading-tight tracking-[-0.06em] text-slate-950 md:text-[44px]">
              {copy.syncingTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
              {copy.syncingBody}
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <section className="rounded-[34px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.06)] ring-1 ring-rose-100">
          <StatusPill tone="rose">{copy.errorTitle}</StatusPill>

          <h1 className="mt-5 text-[30px] font-black leading-tight tracking-[-0.06em] text-slate-950 md:text-[40px]">
            {copy.errorTitle}
          </h1>

          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
            {error}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <ActionLink href="/b/orders" primary>
              {copy.retry}
            </ActionLink>
            <ActionLink href="/b/creators">{copy.searchInfluencer}</ActionLink>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-10 md:px-6">
      <section className="relative overflow-hidden rounded-[34px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-100/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-16 h-64 w-64 rounded-full bg-emerald-100/35 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap gap-2">
            {isAuthorized ? (
              <>
                <StatusPill tone="green">{copy.paymentReady}</StatusPill>
                <StatusPill tone="amber">{copy.waitingInfluencer}</StatusPill>
              </>
            ) : (
              <StatusPill tone="amber">
                {timedOut ? copy.reflectedSoon : copy.reflectedSoon}
              </StatusPill>
            )}

            {deadlineText ? (
              <StatusPill tone="slate">
                {copy.replyDeadline}: {deadlineText}
              </StatusPill>
            ) : null}
          </div>

          <h1 className="mt-5 text-[32px] font-black leading-tight tracking-[-0.06em] text-slate-950 md:text-[44px]">
            {isAuthorized ? copy.successTitle : copy.pendingTitle}
          </h1>

          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
            {isAuthorized ? copy.successBody : result?.message || copy.pendingBody}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <ActionLink href="/b/orders" primary>
              {copy.orderList}
            </ActionLink>
            <ActionLink href="/b/creators">{copy.searchInfluencer}</ActionLink>
            <ActionLink href="/b/dashboard">{copy.dashboard}</ActionLink>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
        <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
          {copy.nextTitle}
        </h2>

        <div className="mt-5 grid gap-3">
          <NextStepRow number="1" title={copy.step1Title} body={copy.step1Body} />
          <NextStepRow number="2" title={copy.step2Title} body={copy.step2Body} />
          <NextStepRow number="3" title={copy.step3Title} body={copy.step3Body} />
        </div>
      </section>
    </div>
  );
}