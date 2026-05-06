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

type NoticeTone = "info" | "success" | "warning" | "error";

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

export default function CreatorPayoutsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const [creator, setCreator] = useState<CreatorPayoutState | null>(null);
  const [status, setStatus] = useState<ConnectStatus | null>(null);
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
            statusFailed: "Stripe Connectの状態確認に失敗しました。",
            onboardingFailed:
              "Stripe Connectのオンボーディング開始に失敗しました。",
            eyebrow: "Creator Payouts",
            title: "報酬受け取り設定",
            subtitle:
              "案件完了後に報酬を受け取るため、Stripe Expressアカウントを設定します。",
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
            noteTitle: "今後の流れ",
            noteBody:
              "この設定が完了した後、完了済み注文の受取予定額をStripe Connectで送金する処理を追加します。",
          }
        : {
            loading: "Loading...",
            loginRequired: "Please log in",
            creatorNotFound: "Creator information was not found.",
            loadFailed: "Failed to load payout settings.",
            statusFailed: "Failed to refresh Stripe Connect status.",
            onboardingFailed: "Failed to start Stripe Connect onboarding.",
            eyebrow: "Creator Payouts",
            title: "Payout Settings",
            subtitle:
              "Set up your Stripe Express account to receive payouts after completed orders.",
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
            noteTitle: "Next step",
            noteBody:
              "After this setup is complete, we will add the transfer flow to send completed order payout amounts through Stripe Connect.",
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

      await refreshConnectStatus(accessToken);
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
    status?.stripe_account_id_masked ||
    creator?.stripe_account_id ||
    copy.none;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">{copy.loading}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
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
      </div>
    </main>
  );
}