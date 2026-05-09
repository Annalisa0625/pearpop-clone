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

type BadgeTone = "gray" | "yellow" | "blue" | "green" | "red" | "purple";

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    gray: "bg-gray-100 text-gray-700",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

function CountCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {helper ? <p className="mt-2 text-xs text-gray-500">{helper}</p> : null}
    </div>
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
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-800">
        {value}
      </p>
    </div>
  );
}

function QuickLinkCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
    </Link>
  );
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
}

function fallbackInitial(name: string) {
  return (name || "C").slice(0, 1).toUpperCase();
}

function compactText(value: string | null | undefined) {
  return value?.trim() || "";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => !!value))
  );
}

function getApprovalBadgeMeta(
  status: string | null,
  locale: "ja" | "en"
): { label: string; tone: BadgeTone } {
  if (locale === "ja") {
    if (status === "approved") return { label: "承認済み", tone: "blue" };
    if (status === "pending") return { label: "審査中", tone: "yellow" };
    if (status === "rejected") return { label: "却下", tone: "red" };
    return { label: "未設定", tone: "gray" };
  }

  if (status === "approved") return { label: "Approved", tone: "blue" };
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
        className: "bg-yellow-100 text-yellow-800",
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
        className: "bg-green-100 text-green-700",
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
        className: "bg-red-100 text-red-700",
      };
    }

    return {
      label: status || "未設定",
      className: "bg-gray-100 text-gray-700",
    };
  }

  if (normalized === "pending" || normalized === "authorized_pending_creator") {
    return {
      label:
        normalized === "authorized_pending_creator"
          ? "Pending Order"
          : "Pending",
      className: "bg-yellow-100 text-yellow-800",
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
    return { label: "Completed", className: "bg-green-100 text-green-700" };
  }

  if (
    normalized === "rejected" ||
    normalized === "declined_canceled" ||
    normalized === "expired_canceled" ||
    normalized === "capture_failed" ||
    normalized === "cancel_failed"
  ) {
    return { label: "Closed", className: "bg-red-100 text-red-700" };
  }

  return {
    label: status || "Not Set",
    className: "bg-gray-100 text-gray-700",
  };
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
            headerEyebrow: "Creator Dashboard",
            headerBody:
              "登録内容・注文/依頼状況・メニュー状況をスマホでも見やすくまとめて確認できます。",
            profileCompleted: "プロフィール完了",
            profileIncomplete: "プロフィール未完了",
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
            summaryTitle: "登録内容サマリー",
            summaryLocation: "活動地域",
            summaryLanguages: "言語",
            summaryCategory: "カテゴリ",
            summarySubCategories: "サブカテゴリ",
            summaryBio: "自己紹介",
            notSet: "未設定",
            none: "なし",
            quickTitle: "まず使う画面",
            quickProfileTitle: "プロフィールを見る",
            quickProfileBody:
              "表示名、写真、SNS情報、登録内容を確認・更新します。",
            quickMenusTitle: "メニューを見る",
            quickMenusBody:
              "公開中メニューの確認、新規追加、編集を行います。",
            quickRequestsTitle: "承認待ち注文・依頼を見る",
            quickRequestsBody:
              "新しく届いた注文・依頼を確認し、承認または却下します。",
            quickJobsTitle: "進行中案件を見る",
            quickJobsBody:
              "進行中・納品済み・完了の案件を確認します。",
            countPending: "承認待ち注文・依頼",
            countAccepted: "進行中案件",
            countDelivered: "納品済み",
            countCompleted: "完了",
            countMenus: "公開中メニュー",
            countMenusHelper: "公開中の件数",
            usageTitle: "現在の利用状況",
            usageProfile: "プロフィール",
            usageReview: "審査状態",
            usageFeature: "案件機能",
            usageMenus: "メニュー公開",
            available: "利用可能",
            limited: "一部制限中",
            noMenus: "未登録",
            recentPendingTitle: "最近の承認待ち注文・依頼",
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
            headerEyebrow: "Creator Dashboard",
            headerBody:
              "Check your signup details, order/request status, and menu status in a cleaner mobile-friendly layout.",
            profileCompleted: "Profile Complete",
            profileIncomplete: "Profile Incomplete",
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
            summaryTitle: "Registration Summary",
            summaryLocation: "Location",
            summaryLanguages: "Languages",
            summaryCategory: "Category",
            summarySubCategories: "Sub-categories",
            summaryBio: "Bio",
            notSet: "Not set",
            none: "None",
            quickTitle: "Primary Screens",
            quickProfileTitle: "View profile",
            quickProfileBody:
              "Review and update your public info, photos, and social accounts.",
            quickMenusTitle: "View menus",
            quickMenusBody:
              "Check your active menus, create new ones, and edit existing ones.",
            quickRequestsTitle: "Check pending orders/requests",
            quickRequestsBody:
              "Review incoming orders and requests and approve or reject them.",
            quickJobsTitle: "Check active jobs",
            quickJobsBody:
              "See jobs that are active, delivered, or completed.",
            countPending: "Pending Orders / Requests",
            countAccepted: "Active Jobs",
            countDelivered: "Delivered",
            countCompleted: "Completed",
            countMenus: "Active Menus",
            countMenusHelper: "Currently public",
            usageTitle: "Current Usage",
            usageProfile: "Profile",
            usageReview: "Review",
            usageFeature: "Job Features",
            usageMenus: "Menu Publishing",
            available: "Available",
            limited: "Partially Limited",
            noMenus: "None",
            recentPendingTitle: "Recent Pending Orders / Requests",
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

        const legacyPendingItems: RecentRequest[] = (
          recentLegacyPendingRows ?? []
        ).map((row) => ({
          kind: "legacy_request",
          id: row.id,
          product_name: row.product_name,
          status: row.status,
          created_at: row.created_at,
        }));

        const orderPendingItems: RecentRequest[] = (
          recentOrderPendingRows ?? []
        ).map((row) => ({
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
          (row) => ({
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
          (row) => ({
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
    return <p className="p-6">{copy.loading}</p>;
  }

  if (errorMsg) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">{copy.genericErrorTitle}</h1>
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      </div>
    );
  }

  if (!gate.isCreator) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">{copy.creatorOnlyTitle}</h1>
        <p className="mt-3 text-sm text-gray-600">{copy.creatorOnlyBody}</p>
      </div>
    );
  }

  const displayName =
    compactText(creator?.display_name) || copy.defaultDisplayName || "creator";

  const fullName =
    compactText(creator?.full_name) ||
    compactText(creator?.display_name) ||
    displayName;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border bg-white shadow-sm">
        <div
          className="relative h-40 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 sm:h-52 lg:h-60"
          style={
            coverImageUrl
              ? {
                  backgroundImage: `url("${coverImageUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="relative px-4 pb-5 sm:px-6">
          <div className="-mt-10 sm:-mt-12">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border-4 border-white bg-gray-100 text-2xl font-bold text-gray-500 shadow-lg sm:h-28 sm:w-28">
                      {creator?.avatar_url ? (
                        <img
                          src={creator.avatar_url}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{fallbackInitial(displayName)}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-blue-600">
                        {copy.headerEyebrow}
                      </p>
                      <h1 className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">
                        @{displayName}
                      </h1>
                      <p className="mt-2 text-sm text-gray-600 sm:text-base">
                        {fullName}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge
                          label={approvalMeta.label}
                          tone={approvalMeta.tone}
                        />
                        <StatusBadge
                          label={
                            gate.creatorProfileCompleted
                              ? copy.profileCompleted
                              : copy.profileIncomplete
                          }
                          tone={gate.creatorProfileCompleted ? "green" : "yellow"}
                        />
                        {creator?.category ? (
                          <StatusBadge label={creator.category} tone="gray" />
                        ) : null}
                        {gate.isSuspended ? (
                          <StatusBadge label={copy.suspended} tone="red" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/creator/profile"
                    className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    {copy.editProfile}
                  </Link>
                  <Link
                    href="/creator/menus"
                    className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    {copy.manageMenus}
                  </Link>
                </div>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-gray-600">
                {copy.headerBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      {!gate.canUsePlatform ? (
        <div className="grid gap-4">
          {gate.isSuspended ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
              <p className="text-lg font-semibold">{copy.suspendedTitle}</p>
              <p className="mt-2 text-sm leading-6">{copy.suspendedBody}</p>
            </div>
          ) : null}

          {gate.creatorApprovalStatus === "pending" ? (
            <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900">
              <p className="text-lg font-semibold">{copy.reviewPendingTitle}</p>
              <p className="mt-2 text-sm leading-6">{copy.reviewPendingBody}</p>
            </div>
          ) : null}

          {!gate.creatorProfileCompleted ? (
            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
              <p className="text-lg font-semibold">{copy.profilePromptTitle}</p>
              <p className="mt-2 text-sm leading-6">{copy.profilePromptBody}</p>
              <Link
                href="/creator/profile"
                className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {copy.goToProfile}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CountCard
          title={copy.countPending}
          value={counts.pendingRequests}
          helper={safeLocale === "ja" ? "承認待ち" : "Pending"}
        />
        <CountCard
          title={copy.countAccepted}
          value={counts.acceptedJobs}
          helper={safeLocale === "ja" ? "進行中" : "Active"}
        />
        <CountCard
          title={copy.countDelivered}
          value={counts.deliveredJobs}
          helper={safeLocale === "ja" ? "納品済み" : "Delivered"}
        />
        <CountCard
          title={copy.countCompleted}
          value={counts.completedJobs}
          helper={safeLocale === "ja" ? "完了" : "Completed"}
        />
        <CountCard
          title={copy.countMenus}
          value={counts.activeMenus}
          helper={copy.countMenusHelper}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">{copy.summaryTitle}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SummaryCard
                label={copy.summaryLocation}
                value={locationSummary}
              />
              <SummaryCard
                label={copy.summaryLanguages}
                value={languageSummary}
              />
              <SummaryCard
                label={copy.summaryCategory}
                value={compactText(creator?.category) || copy.notSet}
              />
              <SummaryCard
                label={copy.summarySubCategories}
                value={subCategorySummary}
              />
              <div className="sm:col-span-2">
                <SummaryCard
                  label={copy.summaryBio}
                  value={compactText(creator?.bio) || copy.notSet}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">{copy.quickTitle}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <QuickLinkCard
                href="/creator/profile"
                title={copy.quickProfileTitle}
                body={copy.quickProfileBody}
              />
              <QuickLinkCard
                href="/creator/menus"
                title={copy.quickMenusTitle}
                body={copy.quickMenusBody}
              />
              <QuickLinkCard
                href="/creator/requests"
                title={copy.quickRequestsTitle}
                body={copy.quickRequestsBody}
              />
              <QuickLinkCard
                href="/creator/jobs"
                title={copy.quickJobsTitle}
                body={copy.quickJobsBody}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">{copy.usageTitle}</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>{copy.usageProfile}</span>
                <StatusBadge
                  label={
                    gate.creatorProfileCompleted
                      ? copy.profileCompleted
                      : copy.profileIncomplete
                  }
                  tone={gate.creatorProfileCompleted ? "green" : "yellow"}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{copy.usageReview}</span>
                <StatusBadge
                  label={approvalMeta.label}
                  tone={approvalMeta.tone}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{copy.usageFeature}</span>
                <StatusBadge
                  label={gate.canUsePlatform ? copy.available : copy.limited}
                  tone={gate.canUsePlatform ? "green" : "yellow"}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{copy.usageMenus}</span>
                <StatusBadge
                  label={counts.activeMenus > 0 ? copy.available : copy.noMenus}
                  tone={counts.activeMenus > 0 ? "green" : "gray"}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{copy.recentPendingTitle}</h2>
              <Link
                href="/creator/requests"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                {copy.viewAll}
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentRequests.length === 0 ? (
                <p className="text-sm text-gray-500">{copy.noPending}</p>
              ) : (
                recentRequests.map((request) => {
                  const badge = getWorkflowBadgeMeta(
                    request.status,
                    safeLocale
                  );

                  return (
                    <Link
                      key={`${request.kind}-${request.id}`}
                      href={
                        request.kind === "order"
                          ? `/creator/orders/${request.id}`
                          : `/creator/requests/${request.id}`
                      }
                      className="block rounded-2xl border p-4 transition hover:bg-gray-50"
                    >
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            request.kind === "order"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {request.kind === "order"
                            ? copy.orderLabel
                            : copy.legacyRequestLabel}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {request.product_name || copy.productUnset}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {copy.createdAt}:{" "}
                        {formatDate(request.created_at, safeLocale)}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{copy.recentJobsTitle}</h2>
              <Link
                href="/creator/jobs"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                {copy.viewAll}
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentJobs.length === 0 ? (
                <p className="text-sm text-gray-500">{copy.noJobs}</p>
              ) : (
                recentJobs.map((job) => {
                  const badge = getWorkflowBadgeMeta(job.status, safeLocale);

                  return (
                    <Link
                      key={`${job.kind}-${job.id}`}
                      href={
                        job.kind === "order"
                          ? `/creator/orders/${job.id}`
                          : `/creator/requests/${job.id}`
                      }
                      className="block rounded-2xl border p-4 transition hover:bg-gray-50"
                    >
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            job.kind === "order"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {job.kind === "order"
                            ? copy.orderLabel
                            : copy.legacyRequestLabel}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {job.product_name || copy.productUnset}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {copy.updatedAt}:{" "}
                        {formatDate(job.updated_at || job.created_at, safeLocale)}
                      </p>
                      {job.delivered_post_url ? (
                        <p className="mt-1 text-xs text-green-700">
                          {copy.deliveredUrl}
                        </p>
                      ) : null}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}