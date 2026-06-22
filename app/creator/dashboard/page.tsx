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

type PastItem = {
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
};

type PayoutProfileStatus = {
  status: "not_submitted" | "submitted" | "verified" | "rejected" | null;
  payout_method: "manual_bank_transfer" | "stripe_connect" | null;
};

type ActionTone = "rose" | "slate" | "green";

type ActionCardData = {
  title: string;
  body: string;
  href: string;
  cta: string;
  tone: ActionTone;
  icon: "speech" | "check" | "profile" | "yen";
  animated?: boolean;
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

function getItemHref(item: PastItem) {
  return item.kind === "order"
    ? `/creator/orders/${item.id}`
    : `/creator/requests/${item.id}`;
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

function CloudSpeechIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M7.7 16.8H7a4 4 0 0 1-.6-8 5.4 5.4 0 0 1 10.2-1.1A4.6 4.6 0 0 1 17 16.8h-4.2L9 20v-3.2H7.7Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.6 11.8h6.7M8.6 14h4.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
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

function YenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
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

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
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
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
        <div className="h-24 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
        <div className="h-44 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
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
  animated = false,
}: {
  children: ReactNode;
  tone?: ActionTone;
  animated?: boolean;
}) {
  const className =
    tone === "rose"
      ? "bg-rose-50 text-[#ff3860] ring-rose-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-[18px] ring-1 ${className} ${
        animated ? "trendre-bubble-float" : ""
      }`}
    >
      {children}
    </span>
  );
}

function ActionIcon({ type }: { type: ActionCardData["icon"] }) {
  if (type === "speech") return <CloudSpeechIcon />;
  if (type === "check") return <CheckIcon />;
  if (type === "profile") return <ProfileIcon />;
  return <YenIcon />;
}

function ActionCard({ action }: { action: ActionCardData }) {
  return (
    <Link href={action.href} className="block">
      <section className="rounded-[24px] bg-white p-4 ring-1 ring-slate-100 transition active:scale-[0.99]">
        <div className="flex items-start gap-3">
          <IconBubble tone={action.tone} animated={action.animated}>
            <ActionIcon type={action.icon} />
          </IconBubble>

          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold tracking-[-0.035em] text-slate-950">
              {action.title}
            </p>
            <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
              {action.body}
            </p>

            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-100">
              {action.cta}
              <ChevronIcon />
            </span>
          </div>
        </div>
      </section>
    </Link>
  );
}

function PastRow({
  item,
  locale,
  productUnset,
  dateLabel,
}: {
  item: PastItem;
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

            payoutPromptTitle: "受け取り口座を登録しましょう",
            payoutPromptBody:
              "報酬を受け取るために、銀行口座の登録が必要です。",
            goToPayoutSettings: "口座を登録する",

            orderActionTitle: "注文を受けましょう",
            orderActionBody: (count: number) =>
              `${count}件の注文に返答が必要です。`,
            orderActionCta: "注文を確認する",

            todoActionTitle: "投稿しましょう",
            todoActionBody: (count: number) =>
              `${count}件の案件を進めましょう。`,
            todoActionCta: "ToDoを見る",

            readyTitle: "今やることはありません",
            readyBody: "新しい注文が届くと、ここに表示されます。",
            readyCta: "プロフィールを見る",

            sectionActionTitle: "今やること",
            pastTitle: "過去案件",
            viewAll: "すべて見る",

            noPastTitle: "過去案件はまだありません",
            noPastBody: "完了した案件がここに表示されます。",
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

            payoutPromptTitle: "Register your payout account",
            payoutPromptBody:
              "Register your bank account to receive creator payouts.",
            goToPayoutSettings: "Register account",

            orderActionTitle: "Accept your order",
            orderActionBody: (count: number) =>
              `${count} order${count === 1 ? "" : "s"} need a reply.`,
            orderActionCta: "Review order",

            todoActionTitle: "Post your content",
            todoActionBody: (count: number) =>
              `${count} active order${count === 1 ? "" : "s"} need action.`,
            todoActionCta: "View ToDo",

            readyTitle: "Nothing to do now",
            readyBody: "New orders will appear here.",
            readyCta: "View profile",

            sectionActionTitle: "Next action",
            pastTitle: "Past orders",
            viewAll: "View all",

            noPastTitle: "No past orders yet",
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
  });

  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);

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
            .select(
              "id, user_id, display_name, full_name, avatar_url, category, approval_status"
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

        const [
          { count: legacyPendingCount, error: legacyPendingError },
          { count: legacyAcceptedCount, error: legacyAcceptedError },
          { count: legacyDeliveredCount, error: legacyDeliveredError },
          { count: legacyCompletedCount, error: legacyCompletedError },
          { count: orderPendingCount, error: orderPendingError },
          { count: orderAcceptedCount, error: orderAcceptedError },
          { count: orderDeliveredCount, error: orderDeliveredError },
          { count: orderCompletedCount, error: orderCompletedError },
          { data: recentLegacyCompletedRows, error: recentLegacyCompletedError },
          { data: recentOrderCompletedRows, error: recentOrderCompletedError },
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
            .from("requests")
            .select(
              "id, product_name, status, updated_at, created_at, delivered_post_url"
            )
            .in("creator_user_id", legacyCreatorKeys)
            .eq("status", "completed")
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(3),

          db
            .from("orders")
            .select(
              "id, product_name, status, updated_at, created_at, delivered_post_url"
            )
            .eq("creator_user_id", user.id)
            .eq("status", "completed")
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(3),
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
          recentLegacyCompletedError,
          recentOrderCompletedError,
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
          delivered_post_url: row.delivered_post_url,
        }));

        setRecentJobs(
          [...orderCompletedItems, ...legacyCompletedItems]
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
        <Notice title={copy.genericErrorTitle} body={errorMsg} tone="red" />
      </main>
    );
  }

  if (!gate.isCreator) {
    return (
      <main className="mx-auto max-w-[760px] px-4 pb-24 pt-4">
        <Notice title={copy.creatorOnlyTitle} body={copy.creatorOnlyBody} />
      </main>
    );
  }

  const activeTodoCount = counts.acceptedJobs + counts.deliveredJobs;

  const isPayoutReady =
    payoutProfile?.status === "submitted" || payoutProfile?.status === "verified";

  const actionCards: ActionCardData[] = [];

  if (!gate.creatorProfileCompleted) {
    actionCards.push({
      title: copy.profilePromptTitle,
      body: copy.profilePromptBody,
      href: "/creator/profile",
      cta: copy.goToProfile,
      tone: "slate",
      icon: "profile",
    });
  } else if (!isPayoutReady) {
    actionCards.push({
      title: copy.payoutPromptTitle,
      body: copy.payoutPromptBody,
      href: "/creator/payouts?from=signup&required=1",
      cta: copy.goToPayoutSettings,
      tone: "rose",
      icon: "yen",
    });
  } else {
    if (counts.pendingRequests > 0) {
      actionCards.push({
        title: copy.orderActionTitle,
        body: copy.orderActionBody(counts.pendingRequests),
        href: "/creator/requests",
        cta: copy.orderActionCta,
        tone: "rose",
        icon: "speech",
        animated: true,
      });
    }

    if (activeTodoCount > 0) {
      actionCards.push({
        title: copy.todoActionTitle,
        body: copy.todoActionBody(activeTodoCount),
        href: "/creator/jobs",
        cta: copy.todoActionCta,
        tone: "rose",
        icon: "speech",
        animated: true,
      });
    }

    if (actionCards.length === 0) {
      actionCards.push({
        title: copy.readyTitle,
        body: copy.readyBody,
        href: "/creator/profile",
        cta: copy.readyCta,
        tone: "green",
        icon: "check",
      });
    }
  }

  const pastItems: PastItem[] = recentJobs.map((item) => ({
    kind: item.kind,
    id: item.id,
    product_name: item.product_name,
    status: item.status,
    date: item.updated_at ?? item.created_at,
  }));

  return (
    <main className="mx-auto max-w-[760px] px-4 pb-24 pt-4">
      <style jsx global>{`
        @keyframes trendreBubbleFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(-0.6deg);
          }
          50% {
            transform: translate3d(0, -3px, 0) rotate(0.8deg);
          }
        }

        .trendre-bubble-float {
          animation: trendreBubbleFloat 2.6s ease-in-out infinite;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .trendre-bubble-float {
            animation: none;
          }
        }
      `}</style>

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
            <h1 className="text-[17px] font-semibold tracking-[-0.035em] text-slate-950">
              {copy.sectionActionTitle}
            </h1>
          </div>

          <div className="space-y-2.5">
            {actionCards.map((action) => (
              <ActionCard key={`${action.href}-${action.title}`} action={action} />
            ))}
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-4 ring-1 ring-slate-100">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-slate-950">
              {copy.pastTitle}
            </h2>
            <Link
              href="/creator/payouts"
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
                <PastRow
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
