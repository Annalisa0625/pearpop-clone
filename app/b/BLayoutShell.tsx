// File: app/b/BLayoutShell.tsx
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCommonText } from "@/lib/i18n/common";
import { useAppLocale } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/types";

type NavBadgeKey = "requests" | "jobs";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  badgeKey?: NavBadgeKey;
};

type ChatReadRow = {
  user_id: string;
  last_read_at: string | null;
};

type ChatRow = {
  id: string;
  request_id?: string | null;
  order_id?: string | null;
  last_message_at: string | null;
  chat_reads?: ChatReadRow[] | ChatReadRow | null;
};

type UnreadState = {
  requests: boolean;
  jobs: boolean;
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/b/dashboard") {
    return pathname === "/b" || pathname === "/b/dashboard";
  }
  return pathname.startsWith(href);
}

function getChatReads(chat: ChatRow) {
  if (!chat.chat_reads) return [];
  if (Array.isArray(chat.chat_reads)) return chat.chat_reads;
  return [chat.chat_reads];
}

function isUnreadChat(chat: ChatRow, userId: string) {
  if (!chat.last_message_at) return false;

  const readRow =
    getChatReads(chat).find((row) => row.user_id === userId) ?? null;

  if (!readRow?.last_read_at) return true;

  return (
    new Date(chat.last_message_at).getTime() >
    new Date(readRow.last_read_at).getTime()
  );
}

function hasUnreadChats(chats: ChatRow[], userId: string) {
  return chats.some((chat) => isUnreadChat(chat, userId));
}

function UnreadBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`ml-2 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
        active ? "bg-white ring-2 ring-blue-200" : "bg-blue-600"
      }`}
      aria-label="unread"
    />
  );
}

function LocaleSwitcher({
  locale,
  setLocale,
}: {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}) {
  const baseClass =
    "rounded-lg border px-3 py-2 text-sm font-medium transition";
  const activeClass = "border-gray-900 bg-gray-900 text-white";
  const inactiveClass =
    "border-gray-300 bg-white text-gray-700 hover:bg-gray-100";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLocale("ja")}
        className={`${baseClass} ${
          locale === "ja" ? activeClass : inactiveClass
        }`}
        aria-pressed={locale === "ja"}
      >
        JA
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`${baseClass} ${
          locale === "en" ? activeClass : inactiveClass
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}

export default function BLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale();
  const t = useMemo(() => getCommonText(locale), [locale]);

  const [loggingOut, setLoggingOut] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [unread, setUnread] = useState<UnreadState>({
    requests: false,
    jobs: false,
  });

  const isOnboarding = pathname.startsWith("/b/onboarding");

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            consoleTitle: "Company Console",
            companyNavigation: "Company Navigation",
            billing: "料金プラン",
            loggingOut: "ログアウト中...",
            logout: "ログアウト",
            memoTitle: "企業向けメモ",
            memoBody:
              "クリエイター検索、依頼管理、進行中案件、料金プラン確認をここから行えます。",
            limitTitle: "⚠ 現在このアカウントは取引制限中です。",
            limitReasonLabel: "制限理由",
            limitBody:
              "※ ログイン・既存案件の操作は可能ですが、新規取引は行えません。",
          }
        : {
            consoleTitle: "Company Console",
            companyNavigation: "Company Navigation",
            billing: "Billing",
            loggingOut: "Logging out...",
            logout: "Logout",
            memoTitle: "Company Notes",
            memoBody:
              "Use this area to search creators, manage requests, review active jobs, and check billing.",
            limitTitle: "⚠ This account is currently under trading restriction.",
            limitReasonLabel: "Reason",
            limitBody:
              "You can log in and manage existing jobs, but you cannot start new transactions.",
          },
    [locale]
  );

  const navItems: NavItem[] = useMemo(
    () => [
      {
        href: "/b/dashboard",
        label: t.nav.dashboard,
        shortLabel: locale === "ja" ? "ホーム" : "Home",
      },
      {
        href: "/b/creators",
        label: locale === "ja" ? "クリエイター検索" : "Find Creators",
        shortLabel: locale === "ja" ? "検索" : "Search",
      },
      {
        href: "/b/requests",
        label: locale === "ja" ? "承認待ち依頼" : "Pending Requests",
        shortLabel: locale === "ja" ? "依頼" : "Pending",
        badgeKey: "requests",
      },
      {
        href: "/b/jobs",
        label: locale === "ja" ? "進行中案件" : "Active Jobs",
        shortLabel: locale === "ja" ? "案件" : "Jobs",
        badgeKey: "jobs",
      },
      {
        href: "/b/billing",
        label: t.nav.billing,
        shortLabel: locale === "ja" ? "料金" : "Billing",
      },
    ],
    [locale, t]
  );

  const loadUnreadBadges = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUnread({ requests: false, jobs: false });
      return;
    }

    const [
      { data: pendingOrders, error: pendingOrdersError },
      { data: activeOrders, error: activeOrdersError },
      { data: pendingRequests, error: pendingRequestsError },
      { data: activeRequests, error: activeRequestsError },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id")
        .eq("b_user_id", user.id)
        .in("status", ["authorized_pending_creator", "checkout_pending"]),

      supabase
        .from("orders")
        .select("id")
        .eq("b_user_id", user.id)
        .in("status", [
          "accepted_captured",
          "in_progress",
          "delivered",
          "completed",
        ]),

      supabase
        .from("requests")
        .select("id")
        .eq("b_user_id", user.id)
        .eq("status", "pending"),

      supabase
        .from("requests")
        .select("id")
        .eq("b_user_id", user.id)
        .in("status", ["accepted", "delivered", "completed"]),
    ]);

    if (
      pendingOrdersError ||
      activeOrdersError ||
      pendingRequestsError ||
      activeRequestsError
    ) {
      console.error("B unread source load error:", {
        pendingOrdersError,
        activeOrdersError,
        pendingRequestsError,
        activeRequestsError,
      });
    }

    const pendingOrderIds = ((pendingOrders ?? []) as { id: string }[]).map(
      (row) => row.id
    );
    const activeOrderIds = ((activeOrders ?? []) as { id: string }[]).map(
      (row) => row.id
    );
    const pendingRequestIds = ((pendingRequests ?? []) as { id: string }[]).map(
      (row) => row.id
    );
    const activeRequestIds = ((activeRequests ?? []) as { id: string }[]).map(
      (row) => row.id
    );

    let pendingOrderChats: ChatRow[] = [];
    let activeOrderChats: ChatRow[] = [];
    let pendingRequestChats: ChatRow[] = [];
    let activeRequestChats: ChatRow[] = [];

    if (pendingOrderIds.length > 0) {
      const { data, error } = await supabase
        .from("chats")
        .select(
          `
          id,
          order_id,
          last_message_at,
          chat_reads (
            user_id,
            last_read_at
          )
        `
        )
        .in("order_id", pendingOrderIds);

      if (error) {
        console.error("B pending order chat unread load error:", error);
      } else {
        pendingOrderChats = (data ?? []) as ChatRow[];
      }
    }

    if (activeOrderIds.length > 0) {
      const { data, error } = await supabase
        .from("chats")
        .select(
          `
          id,
          order_id,
          last_message_at,
          chat_reads (
            user_id,
            last_read_at
          )
        `
        )
        .in("order_id", activeOrderIds);

      if (error) {
        console.error("B active order chat unread load error:", error);
      } else {
        activeOrderChats = (data ?? []) as ChatRow[];
      }
    }

    if (pendingRequestIds.length > 0) {
      const { data, error } = await supabase
        .from("chats")
        .select(
          `
          id,
          request_id,
          last_message_at,
          chat_reads (
            user_id,
            last_read_at
          )
        `
        )
        .in("request_id", pendingRequestIds);

      if (error) {
        console.error("B pending request chat unread load error:", error);
      } else {
        pendingRequestChats = (data ?? []) as ChatRow[];
      }
    }

    if (activeRequestIds.length > 0) {
      const { data, error } = await supabase
        .from("chats")
        .select(
          `
          id,
          request_id,
          last_message_at,
          chat_reads (
            user_id,
            last_read_at
          )
        `
        )
        .in("request_id", activeRequestIds);

      if (error) {
        console.error("B active request chat unread load error:", error);
      } else {
        activeRequestChats = (data ?? []) as ChatRow[];
      }
    }

    setUnread({
      requests:
        hasUnreadChats(pendingOrderChats, user.id) ||
        hasUnreadChats(pendingRequestChats, user.id),
      jobs:
        hasUnreadChats(activeOrderChats, user.id) ||
        hasUnreadChats(activeRequestChats, user.id),
    });
  }, [supabase]);

  useEffect(() => {
    const loadLimit = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("user_suspensions")
        .select("reason, created_at")
        .eq("user_id", user.id)
        .eq("level", "limit")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to load trading limit:", error);
        return;
      }

      if (data) {
        setLimitReason(data.reason);
      } else {
        setLimitReason(null);
      }
    };

    void loadLimit();
  }, [supabase]);

  useEffect(() => {
    void loadUnreadBadges();

    const channel = supabase
      .channel("b-layout-unread-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void loadUnreadBadges();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads" },
        () => {
          void loadUnreadBadges();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        () => {
          void loadUnreadBadges();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void loadUnreadBadges();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => {
          void loadUnreadBadges();
        }
      )
      .subscribe();

    const onFocus = () => {
      void loadUnreadBadges();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadUnreadBadges, supabase]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (e) {
      console.error("logout error", e);
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {limitReason && (
        <div className="border-b border-yellow-400 bg-yellow-100 p-4 text-sm text-yellow-900">
          <b>{copy.limitTitle}</b>
          <div className="mt-1">
            {copy.limitReasonLabel}:
            <span className="ml-1 font-semibold">{limitReason}</span>
          </div>
          <div className="mt-1 text-xs text-yellow-700">{copy.limitBody}</div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/b/dashboard"
              className="text-lg font-bold tracking-tight"
            >
              {copy.consoleTitle}
            </Link>
            <span className="hidden rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 md:inline-flex">
              B
            </span>
          </div>

          <div className="flex items-center gap-2">
            <LocaleSwitcher locale={locale} setLocale={setLocale} />

            <Link
              href="/b/billing"
              className="hidden rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 md:inline-flex"
            >
              {copy.billing}
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {loggingOut ? copy.loggingOut : copy.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        {!isOnboarding && (
          <aside className="hidden w-64 shrink-0 md:block">
            <div className="sticky top-24 rounded-3xl border bg-white p-4 shadow-sm">
              <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {copy.companyNavigation}
              </p>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const showUnread = item.badgeKey ? unread[item.badgeKey] : false;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition ${
                        active
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span>{item.label}</span>
                      {showUnread ? <UnreadBadge active={active} /> : null}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-5 rounded-2xl border bg-gray-50 p-4">
                <p className="text-sm font-semibold">{copy.memoTitle}</p>
                <p className="mt-2 text-xs leading-6 text-gray-600">
                  {copy.memoBody}
                </p>
              </div>
            </div>
          </aside>
        )}

        <main className="min-w-0 flex-1">
          {children}
          {!isOnboarding && <div className="h-20 md:hidden" />}
        </main>
      </div>

      {!isOnboarding && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur md:hidden">
          <div className="grid grid-cols-5">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const showUnread = item.badgeKey ? unread[item.badgeKey] : false;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center px-2 py-3 text-[11px] font-medium ${
                    active ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  <span>{item.shortLabel}</span>
                  {showUnread ? (
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                  ) : (
                    <span className="mt-1 h-1.5 w-1.5" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}