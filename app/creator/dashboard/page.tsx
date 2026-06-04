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

type ActivityItem = {
  kind: "order" | "legacy_request";
  id: string;
  product_name: string | null;
  status: string | null;
  date: string;
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

function getItemHref(item: ActivityItem) {
  return item.kind === "order"
    ? `/creator/orders/${item.id}`
    : `/creator/requests/${item.id}`;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 10h10.5M10.5 5.5 15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m8 5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
        className="h-12 w-12 shrink-0 rounded-[18px] object-cover ring-1 ring-slate-100"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-rose-50 text-base font-black text-[#ff5f67] ring-1 ring-rose-100">
      {fallbackInitial(name)}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="max-w-full space-y-3 overflow-x-hidden pb-4">
      <div className="h-24 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
      <div className="h-36 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
      <div className="h-28 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
      <div className="h-40 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
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
      ? "bg-rose-50 text-rose-900 ring-rose-100"
      : tone === "warning"
        ? "bg-amber-50 text-amber-950 ring-amber-100"
        : "bg-white text-slate-950 ring-slate-100";

  return (
    <section
      className={`creator-home-appear rounded-[24px] p-4 ring-1 ${toneClass}`}
    >
      <h2 className="text-[15px] font-black tracking-[-0.03em]">{title}</h2>
      <p className="mt-1.5 text-xs font-semibold leading-6 opacity-75">
        {body}
      </p>

      {href && cta ? (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#ff5f67] px-4 py-2.5 text-xs font-black text-white shadow-[0_14px_30px_rgba(255,95,103,0.18)] transition active:scale-[0.98]"
        >
          {cta}
          <ArrowIcon />
        </Link>
      ) : null}
    </section>
  );
}

function MainActionCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  count?: number;
  tone: "rose" | "blue" | "slate";
}) {
  return (
    <section className="creator-home-appear creator-home-appear-delay-1 relative overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-rose-100/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-52 w-52 rounded-full bg-emerald-100/35 blur-3xl" />

      <div className="relative">
        <h2 className="text-[20px] font-black leading-tight tracking-[-0.055em] text-slate-950">
          {title}
        </h2>

        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
          {body}
        </p>

        <Link
          href={href}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,95,103,0.2)] transition active:scale-[0.98]"
        >
          {cta}
          <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}

function CompactPayout({
  title,
  body,
  amount,
  href,
}: {
  title: string;
  body: string;
  amount: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="creator-home-appear creator-home-appear-delay-2 flex items-center justify-between gap-4 rounded-[24px] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.035)] ring-1 ring-slate-100 transition active:scale-[0.98]"
    >
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">{body}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <p className="text-[22px] font-black tracking-[-0.055em] text-slate-950">
          {amount}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400">
          <ChevronIcon />
        </span>
      </div>
    </Link>
  );
}

function ActivityRow({
  item,
  locale,
  productUnset,
  dateLabel,
}: {
  item: ActivityItem;
  locale: "ja" | "en";
  productUnset: string;
  dateLabel: string;
}) {
  const dateText =
    locale === "ja"
      ? `${dateLabel}：${formatDate(item.date, locale)}`
      : `${dateLabel}: ${formatDate(item.date, locale)}`;

  return (
    <Link
      href={getItemHref(item)}
      className="group flex items-center justify-between gap-3 rounded-[20px] bg-slate-50 px-4 py-3.5 transition active:scale-[0.98]"
    >
      <div className="min-w-0">
        <p className="truncate text-[15px] font-black tracking-[-0.03em] text-slate-950">
          {item.product_name || productUnset}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">{dateText}</p>
      </div>

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-100 transition group-active:scale-95">
        <ChevronIcon />
      </span>
    </Link>
  );
}

function RecentActivityCard({
  title,
  viewAll,
  viewAllHref,
  emptyText,
  items,
  locale,
  productUnset,
  dateLabel,
}: {
  title: string;
  viewAll: string;
  viewAllHref: string;
  emptyText: string;
  items: ActivityItem[];
  locale: "ja" | "en";
  productUnset: string;
  dateLabel: string;
}) {
  return (
    <section className="creator-home-appear creator-home-appear-delay-3 rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[20px] font-black tracking-[-0.055em] text-slate-950">
          {title}
        </h2>

        <Link
          href={viewAllHref}
          className="text-xs font-black text-slate-400 transition active:scale-95"
        >
          {viewAll}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[22px] bg-slate-50 px-4 py-5">
          <p className="text-sm font-semibold leading-7 text-slate-500">
            {emptyText}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <ActivityRow
              key={`${item.kind}-${item.id}`}
              item={item}
              locale={locale}
              productUnset={productUnset}
              dateLabel={dateLabel}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function CreatorDashboardPage() {
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
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

            suspendedTitle: "アカウント確認中です",
            suspendedBody:
              "一部機能を制限しています。確認が完了するまでお待ちください。",
            reviewPendingTitle: "審査中です",
            reviewPendingBody: "承認後に注文受付や進行機能を利用できます。",
            profilePromptTitle: "プロフィールを整えましょう",
            profilePromptBody:
              "写真・SNS・メニューを整えると、注文を受けやすくなります。",
            goToProfile: "プロフィールを編集",

            nextPendingTitle: "新しい注文があります",
            nextPendingBody: "内容を確認して、受けるか相談できます。",
            nextPendingCta: "確認する",

            nextTodoTitle: "実行待ちの案件",
            nextTodoBody: "承認済みの注文を進めましょう。",
            nextTodoCta: "ToDoを見る",

            nextReadyTitle: "受けられる状態を整えましょう",
            nextReadyBody: "プロフィールやメニューを整えて、次の注文に備えます。",
            nextReadyCta: "プロフィールを見る",

            payoutTitle: "受取予定",
            payoutBody: "報酬ページで詳細を確認",
            activityTitle: "注文が届いています",
            viewAll: "すべて",
            noActivity: "まだ表示する注文はありません。",
            productUnset: "商品名未設定",
            orderDateLabel: "注文日",
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

            suspendedTitle: "Account under review",
            suspendedBody:
              "Some features are temporarily limited while your account is reviewed.",
            reviewPendingTitle: "Your review is in progress",
            reviewPendingBody:
              "Order handling becomes available after approval.",
            profilePromptTitle: "Improve your profile",
            profilePromptBody:
              "Add photos, social accounts, and menus so brands can order easily.",
            goToProfile: "Edit profile",

            nextPendingTitle: "You have a new order",
            nextPendingBody: "Review details and decide whether to accept.",
            nextPendingCta: "Review",

            nextTodoTitle: "Ready to work",
            nextTodoBody: "Continue accepted orders.",
            nextTodoCta: "View ToDo",

            nextReadyTitle: "Get ready for orders",
            nextReadyBody:
              "Update your profile and menus to receive future orders.",
            nextReadyCta: "View profile",

            payoutTitle: "Expected payout",
            payoutBody: "Check details on the payout page",
            activityTitle: "Orders received",
            viewAll: "All",
            noActivity: "No orders to show yet.",
            productUnset: "No product name",
            orderDateLabel: "Order date",
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
          acceptedJobs: (legacyAcceptedCount ?? 0) + (orderAcceptedCount ?? 0),
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
      <NoticeCard title={copy.creatorOnlyTitle} body={copy.creatorOnlyBody} />
    );
  }

  const displayName =
    creator?.display_name || creator?.full_name || copy.defaultDisplayName;

  const activeTodoCount = counts.acceptedJobs + counts.deliveredJobs;

  const nextAction = !gate.creatorProfileCompleted
    ? {
        title: copy.profilePromptTitle,
        body: copy.profilePromptBody,
        href: "/creator/profile",
        cta: copy.goToProfile,
        count: undefined,
        tone: "slate" as const,
      }
    : counts.pendingRequests > 0
      ? {
          title: copy.nextPendingTitle,
          body: copy.nextPendingBody,
          href: "/creator/orders",
          cta: copy.nextPendingCta,
          count: counts.pendingRequests,
          tone: "rose" as const,
        }
      : activeTodoCount > 0
        ? {
            title: copy.nextTodoTitle,
            body: copy.nextTodoBody,
            href: "/creator/jobs",
            cta: copy.nextTodoCta,
            count: activeTodoCount,
            tone: "blue" as const,
          }
        : {
            title: copy.nextReadyTitle,
            body:
              counts.activeMenus > 0
                ? copy.nextReadyBody
                : copy.profilePromptBody,
            href: counts.activeMenus > 0 ? "/creator/menus" : "/creator/profile",
            cta: counts.activeMenus > 0 ? copy.nextReadyCta : copy.goToProfile,
            count: undefined,
            tone: "slate" as const,
          };

  const requestActivityItems: ActivityItem[] = recentRequests.map((item) => ({
    kind: item.kind,
    id: item.id,
    product_name: item.product_name,
    status: item.status,
    date: item.created_at,
  }));

  const jobActivityItems: ActivityItem[] = recentJobs.map((item) => ({
    kind: item.kind,
    id: item.id,
    product_name: item.product_name,
    status: item.status,
    date: item.updated_at ?? item.created_at,
  }));

  const activityItems: ActivityItem[] = [
    ...requestActivityItems,
    ...jobActivityItems,
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className="max-w-full touch-pan-y space-y-3 overflow-x-hidden pb-4">
      <style jsx global>{`
        @keyframes creatorHomeFadeUp {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        .creator-home-appear {
          animation: creatorHomeFadeUp 420ms cubic-bezier(0.2, 0.8, 0.2, 1)
            both;
        }

        .creator-home-appear-delay-1 {
          animation-delay: 50ms;
        }

        .creator-home-appear-delay-2 {
          animation-delay: 95ms;
        }

        .creator-home-appear-delay-3 {
          animation-delay: 140ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .creator-home-appear,
          .creator-home-appear-delay-1,
          .creator-home-appear-delay-2,
          .creator-home-appear-delay-3 {
            animation: none;
          }
        }
      `}</style>

      <section className="creator-home-appear relative overflow-hidden rounded-[28px] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.035)] ring-1 ring-slate-100">
        <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-rose-100/35 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <CreatorAvatar name={displayName} src={creator?.avatar_url} />

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-400">
              {copy.greeting}
            </p>
            <h1 className="mt-0.5 truncate text-[23px] font-black leading-tight tracking-[-0.06em] text-slate-950">
              {displayName}
            </h1>
          </div>
        </div>
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

      <MainActionCard {...nextAction} />

      <CompactPayout
        title={copy.payoutTitle}
        body={copy.payoutBody}
        amount={formatMoney(payoutSummary.pendingAmount, safeLocale)}
        href="/creator/payouts"
      />

      <RecentActivityCard
        title={copy.activityTitle}
        viewAll={copy.viewAll}
        viewAllHref="/creator/orders"
        emptyText={copy.noActivity}
        items={activityItems}
        locale={safeLocale}
        productUnset={copy.productUnset}
        dateLabel={copy.orderDateLabel}
      />
    </div>
  );
}