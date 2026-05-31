// File: app/creator/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type DashboardCounts = {
  pendingRequests: number;
  acceptedJobs: number;
  deliveredJobs: number;
  completedJobs: number;
  activeMenus: number;
};

type RecentRequest = {
  kind: "order" | "legacy_request";
  id: string;
  product_name: string | null;
  status: string | null;
  created_at: string;
};

type RecentJob = {
  kind: "order" | "legacy_request";
  id: string;
  product_name: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
  delivered_post_url: string | null;
};

type CreatorState = {
  isCreator: boolean;
  isSuspended: boolean;
  creatorProfileCompleted: boolean;
  creatorApprovalStatus: string | null;
};

type CreatorProfile = {
  id: string;
  user_id: string;
  display_name: string;
  full_name: string | null;
  avatar_url: string | null;
  category: string | null;
  approval_status: string;
  stripe_onboarding_completed: boolean | null;
};

type PayoutSummary = {
  completedPayoutAmount: number;
  transferredAmount: number;
  pendingAmount: number;
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
}

function fallbackInitial(name: string) {
  return (name || "T").slice(0, 1).toUpperCase();
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

function formatMoney(value: number, locale: "ja" | "en") {
  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `¥${value.toLocaleString()}`;
  }
}

function getOrderHref(item: RecentRequest | RecentJob) {
  return item.kind === "order"
    ? `/creator/orders/${item.id}`
    : `/creator/requests/${item.id}`;
}

function getSimpleStatus(status: string | null, locale: "ja" | "en") {
  const normalized = (status || "").toLowerCase();

  if (locale === "ja") {
    if (
      normalized === "pending" ||
      normalized === "authorized_pending_creator"
    ) {
      return "返答待ち";
    }

    if (
      normalized === "accepted" ||
      normalized === "accepted_captured" ||
      normalized === "in_progress"
    ) {
      return "進行中";
    }

    if (normalized === "delivered") {
      return "確認待ち";
    }

    if (normalized === "completed") {
      return "完了";
    }

    return "注文";
  }

  if (normalized === "pending" || normalized === "authorized_pending_creator") {
    return "New";
  }

  if (
    normalized === "accepted" ||
    normalized === "accepted_captured" ||
    normalized === "in_progress"
  ) {
    return "In progress";
  }

  if (normalized === "delivered") {
    return "Delivered";
  }

  if (normalized === "completed") {
    return "Done";
  }

  return "Order";
}

function CreatorAvatar({
  name,
  src,
}: {
  name: string;
  src: string | null | undefined;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-100"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-base font-black text-[#ff5f67] shadow-sm ring-1 ring-slate-100">
      {fallbackInitial(name)}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="space-y-5">
      <div className="h-32 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 min-w-[74%] animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100 sm:min-w-[260px]"
          />
        ))}
      </div>
      <div className="h-44 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
    </div>
  );
}

function NoticeCard({
  title,
  body,
  href,
  cta,
  tone = "soft",
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
  tone?: "soft" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-rose-50 ring-rose-100 text-rose-900"
      : tone === "warning"
        ? "bg-amber-50 ring-amber-100 text-amber-950"
        : "bg-white ring-slate-100 text-slate-950";

  return (
    <section className={`rounded-[28px] p-5 ring-1 ${toneClass}`}>
      <h2 className="text-base font-black tracking-[-0.03em]">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-7 opacity-75">{body}</p>
      {href && cta ? (
        <Link
          href={href}
          className="mt-4 inline-flex rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,95,103,0.22)] active:scale-[0.98]"
        >
          {cta}
        </Link>
      ) : null}
    </section>
  );
}

function SummaryCard({
  href,
  label,
  value,
  body,
  accent,
}: {
  href: string;
  label: string;
  value: number | string;
  body: string;
  accent: "rose" | "green" | "blue" | "slate";
}) {
  const accentClass =
    accent === "rose"
      ? "bg-rose-50 text-[#ff5f67]"
      : accent === "green"
        ? "bg-emerald-50 text-emerald-700"
        : accent === "blue"
          ? "bg-blue-50 text-blue-700"
          : "bg-slate-50 text-slate-700";

  return (
    <Link
      href={href}
      className="snap-start rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.045)] ring-1 ring-slate-100 transition active:scale-[0.98] sm:hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-500">{label}</p>
          <p className="mt-3 text-[34px] font-black leading-none tracking-[-0.05em] text-slate-950">
            {value}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-black ${accentClass}`}
        >
          ›
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
        {body}
      </p>
    </Link>
  );
}

function RecentOrderCard({
  item,
  locale,
  productUnset,
  dateLabel,
}: {
  item: RecentRequest | RecentJob;
  locale: "ja" | "en";
  productUnset: string;
  dateLabel: string;
}) {
  return (
    <Link
      href={getOrderHref(item)}
      className="block rounded-[24px] bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 transition active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-[-0.03em] text-slate-950">
            {item.product_name || productUnset}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            {dateLabel}:{" "}
            {formatDate(
              "updated_at" in item ? item.updated_at || item.created_at : item.created_at,
              locale
            )}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
          {getSimpleStatus(item.status, locale)}
        </span>
      </div>

      {"delivered_post_url" in item && item.delivered_post_url ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
          {locale === "ja" ? "納品済み" : "Delivered"}
        </p>
      ) : null}
    </Link>
  );
}

export default function CreatorDashboardPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            defaultDisplayName: "インフルエンサー",
            loadingError: "ホームの読み込み中にエラーが発生しました。",
            loadError: "ホーム情報の取得に失敗しました。",
            requestLoadError: "注文データの取得に失敗しました。",
            genericErrorTitle: "読み込みに失敗しました",
            creatorOnlyTitle: "インフルエンサー専用ページです",
            creatorOnlyBody:
              "このページはインフルエンサーアカウントのみ利用できます。",

            greeting: "こんにちは",
            heroTitle: "今日の状況を確認しましょう",
            heroBody:
              "新しい注文、進行中のToDo、報酬の状況をここで確認できます。",
            viewOrders: "注文を見る",

            suspendedTitle: "現在このアカウントは制限中です",
            suspendedBody:
              "アカウント状態の確認が必要です。一部機能をご利用いただけません。",
            reviewPendingTitle: "審査中です",
            reviewPendingBody:
              "承認後に注文受付や進行機能を利用できます。",
            profilePromptTitle: "プロフィールを整えてください",
            profilePromptBody:
              "写真・SNS・メニューを整えると、企業が注文しやすくなります。",
            goToProfile: "プロフィールを編集する",

            orderLabel: "注文",
            orderBody: "新しく届いた注文を確認",
            todoLabel: "ToDo",
            todoBody: "承認済みで対応が必要な案件",
            deliveredLabel: "確認待ち",
            deliveredBody: "納品後の確認が必要な案件",
            payoutLabel: "報酬",
            payoutBody: "受取予定額と送金状況",

            payoutExpected: "受取予定",
            payoutPending: "未送金",
            payoutTransferred: "送金済み",

            recentTitle: "最近の動き",
            recentOrders: "新しい注文",
            recentTodo: "進行中",
            viewAll: "すべて見る",
            noOrders: "新しい注文はありません。",
            noTodo: "対応中の案件はありません。",
            productUnset: "商品名未設定",
            createdAt: "作成",
            updatedAt: "更新",

            menuTitle: "プロフィールとメニュー",
            menuBody:
              "企業に表示されるプロフィールやメニュー価格を編集できます。",
            editProfile: "プロフィール編集",
            editMenus: "メニュー編集",
          }
        : {
            defaultDisplayName: "Influencer",
            loadingError: "An error occurred while loading home.",
            loadError: "Failed to load home information.",
            requestLoadError: "Failed to load order data.",
            genericErrorTitle: "Failed to load",
            creatorOnlyTitle: "Influencer access only",
            creatorOnlyBody:
              "This page is available only for influencer accounts.",

            greeting: "Hi",
            heroTitle: "Check today's activity",
            heroBody:
              "Review new orders, active to-dos, and payout status here.",
            viewOrders: "View orders",

            suspendedTitle: "This account is currently restricted",
            suspendedBody:
              "Your account status requires review. Some features are temporarily unavailable.",
            reviewPendingTitle: "Your review is in progress",
            reviewPendingBody:
              "Order handling becomes available after approval.",
            profilePromptTitle: "Complete your profile",
            profilePromptBody:
              "Add photos, social accounts, and menus so brands can order easily.",
            goToProfile: "Edit profile",

            orderLabel: "Orders",
            orderBody: "Review new incoming orders",
            todoLabel: "ToDo",
            todoBody: "Accepted jobs waiting for action",
            deliveredLabel: "Review",
            deliveredBody: "Delivered jobs awaiting confirmation",
            payoutLabel: "Payouts",
            payoutBody: "Expected payout and transfer status",

            payoutExpected: "Expected",
            payoutPending: "Pending",
            payoutTransferred: "Transferred",

            recentTitle: "Recent activity",
            recentOrders: "New orders",
            recentTodo: "In progress",
            viewAll: "View all",
            noOrders: "No new orders.",
            noTodo: "No active jobs.",
            productUnset: "No product name",
            createdAt: "Created",
            updatedAt: "Updated",

            menuTitle: "Profile and menus",
            menuBody:
              "Edit the profile and menu prices shown to brands.",
            editProfile: "Edit profile",
            editMenus: "Edit menus",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [gate, setGate] = useState<CreatorState>({
    isCreator: false,
    isSuspended: false,
    creatorProfileCompleted: false,
    creatorApprovalStatus: null,
  });
  const [counts, setCounts] = useState<DashboardCounts>({
    pendingRequests: 0,
    acceptedJobs: 0,
    deliveredJobs: 0,
    completedJobs: 0,
    activeMenus: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary>({
    completedPayoutAmount: 0,
    transferredAmount: 0,
    pendingAmount: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const [
          { data: roles, error: rolesError },
          { data: userState, error: stateError },
          { data: activeSuspensions, error: suspensionsError },
          { data: creatorRow, error: creatorError },
        ] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase
            .from("user_states")
            .select("creator_profile_completed")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_suspensions")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", true),
          supabase
            .from("creators")
            .select(
              "id, user_id, display_name, full_name, avatar_url, category, approval_status, stripe_onboarding_completed"
            )
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (rolesError || stateError || suspensionsError || creatorError) {
          console.error({
            rolesError,
            stateError,
            suspensionsError,
            creatorError,
          });
          setErrorMsg(copy.loadError);
          setLoading(false);
          return;
        }

        const isCreator = (roles ?? []).some((item) => item.role === "creator");
        const isSuspended = (activeSuspensions ?? []).length > 0;
        const creatorProfileCompleted = !!userState?.creator_profile_completed;
        const creatorApprovalStatus = creatorRow?.approval_status ?? null;

        setGate({
          isCreator,
          isSuspended,
          creatorProfileCompleted,
          creatorApprovalStatus,
        });

        if (!creatorRow) {
          setCreator(null);
          setLoading(false);
          return;
        }

        if (!creatorRow.stripe_onboarding_completed) {
          window.location.href = "/creator/payouts?required=connect";
          return;
        }

        const typedCreator = creatorRow as CreatorProfile;
        setCreator(typedCreator);

        const legacyCreatorKeys = uniqueStrings([typedCreator.id, user.id]);
        const menuCreatorKeys = uniqueStrings([typedCreator.id, user.id]);

        const [
          { count: legacyPendingCount, error: legacyPendingError },
          { count: legacyAcceptedCount, error: legacyAcceptedError },
          { count: legacyDeliveredCount, error: legacyDeliveredError },
          { count: legacyCompletedCount, error: legacyCompletedError },
          { count: orderPendingCount, error: orderPendingError },
          { count: orderAcceptedCount, error: orderAcceptedError },
          { count: orderDeliveredCount, error: orderDeliveredError },
          { count: orderCompletedCount, error: orderCompletedError },
          { count: activeMenusCount, error: activeMenusError },
          { data: recentLegacyPendingRows, error: recentLegacyPendingError },
          { data: recentOrderPendingRows, error: recentOrderPendingError },
          { data: recentLegacyJobRows, error: recentLegacyJobError },
          { data: recentOrderJobRows, error: recentOrderJobError },
          { data: completedPayoutRows, error: completedPayoutError },
        ] = await Promise.all([
          supabase
            .from("requests")
            .select("id", { count: "exact", head: true })
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "pending"),

          supabase
            .from("requests")
            .select("id", { count: "exact", head: true })
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "accepted"),

          supabase
            .from("requests")
            .select("id", { count: "exact", head: true })
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "delivered"),

          supabase
            .from("requests")
            .select("id", { count: "exact", head: true })
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "completed"),

          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("creator_user_id", user.id)
            .eq("status", "authorized_pending_creator"),

          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("creator_user_id", user.id)
            .in("status", ["accepted_captured", "in_progress"]),

          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("creator_user_id", user.id)
            .eq("status", "delivered"),

          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("creator_user_id", user.id)
            .eq("status", "completed"),

          supabase
            .from("creator_menus")
            .select("id", { count: "exact", head: true })
            .in("creator_id", menuCreatorKeys)
            .eq("is_active", true),

          supabase
            .from("requests")
            .select("id, product_name, status, created_at")
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(3),

          supabase
            .from("orders")
            .select("id, product_name, status, created_at")
            .eq("creator_user_id", user.id)
            .eq("status", "authorized_pending_creator")
            .order("created_at", { ascending: false })
            .limit(3),

          supabase
            .from("requests")
            .select(
              "id, product_name, status, updated_at, created_at, delivered_post_url"
            )
            .in("creator_user_id", legacyCreatorKeys)
            .in("status", ["accepted", "delivered", "completed"])
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(3),

          supabase
            .from("orders")
            .select(
              "id, product_name, status, updated_at, created_at, delivered_post_url"
            )
            .eq("creator_user_id", user.id)
            .in("status", [
              "accepted_captured",
              "in_progress",
              "delivered",
              "completed",
            ])
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(3),

          supabase
            .from("orders")
            .select("creator_payout_amount, transfer_status")
            .eq("creator_user_id", user.id)
            .eq("status", "completed")
            .eq("payment_status", "captured"),
        ]);

        const dashboardErrors = [
          legacyPendingError,
          legacyAcceptedError,
          legacyDeliveredError,
          legacyCompletedError,
          orderPendingError,
          orderAcceptedError,
          orderDeliveredError,
          orderCompletedError,
          activeMenusError,
          recentLegacyPendingError,
          recentOrderPendingError,
          recentLegacyJobError,
          recentOrderJobError,
          completedPayoutError,
        ].filter(Boolean);

        if (dashboardErrors.length > 0) {
          console.error({ dashboardErrors });
          setErrorMsg(copy.requestLoadError);
          setLoading(false);
          return;
        }

        setCounts({
          pendingRequests:
            (legacyPendingCount ?? 0) + (orderPendingCount ?? 0),
          acceptedJobs:
            (legacyAcceptedCount ?? 0) + (orderAcceptedCount ?? 0),
          deliveredJobs:
            (legacyDeliveredCount ?? 0) + (orderDeliveredCount ?? 0),
          completedJobs:
            (legacyCompletedCount ?? 0) + (orderCompletedCount ?? 0),
          activeMenus: activeMenusCount ?? 0,
        });

        const payoutRows = (completedPayoutRows ?? []) as Array<{
          creator_payout_amount: number | null;
          transfer_status: string | null;
        }>;

        const completedPayoutAmount = payoutRows.reduce(
          (sum, row) => sum + Number(row.creator_payout_amount ?? 0),
          0
        );

        const transferredAmount = payoutRows
          .filter((row) => row.transfer_status === "transferred")
          .reduce((sum, row) => sum + Number(row.creator_payout_amount ?? 0), 0);

        setPayoutSummary({
          completedPayoutAmount,
          transferredAmount,
          pendingAmount: Math.max(completedPayoutAmount - transferredAmount, 0),
        });

        const legacyPendingItems: RecentRequest[] = (
          recentLegacyPendingRows ?? []
        ).map((row: any) => ({
          kind: "legacy_request",
          id: row.id,
          product_name: row.product_name,
          status: row.status,
          created_at: row.created_at,
        }));

        const orderPendingItems: RecentRequest[] = (
          recentOrderPendingRows ?? []
        ).map((row: any) => ({
          kind: "order",
          id: row.id,
          product_name: row.product_name,
          status: row.status,
          created_at: row.created_at,
        }));

        setRecentRequests(
          [...orderPendingItems, ...legacyPendingItems]
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, 3)
        );

        const legacyJobItems: RecentJob[] = (recentLegacyJobRows ?? []).map(
          (row: any) => ({
            kind: "legacy_request",
            id: row.id,
            product_name: row.product_name,
            status: row.status,
            updated_at: row.updated_at,
            created_at: row.created_at,
            delivered_post_url: row.delivered_post_url,
          })
        );

        const orderJobItems: RecentJob[] = (recentOrderJobRows ?? []).map(
          (row: any) => ({
            kind: "order",
            id: row.id,
            product_name: row.product_name,
            status: row.status,
            updated_at: row.updated_at,
            created_at: row.created_at,
            delivered_post_url: row.delivered_post_url,
          })
        );

        setRecentJobs(
          [...orderJobItems, ...legacyJobItems]
            .sort((a, b) => {
              const aTime = new Date(a.updated_at || a.created_at).getTime();
              const bTime = new Date(b.updated_at || b.created_at).getTime();
              return bTime - aTime;
            })
            .slice(0, 3)
        );

        setLoading(false);
      } catch (e) {
        console.error(e);
        setErrorMsg(copy.loadingError);
        setLoading(false);
      }
    };

    void load();
  }, [copy.loadError, copy.loadingError, copy.requestLoadError, supabase]);

  if (loading) {
    return <LoadingView />;
  }

  if (errorMsg) {
    return (
      <NoticeCard
        tone="danger"
        title={copy.genericErrorTitle}
        body={errorMsg}
      />
    );
  }

  if (!gate.isCreator) {
    return (
      <NoticeCard
        title={copy.creatorOnlyTitle}
        body={copy.creatorOnlyBody}
      />
    );
  }

  const displayName =
    creator?.display_name || creator?.full_name || copy.defaultDisplayName;

  const primaryHref =
    counts.pendingRequests > 0
      ? "/creator/requests"
      : counts.acceptedJobs + counts.deliveredJobs > 0
        ? "/creator/jobs"
        : "/creator/payouts";

  const primaryLabel =
    counts.pendingRequests > 0
      ? copy.orderLabel
      : counts.acceptedJobs + counts.deliveredJobs > 0
        ? copy.todoLabel
        : copy.payoutLabel;

  return (
    <div className="space-y-5 pb-4">
      <section className="relative overflow-hidden rounded-[32px] bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.055)] ring-1 ring-slate-100">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-rose-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-emerald-100/35 blur-3xl" />

        <div className="relative flex items-start gap-4">
          <CreatorAvatar name={displayName} src={creator?.avatar_url} />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-500">
              {copy.greeting}
            </p>
            <h1 className="mt-1 truncate text-[28px] font-black leading-tight tracking-[-0.06em] text-slate-950">
              {displayName}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              {copy.heroBody}
            </p>
          </div>
        </div>

        <Link
          href={primaryHref}
          className="relative mt-5 flex w-full items-center justify-center rounded-full bg-[#ff5f67] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,95,103,0.22)] transition active:scale-[0.98]"
        >
          {primaryLabel}
        </Link>
      </section>

      {gate.isSuspended ? (
        <NoticeCard
          tone="danger"
          title={copy.suspendedTitle}
          body={copy.suspendedBody}
        />
      ) : null}

      {gate.creatorApprovalStatus === "pending" ? (
        <NoticeCard
          tone="warning"
          title={copy.reviewPendingTitle}
          body={copy.reviewPendingBody}
        />
      ) : null}

      {!gate.creatorProfileCompleted ? (
        <NoticeCard
          title={copy.profilePromptTitle}
          body={copy.profilePromptBody}
          href="/creator/profile"
          cta={copy.goToProfile}
        />
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
            {copy.heroTitle}
          </h2>
        </div>

        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          <div className="min-w-[76%] sm:min-w-0">
            <SummaryCard
              href="/creator/requests"
              label={copy.orderLabel}
              value={counts.pendingRequests}
              body={copy.orderBody}
              accent={counts.pendingRequests > 0 ? "rose" : "slate"}
            />
          </div>

          <div className="min-w-[76%] sm:min-w-0">
            <SummaryCard
              href="/creator/jobs"
              label={copy.todoLabel}
              value={counts.acceptedJobs + counts.deliveredJobs}
              body={copy.todoBody}
              accent={
                counts.acceptedJobs + counts.deliveredJobs > 0
                  ? "blue"
                  : "slate"
              }
            />
          </div>

          <div className="min-w-[76%] sm:min-w-0">
            <SummaryCard
              href="/creator/payouts"
              label={copy.payoutLabel}
              value={formatMoney(payoutSummary.pendingAmount, safeLocale)}
              body={copy.payoutBody}
              accent={payoutSummary.pendingAmount > 0 ? "green" : "slate"}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
              {copy.payoutLabel}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              {copy.payoutExpected}:{" "}
              {formatMoney(payoutSummary.completedPayoutAmount, safeLocale)}
            </p>
          </div>

          <Link
            href="/creator/payouts"
            className="rounded-full bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 active:scale-[0.98]"
          >
            {copy.viewAll}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-400">
              {copy.payoutPending}
            </p>
            <p className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">
              {formatMoney(payoutSummary.pendingAmount, safeLocale)}
            </p>
          </div>

          <div className="rounded-[22px] bg-emerald-50 p-4">
            <p className="text-xs font-black text-emerald-600">
              {copy.payoutTransferred}
            </p>
            <p className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">
              {formatMoney(payoutSummary.transferredAmount, safeLocale)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[30px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
              {copy.recentOrders}
            </h2>
            <Link
              href="/creator/requests"
              className="text-sm font-black text-slate-400"
            >
              {copy.viewAll}
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <p className="rounded-[24px] bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-500">
              {copy.noOrders}
            </p>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((item) => (
                <RecentOrderCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  locale={safeLocale}
                  productUnset={copy.productUnset}
                  dateLabel={copy.createdAt}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[30px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
              {copy.recentTodo}
            </h2>
            <Link
              href="/creator/jobs"
              className="text-sm font-black text-slate-400"
            >
              {copy.viewAll}
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <p className="rounded-[24px] bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-500">
              {copy.noTodo}
            </p>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((item) => (
                <RecentOrderCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  locale={safeLocale}
                  productUnset={copy.productUnset}
                  dateLabel={copy.updatedAt}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[30px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
        <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
          {copy.menuTitle}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
          {copy.menuBody}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href="/creator/profile"
            className="flex items-center justify-center rounded-full bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 active:scale-[0.98]"
          >
            {copy.editProfile}
          </Link>

          <Link
            href="/creator/menus"
            className="flex items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white active:scale-[0.98]"
          >
            {copy.editMenus}
          </Link>
        </div>
      </section>
    </div>
  );
}