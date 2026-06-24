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
  key: string,
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
              ? "内容を確認して、受けるか判断できます。"
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
              ? "クリエイターが商品を受け取りました。"
              : `${orderLabel}の商品がクリエイターに届きました。`,
        };

      case "materials_confirmed":
        return {
          title: "素材・投稿情報が確認されました",
          body:
            orderLabel === "注文"
              ? "素材・投稿情報が確認されました。"
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

    case "order_declined":
      return {
        title: `${creatorName} declined the order`,
        body:
          orderLabel === "Order"
            ? "The order was canceled."
            : `${orderLabel} was canceled.`,
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
            ? "Materials were confirmed."
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

function formatRelativeTime(value: string, locale: "ja" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfTarget.getTime()) / 86400000,
  );

  if (diffDays <= 0) {
    return date.toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (diffDays === 1) {
    return locale === "ja" ? "昨日" : "Yesterday";
  }

  if (diffDays <= 6) {
    return locale === "ja" ? `${diffDays}日前` : `${diffDays}d ago`;
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
      month: "numeric",
      day: "numeric",
    });
  }

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyBellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
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

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-12 items-center justify-center gap-2 border-b-2 px-3 text-[14px] font-semibold transition ${
        active
          ? "border-[#ff3860] text-slate-950"
          : "border-transparent text-slate-400"
      }`}
    >
      <span>{label}</span>
      {count > 0 ? (
        <span
          className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
            active
              ? "bg-gradient-to-br from-[#ff5f67] to-[#ff3860] text-white shadow-[0_5px_14px_rgba(255,56,96,0.22)]"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[360px] items-center justify-center px-6 py-16 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-slate-300 ring-1 ring-slate-100">
          <EmptyBellIcon />
        </div>
        <p className="mt-5 text-[16px] font-semibold tracking-[-0.035em] text-slate-900">
          {title}
        </p>
        <p className="mx-auto mt-2 max-w-[280px] text-[13px] font-medium leading-6 text-slate-500">
          {body}
        </p>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <section className="px-4 py-4">
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-[22px] bg-white px-4 py-4 ring-1 ring-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-4 w-8/12 rounded-full bg-slate-100" />
                <div className="h-3 w-11/12 rounded-full bg-slate-100" />
                <div className="h-3 w-20 rounded-full bg-slate-100" />
              </div>
              <div className="h-3 w-9 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotificationItem({
  item,
  locale,
  unreadLabel,
  importantLabel,
  onOpen,
}: {
  item: NotificationRow;
  locale: "ja" | "en";
  unreadLabel: string;
  importantLabel: string;
  onOpen: (item: NotificationRow) => void;
}) {
  const unread = !item.read_at;
  const display = getNotificationText(item, locale);
  const timeText = formatRelativeTime(item.created_at, locale);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`relative w-full rounded-[22px] bg-white px-4 py-4 text-left ring-1 transition active:scale-[0.99] ${
        unread
          ? "ring-rose-100 shadow-[0_10px_30px_rgba(255,56,96,0.06)]"
          : "ring-slate-100"
      }`}
    >
      {unread ? (
        <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#ff5f67] to-[#ff3860]" />
      ) : null}

      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {unread ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-[#ff3860] ring-1 ring-rose-100">
                {unreadLabel}
              </span>
            ) : null}

            {item.importance === "high" ? (
              <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-white">
                {importantLabel}
              </span>
            ) : null}
          </div>

          <p
            className={`mt-1.5 break-words text-[15px] leading-6 tracking-[-0.025em] ${
              unread
                ? "font-semibold text-slate-950"
                : "font-medium text-slate-800"
            }`}
          >
            {display.title}
          </p>

          {display.body ? (
            <p className="mt-1 line-clamp-2 break-words text-[13px] font-medium leading-6 text-slate-500">
              {display.body}
            </p>
          ) : null}

          <p className="mt-2 text-[11px] font-medium text-slate-400">
            {timeText}
          </p>
        </div>

        <span className="mt-5 shrink-0 text-slate-300">
          <ChevronIcon />
        </span>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "通知",
            subtitle: "注文・メッセージ・お知らせを確認できます。",
            direct: "あなた",
            news: "お知らせ",
            unread: "未読",
            important: "重要",
            loading: "読み込み中...",
            loginRequired: "ログインが必要です",
            loginBody: "通知を確認するにはログインしてください。",
            directEmpty: "あなた宛の通知はありません",
            directEmptyBody: "注文・メッセージ・納品などの通知がここに表示されます。",
            newsEmpty: "お知らせはありません",
            newsEmptyBody: "Trendreからのお知らせや重要な案内がここに表示されます。",
            loadFailed: "通知の取得に失敗しました。",
            readFailed: "既読処理に失敗しました。",
            login: "ログイン",
          }
        : {
            title: "Notifications",
            subtitle: "Check orders, messages, and updates.",
            direct: "For you",
            news: "News",
            unread: "Unread",
            important: "Important",
            loading: "Loading...",
            loginRequired: "Login required",
            loginBody: "Please log in to view notifications.",
            directEmpty: "No notifications for you",
            directEmptyBody:
              "Order, message, and delivery updates will appear here.",
            newsEmpty: "No news",
            newsEmptyBody:
              "Important updates and announcements from Trendre will appear here.",
            loadFailed: "Failed to load notifications.",
            readFailed: "Failed to mark as read.",
            login: "Login",
          },
    [safeLocale],
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
          },
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
    [items],
  );

  const newsItems = useMemo(
    () => items.filter((item) => isNewsNotification(item)),
    [items],
  );

  const directUnreadCount = useMemo(
    () => directItems.filter((item) => !item.read_at).length,
    [directItems],
  );

  const newsUnreadCount = useMemo(
    () => newsItems.filter((item) => !item.read_at).length,
    [newsItems],
  );

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
            : item,
        ),
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
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9fb] text-slate-950">
      <div className="mx-auto min-h-screen w-full max-w-[760px] px-4 pb-8 pt-4">
        <header className="sticky top-0 z-20 -mx-4 bg-[#f8f9fb]/95 px-4 pb-2 pt-1 backdrop-blur-xl">
          <div className="relative flex min-h-[58px] items-center justify-center">
            <button
              type="button"
              onClick={handleBack}
              className="absolute left-0 top-2 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-800 ring-1 ring-slate-100 transition active:scale-95"
              aria-label="back"
            >
              <BackIcon />
            </button>

            <div className="px-12 text-center">
              <h1 className="text-[22px] font-semibold tracking-[-0.045em] text-slate-950">
                {copy.title}
              </h1>
              <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 border-b border-slate-200/80">
            <TabButton
              active={activeTab === "direct"}
              label={copy.direct}
              count={directUnreadCount}
              onClick={() => setActiveTab("direct")}
            />
            <TabButton
              active={activeTab === "news"}
              label={copy.news}
              count={newsUnreadCount}
              onClick={() => setActiveTab("news")}
            />
          </div>
        </header>

        {loading ? (
          <SkeletonList />
        ) : !loggedIn ? (
          <section className="px-6 py-20 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-slate-300 ring-1 ring-slate-100">
              <EmptyBellIcon />
            </div>

            <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
              {copy.loginRequired}
            </h2>

            <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
              {copy.loginBody}
            </p>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
            >
              {copy.login}
            </button>
          </section>
        ) : (
          <section className="pt-3">
            {error ? (
              <div className="mb-3 rounded-[20px] bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700 ring-1 ring-rose-100">
                {error}
              </div>
            ) : null}

            {currentItems.length === 0 ? (
              <EmptyState
                title={activeTab === "direct" ? copy.directEmpty : copy.newsEmpty}
                body={
                  activeTab === "direct"
                    ? copy.directEmptyBody
                    : copy.newsEmptyBody
                }
              />
            ) : (
              <div className="space-y-2.5">
                {currentItems.map((item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                    locale={safeLocale}
                    unreadLabel={copy.unread}
                    importantLabel={copy.important}
                    onOpen={(target) => void openNotification(target)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
