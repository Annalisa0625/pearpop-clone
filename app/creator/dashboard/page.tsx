// File: app/creator/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorBadge,
  CreatorCard,
  CreatorChevron,
  CreatorEmptyState,
  CreatorHero,
  CreatorLinkButton,
  CreatorListItem,
  CreatorMetric,
  CreatorMiniInfo,
  CreatorNotice,
  CreatorPage,
  CreatorSection,
  CreatorSkeleton,
} from "@/app/creator/_components/CreatorDesignSystem";

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
        className="h-14 w-14 shrink-0 rounded-[22px] object-cover shadow-sm ring-1 ring-slate-100"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-rose-50 text-lg font-black text-[#FF3B5C] ring-1 ring-rose-100">
      {fallbackInitial(name)}
    </div>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PayoutIcon() {
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

function EmptyOrderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoadingView() {
  return (
    <CreatorPage>
      <CreatorSkeleton className="h-28" />
      <CreatorSkeleton className="h-36" />
      <div className="grid grid-cols-2 gap-3">
        <CreatorSkeleton className="h-24" />
        <CreatorSkeleton className="h-24" />
      </div>
      <CreatorSkeleton className="h-44" />
    </CreatorPage>
  );
}

function MainActionCard({
  title,
  body,
  href,
  cta,
  tone,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  tone: "red" | "blue" | "slate";
}) {
  const iconTone = tone === "red" ? "red" : tone === "blue" ? "blue" : "slate";

  return (
    <CreatorCard className="creator-appear-delay-1 p-5">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] ring-1 ${
            iconTone === "red"
              ? "bg-rose-50 text-[#FF3B5C] ring-rose-100"
              : iconTone === "blue"
                ? "bg-blue-50 text-blue-700 ring-blue-100"
                : "bg-slate-50 text-slate-500 ring-slate-100"
          }`}
        >
          <OrderIcon />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[21px] font-black leading-tight tracking-[-0.055em] text-slate-950">
            {title}
          </h2>

          <p className="mt-2 text-[15px] font-semibold leading-7 text-slate-500">
            {body}
          </p>

          <CreatorLinkButton href={href} className="mt-5 w-full">
            {cta}
            <CreatorChevron />
          </CreatorLinkButton>
        </div>
      </div>
    </CreatorCard>
  );
}

function PayoutCard({
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
    <CreatorListItem
      href={href}
      title={title}
      description={body}
      icon={
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-rose-50 text-[#FF3B5C] ring-1 ring-rose-100">
          <PayoutIcon />
        </span>
      }
      meta={
        <p className="text-[26px] font-black leading-none tracking-[-0.065em] text-slate-950">
          {amount}
        </p>
      }
    />
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
    <CreatorListItem
      href={getItemHref(item)}
      title={item.product_name || productUnset}
      meta={
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <CreatorMiniInfo label={dateLabel} value={dateText.replace(`${dateLabel}：`, "").replace(`${dateLabel}: `, "")} />
          <span className="text-xs font-black text-slate-300">
            {item.kind === "order" ? "Trendre" : ""}
          </span>
        </div>
      }
    />
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
            pageTitle: "ホーム",
            pageDescription: "今日の注文・やること・報酬を確認できます。",

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
            transferredTitle: "送金済み",
            completedTitle: "完了件数",
            countSuffix: "件",

            activityTitle: "注文が届いています",
            viewAll: "すべて",
            noActivityTitle: "まだ注文はありません",
            noActivityBody: "新しい注文が届くと、ここに表示されます。",
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
            pageTitle: "Home",
            pageDescription: "Check orders, tasks, and payouts.",

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
            transferredTitle: "Transferred",
            completedTitle: "Completed",
            countSuffix: "",

            activityTitle: "Orders received",
            viewAll: "All",
            noActivityTitle: "No orders yet",
            noActivityBody: "New orders will appear here.",
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

        const roleRows = (roles ?? []) as Array<{ role: string }>;
        const isCreator = roleRows.some((item) => item.role === "creator");
        const isSuspended = (activeSuspensions ?? []).length > 0;
        const typedUserState = userState as
          | { creator_profile_completed?: boolean | null }
          | null;
        const typedCreatorRow = creatorRow as CreatorProfile | null;
        const creatorProfileCompleted =
          !!typedUserState?.creator_profile_completed;
        const creatorApprovalStatus = typedCreatorRow?.approval_status ?? null;

        setGate({
          isCreator,
          isSuspended,
          creatorProfileCompleted,
          creatorApprovalStatus,
        });

        if (!typedCreatorRow) {
          setCreator(null);
          setLoading(false);
          return;
        }

        if (!typedCreatorRow.stripe_onboarding_completed) {
          window.location.href = "/creator/payouts?required=connect";
          return;
        }

        setCreator(typedCreatorRow);

        const legacyCreatorKeys = uniqueStrings([typedCreatorRow.id, user.id]);
        const menuCreatorKeys = uniqueStrings([typedCreatorRow.id, user.id]);

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
      <CreatorPage>
        <CreatorNotice
          tone="red"
          title={copy.genericErrorTitle}
          description={errorMsg}
        />
      </CreatorPage>
    );
  }

  if (!gate.isCreator) {
    return (
      <CreatorPage>
        <CreatorNotice
          title={copy.creatorOnlyTitle}
          description={copy.creatorOnlyBody}
        />
      </CreatorPage>
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
        tone: "slate" as const,
      }
    : counts.pendingRequests > 0
      ? {
          title: copy.nextPendingTitle,
          body: copy.nextPendingBody,
          href: "/creator/requests",
          cta: copy.nextPendingCta,
          tone: "red" as const,
        }
      : activeTodoCount > 0
        ? {
            title: copy.nextTodoTitle,
            body: copy.nextTodoBody,
            href: "/creator/jobs",
            cta: copy.nextTodoCta,
            tone: "blue" as const,
          }
        : {
            title: copy.nextReadyTitle,
            body: copy.nextReadyBody,
            href: "/creator/profile",
            cta: copy.nextReadyCta,
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
    <CreatorPage>
      <CreatorHero
        title={copy.pageTitle}
        description={copy.pageDescription}
        eyebrow={copy.greeting}
        right={<CreatorAvatar name={displayName} src={creator?.avatar_url} />}
      >
        <div className="flex items-center justify-between gap-3 rounded-[24px] bg-white/70 p-3 shadow-sm ring-1 ring-white/80 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-400">
              Creator
            </p>
            <p className="mt-0.5 truncate text-[20px] font-black tracking-[-0.055em] text-slate-950">
              {displayName}
            </p>
          </div>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100">
            <HomeIcon />
          </span>
        </div>
      </CreatorHero>

      {gate.isSuspended ? (
        <CreatorNotice
          tone="red"
          title={copy.suspendedTitle}
          description={copy.suspendedBody}
        />
      ) : null}

      {gate.creatorApprovalStatus === "pending" ? (
        <CreatorNotice
          tone="amber"
          title={copy.reviewPendingTitle}
          description={copy.reviewPendingBody}
        />
      ) : null}

      <MainActionCard {...nextAction} />

      <div className="grid grid-cols-2 gap-3">
        <CreatorMetric
          label={copy.transferredTitle}
          value={formatMoney(payoutSummary.transferredAmount, safeLocale)}
        />

        <CreatorMetric
          label={copy.completedTitle}
          value={`${counts.completedJobs}${safeLocale === "ja" ? copy.countSuffix : ""}`}
        />
      </div>

      <PayoutCard
        title={copy.payoutTitle}
        body={copy.payoutBody}
        amount={formatMoney(payoutSummary.pendingAmount, safeLocale)}
        href="/creator/payouts"
      />

      <CreatorSection
        title={copy.activityTitle}
        right={
          <CreatorLinkButton
            href="/creator/requests"
            variant="ghost"
            className="px-0 py-0 text-xs text-slate-400 shadow-none"
          >
            {copy.viewAll}
          </CreatorLinkButton>
        }
      >
        {activityItems.length === 0 ? (
          <CreatorEmptyState
            icon={<EmptyOrderIcon />}
            title={copy.noActivityTitle}
            description={copy.noActivityBody}
          />
        ) : (
          <div className="space-y-2.5">
            {activityItems.map((item) => (
              <ActivityRow
                key={`${item.kind}-${item.id}`}
                item={item}
                locale={safeLocale}
                productUnset={copy.productUnset}
                dateLabel={copy.orderDateLabel}
              />
            ))}
          </div>
        )}
      </CreatorSection>
    </CreatorPage>
  );
}