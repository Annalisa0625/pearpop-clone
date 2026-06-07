// File: app/b/BLayoutShell.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicHeader from "@/components/PublicHeader";
import NotificationBell from "@/components/NotificationBell";

type TopNavItem = {
  href: string;
  label: string;
};

type MobileNavItem = {
  href: string;
  shortLabel: string;
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;

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

  if (href === "/b/billing") {
    return pathname === "/b/billing" || pathname.startsWith("/b/billing/");
  }

  return pathname.startsWith(href);
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
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
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
            jobs: "注文",
            search: "インフルエンサー検索",
            saved: "保存済み",
            company: "BRAND",
            consoleTitle: "企業アカウント",
            notifications: "通知",
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
            jobs: "Orders",
            search: "Influencer Search",
            saved: "Saved",
            company: "BRAND",
            consoleTitle: "Brand Account",
            notifications: "Notifications",
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
    setMenuOpen(false);
  }, [pathname]);

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
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-2">
            <NotificationBell
              href="/notifications"
              label={copy.notifications}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:bg-slate-50 active:scale-95"
            />

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

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center px-2 py-3 text-[11px] font-black ${
                    active ? "text-[#ff5f67]" : "text-slate-500"
                  }`}
                >
                  <span>{item.shortLabel}</span>
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      active ? "bg-[#ff5f67]" : "bg-transparent"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}