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
import { useAppLocale } from "@/lib/i18n/locale";
import PublicHeader from "@/components/PublicHeader";

type NavBadgeKey = "requests" | "jobs" | "orders";

type TopNavItem = {
  href: string;
  label: string;
  badgeKey?: NavBadgeKey;
};

type MobileNavItem = {
  href: string;
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

  if (href === "/home") {
    return pathname === "/home";
  }

  if (href === "/b/dashboard") {
    return pathname === "/b" || pathname === "/b/dashboard";
  }

  if (href === "/b/creators") {
    return pathname === "/b/creators" || pathname.startsWith("/b/creators/");
  }

  if (href === "/b/saved-creators") {
    return (
      pathname === "/b/saved-creators" ||
      pathname.startsWith("/b/saved-creators/")
    );
  }

  if (href === "/b/orders") {
    return (
      pathname === "/b/orders" ||
      pathname.startsWith("/b/orders/") ||
      pathname === "/b/requests" ||
      pathname.startsWith("/b/requests/") ||
      pathname === "/b/jobs" ||
      pathname.startsWith("/b/jobs/")
    );
  }

  if (href === "/b/requests") {
    return pathname === "/b/requests" || pathname.startsWith("/b/requests/");
  }

  if (href === "/b/jobs") {
    return pathname === "/b/jobs" || pathname.startsWith("/b/jobs/");
  }

  if (href === "/b/billing") {
    return pathname === "/b/billing" || pathname.startsWith("/b/billing/");
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

function TopNavUnreadDot() {
  return (
    <span className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full bg-[#ff5f67] ring-2 ring-white" />
  );
}

function MenuUnreadDot() {
  return (
    <span className="ml-auto h-2 w-2 rounded-full bg-[#ff5f67]" />
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 6h12M4 10h12M4 14h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 10h10.5M10.5 5.5 15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuLink({
  href,
  label,
  active,
  unread,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  unread?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition ${
        active
          ? "bg-rose-50 text-[#ff5f67]"
          : "text-slate-800 hover:bg-slate-50"
      }`}
    >
      <span>{label}</span>
      {unread ? <MenuUnreadDot /> : null}
    </Link>
  );
}

export default function BLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();

  const [loggingOut, setLoggingOut] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCompanyViewer, setIsCompanyViewer] = useState<boolean | null>(null);
  const [unread, setUnread] = useState<UnreadState>({
    requests: false,
    jobs: false,
  });

  const isOnboarding = pathname.startsWith("/b/onboarding");

  // /b/creators は未ログインにも公開する。
  // ただし、Bとしてログイン済みなら PublicHeader ではなく B用ヘッダー/Menu を出す。
  const isInfluencerSearchPage =
    pathname === "/b/creators" || pathname.startsWith("/b/creators/");

  const shouldUsePublicHeader =
    isInfluencerSearchPage && isCompanyViewer !== true;

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            dashboard: "トップ",
            billing: "プラン",
            loggingOut: "ログアウト中...",
            logout: "ログアウト",
            limitTitle: "現在このアカウントは取引制限中です。",
            limitReasonLabel: "理由",
            limitBody:
              "ログインと既存注文の確認はできますが、新しい注文はできません。",
            profile: "アカウント設定",
            requests: "返答待ち",
            jobs: "注文",
            search: "インフルエンサー検索",
            saved: "保存済み",
            company: "BRAND",
            consoleTitle: "企業アカウント",
            menu: "Menu",
          }
        : {
            dashboard: "Top",
            billing: "Plan",
            loggingOut: "Logging out...",
            logout: "Logout",
            limitTitle: "This account is currently restricted.",
            limitReasonLabel: "Reason",
            limitBody:
              "You can log in and view existing orders, but you cannot place new orders.",
            profile: "Account Settings",
            requests: "Waiting",
            jobs: "Orders",
            search: "Influencer Search",
            saved: "Saved",
            company: "BRAND",
            consoleTitle: "Brand Account",
            menu: "Menu",
          },
    [locale]
  );

  const topNavItems: TopNavItem[] = useMemo(
    () => [
      {
        href: "/b/creators",
        label: copy.search,
      },
      {
        href: "/b/saved-creators",
        label: copy.saved,
      },
      {
        href: "/b/orders",
        label: copy.jobs,
        badgeKey: "orders",
      },
    ],
    [copy.jobs, copy.saved, copy.search]
  );

  const mobileNavItems: MobileNavItem[] = useMemo(
    () => [
      {
        href: "/b/dashboard",
        shortLabel: locale === "ja" ? "トップ" : "Top",
      },
      {
        href: "/b/creators",
        shortLabel: locale === "ja" ? "検索" : "Search",
      },
      {
        href: "/b/saved-creators",
        shortLabel: locale === "ja" ? "保存" : "Saved",
      },
      {
        href: "/b/orders",
        shortLabel: locale === "ja" ? "注文" : "Orders",
        badgeKey: "orders",
      },
    ],
    [locale]
  );

  useEffect(() => {
    let active = true;

    const checkCompanyViewer = async () => {
      if (!isInfluencerSearchPage) {
        if (active) setIsCompanyViewer(true);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        setIsCompanyViewer(false);
        return;
      }

      const { data: roleRow, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "company")
        .maybeSingle();

      if (!active) return;

      if (roleError || !roleRow) {
        setIsCompanyViewer(false);
        return;
      }

      setIsCompanyViewer(true);
    };

    void checkCompanyViewer();

    return () => {
      active = false;
    };
  }, [isInfluencerSearchPage, supabase]);

  const loadUnreadBadges = useCallback(async () => {
    if (shouldUsePublicHeader) {
      setUnread({ requests: false, jobs: false });
      return;
    }

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
  }, [supabase, shouldUsePublicHeader]);

  useEffect(() => {
    if (shouldUsePublicHeader) {
      setLimitReason(null);
      return;
    }

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
  }, [supabase, shouldUsePublicHeader]);

  useEffect(() => {
    if (shouldUsePublicHeader) {
      setUnread({ requests: false, jobs: false });
      return;
    }

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
    window.addEventListener("trendre:chat-read-changed", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("trendre:chat-read-changed", onFocus);
    };
  }, [loadUnreadBadges, supabase, shouldUsePublicHeader]);

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

  const closeProfileMenu = () => {
    setMenuOpen(false);
  };

  const openProfileMenu = () => {
    setMenuOpen(true);
  };

  if (shouldUsePublicHeader) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-950">
        <PublicHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      {limitReason ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <div className="mx-auto max-w-7xl">
            <span className="font-black">{copy.limitTitle}</span>
            {limitReason ? (
              <span className="ml-2 text-amber-700">
                {copy.limitReasonLabel}: {limitReason}
              </span>
            ) : null}
            <p className="mt-1 text-xs text-amber-700">{copy.limitBody}</p>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-[100] border-b border-slate-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center px-4 py-4 md:px-6 lg:py-5">
          <Link
            href="/b/dashboard"
            className="flex items-center"
            aria-label="Trendre"
          >
            <img
              src="/brand/trendre-logo-full.png"
              alt="Trendre"
              className="h-8 w-auto object-contain md:h-9"
            />
          </Link>

          <nav className="hidden items-center justify-center gap-9 text-sm font-black text-slate-700 md:flex">
            {topNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const showUnread =
                item.badgeKey === "orders"
                  ? unread.requests || unread.jobs
                  : item.badgeKey === "requests"
                    ? unread.requests
                    : item.badgeKey === "jobs"
                      ? unread.jobs
                      : false;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative transition ${
                    active
                      ? "text-slate-950 after:absolute after:-bottom-2 after:left-0 after:h-[2px] after:w-full after:rounded-full after:bg-slate-950"
                      : "text-slate-700 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                  {showUnread ? <TopNavUnreadDot /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-end">
            <div
              className="relative"
              onMouseEnter={openProfileMenu}
              onMouseLeave={closeProfileMenu}
            >
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                onFocus={openProfileMenu}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MenuIcon />
                <span>{copy.menu}</span>
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-full z-[120] w-64 pt-2">
                  <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
                    <div className="border-b border-slate-100 px-4 py-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                        {copy.company}
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {copy.consoleTitle}
                      </p>
                    </div>

                    <div className="py-2">
                      <MenuLink
                        href="/b/dashboard"
                        label={copy.dashboard}
                        active={isActivePath(pathname, "/b/dashboard")}
                        onClick={closeProfileMenu}
                      />

                      <MenuLink
                        href="/b/creators"
                        label={copy.search}
                        active={isActivePath(pathname, "/b/creators")}
                        onClick={closeProfileMenu}
                      />

                      <MenuLink
                        href="/b/saved-creators"
                        label={copy.saved}
                        active={isActivePath(pathname, "/b/saved-creators")}
                        onClick={closeProfileMenu}
                      />

                      <MenuLink
                        href="/b/orders"
                        label={copy.jobs}
                        active={isActivePath(pathname, "/b/orders")}
                        unread={unread.requests || unread.jobs}
                        onClick={closeProfileMenu}
                      />

                      <MenuLink
                        href="/b/billing"
                        label={copy.billing}
                        active={isActivePath(pathname, "/b/billing")}
                        onClick={closeProfileMenu}
                      />

                      <MenuLink
                        href="/b/profile"
                        label={copy.profile}
                        active={isActivePath(pathname, "/b/profile")}
                        onClick={closeProfileMenu}
                      />
                    </div>

                    <div className="border-t border-slate-100 p-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <span>{loggingOut ? copy.loggingOut : copy.logout}</span>
                        <ArrowIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
        {children}
        {!isOnboarding ? <div className="h-20 md:hidden" /> : null}
      </main>

      {!isOnboarding ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 backdrop-blur-xl md:hidden">
          <div className="grid grid-cols-4">
            {mobileNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const showUnread =
                item.badgeKey === "orders"
                  ? unread.requests || unread.jobs
                  : item.badgeKey
                    ? unread[item.badgeKey]
                    : false;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center px-2 py-3 text-[11px] font-black ${
                    active ? "text-[#ff5f67]" : "text-slate-500"
                  }`}
                >
                  <span>{item.shortLabel}</span>
                  {showUnread ? (
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ff5f67]" />
                  ) : (
                    <span className="mt-1 h-1.5 w-1.5" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}