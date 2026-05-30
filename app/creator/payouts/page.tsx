// File: app/creator/payouts/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type CreatorPayoutState = {
  id: string;
  display_name: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_completed: boolean | null;
};

type ConnectStatus = {
  ok: boolean;
  has_stripe_account: boolean;
  stripe_account_id: string | null;
  stripe_account_id_masked: string | null;
  stripe_onboarding_completed: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_currently_due: string[];
  requirements_past_due: string[];
  disabled_reason: string | null;
  error?: string;
};

type PayoutOrderRow = {
  id: string;
  product_name: string | null;
  status: string | null;
  payment_status: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
  completed_at: string | null;
  transferred_at: string | null;
  transfer_status: string | null;
  stripe_transfer_id: string | null;
  transfer_failed_reason: string | null;
  created_at: string | null;
};

type NoticeTone = "info" | "success" | "warning" | "error";
type BadgeTone = "gray" | "green" | "blue" | "yellow" | "red";

function Notice({
  tone,
  title,
  body,
}: {
  tone: NoticeTone;
  title: string;
  body: string;
}) {
  const styles: Record<NoticeTone, string> = {
    info: "border-slate-200 bg-white text-slate-800",
    success: "border-emerald-100 bg-emerald-50 text-emerald-900",
    warning: "border-amber-100 bg-amber-50 text-amber-900",
    error: "border-rose-100 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-[26px] border p-5 text-sm ${styles[tone]}`}>
      <p className="font-black">{title}</p>
      <p className="mt-2 font-semibold leading-7 opacity-80">{body}</p>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: BadgeTone;
  children: React.ReactNode;
}) {
  const styles: Record<BadgeTone, string> = {
    gray: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <div className="text-right text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function formatMoney(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: "ja" | "en"
) {
  const amount = Number(value ?? 0);
  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    if (safeCurrency === "JPY") return `¥${amount.toLocaleString()}`;
    return `${safeCurrency} ${amount.toLocaleString()}`;
  }
}

function formatDateTime(
  value: string | null | undefined,
  locale: "ja" | "en"
) {
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

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function isSameMonth(value: string | null | undefined) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function getTransferBadgeMeta(
  transferStatus: string | null | undefined,
  locale: "ja" | "en"
): { label: string; tone: BadgeTone } {
  const normalized = (transferStatus || "not_started").toLowerCase();

  if (locale === "ja") {
    if (normalized === "transferred") {
      return { label: "送金済み", tone: "green" };
    }

    if (normalized === "pending") {
      return { label: "処理中", tone: "blue" };
    }

    if (normalized === "failed") {
      return { label: "失敗", tone: "red" };
    }

    if (normalized === "skipped") {
      return { label: "保留", tone: "yellow" };
    }

    return { label: "未送金", tone: "gray" };
  }

  if (normalized === "transferred") {
    return { label: "Transferred", tone: "green" };
  }

  if (normalized === "pending") {
    return { label: "Processing", tone: "blue" };
  }

  if (normalized === "failed") {
    return { label: "Failed", tone: "red" };
  }

  if (normalized === "skipped") {
    return { label: "On hold", tone: "yellow" };
  }

  return { label: "Not sent", tone: "gray" };
}

function LoadingView() {
  return (
    <div className="space-y-5 pb-10">
      <div className="h-48 animate-pulse rounded-[34px] bg-white shadow-sm ring-1 ring-slate-100" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[28px] bg-white shadow-sm ring-1 ring-slate-100"
          />
        ))}
      </div>
    </div>
  );
}

function SetupStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#ff5f67] shadow-sm ring-1 ring-slate-100">
          {number}
        </div>
        <div>
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CreatorPayoutsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const [creator, setCreator] = useState<CreatorPayoutState | null>(null);
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [payoutOrders, setPayoutOrders] = useState<PayoutOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnNotice, setReturnNotice] = useState<"return" | "refresh" | null>(
    null
  );
  const [signupMode, setSignupMode] = useState(false);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            loginRequired: "ログインしてください",
            creatorNotFound: "インフルエンサー情報が見つかりませんでした。",
            loadFailed: "報酬受け取り情報の取得に失敗しました。",
            payoutLoadFailed: "報酬履歴の取得に失敗しました。",
            statusFailed: "Stripeの状態確認に失敗しました。",
            onboardingFailed: "Stripeの登録開始に失敗しました。",

            title: "報酬",
            subtitle:
              "完了した注文の受取予定額と送金状況を確認できます。",
            signupTitle: "最後に、報酬の受け取り設定をします",
            signupSubtitle:
              "注文が完了したあとに報酬を受け取るため、Stripeで本人確認と振込先を登録してください。",
            requiredTitle: "報酬の受け取り設定が必要です",
            requiredSubtitle:
              "この設定が完了すると、注文の受け付けと報酬受け取りを安全に進められます。",

            setupLabel: "登録の最終ステップ",
            readyLabel: "設定完了",
            notReadyLabel: "設定が必要",
            backDashboard: "ホームへ",
            goDashboard: "ホームへ進む",

            start: "Stripeで受け取り設定をする",
            continue: "Stripe登録を続ける",
            refresh: "設定状況を確認する",
            refreshing: "確認中...",
            starting: "Stripeへ移動中...",

            step1Title: "本人確認",
            step1Body: "本人確認に必要な情報をStripe側で入力します。",
            step2Title: "振込先登録",
            step2Body: "報酬を受け取る銀行口座をStripe側で登録します。",
            step3Title: "受け取り開始",
            step3Body: "設定完了後、注文完了時に報酬を受け取れます。",

            statusReadyTitle: "受け取り設定は完了しています",
            statusReadyBody:
              "注文完了後に報酬を受け取る準備ができています。",
            statusNotReadyTitle: "受け取り設定がまだ完了していません",
            statusNotReadyBody:
              "Stripeの画面で本人確認と振込先登録を完了してください。",
            returnedTitle: "Stripeから戻りました",
            returnedBody:
              "最新の状態を確認しました。まだ未完了の場合は、もう一度登録を続けてください。",
            refreshTitle: "Stripe登録が中断されました",
            refreshBody:
              "登録を再開できます。下のボタンからStripeの画面へ戻ってください。",
            accountManagedByStripe:
              "銀行口座情報はStripe側で安全に管理されます。Trendreには口座番号の詳細は保存されません。",

            monthRevenue: "今月",
            totalEarned: "受取予定",
            totalTransferred: "送金済み",
            pendingAmount: "未送金",
            completedOrders: "完了件数",
            historyTitle: "報酬履歴",
            historyBody:
              "完了した注文の受取予定額と送金状況を確認できます。",
            historyEmptyTitle: "まだ報酬履歴はありません",
            historyEmptyBody:
              "注文が完了し、受取予定額が確定するとここに表示されます。",
            order: "注文",
            orderDetail: "注文を見る",
            payoutAmount: "受取予定額",
            completedAt: "完了日時",
            transferredAt: "送金日時",
            transferId: "送金ID",
            failedReason: "失敗理由",
            settingTitle: "受け取り設定",
            settingBody:
              "未完了の場合は、報酬を受け取れないため早めに設定してください。",
            connected: "完了済み",
            incomplete: "未完了",
            none: "なし",
            errorTitle: "エラー",
          }
        : {
            loading: "Loading...",
            loginRequired: "Please log in",
            creatorNotFound: "Influencer information was not found.",
            loadFailed: "Failed to load payout settings.",
            payoutLoadFailed: "Failed to load payout history.",
            statusFailed: "Failed to refresh Stripe status.",
            onboardingFailed: "Failed to start Stripe onboarding.",

            title: "Payouts",
            subtitle:
              "Review payout amounts and transfer status for completed orders.",
            signupTitle: "Last step: Set up payouts",
            signupSubtitle:
              "Complete identity verification and payout details in Stripe so you can receive earnings after completed orders.",
            requiredTitle: "Payout setup is required",
            requiredSubtitle:
              "Complete this setup to safely accept orders and receive payouts.",

            setupLabel: "Final setup step",
            readyLabel: "Ready",
            notReadyLabel: "Setup required",
            backDashboard: "Home",
            goDashboard: "Go to home",

            start: "Set up payouts with Stripe",
            continue: "Continue Stripe setup",
            refresh: "Check setup status",
            refreshing: "Checking...",
            starting: "Opening Stripe...",

            step1Title: "Identity verification",
            step1Body: "Enter required identity details securely in Stripe.",
            step2Title: "Bank account",
            step2Body: "Add the bank account where you want to receive payouts.",
            step3Title: "Start receiving",
            step3Body: "After setup, you can receive payouts from completed orders.",

            statusReadyTitle: "Payout setup is complete",
            statusReadyBody:
              "Your account is ready to receive payouts after completed orders.",
            statusNotReadyTitle: "Payout setup is not complete",
            statusNotReadyBody:
              "Complete identity verification and payout details in Stripe.",
            returnedTitle: "Returned from Stripe",
            returnedBody:
              "We refreshed your status. If it is still incomplete, continue setup again.",
            refreshTitle: "Stripe setup was interrupted",
            refreshBody:
              "You can resume setup from the button below.",
            accountManagedByStripe:
              "Bank account details are securely managed by Stripe. Trendre does not store full bank account numbers.",

            monthRevenue: "This month",
            totalEarned: "Expected",
            totalTransferred: "Transferred",
            pendingAmount: "Pending",
            completedOrders: "Completed orders",
            historyTitle: "Payout history",
            historyBody:
              "Review payout amounts and transfer status for completed orders.",
            historyEmptyTitle: "No payout history yet",
            historyEmptyBody:
              "Completed orders with confirmed payout amounts will appear here.",
            order: "Order",
            orderDetail: "View order",
            payoutAmount: "Payout amount",
            completedAt: "Completed at",
            transferredAt: "Transferred at",
            transferId: "Transfer ID",
            failedReason: "Failure reason",
            settingTitle: "Payout setup",
            settingBody:
              "Complete setup early so payouts can be sent after orders are completed.",
            connected: "Complete",
            incomplete: "Incomplete",
            none: "None",
            errorTitle: "Error",
          },
    [safeLocale]
  );

  const getAccessTokenOrRedirect = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      window.alert(copy.loginRequired);
      router.push("/login");
      return null;
    }

    return session.access_token;
  };

  const refreshConnectStatus = async (accessToken: string) => {
    const response = await fetch("/api/creator/connect/status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = (await response.json()) as ConnectStatus;

    if (!response.ok) {
      throw new Error(json.error || copy.statusFailed);
    }

    setStatus(json);

    setCreator((prev) =>
      prev
        ? {
            ...prev,
            stripe_account_id: json.stripe_account_id,
            stripe_onboarding_completed: json.stripe_onboarding_completed,
          }
        : prev
    );

    return json;
  };

  const loadPayoutHistory = async (userId: string, creatorId: string | null) => {
    let query = supabase
      .from("orders")
      .select(
        `
        id,
        product_name,
        status,
        payment_status,
        creator_payout_amount,
        currency,
        completed_at,
        transferred_at,
        transfer_status,
        stripe_transfer_id,
        transfer_failed_reason,
        created_at
      `
      )
      .eq("status", "completed")
      .eq("payment_status", "captured")
      .gt("creator_payout_amount", 0)
      .order("completed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (creatorId) {
      query = query.or(`creator_user_id.eq.${userId},creator_id.eq.${creatorId}`);
    } else {
      query = query.eq("creator_user_id", userId);
    }

    const { data, error: payoutError } = await query;

    if (payoutError) {
      throw payoutError;
    }

    setPayoutOrders((data || []) as PayoutOrderRow[]);
  };

  const loadPage = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.alert(copy.loginRequired);
        router.push("/login");
        return;
      }

      const { data: creatorRow, error: creatorError } = await supabase
        .from("creators")
        .select(
          `
          id,
          display_name,
          stripe_account_id,
          stripe_onboarding_completed
        `
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (creatorError) {
        throw creatorError;
      }

      if (!creatorRow) {
        setError(copy.creatorNotFound);
        return;
      }

      setCreator(creatorRow as CreatorPayoutState);

      const params = new URLSearchParams(window.location.search);
      const connectParam = params.get("connect");
      const fromParam = params.get("from");
      const requiredParam = params.get("required");

      if (connectParam === "return" || connectParam === "refresh") {
        setReturnNotice(connectParam);
      }

      setSignupMode(fromParam === "signup" || requiredParam === "connect");

      const accessToken = await getAccessTokenOrRedirect();

      if (!accessToken) return;

      await Promise.all([
        refreshConnectStatus(accessToken),
        loadPayoutHistory(user.id, creatorRow.id),
      ]);
    } catch (err) {
      console.error("creator payouts load error:", err);
      setError(err instanceof Error ? err.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartOnboarding = async () => {
    setStarting(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenOrRedirect();

      if (!accessToken) return;

      const response = await fetch("/api/creator/connect/onboarding-link", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = (await response.json()) as {
        ok?: boolean;
        url?: string;
        stripe_account_id?: string;
        stripe_onboarding_completed?: boolean;
        error?: string;
      };

      if (!response.ok || !json.url) {
        throw new Error(json.error || copy.onboardingFailed);
      }

      window.location.href = json.url;
    } catch (err) {
      console.error("creator connect onboarding start error:", err);
      setError(err instanceof Error ? err.message : copy.onboardingFailed);
      setStarting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const accessToken = await getAccessTokenOrRedirect();

      if (!accessToken) return;

      await refreshConnectStatus(accessToken);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && creator?.id) {
        await loadPayoutHistory(user.id, creator.id);
      }
    } catch (err) {
      console.error("creator connect status refresh error:", err);
      setError(err instanceof Error ? err.message : copy.statusFailed);
    } finally {
      setRefreshing(false);
    }
  };

  const isReady = Boolean(status?.stripe_onboarding_completed);
  const hasAccount = Boolean(status?.has_stripe_account || creator?.stripe_account_id);

  const payoutSummary = useMemo(() => {
    const totalEarned = payoutOrders.reduce(
      (sum, order) => sum + Number(order.creator_payout_amount || 0),
      0
    );

    const totalTransferred = payoutOrders
      .filter((order) => order.transfer_status === "transferred")
      .reduce((sum, order) => sum + Number(order.creator_payout_amount || 0), 0);

    const pendingAmount = Math.max(totalEarned - totalTransferred, 0);

    const thisMonthEarned = payoutOrders
      .filter((order) => isSameMonth(order.completed_at || order.created_at))
      .reduce((sum, order) => sum + Number(order.creator_payout_amount || 0), 0);

    const mainCurrency =
      payoutOrders.find((order) => order.currency)?.currency || "JPY";

    return {
      totalEarned,
      totalTransferred,
      pendingAmount,
      thisMonthEarned,
      mainCurrency,
      completedCount: payoutOrders.length,
    };
  }, [payoutOrders]);

  if (loading) {
    return <LoadingView />;
  }

  if (signupMode) {
    return (
      <div className="relative overflow-hidden pb-10">
        <div className="pointer-events-none absolute -left-36 top-10 h-80 w-80 rounded-full bg-rose-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-36 top-32 h-96 w-96 rounded-full bg-emerald-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-2">
          <section className="rounded-[34px] bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={isReady ? "green" : "yellow"}>
                {isReady ? copy.readyLabel : copy.setupLabel}
              </Badge>
            </div>

            <h1 className="mt-5 text-[30px] font-black leading-tight tracking-[-0.055em] text-slate-950 md:text-[42px]">
              {isReady ? copy.statusReadyTitle : copy.signupTitle}
            </h1>

            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500 md:text-base md:leading-8">
              {isReady ? copy.statusReadyBody : copy.signupSubtitle}
            </p>

            {returnNotice === "return" ? (
              <div className="mt-5">
                <Notice
                  tone={isReady ? "success" : "info"}
                  title={copy.returnedTitle}
                  body={copy.returnedBody}
                />
              </div>
            ) : null}

            {returnNotice === "refresh" ? (
              <div className="mt-5">
                <Notice
                  tone="warning"
                  title={copy.refreshTitle}
                  body={copy.refreshBody}
                />
              </div>
            ) : null}

            {error ? (
              <div className="mt-5">
                <Notice tone="error" title={copy.errorTitle} body={error} />
              </div>
            ) : null}

            <div className="mt-7 grid gap-3">
              <SetupStep
                number="1"
                title={copy.step1Title}
                body={copy.step1Body}
              />
              <SetupStep
                number="2"
                title={copy.step2Title}
                body={copy.step2Body}
              />
              <SetupStep
                number="3"
                title={copy.step3Title}
                body={copy.step3Body}
              />
            </div>

            <div className="mt-7 grid gap-3">
              {isReady ? (
                <Link
                  href="/creator/dashboard"
                  className="flex w-full items-center justify-center rounded-full bg-[#ff5f67] px-6 py-4 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.25)] transition active:scale-[0.98]"
                >
                  {copy.goDashboard}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleStartOnboarding}
                  disabled={starting}
                  className="flex w-full items-center justify-center rounded-full bg-[#ff5f67] px-6 py-4 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.25)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {starting
                    ? copy.starting
                    : hasAccount
                    ? copy.continue
                    : copy.start}
                </button>
              )}

              {!isReady ? (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex w-full items-center justify-center rounded-full bg-slate-100 px-6 py-4 text-sm font-black text-slate-700 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? copy.refreshing : copy.refresh}
                </button>
              ) : null}
            </div>

            <p className="mt-5 text-xs font-semibold leading-6 text-slate-400">
              {copy.accountManagedByStripe}
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pb-10">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-rose-100/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-32 h-[420px] w-[420px] rounded-full bg-emerald-100/35 blur-3xl" />

      <div className="relative space-y-6">
        <section className="rounded-[34px] bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={isReady ? "green" : "yellow"}>
                  {isReady ? copy.connected : copy.notReadyLabel}
                </Badge>
              </div>

              <h1 className="mt-4 text-[32px] font-black leading-tight tracking-[-0.055em] text-slate-950 md:text-[44px]">
                {copy.title}
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500 md:text-base md:leading-8">
                {copy.subtitle}
              </p>
            </div>

            {!isReady ? (
              <button
                type="button"
                onClick={handleStartOnboarding}
                disabled={starting}
                className="rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.22)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting
                  ? copy.starting
                  : hasAccount
                  ? copy.continue
                  : copy.start}
              </button>
            ) : null}
          </div>
        </section>

        {returnNotice === "return" ? (
          <Notice
            tone={isReady ? "success" : "info"}
            title={copy.returnedTitle}
            body={copy.returnedBody}
          />
        ) : null}

        {returnNotice === "refresh" ? (
          <Notice
            tone="warning"
            title={copy.refreshTitle}
            body={copy.refreshBody}
          />
        ) : null}

        {error ? <Notice tone="error" title={copy.errorTitle} body={error} /> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label={copy.monthRevenue}
            value={formatMoney(
              payoutSummary.thisMonthEarned,
              payoutSummary.mainCurrency,
              safeLocale
            )}
            helper={copy.completedOrders}
          />

          <StatCard
            label={copy.totalEarned}
            value={formatMoney(
              payoutSummary.totalEarned,
              payoutSummary.mainCurrency,
              safeLocale
            )}
            helper={`${copy.pendingAmount}: ${formatMoney(
              payoutSummary.pendingAmount,
              payoutSummary.mainCurrency,
              safeLocale
            )}`}
          />

          <StatCard
            label={copy.totalTransferred}
            value={formatMoney(
              payoutSummary.totalTransferred,
              payoutSummary.mainCurrency,
              safeLocale
            )}
            helper={`${payoutSummary.completedCount}${safeLocale === "ja" ? "件" : ""}`}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[30px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.045)] ring-1 ring-slate-100 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                  {copy.historyTitle}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {copy.historyBody}
                </p>
              </div>
            </div>

            {payoutOrders.length === 0 ? (
              <div className="mt-6 rounded-[26px] bg-slate-50 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-black text-slate-950 shadow-sm ring-1 ring-slate-100">
                  ¥
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  {copy.historyEmptyTitle}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-7 text-slate-500">
                  {copy.historyEmptyBody}
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {payoutOrders.map((order) => {
                  const badge = getTransferBadgeMeta(
                    order.transfer_status,
                    safeLocale
                  );

                  return (
                    <div
                      key={order.id}
                      className="rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-slate-950">
                            {order.product_name || `${copy.order} ${shortId(order.id)}`}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {copy.completedAt}:{" "}
                            {formatDateTime(
                              order.completed_at || order.created_at,
                              safeLocale
                            )}
                          </p>
                        </div>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </div>

                      <div className="mt-4 rounded-[22px] bg-white px-4 py-2 ring-1 ring-slate-100">
                        <FieldRow
                          label={copy.payoutAmount}
                          value={formatMoney(
                            order.creator_payout_amount,
                            order.currency,
                            safeLocale
                          )}
                        />
                        <FieldRow
                          label={copy.transferredAt}
                          value={formatDateTime(order.transferred_at, safeLocale)}
                        />
                        {order.stripe_transfer_id ? (
                          <FieldRow
                            label={copy.transferId}
                            value={shortId(order.stripe_transfer_id)}
                          />
                        ) : null}
                        {order.transfer_failed_reason ? (
                          <FieldRow
                            label={copy.failedReason}
                            value={order.transfer_failed_reason}
                          />
                        ) : null}
                      </div>

                      <Link
                        href={`/creator/orders/${order.id}`}
                        className="mt-4 flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white transition active:scale-[0.98]"
                      >
                        {copy.orderDetail}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[30px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.045)] ring-1 ring-slate-100 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                    {copy.settingTitle}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {isReady ? copy.statusReadyBody : copy.settingBody}
                  </p>
                </div>

                <Badge tone={isReady ? "green" : "yellow"}>
                  {isReady ? copy.connected : copy.incomplete}
                </Badge>
              </div>

              <div className="mt-5 grid gap-3">
                {!isReady ? (
                  <button
                    type="button"
                    onClick={handleStartOnboarding}
                    disabled={starting}
                    className="w-full rounded-full bg-[#ff5f67] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_30px_rgba(255,95,103,0.2)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {starting
                      ? copy.starting
                      : hasAccount
                      ? copy.continue
                      : copy.start}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full rounded-full bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-700 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? copy.refreshing : copy.refresh}
                </button>
              </div>

              <p className="mt-5 text-xs font-semibold leading-6 text-slate-400">
                {copy.accountManagedByStripe}
              </p>
            </div>

            {!isReady ? (
              <Notice
                tone="warning"
                title={copy.statusNotReadyTitle}
                body={copy.statusNotReadyBody}
              />
            ) : (
              <Notice
                tone="success"
                title={copy.statusReadyTitle}
                body={copy.statusReadyBody}
              />
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}