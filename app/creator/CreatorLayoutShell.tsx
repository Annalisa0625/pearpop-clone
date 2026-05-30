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

type NavBadgeKey = "requests" | "jobs";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
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
    new Set(values.filter((value): value is string => Boolean(value)))
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

function isGuardExcludedPath(pathname: string) {
  return (
    pathname.startsWith("/creator/profile") ||
    pathname.startsWith("/creator/payouts") ||
    pathname.startsWith("/creator/onboarding")
  );
}

function MobileUnreadDot() {
  return (
    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#ff5f67] ring-2 ring-white" />
  );
}

function HeaderUnreadDot() {
  return (
    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#ff5f67] ring-2 ring-white" />
  );
}

function LocaleCompactButton({
  locale,
  setLocale,
}: {
  locale: "ja" | "en";
  setLocale: (locale: "ja" | "en") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
      className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-100 transition active:scale-[0.98]"
    >
      {locale === "ja" ? "EN" : "日本語"}
    </button>
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
            menuManagement: "メニュー",
            addMenu: "追加",
            payouts: "報酬",
            loggingOut: "ログアウト中...",
            logout: "ログアウト",
            limitTitle: "現在、取引が一部制限されています",
            limitReasonLabel: "理由",
            limitBody:
              "既存の注文対応はできますが、新しい注文の受け付けは制限されています。",
            notifications: "通知",
          }
        : {
            menuManagement: "Menus",
            addMenu: "Add",
            payouts: "Payouts",
            loggingOut: "Logging out...",
            logout: "Logout",
            limitTitle: "Some account actions are restricted",
            limitReasonLabel: "Reason",
            limitBody:
              "You can continue handling existing orders, but new orders are restricted.",
            notifications: "Notifications",
          },
    [locale]
  );

  const navItems: NavItem[] = useMemo(
    () => [
      {
        href: "/creator/dashboard",
        label: t.nav.dashboard,
        shortLabel: locale === "ja" ? "ホーム" : "Home",
        icon: "⌂",
      },
      {
        href: "/creator/requests",
        label: t.nav.requests,
        shortLabel: locale === "ja" ? "依頼" : "Requests",
        icon: "○",
        badgeKey: "requests",
      },
      {
        href: "/creator/jobs",
        label: t.nav.jobs,
        shortLabel: locale === "ja" ? "進行中" : "Jobs",
        icon: "□",
        badgeKey: "jobs",
      },
      {
        href: "/creator/payouts",
        label: copy.payouts,
        shortLabel: locale === "ja" ? "報酬" : "Payouts",
        icon: "¥",
      },
      {
        href: "/creator/profile",
        label: t.nav.profile,
        shortLabel: locale === "ja" ? "設定" : "Profile",
        icon: "◯",
      },
    ],
    [copy.payouts, locale, t]
  );

  const [loggingOut, setLoggingOut] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [detailNavContext, setDetailNavContext] =
    useState<DetailNavContext>(null);
  const [unread, setUnread] = useState<UnreadState>({
    requests: false,
    jobs: false,
  });

  const hasAnyUnread = unread.requests || unread.jobs;

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
    const checkRequiredSetup = async () => {
      if (isGuardExcludedPath(pathname)) {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: creator, error: creatorError } = await supabase
        .from("creators")
        .select("id, stripe_onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (creatorError || !creator) return;

      if (!creator.stripe_onboarding_completed) {
        router.replace("/creator/payouts?required=connect");
        return;
      }

      const { count, error: portfolioError } = await supabase
        .from("creator_portfolio_assets")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creator.id)
        .eq("asset_type", "image")
        .eq("is_public", true);

      if (portfolioError) {
        console.error("portfolio requirement check error:", portfolioError);
        return;
      }

      if ((count ?? 0) < 3) {
        router.replace("/creator/profile?required=portfolio");
      }
    };

    void checkRequiredSetup();
  }, [pathname, router, supabase]);

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
    window.addEventListener("trendre:chat-read-changed", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("trendre:chat-read-changed", onFocus);
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

          const status =
            (data as { status: string | null } | null)?.status ?? null;

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
    <div className="min-h-screen overflow-x-hidden bg-[#f8f9fb] text-slate-950">
      {limitReason ? (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="mx-auto max-w-5xl">
            <p className="font-black">{copy.limitTitle}</p>
            <p className="mt-1 text-xs font-semibold leading-5">
              {copy.limitReasonLabel}: {limitReason}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 opacity-80">
              {copy.limitBody}
            </p>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-[100] border-b border-slate-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 md:px-6">
          <Link
            href="/creator/dashboard"
            className="flex min-w-0 items-center"
            aria-label="Trendre"
          >
            <img
              src="/brand/trendre-logo-full.png"
              alt="Trendre"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/creator/requests"
              aria-label={copy.notifications}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-slate-700 shadow-sm ring-1 ring-slate-100 transition active:scale-[0.98]"
            >
              ♡
              {hasAnyUnread ? <HeaderUnreadDot /> : null}
            </Link>

            <LocaleCompactButton locale={locale} setLocale={setLocale} />

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden rounded-full bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 sm:inline-flex"
            >
              {loggingOut ? copy.loggingOut : copy.logout}
            </button>
          </div>
        </div>

        <div className="hidden border-t border-slate-100 bg-white/95 px-4 py-2 md:block lg:hidden">
          <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                    active
                      ? "bg-[#ff5f67] text-white shadow-[0_12px_25px_rgba(255,95,103,0.2)]"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                  {showUnread ? (
                    <span
                      className={`ml-2 inline-flex h-2 w-2 rounded-full ${
                        active ? "bg-white" : "bg-[#ff5f67]"
                      }`}
                    />
                  ) : null}
                </Link>
              );
            })}

            <Link
              href="/creator/menus"
              className="shrink-0 rounded-full bg-slate-50 px-4 py-2 text-sm font-black text-slate-500 hover:bg-slate-100"
            >
              {copy.menuManagement}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl overflow-x-hidden px-4 py-5 pb-28 md:px-6 md:py-7 lg:pb-10">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href, detailNavContext);
            const showUnread = item.badgeKey ? unread[item.badgeKey] : false;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-h-[62px] flex-col items-center justify-center rounded-[22px] px-1 py-2 text-[11px] font-black transition active:scale-[0.98] ${
                  active
                    ? "bg-rose-50 text-[#ff5f67]"
                    : "bg-white text-slate-400"
                }`}
              >
                <span
                  className={`mb-1 flex h-7 w-7 items-center justify-center rounded-2xl text-sm ${
                    active ? "bg-white shadow-sm" : "bg-transparent"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="max-w-full truncate text-center leading-4">
                  {item.shortLabel}
                </span>
                {showUnread ? <MobileUnreadDot /> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}