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
    return "Review";
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
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-base font-black text-[#ff5f67] ring-1 ring-rose-100">
      {fallbackInitial(name)}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
      <div className="h-32 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
      <div className="h-52 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
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
    <section className={`rounded-[26px] p-5 ring-1 ${toneClass}`}>
      <h2 className="text-base font-black tracking-[-0.03em]">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-7 opacity-75">{body}</p>
      {href && cta ? (
        <Link
          href={href}
          className="mt-4 inline-flex rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,95,103,0.2)] active:scale-[0.98]"
        >
          {cta}
        </Link>
      ) : null}
    </section>
  );
}

function NextActionCard({
  title,
  body,
  href,
  cta,
  count,
  tone,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  count?: number;
  tone: "rose" | "blue" | "green" | "slate";
}) {
  const markClass =
    tone === "rose"
      ? "bg-rose-50 text-[#ff5f67]"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700"
        : tone === "green"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-50 text-slate-500";

  return (
    <section className="rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-400">NEXT</p>
          <h2 className="mt-2 text-[24px] font-black leading-tight tracking-[-0.05em] text-slate-950">
            {title}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            {body}
          </p>
        </div>

        {typeof count === "number" ? (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${markClass}`}
          >
            {count}
          </div>
        ) : null}
      </div>

      <Link
        href={href}
        className="mt-5 flex w-full items-center justify-center rounded-full bg-[#ff5f67] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,95,103,0.2)] active:scale-[0.98]"
      >
        {cta}
      </Link>
    </section>
  );
}

function PayoutMiniCard({
  title,
  amount,
  body,
  href,
}: {
  title: string;
  amount: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-[26px] bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 active:scale-[0.98]"
    >
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">{body}</p>
      </div>
      <p className="text-xl font-black tracking-[-0.04em] text-slate-950">
        {amount}
      </p>
    </Link>
  );
}

function ActivityCard({
  item,
  locale,
  productUnset,
}: {
  item: ActivityItem;
  locale: "ja" | "en";
  productUnset: string;
}) {
  return (
    <Link
      href={getItemHref(item)}
      className="block rounded-[24px] bg-slate-50 p-4 transition active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-[-0.03em] text-slate-950">
            {item.product_name || productUnset}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            {formatDate(item.date, locale)}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100">
          {getSimpleStatus(item.status, locale)}
        </span>
      </div>
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
            heroBody: "今日やることだけ、ここで確認できます。",

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

            nextPendingTitle: "新しい注文があります",
            nextPendingBody: "内容を確認して、受けるか辞退するか選べます。",
            nextPendingCta: "注文を確認する",

            nextTodoTitle: "対応が必要な注文があります",
            nextTodoBody: "承認済みの注文を確認して、制作・投稿を進めましょう。",
            nextTodoCta: "ToDoを見る",

            nextReadyTitle: "今は対応待ちなし",
            nextReadyBody:
              "プロフィールやメニューを整えて、次の注文を受けやすくしましょう。",
            nextReadyCta: "メニューを確認する",

            payoutTitle: "報酬",
            payoutBody: "受取予定額を確認",
            activityTitle: "最近の注文",
            viewAll: "すべて見る",
            noActivity: "まだ表示する注文はありません。",
            productUnset: "商品名未設定",
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
            heroBody: "Check only what matters today.",

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

            nextPendingTitle: "You have a new order",
            nextPendingBody: "Review the details and accept or decline.",
            nextPendingCta: "Review order",

            nextTodoTitle: "You have work to do",
            nextTodoBody: "Check accepted orders and continue production.",
            nextTodoCta: "View ToDo",

            nextReadyTitle: "Nothing pending right now",
            nextReadyBody:
              "Keep your profile and menus ready for the next order.",
            nextReadyCta: "Check menus",

            payoutTitle: "Payouts",
            payoutBody: "Expected payout",
            activityTitle: "Recent orders",
            viewAll: "View all",
            noActivity: "No orders to show yet.",
            productUnset: "No product name",
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
      <NoticeCard title={copy.creatorOnlyTitle} body={copy.creatorOnlyBody} />
    );
  }

  const displayName =
    creator?.display_name || creator?.full_name || copy.defaultDisplayName;

  const activeTodoCount = counts.acceptedJobs + counts.deliveredJobs;

  const nextAction =
    counts.pendingRequests > 0
      ? {
          title: copy.nextPendingTitle,
          body: copy.nextPendingBody,
          href: "/creator/requests",
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
            body: copy.nextReadyBody,
            href: "/creator/menus",
            cta: copy.nextReadyCta,
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
  .slice(0, 4);

  return (
    <div className="space-y-4 pb-4">
      <section className="relative overflow-hidden rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-rose-100/45 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <CreatorAvatar name={displayName} src={creator?.avatar_url} />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-400">
              {copy.greeting}
            </p>
            <h1 className="mt-0.5 truncate text-[24px] font-black leading-tight tracking-[-0.055em] text-slate-950">
              {displayName}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {copy.heroBody}
            </p>
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

      {!gate.creatorProfileCompleted ? (
        <NoticeCard
          title={copy.profilePromptTitle}
          body={copy.profilePromptBody}
          href="/creator/profile"
          cta={copy.goToProfile}
        />
      ) : null}

      <NextActionCard {...nextAction} />

      <PayoutMiniCard
        title={copy.payoutTitle}
        body={copy.payoutBody}
        amount={formatMoney(payoutSummary.pendingAmount, safeLocale)}
        href="/creator/payouts"
      />

      <section className="rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
            {copy.activityTitle}
          </h2>

          <Link
            href="/creator/requests"
            className="text-sm font-black text-slate-400"
          >
            {copy.viewAll}
          </Link>
        </div>

        {activityItems.length === 0 ? (
          <p className="rounded-[24px] bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-500">
            {copy.noActivity}
          </p>
        ) : (
          <div className="space-y-3">
            {activityItems.map((item) => (
              <ActivityCard
                key={`${item.kind}-${item.id}`}
                item={item}
                locale={safeLocale}
                productUnset={copy.productUnset}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}