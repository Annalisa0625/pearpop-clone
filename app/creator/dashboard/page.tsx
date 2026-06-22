// File: app/creator/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type DashboardCounts = {
  pendingRequests: number;
  acceptedJobs: number;
  deliveredJobs: number;
  completedJobs: number;
  activeMenus: number;
};

type RecentJob = {
  kind: "order" | "legacy_request";
  id: string;
  product_name: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
  completed_at?: string | null;
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
  display_name: string | null;
  full_name: string | null;
  approval_status: string | null;
};

type PayoutProfileStatus = {
  status: "not_submitted" | "submitted" | "verified" | "rejected" | null;
  payout_method: "manual_bank_transfer" | "stripe_connect" | null;
};

type PayoutSummary = {
  completedPayoutAmount: number;
  paidAmount: number;
  pendingAmount: number;
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
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

function DashboardMotionStyle() {
  return (
    <style jsx global>{`
      @keyframes trendreBubbleFloat {
        0%, 100% {
          transform: translate3d(0, 0, 0);
        }
        50% {
          transform: translate3d(0, -4px, 0);
        }
      }

      @keyframes trendreBubbleGlow {
        0%, 100% {
          box-shadow: 0 10px 24px rgba(255, 56, 96, 0.14);
        }
        50% {
          box-shadow: 0 14px 30px rgba(255, 56, 96, 0.24);
        }
      }

      .trendre-action-bubble {
        animation:
          trendreBubbleFloat 2.4s ease-in-out infinite,
          trendreBubbleGlow 2.4s ease-in-out infinite;
      }

      .trendre-action-bubble::after {
        content: "";
        position: absolute;
        left: 18px;
        bottom: -6px;
        width: 12px;
        height: 12px;
        border-radius: 3px;
        background: inherit;
        transform: rotate(45deg);
      }

      @media (prefers-reduced-motion: reduce) {
        .trendre-action-bubble {
          animation: none;
        }
      }
    `}</style>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.6-2.7 1.6-2.6-1.6L8 20l-3-1.6V6a2 2 0 0 1 2-2Z"
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m5 12.5 4.4 4.2L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoadingView() {
  return (
    <main className="mx-auto max-w-[760px] px-4 pb-24 pt-4">
      <DashboardMotionStyle />
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-[26px] bg-white ring-1 ring-slate-100" />
        <div className="h-28 animate-pulse rounded-[26px] bg-white ring-1 ring-slate-100" />
        <div className="h-44 animate-pulse rounded-[26px] bg-white ring-1 ring-slate-100" />
      </div>
    </main>
  );
}

function Notice({
  tone = "slate",
  title,
  body,
}: {
  tone?: "slate" | "red" | "amber";
  title: string;
  body: string;
}) {
  const className =
    tone === "red"
      ? "bg-rose-50 text-rose-800 ring-rose-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-800 ring-amber-100"
        : "bg-white text-slate-700 ring-slate-100";

  return (
    <section className={`rounded-[20px] px-4 py-3 ring-1 ${className}`}>
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-medium leading-5 opacity-80">{body}</p>
    </section>
  );
}

function IconBubble({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "rose" | "slate" | "green";
}) {
  const className =
    tone === "rose"
      ? "bg-rose-50 text-[#ff3860] ring-rose-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-[18px] ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function CloudBubble({ children }: { children: ReactNode }) {
  return (
    <span className="trendre-action-bubble relative inline-flex rounded-[18px] bg-[#ff3860] px-4 py-2 text-[14px] font-semibold leading-none tracking-[-0.02em] text-white">
      {children}
    </span>
  );
}

function ActionCard({
  title,
  body,
  href,
  cta,
  icon,
  bubble,
  tone = "rose",
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  icon: ReactNode;
  bubble?: string;
  tone?: "rose" | "slate" | "green";
}) {
  return (
    <Link href={href} className="block">
      <section className="rounded-[28px] bg-white p-4 ring-1 ring-slate-100 transition active:scale-[0.99]">
        <div className="flex items-start gap-3">
          <IconBubble tone={tone}>{icon}</IconBubble>

          <div className="min-w-0 flex-1">
            {bubble ? (
              <div className="mb-3">
                <CloudBubble>{bubble}</CloudBubble>
              </div>
            ) : null}

            <p className="text-[16px] font-semibold tracking-[-0.03em] text-slate-950">
              {title}
            </p>
            <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
              {body}
            </p>

            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-100">
              {cta}
              <ChevronIcon />
            </span>
          </div>
        </div>
      </section>
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
  return (
    <Link href={getItemHref(item)} className="block">
      <div className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-3 ring-1 ring-slate-100 transition active:scale-[0.99]">
        <IconBubble tone="slate">
          <ReceiptIcon />
        </IconBubble>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-slate-950">
            {item.product_name || productUnset}
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-slate-500">
            {dateLabel}：{formatDate(item.date, locale)}
          </p>
        </div>

        <span className="shrink-0 text-slate-300">
          <ChevronIcon />
        </span>
      </div>
    </Link>
  );
}

function EmptyBox({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[22px] bg-white px-5 py-8 text-center ring-1 ring-slate-100">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
        <CheckIcon />
      </div>
      <p className="mt-4 text-[14px] font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
        {body}
      </p>
    </div>
  );
}

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const db = useMemo(() => supabase as any, [supabase]);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            defaultDisplayName: "クリエイター",
            loadingError: "ホームの読み込み中にエラーが発生しました。",
            loadError: "ホーム情報の取得に失敗しました。",
            requestLoadError: "注文データの取得に失敗しました。",
            genericErrorTitle: "読み込みに失敗しました",
            creatorOnlyTitle: "クリエイター専用ページです",
            creatorOnlyBody:
              "このページはクリエイターアカウントのみ利用できます。",

            suspendedTitle: "アカウント確認中です",
            suspendedBody:
              "一部機能を制限しています。確認が完了するまでお待ちください。",
            reviewPendingTitle: "審査中です",
            reviewPendingBody: "承認後に注文受付や進行機能を利用できます。",

            profilePromptTitle: "プロフィールを整えましょう",
            profilePromptBody:
              "写真・SNS・メニューを整えると、注文を受けやすくなります。",
            goToProfile: "プロフィールを見る",
            profileBubble: "準備しましょう",

            payoutPromptTitle: "受け取り口座を登録しましょう",
            payoutPromptBody:
              "報酬を受け取るために、銀行口座の登録が必要です。",
            goToPayoutSettings: "口座を登録する",
            payoutBubble: "口座を登録しましょう",

            orderActionTitle: "新しい注文があります",
            orderActionBody: "内容を確認して、受けるか相談できます。",
            orderActionCta: "注文を確認する",
            orderBubble: "注文を受けましょう",

            todoActionTitle: "進行中の案件があります",
            todoActionBody: "制作・投稿・納品URLの提出を進めましょう。",
            todoActionCta: "ToDoを見る",
            todoBubble: "投稿しましょう",

            readyTitle: "新しい注文を待っています",
            readyBody: "プロフィールやメニューを整えて、次の注文に備えます。",
            readyCta: "プロフィールを見る",
            readyBubble: "準備OK",

            sectionActionTitle: "今やること",
            pastTitle: "過去案件",
            viewAll: "すべて見る",
            noPastTitle: "完了した案件はまだありません",
            noPastBody: "案件が完了すると、ここに表示されます。",
            productUnset: "商品名未設定",
            completedDateLabel: "完了日",
          }
        : {
            defaultDisplayName: "Creator",
            loadingError: "An error occurred while loading home.",
            loadError: "Failed to load home information.",
            requestLoadError: "Failed to load order data.",
            genericErrorTitle: "Failed to load",
            creatorOnlyTitle: "Creator access only",
            creatorOnlyBody:
              "This page is available only for creator accounts.",

            suspendedTitle: "Account under review",
            suspendedBody:
              "Some features are temporarily limited while your account is reviewed.",
            reviewPendingTitle: "Your review is in progress",
            reviewPendingBody:
              "Order handling becomes available after approval.",

            profilePromptTitle: "Improve your profile",
            profilePromptBody:
              "Add photos, social accounts, and menus so brands can order easily.",
            goToProfile: "View profile",
            profileBubble: "Get ready",

            payoutPromptTitle: "Register your payout account",
            payoutPromptBody:
              "Register your bank account to receive creator payouts.",
            goToPayoutSettings: "Register account",
            payoutBubble: "Register account",

            orderActionTitle: "You have a new order",
            orderActionBody: "Review details and decide whether to accept.",
            orderActionCta: "Review order",
            orderBubble: "Accept the order",

            todoActionTitle: "Active orders need action",
            todoActionBody: "Continue production, posting, or delivery URL submission.",
            todoActionCta: "View ToDo",
            todoBubble: "Post now",

            readyTitle: "Waiting for new orders",
            readyBody:
              "Update your profile and menus to prepare for future orders.",
            readyCta: "View profile",
            readyBubble: "Ready",

            sectionActionTitle: "Next action",
            pastTitle: "Past orders",
            viewAll: "View all",
            noPastTitle: "No completed orders yet",
            noPastBody: "Completed orders will appear here.",
            productUnset: "No product name",
            completedDateLabel: "Completed",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [payoutProfile, setPayoutProfile] =
    useState<PayoutProfileStatus | null>(null);

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

  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);

  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary>({
    completedPayoutAmount: 0,
    paidAmount: 0,
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
          db.from("user_roles").select("role").eq("user_id", user.id),
          db
            .from("user_states")
            .select("creator_profile_completed")
            .eq("user_id", user.id)
            .maybeSingle(),
          db
            .from("user_suspensions")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", true),
          db
            .from("creators")
            .select("id, user_id, display_name, full_name, approval_status")
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
          setLoading(false);
          return;
        }

        const { data: payoutProfileRow, error: payoutProfileError } = await db
          .from("creator_payout_profiles")
          .select("status, payout_method")
          .eq("creator_id", typedCreatorRow.id)
          .maybeSingle();

        if (payoutProfileError) {
          console.error({ payoutProfileError });
          setErrorMsg(copy.loadError);
          setLoading(false);
          return;
        }

        const typedPayoutProfile =
          (payoutProfileRow ?? null) as PayoutProfileStatus | null;

        setPayoutProfile(typedPayoutProfile);

        const payoutReady =
          typedPayoutProfile?.status === "submitted" ||
          typedPayoutProfile?.status === "verified";

        if (!payoutReady) {
          router.replace("/creator/payouts?from=signup&required=1");
          return;
        }

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
          { data: recentLegacyCompletedRows, error: recentLegacyCompletedError },
          { data: recentOrderCompletedRows, error: recentOrderCompletedError },
          { data: completedPayoutRows, error: completedPayoutError },
        ] = await Promise.all([
          db
            .from("requests")
            .select("id", { count: "exact", head: true })
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "pending"),

          db
            .from("requests")
            .select("id", { count: "exact", head: true })
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "accepted"),

          db
            .from("requests")
            .select("id", { count: "exact", head: true })
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "delivered"),

          db
            .from("requests")
            .select("id", { count: "exact", head: true })
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "completed"),

          db
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("creator_user_id", user.id)
            .eq("status", "authorized_pending_creator"),

          db
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("creator_user_id", user.id)
            .in("status", ["accepted_captured", "in_progress", "revision_requested"]),

          db
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("creator_user_id", user.id)
            .eq("status", "delivered"),

          db
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("creator_user_id", user.id)
            .eq("status", "completed"),

          db
            .from("creator_menus")
            .select("id", { count: "exact", head: true })
            .in("creator_id", menuCreatorKeys)
            .eq("is_active", true),

          db
            .from("requests")
            .select(
              "id, product_name, status, updated_at, created_at, delivered_post_url"
            )
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "completed")
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(5),

          db
            .from("orders")
            .select(
              "id, product_name, status, updated_at, created_at, completed_at, delivered_post_url"
            )
            .eq("creator_user_id", user.id)
            .eq("status", "completed")
            .order("completed_at", { ascending: false, nullsFirst: false })
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(5),

          db
            .from("orders")
            .select("creator_payout_amount, payout_status")
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
          recentLegacyCompletedError,
          recentOrderCompletedError,
          completedPayoutError,
        ].filter(Boolean);

        if (dashboardErrors.length > 0) {
          console.error({ dashboardErrors });
          setErrorMsg(copy.requestLoadError);
          setLoading(false);
          return;
        }

        setCounts({
          pendingRequests: (legacyPendingCount ?? 0) + (orderPendingCount ?? 0),
          acceptedJobs: (legacyAcceptedCount ?? 0) + (orderAcceptedCount ?? 0),
          deliveredJobs: (legacyDeliveredCount ?? 0) + (orderDeliveredCount ?? 0),
          completedJobs: (legacyCompletedCount ?? 0) + (orderCompletedCount ?? 0),
          activeMenus: activeMenusCount ?? 0,
        });

        const payoutRows = (completedPayoutRows ?? []) as Array<{
          creator_payout_amount: number | null;
          payout_status: string | null;
        }>;

        const completedPayoutAmount = payoutRows.reduce(
          (sum, row) => sum + Number(row.creator_payout_amount ?? 0),
          0
        );

        const paidAmount = payoutRows
          .filter((row) => row.payout_status === "paid")
          .reduce((sum, row) => sum + Number(row.creator_payout_amount ?? 0), 0);

        const pendingAmount = payoutRows
          .filter((row) =>
            ["unpaid", "pending", null, undefined].includes(row.payout_status)
          )
          .reduce((sum, row) => sum + Number(row.creator_payout_amount ?? 0), 0);

        setPayoutSummary({
          completedPayoutAmount,
          paidAmount,
          pendingAmount,
        });

        const legacyCompletedItems: RecentJob[] = (
          recentLegacyCompletedRows ?? []
        ).map((row: any) => ({
          kind: "legacy_request",
          id: row.id,
          product_name: row.product_name,
          status: row.status,
          updated_at: row.updated_at,
          created_at: row.created_at,
          completed_at: row.updated_at,
          delivered_post_url: row.delivered_post_url,
        }));

        const orderCompletedItems: RecentJob[] = (
          recentOrderCompletedRows ?? []
        ).map((row: any) => ({
          kind: "order",
          id: row.id,
          product_name: row.product_name,
          status: row.status,
          updated_at: row.updated_at,
          created_at: row.created_at,
          completed_at: row.completed_at,
          delivered_post_url: row.delivered_post_url,
        }));

        setRecentJobs(
          [...orderCompletedItems, ...legacyCompletedItems]
            .sort((a, b) => {
              const aTime = new Date(
                a.completed_at || a.updated_at || a.created_at
              ).getTime();
              const bTime = new Date(
                b.completed_at || b.updated_at || b.created_at
              ).getTime();
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
  }, [
    copy.loadError,
    copy.loadingError,
    copy.requestLoadError,
    db,
    router,
    supabase.auth,
  ]);

  if (loading) {
    return <LoadingView />;
  }

  if (errorMsg) {
    return (
      <main className="mx-auto max-w-[760px] px-4 pb-24 pt-4">
        <DashboardMotionStyle />
        <Notice title={copy.genericErrorTitle} body={errorMsg} tone="red" />
      </main>
    );
  }

  if (!gate.isCreator) {
    return (
      <main className="mx-auto max-w-[760px] px-4 pb-24 pt-4">
        <DashboardMotionStyle />
        <Notice title={copy.creatorOnlyTitle} body={copy.creatorOnlyBody} />
      </main>
    );
  }

  const activeTodoCount = counts.acceptedJobs + counts.deliveredJobs;

  const isPayoutReady =
    payoutProfile?.status === "submitted" || payoutProfile?.status === "verified";

  const actionCards: Array<{
    key: string;
    title: string;
    body: string;
    href: string;
    cta: string;
    icon: ReactNode;
    bubble: string;
    tone: "rose" | "slate" | "green";
  }> = [];

  if (!gate.creatorProfileCompleted) {
    actionCards.push({
      key: "profile",
      title: copy.profilePromptTitle,
      body: copy.profilePromptBody,
      href: "/creator/profile",
      cta: copy.goToProfile,
      icon: <ProfileIcon />,
      bubble: copy.profileBubble,
      tone: "slate",
    });
  } else if (!isPayoutReady) {
    actionCards.push({
      key: "payout",
      title: copy.payoutPromptTitle,
      body: copy.payoutPromptBody,
      href: "/creator/payouts?from=signup&required=1",
      cta: copy.goToPayoutSettings,
      icon: <ProfileIcon />,
      bubble: copy.payoutBubble,
      tone: "rose",
    });
  } else {
    if (counts.pendingRequests > 0) {
      actionCards.push({
        key: "orders",
        title: copy.orderActionTitle,
        body:
          safeLocale === "ja"
            ? `${counts.pendingRequests}件の注文に返答が必要です。`
            : `${counts.pendingRequests} order${
                counts.pendingRequests === 1 ? "" : "s"
              } need a reply.`,
        href: "/creator/requests",
        cta: copy.orderActionCta,
        icon: <ReceiptIcon />,
        bubble: copy.orderBubble,
        tone: "rose",
      });
    }

    if (activeTodoCount > 0) {
      actionCards.push({
        key: "todo",
        title: copy.todoActionTitle,
        body:
          safeLocale === "ja"
            ? `${activeTodoCount}件の案件を進めましょう。`
            : `${activeTodoCount} active order${
                activeTodoCount === 1 ? "" : "s"
              } need action.`,
        href: "/creator/jobs",
        cta: copy.todoActionCta,
        icon: <CheckIcon />,
        bubble: copy.todoBubble,
        tone: "rose",
      });
    }

    if (actionCards.length === 0) {
      actionCards.push({
        key: "ready",
        title: copy.readyTitle,
        body: copy.readyBody,
        href: "/creator/profile",
        cta: copy.readyCta,
        icon: <CheckIcon />,
        bubble: copy.readyBubble,
        tone: "green",
      });
    }
  }

  const pastItems: ActivityItem[] = recentJobs
    .filter((item) => item.status === "completed")
    .map((item) => ({
      kind: item.kind,
      id: item.id,
      product_name: item.product_name,
      status: item.status,
      date: item.completed_at ?? item.updated_at ?? item.created_at,
    }));

  return (
    <main className="mx-auto max-w-[760px] px-4 pb-24 pt-4">
      <DashboardMotionStyle />

      <div className="space-y-3">
        {gate.isSuspended ? (
          <Notice
            tone="red"
            title={copy.suspendedTitle}
            body={copy.suspendedBody}
          />
        ) : null}

        {gate.creatorApprovalStatus === "pending" ? (
          <Notice
            tone="amber"
            title={copy.reviewPendingTitle}
            body={copy.reviewPendingBody}
          />
        ) : null}

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h1 className="text-[15px] font-semibold text-slate-950">
              {copy.sectionActionTitle}
            </h1>
          </div>

          <div className="space-y-3">
            {actionCards.map((card) => (
              <ActionCard
                key={card.key}
                title={card.title}
                body={card.body}
                href={card.href}
                cta={card.cta}
                icon={card.icon}
                bubble={card.bubble}
                tone={card.tone}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-4 ring-1 ring-slate-100">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-slate-950">
              {copy.pastTitle}
            </h2>
            <Link
              href="/creator/jobs"
              className="text-[12px] font-semibold text-slate-400"
            >
              {copy.viewAll}
            </Link>
          </div>

          {pastItems.length === 0 ? (
            <EmptyBox title={copy.noPastTitle} body={copy.noPastBody} />
          ) : (
            <div className="space-y-2">
              {pastItems.map((item) => (
                <ActivityRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  locale={safeLocale}
                  productUnset={copy.productUnset}
                  dateLabel={copy.completedDateLabel}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
