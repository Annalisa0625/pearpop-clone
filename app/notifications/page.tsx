// File: app/notifications/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  notification_type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  entity_type: string | null;
  entity_id: string | null;
  order_id: string | null;
  chat_id: string | null;
  message_id: string | null;
  importance: "low" | "normal" | "high";
  read_at: string | null;
  archived_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type NotificationTab = "direct" | "news";
type VisualTone = "rose" | "amber" | "emerald" | "sky" | "slate";

const NEWS_TYPES = new Set([
  "news",
  "service_news",
  "service_announcement",
  "system_announcement",
  "announcement",
  "admin_notice",
]);

function getMetadataString(
  metadata: Record<string, unknown> | null,
  key: string
) {
  const value = metadata?.[key];

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function isNewsNotification(item: NotificationRow) {
  const category = getMetadataString(item.metadata, "category").toLowerCase();

  return (
    NEWS_TYPES.has(item.notification_type) ||
    category === "news" ||
    category === "service" ||
    category === "system" ||
    category === "announcement"
  );
}

function getOrderLabel(item: NotificationRow, locale: "ja" | "en") {
  const productName = getMetadataString(item.metadata, "product_name");
  const menuTitle = getMetadataString(item.metadata, "menu_title");

  if (productName) return productName;
  if (menuTitle) return menuTitle;

  return locale === "ja" ? "注文" : "Order";
}

function getCreatorName(item: NotificationRow, locale: "ja" | "en") {
  return (
    getMetadataString(item.metadata, "creator_name") ||
    (locale === "ja" ? "クリエイター" : "Creator")
  );
}

function getCompanyName(item: NotificationRow, locale: "ja" | "en") {
  return (
    getMetadataString(item.metadata, "company_name") ||
    (locale === "ja" ? "依頼元" : "Client")
  );
}

function getNotificationText(item: NotificationRow, locale: "ja" | "en") {
  const orderLabel = getOrderLabel(item, locale);
  const creatorName = getCreatorName(item, locale);
  const companyName = getCompanyName(item, locale);
  const carrier = getMetadataString(item.metadata, "shipping_carrier");
  const tracking = getMetadataString(item.metadata, "shipping_tracking_number");

  if (locale === "ja") {
    switch (item.notification_type) {
      case "new_order":
        return {
          title: `${companyName}から新しい注文が届きました`,
          body:
            orderLabel === "注文"
              ? "内容を確認して、受けるか相談してください。"
              : `${orderLabel}の内容を確認してください。`,
        };

      case "order_accepted":
        return {
          title: `${creatorName}が注文を受けました`,
          body:
            orderLabel === "注文"
              ? "注文が進行中になりました。"
              : `${orderLabel}の注文が進行中になりました。`,
        };

      case "order_declined":
        return {
          title: `${creatorName}が注文を辞退しました`,
          body:
            orderLabel === "注文"
              ? "注文はキャンセルされました。"
              : `${orderLabel}の注文はキャンセルされました。`,
        };

      case "shipping_address_shared":
        return {
          title: "配送先が共有されました",
          body:
            orderLabel === "注文"
              ? "商品発送に必要な配送先を確認できます。"
              : `${orderLabel}の商品発送に必要な配送先を確認できます。`,
        };

      case "product_shipped":
        return {
          title: "商品が発送されました",
          body:
            carrier && tracking
              ? `配送会社：${carrier} / 追跡番号：${tracking}`
              : carrier
                ? `配送会社：${carrier}`
                : tracking
                  ? `追跡番号：${tracking}`
                  : "発送情報を確認できます。",
        };

      case "product_received":
        return {
          title: "商品が受け取られました",
          body:
            orderLabel === "注文"
              ? "インフルエンサーが商品を受け取りました。"
              : `${orderLabel}の商品がインフルエンサーに届きました。`,
        };

      case "materials_confirmed":
        return {
          title: "素材・投稿情報が確認されました",
          body:
            orderLabel === "注文"
              ? "インフルエンサーが素材・投稿情報を確認しました。"
              : `${orderLabel}の素材・投稿情報が確認されました。`,
        };

      case "order_delivered":
        return {
          title: "納品が届きました",
          body:
            orderLabel === "注文"
              ? "確認用URLが届いています。"
              : `${orderLabel}の確認用URLが届いています。`,
        };

      case "revision_requested":
        return {
          title: "修正依頼が届きました",
          body:
            orderLabel === "注文"
              ? "内容を確認して、修正版を送ってください。"
              : `${orderLabel}の修正内容を確認してください。`,
        };

      case "order_completed":
        return {
          title: "注文が完了しました",
          body:
            orderLabel === "注文"
              ? "納品が承認されました。報酬状況を確認できます。"
              : `${orderLabel}の納品が承認されました。`,
        };

      case "message_received":
        return {
          title: "新しいメッセージが届きました",
          body: item.body || "チャットを確認してください。",
        };

      case "admin_notice":
        return {
          title: item.title || "Trendreからのお知らせ",
          body: item.body || "重要なお知らせがあります。",
        };

      default:
        return {
          title: item.title,
          body: item.body || "",
        };
    }
  }

  switch (item.notification_type) {
    case "new_order":
      return {
        title: `New order from ${companyName}`,
        body:
          orderLabel === "Order"
            ? "Review the order details."
            : `Review ${orderLabel}.`,
      };

    case "order_accepted":
      return {
        title: `${creatorName} accepted the order`,
        body:
          orderLabel === "Order"
            ? "The order is now in progress."
            : `${orderLabel} is now in progress.`,
      };

    case "shipping_address_shared":
      return {
        title: "Delivery address shared",
        body:
          orderLabel === "Order"
            ? "The delivery address is ready to review."
            : `Review the delivery address for ${orderLabel}.`,
      };

    case "product_shipped":
      return {
        title: "Product shipped",
        body:
          carrier && tracking
            ? `Carrier: ${carrier} / Tracking: ${tracking}`
            : carrier
              ? `Carrier: ${carrier}`
              : tracking
                ? `Tracking: ${tracking}`
                : "Shipment details are available.",
      };

    case "product_received":
      return {
        title: "Product received",
        body:
          orderLabel === "Order"
            ? "The creator received the product."
            : `The product for ${orderLabel} was received.`,
      };

    case "materials_confirmed":
      return {
        title: "Materials confirmed",
        body:
          orderLabel === "Order"
            ? "The creator confirmed the materials."
            : `Materials for ${orderLabel} were confirmed.`,
      };

    case "order_delivered":
      return {
        title: "Delivery submitted",
        body:
          orderLabel === "Order"
            ? "A review URL has been submitted."
            : `A review URL for ${orderLabel} has been submitted.`,
      };

    case "revision_requested":
      return {
        title: "Revision requested",
        body:
          orderLabel === "Order"
            ? "Review the requested changes."
            : `Review the changes for ${orderLabel}.`,
      };

    case "order_completed":
      return {
        title: "Order completed",
        body:
          orderLabel === "Order"
            ? "The delivery was approved."
            : `${orderLabel} was approved.`,
      };

    case "message_received":
      return {
        title: "New message",
        body: item.body || "Open the chat to check it.",
      };

    default:
      return {
        title: item.title,
        body: item.body || "",
      };
  }
}

function getVisualTone(item: NotificationRow, news: boolean): VisualTone {
  if (news) return "emerald";

  if (item.importance === "high") return "rose";

  switch (item.notification_type) {
    case "new_order":
    case "order_delivered":
    case "revision_requested":
      return "rose";

    case "shipping_address_shared":
    case "product_shipped":
    case "product_received":
    case "materials_confirmed":
      return "amber";

    case "order_accepted":
    case "order_completed":
      return "emerald";

    case "message_received":
      return "sky";

    default:
      return "slate";
  }
}

function getToneClass(tone: VisualTone) {
  switch (tone) {
    case "rose":
      return "bg-rose-50 text-[#ff3b5c] ring-rose-100";
    case "amber":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "emerald":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "sky":
      return "bg-sky-50 text-sky-600 ring-sky-100";
    default:
      return "bg-slate-50 text-slate-500 ring-slate-100";
  }
}

function formatRelativeTime(value: string, locale: "ja" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (locale === "ja") {
    if (diffMinutes < 1) return "たった今";
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 30) return `${diffDays}日前`;

    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
    });
  }

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellMiniIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 8.5a6 6 0 0 0-12 0c0 7-3 7-3 8.7h18c0-1.7-3-1.7-3-8.7Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.8 20a2.4 2.4 0 0 0 4.4 0"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageMiniIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5A3.5 3.5 0 0 1 8.5 4h7A3.5 3.5 0 0 1 19 7.5v5A3.5 3.5 0 0 1 15.5 16H11l-5 4v-4.5A3.5 3.5 0 0 1 5 12V7.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PackageMiniIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 8.2 12 4.5l7 3.7v7.1l-7 4.2-7-4.2V8.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 8.5 12 12l6.5-3.5M12 12v7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckMiniIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 12 4.2 4.2L19 6.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertMiniIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 8v5M12 17h.01M10.3 4.7 3.8 17a2 2 0 0 0 1.8 3h12.8a2 2 0 0 0 1.8-3L13.7 4.7a1.9 1.9 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ServiceMiniIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 7.5A3.5 3.5 0 0 1 9.5 4h5A3.5 3.5 0 0 1 18 7.5v9A3.5 3.5 0 0 1 14.5 20h-5A3.5 3.5 0 0 1 6 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9 8h6M9 12h6M9 16h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NotificationIcon({
  item,
  news,
}: {
  item: NotificationRow;
  news: boolean;
}) {
  switch (item.notification_type) {
    case "message_received":
      return <MessageMiniIcon />;

    case "shipping_address_shared":
    case "product_shipped":
    case "product_received":
      return <PackageMiniIcon />;

    case "order_accepted":
    case "order_completed":
    case "materials_confirmed":
      return <CheckMiniIcon />;

    case "revision_requested":
    case "order_delivered":
    case "new_order":
      return <AlertMiniIcon />;

    default:
      return news ? <ServiceMiniIcon /> : <BellMiniIcon />;
  }
}

function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center px-8 py-16 text-center">
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
          <BellMiniIcon />
        </div>
        <p className="mt-5 text-base font-black text-slate-800">{title}</p>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-400">
          {body}
        </p>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <section className="px-4 py-5">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex animate-pulse gap-4 rounded-[24px] bg-white p-4 ring-1 ring-slate-100"
          >
            <div className="h-12 w-12 shrink-0 rounded-[18px] bg-slate-100" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-10/12 rounded-full bg-slate-100" />
              <div className="h-4 w-8/12 rounded-full bg-slate-100" />
              <div className="h-3 w-20 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "通知",
            subtitle: "注文・メッセージ・大切なお知らせを確認できます。",
            direct: "あなた宛",
            news: "お知らせ",
            unread: "未読",
            all: "すべて",
            important: "重要",
            loading: "読み込み中...",
            loginRequired: "ログインが必要です。",
            loginBody: "通知を確認するにはログインしてください。",
            directEmpty: "あなた宛の通知はありません。",
            directEmptyBody: "注文・メッセージ・納品などの通知がここに表示されます。",
            newsEmpty: "お知らせはありません。",
            newsEmptyBody: "Trendreからのお知らせや重要な案内がここに表示されます。",
            loadFailed: "通知の取得に失敗しました。",
            readFailed: "既読処理に失敗しました。",
            login: "ログイン",
          }
        : {
            title: "Notifications",
            subtitle: "Check orders, messages, and important updates.",
            direct: "For you",
            news: "News",
            unread: "Unread",
            all: "All",
            important: "Important",
            loading: "Loading...",
            loginRequired: "Login required.",
            loginBody: "Please log in to view notifications.",
            directEmpty: "No notifications for you.",
            directEmptyBody:
              "Order, message, and delivery updates will appear here.",
            newsEmpty: "No news.",
            newsEmptyBody:
              "Important updates and announcements from Trendre will appear here.",
            loadFailed: "Failed to load notifications.",
            readFailed: "Failed to mark as read.",
            login: "Login",
          },
    [safeLocale]
  );

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationTab>("direct");
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  }, [supabase]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        setLoggedIn(false);
        setItems([]);
        setLoading(false);
        return;
      }

      setLoggedIn(true);

      const searchParams = new URLSearchParams();
      searchParams.set("limit", "80");

      const res = await fetch(`/api/notifications?${searchParams.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? copy.loadFailed);
      }

      setItems((json?.notifications ?? []) as NotificationRow[]);
    } catch (error) {
      console.error("notifications page load error:", error);
      setError(error instanceof Error ? error.message : copy.loadFailed);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, getAccessToken]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user?.id) return;

      channel = supabase
        .channel(`notifications-page-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_user_id=eq.${user.id}`,
          },
          () => {
            void loadNotifications();
          }
        )
        .subscribe();
    };

    void setupRealtime();

    const onFocus = () => {
      void loadNotifications();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("trendre:notification-changed", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }

      window.removeEventListener("focus", onFocus);
      window.removeEventListener("trendre:notification-changed", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadNotifications, supabase]);

  const directItems = useMemo(
    () => items.filter((item) => !isNewsNotification(item)),
    [items]
  );

  const newsItems = useMemo(
    () => items.filter((item) => isNewsNotification(item)),
    [items]
  );

  const directUnreadCount = useMemo(
    () => directItems.filter((item) => !item.read_at).length,
    [directItems]
  );

  const newsUnreadCount = useMemo(
    () => newsItems.filter((item) => !item.read_at).length,
    [newsItems]
  );

  const totalUnreadCount = directUnreadCount + newsUnreadCount;
  const currentItems = activeTab === "direct" ? directItems : newsItems;

  const markAsRead = async (id: string) => {
    try {
      const token = await getAccessToken();

      if (!token) {
        setLoggedIn(false);
        return false;
      }

      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? copy.readFailed);
      }

      const now = new Date().toISOString();

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                read_at: item.read_at ?? now,
              }
            : item
        )
      );

      window.dispatchEvent(new Event("trendre:notification-changed"));

      return true;
    } catch (error) {
      console.error("notification mark read error:", error);
      setError(error instanceof Error ? error.message : copy.readFailed);
      return false;
    }
  };

  const openNotification = async (item: NotificationRow) => {
    if (!item.read_at) {
      await markAsRead(item.id);
    }

    if (item.link_path) {
      router.push(item.link_path);
    }
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8F9FA] text-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-rose-100/60 blur-3xl" />
        <div className="absolute -right-24 top-48 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-[820px] px-3 py-3 sm:px-5 sm:py-8">
        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
            <div className="relative px-5 pb-4 pt-5">
              <button
                type="button"
                onClick={handleBack}
                className="absolute left-4 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-900 ring-1 ring-slate-100 transition hover:bg-slate-100 active:scale-95"
                aria-label="back"
              >
                <BackIcon />
              </button>

              <div className="px-12 text-center">
                <h1 className="text-[25px] font-black tracking-[-0.055em] text-slate-950">
                  {copy.title}
                </h1>
                <p className="mx-auto mt-1 max-w-[360px] text-xs font-bold leading-5 text-slate-400">
                  {copy.subtitle}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <p className="text-[11px] font-black text-slate-400">
                    {copy.unread}
                  </p>
                  <p className="mt-1 text-[24px] font-black tracking-[-0.06em] text-slate-950">
                    {totalUnreadCount}
                    <span className="ml-1 text-sm tracking-normal text-slate-400">
                      件
                    </span>
                  </p>
                </div>

                <div className="rounded-[22px] bg-rose-50/70 px-4 py-3 ring-1 ring-rose-100">
                  <p className="text-[11px] font-black text-rose-400">
                    {copy.all}
                  </p>
                  <p className="mt-1 text-[24px] font-black tracking-[-0.06em] text-slate-950">
                    {items.length}
                    <span className="ml-1 text-sm tracking-normal text-slate-400">
                      件
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setActiveTab("direct")}
                className={`relative flex h-[58px] items-center justify-center text-sm font-black transition ${
                  activeTab === "direct"
                    ? "text-[#ff3b5c]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="relative inline-flex items-center gap-2">
                  {copy.direct}

                  {directUnreadCount > 0 ? (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3b5c] px-[5px] text-[10px] font-black leading-none text-white">
                      {directUnreadCount > 99 ? "99+" : directUnreadCount}
                    </span>
                  ) : null}
                </span>

                {activeTab === "direct" ? (
                  <span className="absolute bottom-0 left-4 right-4 h-[4px] rounded-full bg-[#ff3b5c]" />
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("news")}
                className={`relative flex h-[58px] items-center justify-center text-sm font-black transition ${
                  activeTab === "news"
                    ? "text-[#ff3b5c]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="relative inline-flex items-center gap-2">
                  {copy.news}

                  {newsUnreadCount > 0 ? (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3b5c] px-[5px] text-[10px] font-black leading-none text-white">
                      {newsUnreadCount > 99 ? "99+" : newsUnreadCount}
                    </span>
                  ) : null}
                </span>

                {activeTab === "news" ? (
                  <span className="absolute bottom-0 left-4 right-4 h-[4px] rounded-full bg-[#ff3b5c]" />
                ) : null}
              </button>
            </div>
          </header>

          {loading ? (
            <SkeletonList />
          ) : !loggedIn ? (
            <section className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                <BellMiniIcon />
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950">
                {copy.loginRequired}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-7 text-slate-400">
                {copy.loginBody}
              </p>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white"
              >
                {copy.login}
              </button>
            </section>
          ) : (
            <section className="min-h-[420px] bg-slate-50/60 px-3 py-3 sm:px-4 sm:py-4">
              {error ? (
                <div className="mb-3 rounded-[22px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
                  {error}
                </div>
              ) : null}

              {currentItems.length === 0 ? (
                <div className="rounded-[28px] bg-white ring-1 ring-slate-100">
                  <EmptyState
                    title={
                      activeTab === "direct" ? copy.directEmpty : copy.newsEmpty
                    }
                    body={
                      activeTab === "direct"
                        ? copy.directEmptyBody
                        : copy.newsEmptyBody
                    }
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {currentItems.map((item) => {
                    const unread = !item.read_at;
                    const news = isNewsNotification(item);
                    const tone = getVisualTone(item, news);
                    const display = getNotificationText(item, safeLocale);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void openNotification(item)}
                        className={`group flex w-full gap-3 rounded-[26px] bg-white p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.035)] ring-1 transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.06)] active:scale-[0.99] ${
                          unread
                            ? "ring-rose-100"
                            : "ring-slate-100 hover:ring-slate-200"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div
                            className={`flex h-[52px] w-[52px] items-center justify-center rounded-[20px] ring-1 ${getToneClass(
                              tone
                            )}`}
                          >
                            <NotificationIcon item={item} news={news} />
                          </div>

                          {unread ? (
                            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-[#ff3b5c] ring-[3px] ring-white" />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {unread ? (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-[#ff3b5c] ring-1 ring-rose-100">
                                {copy.unread}
                              </span>
                            ) : null}

                            {item.importance === "high" ? (
                              <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-black text-white">
                                {copy.important}
                              </span>
                            ) : null}
                          </div>

                          <p
                            className={`mt-1 break-words text-[15px] leading-6 tracking-[-0.02em] ${
                              unread
                                ? "font-black text-slate-950"
                                : "font-bold text-slate-700"
                            }`}
                          >
                            {display.title}
                          </p>

                          {display.body ? (
                            <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-500">
                              {display.body}
                            </p>
                          ) : null}

                          <p className="mt-2 text-xs font-black text-slate-400">
                            {formatRelativeTime(item.created_at, safeLocale)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center text-slate-300 transition group-hover:text-slate-500">
                          <ChevronIcon />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}