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
  key: string
) {
  const value = metadata?.[key];

  if (typeof value === "string") {
    return value;
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
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
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

function BellMiniIcon({ news }: { news: boolean }) {
  if (news) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
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

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
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
          <BellMiniIcon news={false} />
        </div>
        <p className="mt-5 text-base font-black text-slate-800">{title}</p>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-400">
          {body}
        </p>
      </div>
    </div>
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
            title: "お知らせ",
            direct: "あなた宛",
            news: "お知らせ",
            loading: "読み込み中...",
            loginRequired: "ログインが必要です。",
            loginBody: "通知を確認するにはログインしてください。",
            directEmpty: "あなた宛の通知はありません。",
            directEmptyBody: "注文・メッセージ・納品などの通知がここに表示されます。",
            newsEmpty: "お知らせはありません。",
            newsEmptyBody: "Trendreからのお知らせや重要な案内がここに表示されます。",
            loadFailed: "通知の取得に失敗しました。",
            readFailed: "既読処理に失敗しました。",
          }
        : {
            title: "Notifications",
            direct: "For you",
            news: "News",
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

    router.push("/home");
  };

  return (
    <main className="min-h-screen bg-white text-slate-950 sm:bg-[#F8F9FA]">
      <div className="mx-auto min-h-screen w-full max-w-[760px] bg-white sm:my-8 sm:min-h-[calc(100vh-64px)] sm:overflow-hidden sm:rounded-[34px] sm:shadow-[0_22px_70px_rgba(15,23,42,0.08)] sm:ring-1 sm:ring-slate-100">
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
          <div className="relative flex h-[72px] items-center justify-center px-4">
            <button
              type="button"
              onClick={handleBack}
              className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full text-slate-900 transition hover:bg-slate-50 active:scale-95"
              aria-label="back"
            >
              <BackIcon />
            </button>

            <h1 className="text-[26px] font-black tracking-[-0.055em] text-slate-950">
              {copy.title}
            </h1>
          </div>

          <div className="grid grid-cols-2 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setActiveTab("direct")}
              className={`relative flex h-[58px] items-center justify-center text-base font-black transition ${
                activeTab === "direct"
                  ? "text-[#ff3b5c]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="relative">
                {copy.direct}

                {directUnreadCount > 0 ? (
                  <span className="absolute -right-3 -top-1 h-2.5 w-2.5 rounded-full bg-[#ff3b5c] ring-2 ring-white" />
                ) : null}
              </span>

              {activeTab === "direct" ? (
                <span className="absolute bottom-0 left-0 h-[4px] w-full rounded-full bg-[#ff3b5c]" />
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("news")}
              className={`relative flex h-[58px] items-center justify-center text-base font-black transition ${
                activeTab === "news"
                  ? "text-[#ff3b5c]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="relative">
                {copy.news}

                {newsUnreadCount > 0 ? (
                  <span className="absolute -right-3 -top-1 h-2.5 w-2.5 rounded-full bg-[#ff3b5c] ring-2 ring-white" />
                ) : null}
              </span>

              {activeTab === "news" ? (
                <span className="absolute bottom-0 left-0 h-[4px] w-full rounded-full bg-[#ff3b5c]" />
              ) : null}
            </button>
          </div>
        </header>

        {loading ? (
          <section className="px-4 py-5">
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex animate-pulse gap-4 border-b border-slate-100 px-1 py-5"
                >
                  <div className="h-14 w-14 shrink-0 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-11/12 rounded-full bg-slate-100" />
                    <div className="h-4 w-8/12 rounded-full bg-slate-100" />
                    <div className="h-3 w-20 rounded-full bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : !loggedIn ? (
          <section className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
              <BellMiniIcon news={false} />
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
              Login
            </button>
          </section>
        ) : (
          <section>
            {error ? (
              <div className="mx-4 mt-4 rounded-[22px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
                {error}
              </div>
            ) : null}

            {currentItems.length === 0 ? (
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
            ) : (
              <div className="divide-y divide-slate-100">
                {currentItems.map((item) => {
                  const unread = !item.read_at;
                  const news = isNewsNotification(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void openNotification(item)}
                      className="flex w-full gap-4 bg-white px-5 py-5 text-left transition hover:bg-slate-50 active:bg-slate-50"
                    >
                      <div className="relative shrink-0">
                        <div
                          className={`flex h-[58px] w-[58px] items-center justify-center rounded-full ring-1 ${
                            news
                              ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                              : "bg-rose-50 text-[#ff3b5c] ring-rose-100"
                          }`}
                        >
                          <BellMiniIcon news={news} />
                        </div>

                        {unread ? (
                          <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-sky-400 ring-[3px] ring-white" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <p
                          className={`break-words text-[15px] leading-6 ${
                            unread
                              ? "font-black text-slate-950"
                              : "font-bold text-slate-700"
                          }`}
                        >
                          {item.title}
                        </p>

                        {item.body ? (
                          <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-500">
                            {item.body}
                          </p>
                        ) : null}

                        <p className="mt-1 text-sm font-semibold text-slate-400">
                          {formatRelativeTime(item.created_at, safeLocale)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center text-slate-400">
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
    </main>
  );
}