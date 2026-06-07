// File: app/notifications/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

function formatDateTime(value: string, locale: "ja" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationIcon({ unread }: { unread: boolean }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
        unread
          ? "bg-rose-50 text-[#ff5f67] ring-1 ring-rose-100"
          : "bg-slate-50 text-slate-400 ring-1 ring-slate-100"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8.5a6 6 0 0 0-12 0c0 7-3 7-3 8.7h18c0-1.7-3-1.7-3-8.7Z" />
        <path d="M9.8 20a2.4 2.4 0 0 0 4.4 0" />
      </svg>
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
            title: "通知",
            subtitle: "注文・メッセージ・納品などの更新を確認できます。",
            loading: "読み込み中...",
            loginRequired: "ログインが必要です。",
            login: "ログインへ",
            unreadOnly: "未読のみ",
            showAll: "すべて表示",
            empty: "通知はありません。",
            open: "開く",
            markRead: "既読にする",
            read: "既読",
            unread: "未読",
            loadFailed: "通知の取得に失敗しました。",
            readFailed: "既読処理に失敗しました。",
          }
        : {
            title: "Notifications",
            subtitle: "Check updates for orders, messages, and deliveries.",
            loading: "Loading...",
            loginRequired: "Login required.",
            login: "Go to login",
            unreadOnly: "Unread only",
            showAll: "Show all",
            empty: "No notifications.",
            open: "Open",
            markRead: "Mark as read",
            read: "Read",
            unread: "Unread",
            loadFailed: "Failed to load notifications.",
            readFailed: "Failed to mark as read.",
          },
    [safeLocale]
  );

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
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

      searchParams.set("limit", "50");

      if (unreadOnly) {
        searchParams.set("unread", "1");
      }

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
  }, [copy.loadFailed, getAccessToken, unreadOnly]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-32 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
          <div className="h-24 animate-pulse rounded-[26px] bg-white ring-1 ring-slate-100" />
          <div className="h-24 animate-pulse rounded-[26px] bg-white ring-1 ring-slate-100" />
        </div>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
          <h1 className="text-[26px] font-black tracking-[-0.05em] text-slate-950">
            {copy.loginRequired}
          </h1>

          <Link
            href="/login"
            className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            {copy.login}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <section className="overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5f67]">
                Trendre
              </p>
              <h1 className="mt-2 text-[30px] font-black tracking-[-0.06em] text-slate-950">
                {copy.title}
              </h1>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                {copy.subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setUnreadOnly((value) => !value)}
              className={`w-fit rounded-full px-4 py-2 text-xs font-black ring-1 transition ${
                unreadOnly
                  ? "bg-[#ff5f67] text-white ring-[#ff5f67]"
                  : "bg-slate-50 text-slate-600 ring-slate-100"
              }`}
            >
              {unreadOnly ? copy.showAll : copy.unreadOnly}
            </button>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        <section className="mt-4 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-[28px] bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
              {copy.empty}
            </div>
          ) : (
            items.map((item) => {
              const unread = !item.read_at;

              return (
                <article
                  key={item.id}
                  className={`rounded-[28px] bg-white p-4 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 transition ${
                    unread ? "ring-rose-100" : "ring-slate-100 opacity-80"
                  }`}
                >
                  <div className="flex gap-4">
                    <NotificationIcon unread={unread} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            unread
                              ? "bg-rose-50 text-[#ff5f67]"
                              : "bg-slate-50 text-slate-400"
                          }`}
                        >
                          {unread ? copy.unread : copy.read}
                        </span>

                        <span className="text-xs font-semibold text-slate-400">
                          {formatDateTime(item.created_at, safeLocale)}
                        </span>
                      </div>

                      <h2 className="mt-2 break-words text-base font-black text-slate-950">
                        {item.title}
                      </h2>

                      {item.body ? (
                        <p className="mt-1 whitespace-pre-line break-words text-sm font-semibold leading-7 text-slate-500">
                          {item.body}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.link_path ? (
                          <button
                            type="button"
                            onClick={() => void openNotification(item)}
                            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition active:scale-[0.98]"
                          >
                            {copy.open}
                          </button>
                        ) : null}

                        {unread ? (
                          <button
                            type="button"
                            onClick={() => void markAsRead(item.id)}
                            className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100 transition active:scale-[0.98]"
                          >
                            {copy.markRead}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}