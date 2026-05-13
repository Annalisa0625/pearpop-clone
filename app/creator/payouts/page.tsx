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
type BadgeTone = "gray" | "green" | "blue" | "yellow" | "red" | "purple" | "black";

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
    info: "border-blue-100 bg-blue-50 text-blue-900",
    success: "border-emerald-100 bg-emerald-50 text-emerald-900",
    warning: "border-amber-100 bg-amber-50 text-amber-900",
    error: "border-rose-100 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-[24px] border p-4 text-sm ${styles[tone]}`}>
      <p className="font-black">{title}</p>
      <p className="mt-2 leading-6">{body}</p>
    </div>
  );
}

function StatusPill({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
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
    purple: "bg-purple-100 text-purple-700",
    black: "bg-slate-950 text-white",
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
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <div className="text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

function MoneyCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "green" | "dark" | "warning";
}) {
  const styles = {
    default: "border-slate-100 bg-white text-slate-950",
    green: "border-emerald-100 bg-emerald-50 text-slate-950",
    dark: "border-slate-950 bg-slate-950 text-white",
    warning: "border-amber-100 bg-amber-50 text-slate-950",
  };

  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${styles[tone]}`}>
      <p
        className={`text-xs font-black uppercase tracking-[0.2em] ${
          tone === "dark" ? "text-white/60" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-4 text-3xl font-black ${
          tone === "dark" ? "text-white" : "text-slate-950"
        }`}
      >
        {value}
      </p>
      {helper ? (
        <p
          className={`mt-2 text-xs leading-5 ${
            tone === "dark" ? "text-white/70" : "text-slate-500"
          }`}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function ActionRow({
  icon,
  title,
  body,
  children,
}: {
  icon: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-950">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
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
      return { label: "送金処理中", tone: "blue" };
    }

    if (normalized === "failed") {
      return { label: "送金失敗", tone: "red" };
    }

    if (normalized === "skipped") {
      return { label: "送金保留", tone: "yellow" };
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

  return { label: "Not started", tone: "gray" };
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
            creatorNotFound: "クリエイター情報が見つかりませんでした。",
            loadFailed: "報酬受け取り情報の取得に失敗しました。",
            payoutLoadFailed: "報酬履歴の取得に失敗しました。",
            statusFailed: "Stripe Connectの状態確認に失敗しました。",
            onboardingFailed:
              "Stripe Connectのオンボーディング開始に失敗しました。",
            eyebrow: "Creator Wallet",
            title: "報酬",
            signupTitle: "最後のステップ：報酬受け取り設定",
            subtitle:
              "今月の収益、送金状況、Stripe Expressの受け取り設定を確認できます。",
            signupSubtitle:
              "案件完了後に安全に報酬を受け取るため、Stripe Expressで本人確認と振込先登録を完了してください。",
            backDashboard: "ホームへ戻る",
            connectTitle: "銀行口座・本人確認",
            connectBody:
              "報酬の受け取りはStripe Expressで管理されます。本人確認と振込先登録が完了すると、案件完了後に送金を受け取れます。",
            statusReadyTitle: "受け取り設定は完了しています",
            statusReadyBody:
              "案件完了後に報酬を受け取る準備ができています。",
            statusNotReadyTitle: "受け取り設定が未完了です",
            statusNotReadyBody:
              "本人確認や振込先情報が不足している可能性があります。Stripeの画面で登録を完了してください。",
            noAccountTitle: "Stripeアカウントは未作成です",
            noAccountBody:
              "下のボタンからStripe Expressアカウントを作成し、報酬受け取り設定を開始してください。",
            returnedTitle: "Stripeから戻りました",
            returnedBody:
              "最新の状態を確認しました。未完了の場合は、もう一度オンボーディングを続けてください。",
            refreshTitle: "Stripe登録が中断されました",
            refreshBody:
              "登録を再開できます。下のボタンからStripeの登録画面へ戻ってください。",
            accountId: "Stripeアカウント",
            onboarding: "オンボーディング",
            detailsSubmitted: "本人確認情報",
            chargesEnabled: "決済受け入れ",
            payoutsEnabled: "振込",
            requirements: "追加対応が必要な項目",
            disabledReason: "制限理由",
            completed: "完了",
            incomplete: "未完了",
            enabled: "有効",
            disabled: "無効",
            none: "なし",
            start: "報酬受け取り設定を開始する",
            continue: "Stripe登録を続ける",
            refresh: "状態を更新する",
            refreshing: "更新中...",
            starting: "Stripeへ移動中...",
            noteTitle: "送金について",
            noteBody:
              "完了済み注文の受取予定額は、運営側の自動処理によりStripe Connect経由で送金されます。",
            monthRevenue: "今月の収益",
            totalEarned: "受取予定",
            totalTransferred: "送金済み",
            pendingAmount: "未送金",
            completedOrders: "完了件数",
            transferHistory: "振込履歴",
            historyTitle: "報酬・送金履歴",
            historyBody:
              "完了済み注文の受取予定額、送金状態、送金日時を確認できます。",
            historyEmptyTitle: "まだ報酬履歴がありません",
            historyEmptyBody:
              "案件が完了し、受取予定額が確定するとここに表示されます。",
            order: "注文",
            orderDetail: "案件詳細",
            payoutAmount: "受取予定額",
            transferStatus: "送金状態",
            completedAt: "完了日時",
            transferredAt: "送金日時",
            transferId: "Transfer ID",
            failedReason: "失敗理由",
            createdAt: "作成日時",
            setupCompleteDashboard: "登録を完了してホームへ進む",
            accountManagedByStripe:
              "銀行口座情報はStripe側で安全に管理されます。Trendreには口座番号の詳細は保存されません。",
          }
        : {
            loading: "Loading...",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found.",
            loadFailed: "Failed to load payout settings.",
            payoutLoadFailed: "Failed to load payout history.",
            statusFailed: "Failed to refresh Stripe Connect status.",
            onboardingFailed: "Failed to start Stripe Connect onboarding.",
            eyebrow: "Creator Wallet",
            title: "Payouts",
            signupTitle: "Last step: Set up payouts",
            subtitle:
              "Check monthly earnings, transfer status, and Stripe Express payout setup.",
            signupSubtitle:
              "Complete Stripe Express onboarding so you can safely receive payouts after completed orders.",
            backDashboard: "Back to home",
            connectTitle: "Bank account & identity",
            connectBody:
              "Creator payouts are managed through Stripe Express. Complete identity verification and payout details to receive transfers after completed jobs.",
            statusReadyTitle: "Payout setup is complete",
            statusReadyBody:
              "Your account is ready to receive payouts after completed orders.",
            statusNotReadyTitle: "Payout setup is not complete",
            statusNotReadyBody:
              "Some identity or payout details may still be missing. Please complete the setup in Stripe.",
            noAccountTitle: "Stripe account has not been created",
            noAccountBody:
              "Start Stripe Express onboarding from the button below to set up payouts.",
            returnedTitle: "Returned from Stripe",
            returnedBody:
              "We refreshed your latest status. If it is still incomplete, continue onboarding again.",
            refreshTitle: "Stripe setup was interrupted",
            refreshBody:
              "You can resume setup. Use the button below to return to Stripe onboarding.",
            accountId: "Stripe account",
            onboarding: "Onboarding",
            detailsSubmitted: "Details submitted",
            chargesEnabled: "Charges",
            payoutsEnabled: "Payouts",
            requirements: "Requirements currently due",
            disabledReason: "Disabled reason",
            completed: "Completed",
            incomplete: "Incomplete",
            enabled: "Enabled",
            disabled: "Disabled",
            none: "None",
            start: "Start payout setup",
            continue: "Continue Stripe setup",
            refresh: "Refresh status",
            refreshing: "Refreshing...",
            starting: "Opening Stripe...",
            noteTitle: "About payouts",
            noteBody:
              "Payout amounts from completed orders are transferred through Stripe Connect by the platform's automated process.",
            monthRevenue: "This month",
            totalEarned: "Expected",
            totalTransferred: "Transferred",
            pendingAmount: "Pending",
            completedOrders: "Completed orders",
            transferHistory: "Transfer history",
            historyTitle: "Payout & Transfer History",
            historyBody:
              "Review payout amounts, transfer status, and transfer timestamps for completed orders.",
            historyEmptyTitle: "No payout history yet",
            historyEmptyBody:
              "Completed orders with confirmed payout amounts will appear here.",
            order: "Order",
            orderDetail: "View order",
            payoutAmount: "Payout amount",
            transferStatus: "Transfer status",
            completedAt: "Completed at",
            transferredAt: "Transferred at",
            transferId: "Transfer ID",
            failedReason: "Failure reason",
            createdAt: "Created at",
            setupCompleteDashboard: "Complete setup and go to home",
            accountManagedByStripe:
              "Bank account details are securely managed by Stripe. Trendre does not store full bank account numbers.",
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
  const accountIdLabel =
    status?.stripe_account_id_masked || creator?.stripe_account_id || copy.none;

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
    return (
      <div className="space-y-5">
        <div className="h-40 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-[28px] bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-4">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          {copy.eyebrow}
        </p>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {signupMode ? copy.signupTitle : copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              {signupMode ? copy.signupSubtitle : copy.subtitle}
            </p>
          </div>

          <Link
            href="/creator/dashboard"
            className="w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {copy.backDashboard}
          </Link>
        </div>
      </section>

      {returnNotice === "return" ? (
        <Notice
          tone="success"
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

      {error ? <Notice tone="error" title="Error" body={error} /> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MoneyCard
          label={copy.monthRevenue}
          value={formatMoney(
            payoutSummary.thisMonthEarned,
            payoutSummary.mainCurrency,
            safeLocale
          )}
          helper={copy.completedOrders}
          tone="dark"
        />
        <MoneyCard
          label={copy.totalEarned}
          value={formatMoney(
            payoutSummary.totalEarned,
            payoutSummary.mainCurrency,
            safeLocale
          )}
          helper={`${payoutSummary.completedCount}${safeLocale === "ja" ? "件" : ""}`}
        />
        <MoneyCard
          label={copy.totalTransferred}
          value={formatMoney(
            payoutSummary.totalTransferred,
            payoutSummary.mainCurrency,
            safeLocale
          )}
          tone="green"
        />
        <MoneyCard
          label={copy.pendingAmount}
          value={formatMoney(
            payoutSummary.pendingAmount,
            payoutSummary.mainCurrency,
            safeLocale
          )}
          tone={payoutSummary.pendingAmount > 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <ActionRow
            icon="🏦"
            title={copy.connectTitle}
            body={copy.connectBody}
          >
            <div className="flex flex-wrap gap-2">
              <StatusPill
                active={isReady}
                activeLabel={copy.completed}
                inactiveLabel={copy.incomplete}
              />
              <StatusPill
                active={Boolean(status?.payouts_enabled)}
                activeLabel={copy.enabled}
                inactiveLabel={copy.disabled}
              />
            </div>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={handleStartOnboarding}
                disabled={starting}
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting
                  ? copy.starting
                  : hasAccount
                  ? copy.continue
                  : copy.start}
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? copy.refreshing : copy.refresh}
              </button>
            </div>

            {isReady && signupMode ? (
              <Link
                href="/creator/dashboard"
                className="mt-3 flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
              >
                {copy.setupCompleteDashboard}
              </Link>
            ) : null}
          </ActionRow>

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              {copy.historyTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {copy.historyBody}
            </p>

            {payoutOrders.length === 0 ? (
              <div className="mt-5 rounded-[24px] bg-slate-50 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm">
                  ¥
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  {copy.historyEmptyTitle}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {copy.historyEmptyBody}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {payoutOrders.map((order) => {
                  const badge = getTransferBadgeMeta(
                    order.transfer_status,
                    safeLocale
                  );

                  return (
                    <div
                      key={order.id}
                      className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            {order.product_name || `${copy.order} ${shortId(order.id)}`}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {copy.completedAt}:{" "}
                            {formatDateTime(
                              order.completed_at || order.created_at,
                              safeLocale
                            )}
                          </p>
                        </div>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
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
                        <FieldRow
                          label={copy.transferId}
                          value={shortId(order.stripe_transfer_id)}
                        />
                        {order.transfer_failed_reason ? (
                          <FieldRow
                            label={copy.failedReason}
                            value={order.transfer_failed_reason}
                          />
                        ) : null}
                      </div>

                      <Link
                        href={`/creator/orders/${order.id}`}
                        className="mt-4 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition active:scale-[0.98]"
                      >
                        {copy.orderDetail}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          {isReady ? (
            <Notice
              tone="success"
              title={copy.statusReadyTitle}
              body={copy.statusReadyBody}
            />
          ) : hasAccount ? (
            <Notice
              tone="warning"
              title={copy.statusNotReadyTitle}
              body={copy.statusNotReadyBody}
            />
          ) : (
            <Notice
              tone="info"
              title={copy.noAccountTitle}
              body={copy.noAccountBody}
            />
          )}

          <Notice tone="info" title={copy.noteTitle} body={copy.noteBody} />

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              {copy.connectTitle}
            </h2>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <FieldRow label={copy.accountId} value={accountIdLabel} />
              <FieldRow
                label={copy.onboarding}
                value={
                  <StatusPill
                    active={isReady}
                    activeLabel={copy.completed}
                    inactiveLabel={copy.incomplete}
                  />
                }
              />
              <FieldRow
                label={copy.detailsSubmitted}
                value={
                  <StatusPill
                    active={Boolean(status?.details_submitted)}
                    activeLabel={copy.completed}
                    inactiveLabel={copy.incomplete}
                  />
                }
              />
              <FieldRow
                label={copy.payoutsEnabled}
                value={
                  <StatusPill
                    active={Boolean(status?.payouts_enabled)}
                    activeLabel={copy.enabled}
                    inactiveLabel={copy.disabled}
                  />
                }
              />
              <FieldRow
                label={copy.requirements}
                value={
                  status?.requirements_currently_due?.length
                    ? status.requirements_currently_due.join(", ")
                    : copy.none
                }
              />
              <FieldRow
                label={copy.disabledReason}
                value={status?.disabled_reason || copy.none}
              />
            </div>

            <p className="mt-4 text-xs leading-6 text-slate-500">
              {copy.accountManagedByStripe}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}