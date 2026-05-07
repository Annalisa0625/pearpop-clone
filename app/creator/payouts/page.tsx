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
type BadgeTone = "gray" | "green" | "blue" | "yellow" | "red" | "purple";

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
    success: "border-green-100 bg-green-50 text-green-900",
    warning: "border-yellow-100 bg-yellow-50 text-yellow-900",
    error: "border-red-100 bg-red-50 text-red-900",
  };

  return (
    <div className={`rounded-2xl border p-4 text-sm ${styles[tone]}`}>
      <p className="font-bold">{title}</p>
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
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
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
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${styles[tone]}`}
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
    <div className="flex flex-col gap-1 border-b border-gray-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-gray-900">{value}</p>
      {helper ? <p className="mt-2 text-xs text-gray-500">{helper}</p> : null}
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
            eyebrow: "Creator Payouts",
            title: "報酬受け取り設定",
            subtitle:
              "Stripe Expressの受け取り設定と、完了済み案件の報酬・送金状況を確認できます。",
            backDashboard: "ダッシュボードへ戻る",
            connectTitle: "Stripe Express Connect",
            connectBody:
              "Trendreでは、案件完了後のクリエイター報酬をStripe Connect経由で管理します。本人確認・振込先情報の登録を完了してください。",
            statusReadyTitle: "受け取り設定は完了しています",
            statusReadyBody:
              "現在の状態では、案件完了後に報酬を受け取る準備ができています。",
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
              "完了済み注文の受取予定額は、運営側の自動処理によりStripe Connect経由で送金されます。送金状況は下の履歴で確認できます。",
            historyEyebrow: "Payout History",
            historyTitle: "報酬・送金履歴",
            historyBody:
              "完了済み注文の受取予定額、送金状態、送金日時を確認できます。",
            totalEarned: "受取予定額合計",
            totalTransferred: "送金済み合計",
            pendingAmount: "未送金・処理中",
            completedOrders: "完了済み件数",
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
          }
        : {
            loading: "Loading...",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found.",
            loadFailed: "Failed to load payout settings.",
            payoutLoadFailed: "Failed to load payout history.",
            statusFailed: "Failed to refresh Stripe Connect status.",
            onboardingFailed: "Failed to start Stripe Connect onboarding.",
            eyebrow: "Creator Payouts",
            title: "Payout Settings",
            subtitle:
              "Manage your Stripe Express setup and review payout status for completed orders.",
            backDashboard: "Back to dashboard",
            connectTitle: "Stripe Express Connect",
            connectBody:
              "Trendre uses Stripe Connect to manage creator payouts after completed orders. Please complete identity verification and payout details.",
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
              "Payout amounts from completed orders are transferred through Stripe Connect by the platform's automated process. You can review payout status below.",
            historyEyebrow: "Payout History",
            historyTitle: "Payout & Transfer History",
            historyBody:
              "Review payout amounts, transfer status, and transfer timestamps for completed orders.",
            totalEarned: "Total payout amount",
            totalTransferred: "Transferred",
            pendingAmount: "Pending / processing",
            completedOrders: "Completed orders",
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

  const loadPayoutHistory = async (
    userId: string,
    creatorId: string | null
  ) => {
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

      if (connectParam === "return" || connectParam === "refresh") {
        setReturnNotice(connectParam);
      }

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
  const hasAccount = Boolean(
    status?.has_stripe_account || creator?.stripe_account_id
  );
  const accountIdLabel =
    status?.stripe_account_id_masked ||
    creator?.stripe_account_id ||
    copy.none;

  const payoutSummary = useMemo(() => {
    const totalEarned = payoutOrders.reduce(
      (sum, order) => sum + Number(order.creator_payout_amount || 0),
      0
    );

    const totalTransferred = payoutOrders
      .filter((order) => order.transfer_status === "transferred")
      .reduce((sum, order) => sum + Number(order.creator_payout_amount || 0), 0);

    const pendingAmount = Math.max(totalEarned - totalTransferred, 0);

    const mainCurrency =
      payoutOrders.find((order) => order.currency)?.currency || "JPY";

    return {
      totalEarned,
      totalTransferred,
      pendingAmount,
      mainCurrency,
      completedCount: payoutOrders.length,
    };
  }, [payoutOrders]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">{copy.loading}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-gray-900 sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">
                {copy.subtitle}
              </p>
            </div>

            <Link
              href="/creator/dashboard"
              className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
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

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  {copy.connectTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {copy.connectBody}
                </p>
              </div>

              <StatusPill
                active={isReady}
                activeLabel={copy.completed}
                inactiveLabel={copy.incomplete}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-gray-100 p-4">
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
                label={copy.chargesEnabled}
                value={
                  <StatusPill
                    active={Boolean(status?.charges_enabled)}
                    activeLabel={copy.enabled}
                    inactiveLabel={copy.disabled}
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

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleStartOnboarding}
                disabled={starting}
                className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? copy.refreshing : copy.refresh}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
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

            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-bold text-gray-900">
                {creator?.display_name || "Creator"}
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-600">
                {safeLocale === "ja"
                  ? "このページはクリエイター本人の報酬受け取り設定です。企業側には表示されません。"
                  : "This page is for the creator's payout setup. It is not shown to companies."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">
                {copy.historyEyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-black text-gray-900">
                {copy.historyTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">
                {copy.historyBody}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? copy.refreshing : copy.refresh}
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label={copy.totalEarned}
              value={formatMoney(
                payoutSummary.totalEarned,
                payoutSummary.mainCurrency,
                safeLocale
              )}
              helper={copy.completedOrders}
            />
            <SummaryCard
              label={copy.totalTransferred}
              value={formatMoney(
                payoutSummary.totalTransferred,
                payoutSummary.mainCurrency,
                safeLocale
              )}
              helper={safeLocale === "ja" ? "送金完了済み" : "Transferred"}
            />
            <SummaryCard
              label={copy.pendingAmount}
              value={formatMoney(
                payoutSummary.pendingAmount,
                payoutSummary.mainCurrency,
                safeLocale
              )}
              helper={safeLocale === "ja" ? "未送金・処理中" : "Pending"}
            />
            <SummaryCard
              label={copy.completedOrders}
              value={String(payoutSummary.completedCount)}
              helper={safeLocale === "ja" ? "報酬対象の完了注文" : "Eligible completed orders"}
            />
          </div>

          {payoutOrders.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-base font-black text-gray-900">
                {copy.historyEmptyTitle}
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                {copy.historyEmptyBody}
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {payoutOrders.map((order) => {
                const badge = getTransferBadgeMeta(
                  order.transfer_status,
                  safeLocale
                );

                return (
                  <article
                    key={order.id}
                    className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                          <Badge tone="purple">
                            {formatMoney(
                              order.creator_payout_amount,
                              order.currency,
                              safeLocale
                            )}
                          </Badge>
                        </div>

                        <h3 className="mt-3 break-words text-lg font-black text-gray-900">
                          {order.product_name ||
                            (safeLocale === "ja" ? "注文" : "Order")}
                        </h3>

                        <p className="mt-1 break-all text-xs text-gray-400">
                          {copy.order}: {shortId(order.id)}
                        </p>
                      </div>

                      <Link
                        href={`/creator/orders/${order.id}`}
                        className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                      >
                        {copy.orderDetail}
                      </Link>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-bold text-gray-400">
                          {copy.payoutAmount}
                        </p>
                        <p className="mt-2 font-black text-gray-900">
                          {formatMoney(
                            order.creator_payout_amount,
                            order.currency,
                            safeLocale
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-bold text-gray-400">
                          {copy.completedAt}
                        </p>
                        <p className="mt-2 font-semibold text-gray-900">
                          {formatDateTime(order.completed_at, safeLocale)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-bold text-gray-400">
                          {copy.transferredAt}
                        </p>
                        <p className="mt-2 font-semibold text-gray-900">
                          {formatDateTime(order.transferred_at, safeLocale)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-bold text-gray-400">
                          {copy.transferId}
                        </p>
                        <p className="mt-2 break-all font-semibold text-gray-900">
                          {shortId(order.stripe_transfer_id)}
                        </p>
                      </div>
                    </div>

                    {order.transfer_failed_reason ? (
                      <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-900">
                        <p className="font-bold">{copy.failedReason}</p>
                        <p className="mt-2 break-words leading-6">
                          {order.transfer_failed_reason}
                        </p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}