// File: app/creator/CreatorLayoutShell.tsx
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

type DetailNavContext = "requests" | "jobs" | null;

type RequestSummary = {
  id: string;
  status: string | null;
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

type CreatorRow = {
  id: string;
  user_id: string;
};

type UnreadState = {
  requests: boolean;
  jobs: boolean;
};

function getRequestDetailId(pathname: string) {
  const match = pathname.match(/^\/creator\/requests\/([^/]+)$/);
  return match?.[1] ?? null;
}

function getOrderDetailId(pathname: string) {
  const match = pathname.match(/^\/creator\/orders\/([^/]+)$/);
  return match?.[1] ?? null;
}

function getDetailNavContextFromStatus(status: string | null): DetailNavContext {
  const normalized = (status ?? "").trim().toLowerCase();

  if (
    normalized === "pending" ||
    normalized === "rejected" ||
    normalized === "authorized_pending_creator" ||
    normalized === "checkout_pending"
  ) {
    return "requests";
  }

  if (
    normalized === "accepted" ||
    normalized === "accepted_captured" ||
    normalized === "in_progress" ||
    normalized === "delivered" ||
    normalized === "completed"
  ) {
    return "jobs";
  }

  return null;
}

function isActivePath(
  pathname: string,
  href: string,
  detailNavContext: DetailNavContext
) {
  if (pathname === href) return true;

  if (href === "/creator/dashboard") {
    return pathname === "/creator" || pathname === "/creator/dashboard";
  }

  if (href === "/creator/requests") {
    if (pathname === "/creator/requests") return true;

    if (pathname.startsWith("/creator/requests/")) {
      return detailNavContext === "requests";
    }

    if (pathname.startsWith("/creator/orders/")) {
      return detailNavContext === "requests";
    }

    return false;
  }

  if (href === "/creator/jobs") {
    if (pathname === "/creator/jobs") return true;

    if (pathname.startsWith("/creator/requests/")) {
      return detailNavContext === "jobs";
    }

    if (pathname.startsWith("/creator/orders/")) {
      return detailNavContext === "jobs";
    }

    return false;
  }

  return pathname.startsWith(href);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => !!value))
  );
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
    "rounded-xl border px-3 py-2 text-sm font-medium transition";
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

export default function CreatorLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale();
  const t = useMemo(() => getCommonText(locale), [locale]);

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            consoleTitle: "Creator Console",
            creatorNavigation: "Creator Navigation",
            addMenu: "メニュー追加",
            loggingOut: "ログアウト中...",
            logout: "ログアウト",
            memoTitle: "クリエイター向けメモ",
            memoBody:
              "依頼確認、進行中案件、メニュー管理、プロフィール更新をここから行えます。",
            limitTitle: "⚠ 現在、取引制限中です。",
            limitReasonLabel: "制限理由",
            limitBody:
              "既存案件の対応は可能ですが、新規案件の受注や提案はできません。",
          }
        : {
            consoleTitle: "Creator Console",
            creatorNavigation: "Creator Navigation",
            addMenu: "Add Menu",
            loggingOut: "Logging out...",
            logout: "Logout",
            memoTitle: "Creator Notes",
            memoBody:
              "Use this area to review requests, manage active jobs, manage menus, and edit your profile.",
            limitTitle: "⚠ Your account is currently under trading restriction.",
            limitReasonLabel: "Reason",
            limitBody:
              "You can continue handling existing jobs, but you cannot accept or propose new ones.",
          },
    [locale]
  );

  const navItems: NavItem[] = useMemo(
    () => [
      {
        href: "/creator/dashboard",
        label: t.nav.dashboard,
        shortLabel: locale === "ja" ? "ホーム" : "Home",
      },
      {
        href: "/creator/requests",
        label: t.nav.requests,
        shortLabel: locale === "ja" ? "依頼" : "Pending",
        badgeKey: "requests",
      },
      {
        href: "/creator/jobs",
        label: t.nav.jobs,
        shortLabel: locale === "ja" ? "案件" : "Jobs",
        badgeKey: "jobs",
      },
      {
        href: "/creator/menus",
        label: t.nav.menus,
        shortLabel: locale === "ja" ? "メニュー" : "Menus",
      },
      {
        href: "/creator/profile",
        label: t.nav.profile,
        shortLabel: locale === "ja" ? "プロフィール" : "Profile",
      },
    ],
    [locale, t]
  );

  const [loggingOut, setLoggingOut] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [detailNavContext, setDetailNavContext] =
    useState<DetailNavContext>(null);
  const [unread, setUnread] = useState<UnreadState>({
    requests: false,
    jobs: false,
  });

  const loadUnreadBadges = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUnread({ requests: false, jobs: false });
      return;
    }

    const { data: creatorRow, error: creatorError } = await supabase
      .from("creators")
      .select("id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (creatorError) {
      console.error("Creator unread creator row load error:", creatorError);
    }

    const creator = (creatorRow as CreatorRow | null) ?? null;
    const legacyCreatorKeys = uniqueStrings([user.id, creator?.id]);

    const [
      { data: pendingOrders, error: pendingOrdersError },
      { data: activeOrders, error: activeOrdersError },
      { data: pendingRequests, error: pendingRequestsError },
      { data: activeRequests, error: activeRequestsError },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id")
        .eq("creator_user_id", user.id)
        .in("status", ["authorized_pending_creator", "checkout_pending"]),

      supabase
        .from("orders")
        .select("id")
        .eq("creator_user_id", user.id)
        .in("status", [
          "accepted_captured",
          "in_progress",
          "delivered",
          "completed",
        ]),

      supabase
        .from("requests")
        .select("id")
        .in("creator_user_id", legacyCreatorKeys)
        .eq("status", "pending"),

      supabase
        .from("requests")
        .select("id")
        .in("creator_user_id", legacyCreatorKeys)
        .in("status", ["accepted", "delivered", "completed"]),
    ]);

    if (
      pendingOrdersError ||
      activeOrdersError ||
      pendingRequestsError ||
      activeRequestsError
    ) {
      console.error("Creator unread source load error:", {
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
        console.error("Creator pending order chat unread load error:", error);
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
        console.error("Creator active order chat unread load error:", error);
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
        console.error("Creator pending request chat unread load error:", error);
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
        console.error("Creator active request chat unread load error:", error);
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

      setLimitReason(data?.reason ?? null);
    };

    void loadLimit();
  }, [supabase]);

  useEffect(() => {
    void loadUnreadBadges();

    const channel = supabase
      .channel("creator-layout-unread-badges")
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

  useEffect(() => {
    const requestId = getRequestDetailId(pathname);
    const orderId = getOrderDetailId(pathname);

    if (!requestId && !orderId) {
      setDetailNavContext(null);
      return;
    }

    let cancelled = false;

    const loadDetailContext = async () => {
      if (requestId) {
        try {
          const res = await fetch("/api/creator/requests", {
            credentials: "include",
            cache: "no-store",
          });

          const json = await res.json().catch(() => null);

          if (!res.ok) {
            if (!cancelled) {
              setDetailNavContext("requests");
            }
            return;
          }

          const requests = (json?.requests ?? []) as RequestSummary[];
          const current = requests.find((item) => item.id === requestId);

          if (!cancelled) {
            setDetailNavContext(
              getDetailNavContextFromStatus(current?.status ?? null) ??
                "requests"
            );
          }
        } catch (e) {
          console.error("failed to resolve creator request nav context", e);
          if (!cancelled) {
            setDetailNavContext("requests");
          }
        }

        return;
      }

      if (orderId) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            if (!cancelled) setDetailNavContext("requests");
            return;
          }

          const { data, error } = await supabase
            .from("orders")
            .select("status")
            .eq("id", orderId)
            .eq("creator_user_id", user.id)
            .maybeSingle();

          if (error) {
            console.error("failed to resolve creator order nav context", error);
          }

          const status = (data as { status: string | null } | null)?.status ?? null;

          if (!cancelled) {
            setDetailNavContext(
              getDetailNavContextFromStatus(status) ?? "requests"
            );
          }
        } catch (e) {
          console.error("failed to resolve creator order nav context", e);
          if (!cancelled) {
            setDetailNavContext("requests");
          }
        }
      }
    };

    void loadDetailContext();

    return () => {
      cancelled = true;
    };
  }, [pathname, supabase]);

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
      {limitReason ? (
        <div className="border-b border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <div className="mx-auto max-w-7xl">
            <p className="font-semibold">{copy.limitTitle}</p>
            <p className="mt-1">
              {copy.limitReasonLabel}:
              <span className="ml-1 font-semibold">{limitReason}</span>
            </p>
            <p className="mt-1 text-xs text-yellow-700">{copy.limitBody}</p>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <Link
              href="/creator/dashboard"
              className="flex items-center gap-3 text-lg font-bold tracking-tight"
            >
              <span className="truncate">{copy.consoleTitle}</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                C
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LocaleSwitcher locale={locale} setLocale={setLocale} />
            </div>

            <Link
              href="/creator/menus/new"
              className="hidden rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 md:inline-flex"
            >
              {copy.addMenu}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              {loggingOut ? copy.loggingOut : copy.logout}
            </button>
          </div>
        </div>

        <div className="border-t bg-white px-4 py-2 sm:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
            <LocaleSwitcher locale={locale} setLocale={setLocale} />
            <Link
              href="/creator/menus/new"
              className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
            >
              {copy.addMenu}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-3xl border bg-white p-4 shadow-sm">
            <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.creatorNavigation}
            </p>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = isActivePath(
                  pathname,
                  item.href,
                  detailNavContext
                );
                const showUnread = item.badgeKey ? unread[item.badgeKey] : false;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-green-600 text-white shadow-sm"
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

        <main className="min-w-0 flex-1">
          {children}
          <div className="h-24 md:h-0" />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href, detailNavContext);
            const showUnread = item.badgeKey ? unread[item.badgeKey] : false;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[64px] flex-col items-center justify-center px-2 py-2 text-[11px] font-medium transition ${
                  active ? "text-green-600" : "text-gray-500"
                }`}
              >
                <span className="text-center leading-4">{item.shortLabel}</span>
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
    </div>
  );
}