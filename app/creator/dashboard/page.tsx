// app/creator/dashboard/page.tsx
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
  canUsePlatform: boolean;
};

type CreatorProfile = {
  id: string;
  user_id: string;
  display_name: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  bio: string | null;
  country: string | null;
  prefecture: string | null;
  city: string | null;
  content_language: string | null;
  response_language: string | null;
  sub_categories: string[] | null;
  approval_status: string;
  stripe_onboarding_completed: boolean | null;
};

type PayoutSummary = {
  completedPayoutAmount: number;
  transferredAmount: number;
  pendingAmount: number;
};

type BadgeTone = "gray" | "yellow" | "blue" | "green" | "red" | "purple" | "black";

function compactText(value: string | null | undefined) {
  return value?.trim() || "";
}

function fallbackInitial(name: string) {
  return (name || "C").slice(0, 1).toUpperCase();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => !!value))
  );
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
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

function getApprovalBadgeMeta(
  status: string | null,
  locale: "ja" | "en"
): { label: string; tone: BadgeTone } {
  if (locale === "ja") {
    if (status === "approved") return { label: "承認済み", tone: "green" };
    if (status === "pending") return { label: "審査中", tone: "yellow" };
    if (status === "rejected") return { label: "却下", tone: "red" };
    return { label: "未設定", tone: "gray" };
  }

  if (status === "approved") return { label: "Approved", tone: "green" };
  if (status === "pending") return { label: "Under Review", tone: "yellow" };
  if (status === "rejected") return { label: "Rejected", tone: "red" };
  return { label: "Not Set", tone: "gray" };
}

function getWorkflowBadgeMeta(
  status: string | null,
  locale: "ja" | "en"
): { label: string; className: string } {
  const normalized = (status ?? "").toLowerCase();

  if (locale === "ja") {
    if (normalized === "pending" || normalized === "authorized_pending_creator") {
      return {
        label:
          normalized === "authorized_pending_creator"
            ? "承認待ち注文"
            : "承認待ち",
        className: "bg-amber-100 text-amber-800",
      };
    }

    if (normalized === "accepted" || normalized === "accepted_captured") {
      return {
        label:
          normalized === "accepted_captured"
            ? "承認済み・決済確定"
            : "進行中",
        className: "bg-blue-100 text-blue-700",
      };
    }

    if (normalized === "in_progress") {
      return {
        label: "進行中",
        className: "bg-blue-100 text-blue-700",
      };
    }

    if (normalized === "delivered") {
      return {
        label: "納品済み",
        className: "bg-purple-100 text-purple-700",
      };
    }

    if (normalized === "completed") {
      return {
        label: "完了",
        className: "bg-emerald-100 text-emerald-700",
      };
    }

    if (
      normalized === "rejected" ||
      normalized === "declined_canceled" ||
      normalized === "expired_canceled" ||
      normalized === "capture_failed" ||
      normalized === "cancel_failed"
    ) {
      return {
        label: "終了",
        className: "bg-rose-100 text-rose-700",
      };
    }

    return {
      label: status || "未設定",
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (normalized === "pending" || normalized === "authorized_pending_creator") {
    return {
      label:
        normalized === "authorized_pending_creator"
          ? "Pending Order"
          : "Pending",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (normalized === "accepted" || normalized === "accepted_captured") {
    return {
      label:
        normalized === "accepted_captured"
          ? "Accepted / Captured"
          : "Active",
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (normalized === "in_progress") {
    return { label: "In Progress", className: "bg-blue-100 text-blue-700" };
  }

  if (normalized === "delivered") {
    return { label: "Delivered", className: "bg-purple-100 text-purple-700" };
  }

  if (normalized === "completed") {
    return { label: "Completed", className: "bg-emerald-100 text-emerald-700" };
  }

  if (
    normalized === "rejected" ||
    normalized === "declined_canceled" ||
    normalized === "expired_canceled" ||
    normalized === "capture_failed" ||
    normalized === "cancel_failed"
  ) {
    return { label: "Closed", className: "bg-rose-100 text-rose-700" };
  }

  return {
    label: status || "Not Set",
    className: "bg-slate-100 text-slate-700",
  };
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    gray: "bg-slate-100 text-slate-700",
    yellow: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    purple: "bg-purple-100 text-purple-700",
    black: "bg-slate-950 text-white",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

function Avatar({
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
        className="h-16 w-16 rounded-3xl border-4 border-white object-cover shadow-lg"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-4 border-white bg-slate-950 text-2xl font-black text-white shadow-lg">
      {fallbackInitial(name)}
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  href,
  tone = "gray",
}: {
  label: string;
  value: number | string;
  helper?: string;
  href?: string;
  tone?: "gray" | "amber" | "blue" | "purple" | "green" | "black";
}) {
  const toneClass = {
    gray: "bg-white",
    amber: "bg-amber-50",
    blue: "bg-blue-50",
    purple: "bg-purple-50",
    green: "bg-emerald-50",
    black: "bg-slate-950 text-white",
  }[tone];

  const inner = (
    <div
      className={`rounded-[24px] border border-slate-100 p-4 shadow-sm transition ${
        href ? "hover:-translate-y-0.5 hover:shadow-md" : ""
      } ${toneClass}`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.16em] ${
          tone === "black" ? "text-white/60" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-3 text-3xl font-black ${
          tone === "black" ? "text-white" : "text-slate-950"
        }`}
      >
        {value}
      </p>
      {helper ? (
        <p
          className={`mt-2 text-xs leading-5 ${
            tone === "black" ? "text-white/70" : "text-slate-500"
          }`}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );

  if (!href) return inner;

  return <Link href={href}>{inner}</Link>;
}

function ActionCard({
  href,
  title,
  body,
  icon,
  strong,
}: {
  href: string;
  title: string;
  body: string;
  icon: string;
  strong?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[26px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        strong
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-100 bg-white text-slate-950"
      }`}
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black ${
          strong ? "bg-white text-slate-950" : "bg-slate-100 text-slate-950"
        }`}
      >
        {icon}
      </div>
      <p className="text-base font-black">{title}</p>
      <p
        className={`mt-2 text-sm leading-6 ${
          strong ? "text-white/70" : "text-slate-500"
        }`}
      >
        {body}
      </p>
    </Link>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}

function WorkflowBadge({
  status,
  locale,
}: {
  status: string | null;
  locale: "ja" | "en";
}) {
  const meta = getWorkflowBadgeMeta(status, locale);

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function RecentRequestCard({
  item,
  copy,
  locale,
}: {
  item: RecentRequest;
  copy: {
    productUnset: string;
    createdAt: string;
    orderLabel: string;
    legacyRequestLabel: string;
  };
  locale: "ja" | "en";
}) {
  const href =
    item.kind === "order"
      ? `/creator/orders/${item.id}`
      : `/creator/requests/${item.id}`;

  return (
    <Link
      href={href}
      className="block rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {item.product_name || copy.productUnset}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {item.kind === "order" ? copy.orderLabel : copy.legacyRequestLabel}
            {" · "}
            {copy.createdAt}: {formatDate(item.created_at, locale)}
          </p>
        </div>

        <WorkflowBadge status={item.status} locale={locale} />
      </div>
    </Link>
  );
}

function RecentJobCard({
  item,
  copy,
  locale,
}: {
  item: RecentJob;
  copy: {
    productUnset: string;
    updatedAt: string;
    deliveredUrl: string;
    orderLabel: string;
    legacyRequestLabel: string;
  };
  locale: "ja" | "en";
}) {
  const href =
    item.kind === "order"
      ? `/creator/orders/${item.id}`
      : `/creator/requests/${item.id}`;

  return (
    <Link
      href={href}
      className="block rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {item.product_name || copy.productUnset}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {item.kind === "order" ? copy.orderLabel : copy.legacyRequestLabel}
            {" · "}
            {copy.updatedAt}: {formatDate(item.updated_at || item.created_at, locale)}
          </p>
          {item.delivered_post_url ? (
            <p className="mt-2 text-xs font-bold text-purple-600">
              {copy.deliveredUrl}
            </p>
          ) : null}
        </div>

        <WorkflowBadge status={item.status} locale={locale} />
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
            loading: "読み込み中...",
            defaultDisplayName: "creator",
            genericErrorTitle: "エラーが発生しました",
            creatorOnlyTitle: "クリエイター専用ページです",
            creatorOnlyBody:
              "このページはクリエイターアカウントのみ利用できます。",
            loadError: "ダッシュボード情報の取得に失敗しました。",
            requestLoadError: "案件データの取得に失敗しました。",
            loadingError: "ダッシュボードの読み込み中にエラーが発生しました。",
            welcome: "おかえりなさい",
            headerEyebrow: "Creator Home",
            headerBody:
              "依頼確認、進行中案件、報酬、プロフィールをスマホでもすぐ確認できます。",
            profileCompleted: "プロフィール完了",
            profileIncomplete: "プロフィール未完了",
            connectCompleted: "報酬受け取り設定済み",
            suspended: "停止中",
            suspendedTitle: "現在このアカウントは制限中です",
            suspendedBody:
              "アカウント状態の確認が必要です。一部機能をご利用いただけません。",
            reviewPendingTitle: "審査結果待ちです",
            reviewPendingBody:
              "現在、クリエイターアカウントの審査中です。承認後に依頼受領や進行機能が安定して利用できます。",
            profilePromptTitle: "プロフィール情報を確認してください",
            profilePromptBody:
              "企業から見られる登録内容や依頼導線を整えるために、プロフィール情報を確認してください。",
            goToProfile: "プロフィールを確認する",
            summaryTitle: "プロフィール概要",
            summaryLocation: "活動地域",
            summaryLanguages: "言語",
            summaryCategory: "カテゴリ",
            summarySubCategories: "サブカテゴリ",
            summaryBio: "自己紹介",
            notSet: "未設定",
            none: "なし",
            quickTitle: "クイックアクション",
            quickRequestsTitle: "依頼を確認",
            quickRequestsBody:
              "新しく届いた注文・依頼を確認し、承認または辞退します。",
            quickJobsTitle: "案件を進める",
            quickJobsBody:
              "進行中・納品済み・完了待ちの案件を確認します。",
            quickPayoutsTitle: "報酬を見る",
            quickPayoutsBody:
              "受取予定額、送金済み、Stripe Connect状態を確認します。",
            quickProfileTitle: "プロフィールを整える",
            quickProfileBody:
              "写真、SNS、カテゴリ、自己紹介を更新します。",
            quickMenusTitle: "メニュー管理",
            quickMenusBody:
              "公開中メニューの確認、新規追加、編集を行います。",
            countPending: "承認待ち",
            countAccepted: "進行中",
            countDelivered: "納品済み",
            countCompleted: "完了",
            countMenus: "公開メニュー",
            countMenusHelper: "現在公開中",
            payoutTitle: "報酬サマリー",
            payoutCompleted: "受取予定",
            payoutTransferred: "送金済み",
            payoutPending: "未送金",
            usageTitle: "現在の状態",
            usageProfile: "プロフィール",
            usageReview: "審査状態",
            usageFeature: "案件機能",
            usageMenus: "メニュー公開",
            available: "利用可能",
            limited: "一部制限中",
            noMenus: "未登録",
            recentPendingTitle: "最近の承認待ち",
            recentJobsTitle: "最近の進行中案件",
            viewAll: "すべて見る",
            noPending: "承認待ちの注文・依頼はありません。",
            noJobs: "進行中の案件はありません。",
            productUnset: "商品名未設定",
            createdAt: "作成日",
            updatedAt: "更新日",
            deliveredUrl: "納品URLあり",
            editProfile: "プロフィール編集",
            manageMenus: "メニュー管理",
            responsePrefix: "対応",
            orderLabel: "注文",
            legacyRequestLabel: "旧依頼",
          }
        : {
            loading: "Loading...",
            defaultDisplayName: "creator",
            genericErrorTitle: "Something went wrong",
            creatorOnlyTitle: "Creator access only",
            creatorOnlyBody:
              "This page is available only for creator accounts.",
            loadError: "Failed to load dashboard information.",
            requestLoadError: "Failed to load request data.",
            loadingError: "An error occurred while loading the dashboard.",
            welcome: "Welcome back",
            headerEyebrow: "Creator Home",
            headerBody:
              "Review requests, active jobs, payouts, and profile status in a mobile-friendly home.",
            profileCompleted: "Profile Complete",
            profileIncomplete: "Profile Incomplete",
            connectCompleted: "Payout setup complete",
            suspended: "Suspended",
            suspendedTitle: "This account is currently restricted",
            suspendedBody:
              "Your account status requires review. Some features are temporarily unavailable.",
            reviewPendingTitle: "Your review is still in progress",
            reviewPendingBody:
              "Your creator account is currently under review. Request handling and workflow features will be fully available after approval.",
            profilePromptTitle: "Please review your profile information",
            profilePromptBody:
              "Make sure your registration details and public profile information are ready for brands to view.",
            goToProfile: "Review profile",
            summaryTitle: "Profile Summary",
            summaryLocation: "Location",
            summaryLanguages: "Languages",
            summaryCategory: "Category",
            summarySubCategories: "Sub-categories",
            summaryBio: "Bio",
            notSet: "Not set",
            none: "None",
            quickTitle: "Quick Actions",
            quickRequestsTitle: "Review requests",
            quickRequestsBody:
              "Review incoming orders and requests and approve or reject them.",
            quickJobsTitle: "Continue jobs",
            quickJobsBody:
              "See jobs that are active, delivered, or waiting for completion.",
            quickPayoutsTitle: "Check payouts",
            quickPayoutsBody:
              "Check payout estimates, transfers, and Stripe Connect status.",
            quickProfileTitle: "Polish profile",
            quickProfileBody:
              "Update your photos, social accounts, category, and bio.",
            quickMenusTitle: "Manage menus",
            quickMenusBody:
              "Check active menus, create new ones, and edit existing ones.",
            countPending: "Pending",
            countAccepted: "Active",
            countDelivered: "Delivered",
            countCompleted: "Completed",
            countMenus: "Active Menus",
            countMenusHelper: "Currently public",
            payoutTitle: "Payout Summary",
            payoutCompleted: "Expected",
            payoutTransferred: "Transferred",
            payoutPending: "Pending",
            usageTitle: "Current Status",
            usageProfile: "Profile",
            usageReview: "Review",
            usageFeature: "Job Features",
            usageMenus: "Menu Publishing",
            available: "Available",
            limited: "Partially Limited",
            noMenus: "None",
            recentPendingTitle: "Recent Pending",
            recentJobsTitle: "Recent Active Jobs",
            viewAll: "View All",
            noPending: "There are no pending orders or requests.",
            noJobs: "There are no active jobs.",
            productUnset: "No product name",
            createdAt: "Created",
            updatedAt: "Updated",
            deliveredUrl: "Delivered URL Submitted",
            editProfile: "Edit Profile",
            manageMenus: "Manage Menus",
            responsePrefix: "Response",
            orderLabel: "Order",
            legacyRequestLabel: "Legacy Request",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [gate, setGate] = useState<CreatorState>({
    isCreator: false,
    isSuspended: false,
    creatorProfileCompleted: false,
    creatorApprovalStatus: null,
    canUsePlatform: false,
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

        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
        const metadataCover =
          typeof metadata.creator_cover_image_url === "string"
            ? metadata.creator_cover_image_url
            : null;

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
              "id, user_id, display_name, full_name, avatar_url, cover_image_url, category, bio, country, prefecture, city, content_language, response_language, sub_categories, approval_status, stripe_onboarding_completed"
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

        const canUsePlatform =
          isCreator &&
          !isSuspended &&
          creatorProfileCompleted &&
          creatorApprovalStatus === "approved";

        setGate({
          isCreator,
          isSuspended,
          creatorProfileCompleted,
          creatorApprovalStatus,
          canUsePlatform,
        });

        if (!creatorRow) {
          setCreator(null);
          setCoverImageUrl(metadataCover);
          setLoading(false);
          return;
        }

        if (!creatorRow.stripe_onboarding_completed) {
          window.location.href = "/creator/payouts?required=connect";
          return;
        }

        const typedCreator = creatorRow as CreatorProfile;
        setCreator(typedCreator);
        setCoverImageUrl(typedCreator.cover_image_url || metadataCover);

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
            .limit(5),

          supabase
            .from("orders")
            .select("id, product_name, status, created_at")
            .eq("creator_user_id", user.id)
            .eq("status", "authorized_pending_creator")
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("requests")
            .select(
              "id, product_name, status, updated_at, created_at, delivered_post_url"
            )
            .in("creator_user_id", legacyCreatorKeys)
            .in("status", ["accepted", "delivered", "completed"])
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(5),

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
            .limit(5),

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

        const nextRecentRequests = [
          ...orderPendingItems,
          ...legacyPendingItems,
        ]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 5);

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

        const nextRecentJobs = [...orderJobItems, ...legacyJobItems]
          .sort((a, b) => {
            const aTime = new Date(a.updated_at || a.created_at).getTime();
            const bTime = new Date(b.updated_at || b.created_at).getTime();
            return bTime - aTime;
          })
          .slice(0, 5);

        setRecentRequests(nextRecentRequests);
        setRecentJobs(nextRecentJobs);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErrorMsg(copy.loadingError);
        setLoading(false);
      }
    };

    void load();
  }, [copy.loadError, copy.loadingError, copy.requestLoadError, supabase]);

  const approvalMeta = getApprovalBadgeMeta(
    gate.creatorApprovalStatus,
    safeLocale
  );

  const locationSummary = useMemo(() => {
    const parts = [
      compactText(creator?.country),
      compactText(creator?.prefecture),
      compactText(creator?.city),
    ].filter(Boolean);

    if (parts.length === 0) return copy.notSet;
    return parts.join(" / ");
  }, [copy.notSet, creator?.city, creator?.country, creator?.prefecture]);

  const languageSummary = useMemo(() => {
    const content = compactText(creator?.content_language);
    const response = compactText(creator?.response_language);

    if (!content && !response) return copy.notSet;
    if (content && !response) return content;
    if (!content && response) return `${copy.responsePrefix}: ${response}`;
    if (content === response) return content;
    return `${content}\n${copy.responsePrefix}: ${response}`;
  }, [
    copy.notSet,
    copy.responsePrefix,
    creator?.content_language,
    creator?.response_language,
  ]);

  const subCategorySummary = useMemo(() => {
    if (!creator?.sub_categories || creator.sub_categories.length === 0) {
      return copy.none;
    }

    return creator.sub_categories.join(" / ");
  }, [copy.none, creator?.sub_categories]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-[24px] bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-black text-rose-800">
          {copy.genericErrorTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-rose-700">{errorMsg}</p>
      </div>
    );
  }

  if (!gate.isCreator) {
    return (
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-black text-slate-950">
          {copy.creatorOnlyTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          {copy.creatorOnlyBody}
        </p>
      </div>
    );
  }

  const displayName =
    creator?.display_name ||
    creator?.full_name ||
    copy.defaultDisplayName;

  const heroStyle = coverImageUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.78), rgba(15,23,42,0.38)), url(${coverImageUrl})`,
      }
    : undefined;

  return (
    <div className="space-y-8 pb-4">
      <section
        className={`overflow-hidden rounded-[32px] p-6 text-white shadow-sm md:p-8 ${
          coverImageUrl
            ? "bg-cover bg-center"
            : "bg-gradient-to-br from-slate-950 via-slate-800 to-slate-600"
        }`}
        style={heroStyle}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <Avatar name={displayName} src={creator?.avatar_url} />

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/60">
                {copy.headerEyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                {copy.welcome}, {displayName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
                {copy.headerBody}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge label={approvalMeta.label} tone={approvalMeta.tone} />
            <StatusBadge
              label={
                gate.creatorProfileCompleted
                  ? copy.profileCompleted
                  : copy.profileIncomplete
              }
              tone={gate.creatorProfileCompleted ? "green" : "yellow"}
            />
            {creator?.stripe_onboarding_completed ? (
              <StatusBadge label={copy.connectCompleted} tone="black" />
            ) : null}
          </div>
        </div>
      </section>

      {gate.isSuspended ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
          <h2 className="text-lg font-black text-rose-800">
            {copy.suspendedTitle}
          </h2>
          <p className="mt-2 text-sm leading-7 text-rose-700">
            {copy.suspendedBody}
          </p>
        </section>
      ) : null}

      {gate.creatorApprovalStatus === "pending" ? (
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-black text-amber-900">
            {copy.reviewPendingTitle}
          </h2>
          <p className="mt-2 text-sm leading-7 text-amber-800">
            {copy.reviewPendingBody}
          </p>
        </section>
      ) : null}

      {!gate.creatorProfileCompleted ? (
        <section className="rounded-[28px] border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-lg font-black text-blue-900">
            {copy.profilePromptTitle}
          </h2>
          <p className="mt-2 text-sm leading-7 text-blue-800">
            {copy.profilePromptBody}
          </p>
          <Link
            href="/creator/profile"
            className="mt-4 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            {copy.goToProfile}
          </Link>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label={copy.countPending}
          value={counts.pendingRequests}
          href="/creator/requests"
          tone={counts.pendingRequests > 0 ? "amber" : "gray"}
        />
        <KpiCard
          label={copy.countAccepted}
          value={counts.acceptedJobs}
          href="/creator/jobs"
          tone={counts.acceptedJobs > 0 ? "blue" : "gray"}
        />
        <KpiCard
          label={copy.countDelivered}
          value={counts.deliveredJobs}
          href="/creator/jobs"
          tone={counts.deliveredJobs > 0 ? "purple" : "gray"}
        />
        <KpiCard
          label={copy.countCompleted}
          value={counts.completedJobs}
          href="/creator/jobs"
          tone={counts.completedJobs > 0 ? "green" : "gray"}
        />
        <KpiCard
          label={copy.countMenus}
          value={counts.activeMenus}
          helper={copy.countMenusHelper}
          href="/creator/menus"
          tone={counts.activeMenus > 0 ? "black" : "gray"}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={copy.payoutCompleted}
          value={formatMoney(payoutSummary.completedPayoutAmount, safeLocale)}
          href="/creator/payouts"
          tone="gray"
        />
        <KpiCard
          label={copy.payoutTransferred}
          value={formatMoney(payoutSummary.transferredAmount, safeLocale)}
          href="/creator/payouts"
          tone="green"
        />
        <KpiCard
          label={copy.payoutPending}
          value={formatMoney(payoutSummary.pendingAmount, safeLocale)}
          href="/creator/payouts"
          tone={payoutSummary.pendingAmount > 0 ? "amber" : "gray"}
        />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              App shortcuts
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {copy.quickTitle}
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <ActionCard
            href="/creator/requests"
            title={copy.quickRequestsTitle}
            body={copy.quickRequestsBody}
            icon="◎"
            strong={counts.pendingRequests > 0}
          />
          <ActionCard
            href="/creator/jobs"
            title={copy.quickJobsTitle}
            body={copy.quickJobsBody}
            icon="▣"
            strong={counts.acceptedJobs + counts.deliveredJobs > 0}
          />
          <ActionCard
            href="/creator/payouts"
            title={copy.quickPayoutsTitle}
            body={copy.quickPayoutsBody}
            icon="¥"
          />
          <ActionCard
            href="/creator/profile"
            title={copy.quickProfileTitle}
            body={copy.quickProfileBody}
            icon="◯"
          />
          <ActionCard
            href="/creator/menus"
            title={copy.quickMenusTitle}
            body={copy.quickMenusBody}
            icon="+"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-black text-slate-950">
                {copy.recentPendingTitle}
              </h2>
              <Link
                href="/creator/requests"
                className="text-sm font-bold text-slate-500 hover:text-slate-950"
              >
                {copy.viewAll}
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                {copy.noPending}
              </p>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((item) => (
                  <RecentRequestCard
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    copy={{
                      productUnset: copy.productUnset,
                      createdAt: copy.createdAt,
                      orderLabel: copy.orderLabel,
                      legacyRequestLabel: copy.legacyRequestLabel,
                    }}
                    locale={safeLocale}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-black text-slate-950">
                {copy.recentJobsTitle}
              </h2>
              <Link
                href="/creator/jobs"
                className="text-sm font-bold text-slate-500 hover:text-slate-950"
              >
                {copy.viewAll}
              </Link>
            </div>

            {recentJobs.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                {copy.noJobs}
              </p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((item) => (
                  <RecentJobCard
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    copy={{
                      productUnset: copy.productUnset,
                      updatedAt: copy.updatedAt,
                      deliveredUrl: copy.deliveredUrl,
                      orderLabel: copy.orderLabel,
                      legacyRequestLabel: copy.legacyRequestLabel,
                    }}
                    locale={safeLocale}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              {copy.summaryTitle}
            </h2>

            <div className="mt-5 grid gap-3">
              <SummaryCard label={copy.summaryLocation} value={locationSummary} />
              <SummaryCard label={copy.summaryLanguages} value={languageSummary} />
              <SummaryCard
                label={copy.summaryCategory}
                value={compactText(creator?.category) || copy.notSet}
              />
              <SummaryCard
                label={copy.summarySubCategories}
                value={subCategorySummary}
              />
              <SummaryCard
                label={copy.summaryBio}
                value={compactText(creator?.bio) || copy.notSet}
              />
            </div>

            <div className="mt-5 grid gap-3">
              <Link
                href="/creator/profile"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {copy.editProfile}
              </Link>
              <Link
                href="/creator/menus"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                {copy.manageMenus}
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              {copy.usageTitle}
            </h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="text-sm font-bold text-slate-600">
                  {copy.usageProfile}
                </span>
                <StatusBadge
                  label={
                    gate.creatorProfileCompleted
                      ? copy.profileCompleted
                      : copy.profileIncomplete
                  }
                  tone={gate.creatorProfileCompleted ? "green" : "yellow"}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="text-sm font-bold text-slate-600">
                  {copy.usageReview}
                </span>
                <StatusBadge label={approvalMeta.label} tone={approvalMeta.tone} />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="text-sm font-bold text-slate-600">
                  {copy.usageFeature}
                </span>
                <StatusBadge
                  label={gate.canUsePlatform ? copy.available : copy.limited}
                  tone={gate.canUsePlatform ? "green" : "yellow"}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="text-sm font-bold text-slate-600">
                  {copy.usageMenus}
                </span>
                <StatusBadge
                  label={
                    counts.activeMenus > 0
                      ? `${counts.activeMenus}`
                      : copy.noMenus
                  }
                  tone={counts.activeMenus > 0 ? "green" : "gray"}
                />
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}