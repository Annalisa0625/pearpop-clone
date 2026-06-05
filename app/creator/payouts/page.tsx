// File: app/creator/payouts/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorBadge,
  CreatorButton,
  CreatorCard,
  CreatorChevron,
  CreatorEmptyState,
  CreatorHero,
  CreatorLinkButton,
  CreatorMetric,
  CreatorMiniInfo,
  CreatorNotice,
  CreatorPage,
  CreatorSection,
  CreatorSkeleton,
} from "@/app/creator/_components/CreatorDesignSystem";

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

type TransferTone = "green" | "blue" | "red" | "amber" | "slate";

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

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
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

function getTransferMeta(
  transferStatus: string | null | undefined,
  locale: "ja" | "en"
): {
  label: string;
  tone: TransferTone;
} {
  const normalized = (transferStatus || "not_started").toLowerCase();

  if (locale === "ja") {
    if (normalized === "transferred") {
      return { label: "送金済み", tone: "green" };
    }

    if (normalized === "pending") {
      return { label: "処理中", tone: "blue" };
    }

    if (normalized === "failed") {
      return { label: "確認が必要", tone: "red" };
    }

    if (normalized === "skipped") {
      return { label: "保留中", tone: "amber" };
    }

    return { label: "送金待ち", tone: "slate" };
  }

  if (normalized === "transferred") {
    return { label: "Transferred", tone: "green" };
  }

  if (normalized === "pending") {
    return { label: "Processing", tone: "blue" };
  }

  if (normalized === "failed") {
    return { label: "Needs check", tone: "red" };
  }

  if (normalized === "skipped") {
    return { label: "On hold", tone: "amber" };
  }

  return { label: "Waiting", tone: "slate" };
}

function LoadingView() {
  return (
    <CreatorPage>
      <CreatorSkeleton className="h-40" />
      <div className="grid grid-cols-2 gap-3">
        <CreatorSkeleton className="h-24" />
        <CreatorSkeleton className="h-24" />
      </div>
      <CreatorSkeleton className="h-44" />
    </CreatorPage>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M12 3v18M17 6.5c-.9-1-2.5-1.7-4.2-1.7-2.4 0-4.3 1.2-4.3 3.1 0 2.2 2.2 2.8 4.5 3.3 2.2.5 4.2 1.1 4.2 3.4 0 2-1.9 3.3-4.5 3.3-2.1 0-3.9-.8-4.9-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M5 18h14M12 4l8 4H4l8-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function YenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m7 5 5 7 5-7M12 12v7M8 13h8M8 16h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
    <div className="rounded-[22px] bg-[#F8F9FA] p-4 ring-1 ring-slate-100">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#FF3B5C] shadow-sm ring-1 ring-slate-100">
          {number}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({
  order,
  locale,
  copy,
}: {
  order: PayoutOrderRow;
  locale: "ja" | "en";
  copy: {
    order: string;
    completedAt: string;
    payoutAmount: string;
  };
}) {
  const badge = getTransferMeta(order.transfer_status, locale);

  return (
    <Link
      href={`/creator/orders/${order.id}`}
      className="block rounded-[24px] bg-[#F8F9FA] p-4 ring-1 ring-slate-100 transition active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <CreatorBadge tone={badge.tone}>{badge.label}</CreatorBadge>
          </div>

          <p className="truncate text-[16px] font-black tracking-[-0.04em] text-slate-950">
            {order.product_name || copy.order}
          </p>

          <p className="mt-1.5 text-xs font-bold text-slate-400">
            {copy.completedAt}：
            {formatDate(order.completed_at || order.created_at, locale)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-[15px] font-black tracking-[-0.035em] text-slate-950">
              {formatMoney(order.creator_payout_amount, order.currency, locale)}
            </p>
            <p className="mt-1 text-[11px] font-black text-slate-400">
              {copy.payoutAmount}
            </p>
          </div>

          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-100">
            <CreatorChevron />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CreatorPayoutsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

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
            loginRequired: "ログインしてください",
            creatorNotFound: "インフルエンサー情報が見つかりませんでした。",
            loadFailed: "報酬受け取り情報の取得に失敗しました。",
            statusFailed: "Stripeの状態確認に失敗しました。",
            onboardingFailed: "Stripeの登録開始に失敗しました。",

            title: "報酬",
            subtitle: "受取予定額と送金状況を確認できます。",
            signupTitle: "報酬の受け取り設定",
            signupSubtitle:
              "注文完了後に報酬を受け取るため、Stripeで本人確認と振込先を登録します。",

            setupLabel: "設定が必要",
            readyLabel: "設定済み",
            goDashboard: "ホームへ進む",

            start: "受け取り設定をする",
            continue: "設定を続ける",
            refresh: "設定状況を確認する",
            refreshing: "確認中...",
            starting: "Stripeへ移動中...",

            step1Title: "本人確認",
            step1Body: "Stripeの画面で本人確認情報を入力します。",
            step2Title: "振込先登録",
            step2Body: "報酬を受け取る銀行口座を登録します。",
            step3Title: "受け取り開始",
            step3Body: "設定完了後、注文完了時に報酬が反映されます。",

            statusReadyTitle: "受け取り設定は完了しています",
            statusReadyBody: "注文完了後に報酬を受け取る準備ができています。",
            statusNotReadyTitle: "受け取り設定がまだ完了していません",
            statusNotReadyBody:
              "報酬を受け取るには、Stripeで本人確認と振込先登録を完了してください。",
            returnedTitle: "Stripeから戻りました",
            returnedBody:
              "状態を確認しました。未完了の場合は、もう一度設定を続けてください。",
            refreshTitle: "Stripe登録が中断されました",
            refreshBody: "下のボタンから登録を再開できます。",
            accountManagedByStripe:
              "銀行口座情報はStripe側で安全に管理されます。Trendreには口座番号の詳細は保存されません。",

            thisMonthExpected: "今月の受取予定",
            totalTransferred: "送金済み",
            pendingAmount: "送金待ち",
            completedOrders: "完了件数",
            countSuffix: "件",

            historyTitle: "報酬履歴",
            historyBody: "完了した注文の報酬がここに表示されます。",
            historyEmptyTitle: "まだ報酬履歴はありません",
            historyEmptyBody:
              "注文が完了して受取予定額が確定すると、ここに表示されます。",
            order: "注文",
            payoutAmount: "受取予定",
            completedAt: "完了日",
            settingTitle: "受け取り設定",
            settingBody: "報酬を受け取るための本人確認と振込先設定です。",
            connected: "設定済み",
            incomplete: "未設定",
            errorTitle: "エラー",
          }
        : {
            loginRequired: "Please log in",
            creatorNotFound: "Influencer information was not found.",
            loadFailed: "Failed to load payout settings.",
            statusFailed: "Failed to refresh Stripe status.",
            onboardingFailed: "Failed to start Stripe onboarding.",

            title: "Payouts",
            subtitle: "Check expected payouts and transfer status.",
            signupTitle: "Set up payouts",
            signupSubtitle:
              "Complete identity verification and payout details in Stripe to receive earnings after completed orders.",

            setupLabel: "Setup required",
            readyLabel: "Ready",
            goDashboard: "Go to home",

            start: "Set up payouts",
            continue: "Continue setup",
            refresh: "Check setup status",
            refreshing: "Checking...",
            starting: "Opening Stripe...",

            step1Title: "Identity verification",
            step1Body: "Enter identity details securely in Stripe.",
            step2Title: "Bank account",
            step2Body: "Add the bank account for your payouts.",
            step3Title: "Start receiving",
            step3Body: "After setup, payouts appear after completed orders.",

            statusReadyTitle: "Payout setup is complete",
            statusReadyBody:
              "Your account is ready to receive payouts after completed orders.",
            statusNotReadyTitle: "Payout setup is not complete",
            statusNotReadyBody:
              "Complete identity verification and payout details in Stripe.",
            returnedTitle: "Returned from Stripe",
            returnedBody:
              "We checked your status. Continue setup again if it is still incomplete.",
            refreshTitle: "Stripe setup was interrupted",
            refreshBody: "You can resume setup from the button below.",
            accountManagedByStripe:
              "Bank account details are securely managed by Stripe. Trendre does not store full bank account numbers.",

            thisMonthExpected: "This month",
            totalTransferred: "Transferred",
            pendingAmount: "Waiting",
            completedOrders: "Completed",
            countSuffix: "",

            historyTitle: "Payout history",
            historyBody: "Completed order payouts will appear here.",
            historyEmptyTitle: "No payout history yet",
            historyEmptyBody:
              "Completed orders with confirmed payout amounts will appear here.",
            order: "Order",
            payoutAmount: "Expected",
            completedAt: "Completed",
            settingTitle: "Payout setup",
            settingBody:
              "Identity verification and bank account setup for payouts.",
            connected: "Ready",
            incomplete: "Not set",
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

      const typedCreator = creatorRow as CreatorPayoutState;
      setCreator(typedCreator);

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
        loadPayoutHistory(user.id, typedCreator.id),
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

  const payoutSummary = useMemo(() => {
    const totalExpected = payoutOrders.reduce(
      (sum, order) => sum + Number(order.creator_payout_amount || 0),
      0
    );

    const totalTransferred = payoutOrders
      .filter((order) => order.transfer_status === "transferred")
      .reduce((sum, order) => sum + Number(order.creator_payout_amount || 0), 0);

    const pendingAmount = Math.max(totalExpected - totalTransferred, 0);

    const thisMonthOrders = payoutOrders.filter((order) =>
      isSameMonth(order.completed_at || order.created_at)
    );

    const thisMonthExpected = thisMonthOrders.reduce(
      (sum, order) => sum + Number(order.creator_payout_amount || 0),
      0
    );

    const mainCurrency =
      payoutOrders.find((order) => order.currency)?.currency || "JPY";

    return {
      totalExpected,
      totalTransferred,
      pendingAmount,
      thisMonthExpected,
      thisMonthCompletedCount: thisMonthOrders.length,
      mainCurrency,
      completedCount: payoutOrders.length,
    };
  }, [payoutOrders]);

  if (loading) {
    return <LoadingView />;
  }

  if (signupMode) {
    return (
      <CreatorPage>
        <CreatorHero
          title={isReady ? copy.statusReadyTitle : copy.signupTitle}
          description={isReady ? copy.statusReadyBody : copy.signupSubtitle}
          right={
            <CreatorBadge tone={isReady ? "green" : "amber"}>
              {isReady ? copy.readyLabel : copy.setupLabel}
            </CreatorBadge>
          }
        />

        {returnNotice === "return" ? (
          <CreatorNotice
            tone={isReady ? "green" : "blue"}
            title={copy.returnedTitle}
            description={copy.returnedBody}
          />
        ) : null}

        {returnNotice === "refresh" ? (
          <CreatorNotice
            tone="amber"
            title={copy.refreshTitle}
            description={copy.refreshBody}
          />
        ) : null}

        {error ? (
          <CreatorNotice tone="red" title={copy.errorTitle} description={error} />
        ) : null}

        {!isReady ? (
          <CreatorSection
            title={copy.settingTitle}
            description={copy.accountManagedByStripe}
          >
            <div className="grid gap-3">
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

            <div className="mt-5 grid gap-3">
              <CreatorButton
                type="button"
                onClick={handleStartOnboarding}
                disabled={starting}
                className="w-full"
              >
                {starting
                  ? copy.starting
                  : hasAccount
                    ? copy.continue
                    : copy.start}
              </CreatorButton>

              <CreatorButton
                type="button"
                variant="soft"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full"
              >
                {refreshing ? copy.refreshing : copy.refresh}
              </CreatorButton>
            </div>
          </CreatorSection>
        ) : (
          <CreatorCard className="p-5">
            <CreatorLinkButton href="/creator/dashboard" className="w-full">
              {copy.goDashboard}
            </CreatorLinkButton>
          </CreatorCard>
        )}
      </CreatorPage>
    );
  }

  return (
    <CreatorPage>
      <CreatorHero
        title={copy.title}
        description={copy.subtitle}
        right={
          !isReady ? (
            <CreatorBadge tone="amber">{copy.incomplete}</CreatorBadge>
          ) : (
            <CreatorBadge tone="green">{copy.connected}</CreatorBadge>
          )
        }
      >
        <div className="rounded-[26px] bg-white/70 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur">
          <p className="text-xs font-black text-slate-400">
            {copy.thisMonthExpected}
          </p>

          <p className="mt-2 text-[42px] font-black leading-none tracking-[-0.075em] text-slate-950">
            {formatMoney(
              payoutSummary.thisMonthExpected,
              payoutSummary.mainCurrency,
              safeLocale
            )}
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-400">
            {copy.completedOrders}：{payoutSummary.thisMonthCompletedCount}
            {safeLocale === "ja" ? copy.countSuffix : ""}
          </p>
        </div>
      </CreatorHero>

      {returnNotice === "return" ? (
        <CreatorNotice
          tone={isReady ? "green" : "blue"}
          title={copy.returnedTitle}
          description={copy.returnedBody}
        />
      ) : null}

      {returnNotice === "refresh" ? (
        <CreatorNotice
          tone="amber"
          title={copy.refreshTitle}
          description={copy.refreshBody}
        />
      ) : null}

      {error ? (
        <CreatorNotice tone="red" title={copy.errorTitle} description={error} />
      ) : null}

      {!isReady ? (
        <CreatorCard className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-amber-50 text-amber-700 ring-1 ring-amber-100">
              <BankIcon />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-black tracking-[-0.045em] text-slate-950">
                {copy.statusNotReadyTitle}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                {copy.statusNotReadyBody}
              </p>

              <CreatorButton
                type="button"
                onClick={handleStartOnboarding}
                disabled={starting}
                className="mt-5 w-full"
              >
                {starting ? copy.starting : hasAccount ? copy.continue : copy.start}
              </CreatorButton>
            </div>
          </div>
        </CreatorCard>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <CreatorMetric
          label={copy.pendingAmount}
          value={formatMoney(
            payoutSummary.pendingAmount,
            payoutSummary.mainCurrency,
            safeLocale
          )}
        />

        <CreatorMetric
          label={copy.totalTransferred}
          value={formatMoney(
            payoutSummary.totalTransferred,
            payoutSummary.mainCurrency,
            safeLocale
          )}
        />
      </div>

      <CreatorSection
        title={copy.historyTitle}
        description={copy.historyBody}
        right={
          <CreatorBadge tone="slate">
            {payoutSummary.completedCount}
            {safeLocale === "ja" ? copy.countSuffix : ""}
          </CreatorBadge>
        }
      >
        {payoutOrders.length === 0 ? (
          <CreatorEmptyState
            icon={<EmptyIcon />}
            title={copy.historyEmptyTitle}
            description={copy.historyEmptyBody}
          />
        ) : (
          <div className="space-y-2.5">
            {payoutOrders.map((order) => (
              <HistoryRow
                key={order.id}
                order={order}
                locale={safeLocale}
                copy={copy}
              />
            ))}
          </div>
        )}
      </CreatorSection>

      <CreatorCard className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-slate-50 text-slate-500 ring-1 ring-slate-100">
              <YenIcon />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-950">
                {copy.settingTitle}
              </h2>

              <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                {isReady ? copy.statusReadyBody : copy.settingBody}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <CreatorBadge tone={isReady ? "green" : "amber"}>
              {isReady ? copy.connected : copy.incomplete}
            </CreatorBadge>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition active:scale-95 disabled:opacity-50"
              aria-label={copy.refresh}
            >
              <CreatorChevron />
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs font-semibold leading-6 text-slate-400">
          {copy.accountManagedByStripe}
        </p>
      </CreatorCard>
    </CreatorPage>
  );
}