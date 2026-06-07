// File: app/creator/CreatorLayoutShell.tsx
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
import NotificationBell from "@/components/NotificationBell";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

type DetailNavContext = "requests" | "jobs" | null;

type IconProps = {
  className?: string;
};

function HomeIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m3 10.8 9-7.2 9 7.2" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function OrdersIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z" />
      <path d="M8 9h8" />
      <path d="M8 13h6" />
    </svg>
  );
}

function TodoIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="m8.3 12.2 2.4 2.4 5-5.2" />
    </svg>
  );
}

function YenIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 4 6 8 6-8" />
      <path d="M12 12v8" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
    </svg>
  );
}

function ProfileIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 19.5a7 7 0 0 1 14 0" />
      <circle cx="12" cy="8.2" r="4.2" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 11.1V12a9 9 0 1 1-5.3-8.2" />
      <path d="m9.2 11.8 2.2 2.2L21 4.5" />
    </svg>
  );
}

function UserIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function EditIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function HelpIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9a2.7 2.7 0 1 1 4.7 1.8c-.9.8-1.5 1.2-1.5 2.7" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function LoginIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

function getOrderIdFromPath(pathname: string) {
  const match = pathname.match(/^\/creator\/orders\/([^/]+)/);
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
    normalized === "revision_requested" ||
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
      return true;
    }

    if (pathname.startsWith("/creator/orders/")) {
      return detailNavContext === "requests";
    }

    return false;
  }

  if (href === "/creator/jobs") {
    if (pathname === "/creator/jobs") return true;

    if (pathname.startsWith("/creator/orders/")) {
      return detailNavContext === "jobs";
    }

    return false;
  }

  if (href === "/creator/profile") {
    return (
      pathname.startsWith("/creator/profile") ||
      pathname.startsWith("/creator/menus")
    );
  }

  return pathname.startsWith(href);
}

function isGuardExcludedPath(pathname: string) {
  return (
    pathname.startsWith("/creator/profile") ||
    pathname.startsWith("/creator/payouts") ||
    pathname.startsWith("/creator/onboarding")
  );
}

function UserMenuLink({
  href,
  icon,
  title,
  body,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  body?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50 active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-700">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        {body ? (
          <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">
            {body}
          </span>
        ) : null}
      </span>
    </Link>
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

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            home: "ホーム",
            orders: "注文",
            todo: "ToDo",
            payouts: "報酬",
            menu: "プロフィール",

            notifications: "通知",
            waitingWork: "実行待ち",
            myPage: "マイページ",

            profile: "プロフィール設定",
            profileBody: "表示名・写真・ポートフォリオ",
            menus: "メニュー編集",
            menusBody: "価格・投稿内容を編集",
            payoutSetting: "報酬設定",
            payoutBody: "受け取り・送金状況",
            help: "ヘルプ",
            terms: "利用規約",
            privacy: "プライバシーポリシー",

            login: "ログイン",
            signup: "会員登録",
            loggingOut: "ログアウト中...",
            logout: "ログアウト",

            language: "表示言語",
            limitTitle: "現在、取引が一部制限されています",
            limitReasonLabel: "理由",
          }
        : {
            home: "Home",
            orders: "Orders",
            todo: "ToDo",
            payouts: "Payouts",
            menu: "Profile",

            notifications: "Notifications",
            waitingWork: "Waiting work",
            myPage: "My page",

            profile: "Profile settings",
            profileBody: "Name, photo, portfolio",
            menus: "Edit menus",
            menusBody: "Pricing and services",
            payoutSetting: "Payout settings",
            payoutBody: "Payouts and transfers",
            help: "Help",
            terms: "Terms",
            privacy: "Privacy Policy",

            login: "Login",
            signup: "Sign up",
            loggingOut: "Logging out...",
            logout: "Logout",

            language: "Language",
            limitTitle: "Some account actions are restricted",
            limitReasonLabel: "Reason",
          },
    [locale]
  );

  const navItems: NavItem[] = useMemo(
    () => [
      {
        href: "/creator/dashboard",
        label: copy.home,
        icon: <HomeIcon className="h-[25px] w-[25px]" />,
      },
      {
        href: "/creator/requests",
        label: copy.orders,
        icon: <OrdersIcon className="h-[25px] w-[25px]" />,
      },
      {
        href: "/creator/jobs",
        label: copy.todo,
        icon: <TodoIcon className="h-[25px] w-[25px]" />,
      },
      {
        href: "/creator/payouts",
        label: copy.payouts,
        icon: <YenIcon className="h-[25px] w-[25px]" />,
      },
      {
        href: "/creator/profile",
        label: copy.menu,
        icon: <ProfileIcon className="h-[25px] w-[25px]" />,
      },
    ],
    [copy.home, copy.menu, copy.orders, copy.payouts, copy.todo]
  );

  const [loggingOut, setLoggingOut] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [detailNavContext, setDetailNavContext] =
    useState<DetailNavContext>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!cancelled) {
        setUserEmail(user?.email ?? null);
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

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
    const orderId = getOrderIdFromPath(pathname);

    if (!orderId) {
      if (pathname.startsWith("/creator/requests/")) {
        setDetailNavContext("requests");
      } else {
        setDetailNavContext(null);
      }

      return;
    }

    let cancelled = false;

    const loadDetailContext = async () => {
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
      <header className="fixed inset-x-0 top-0 z-[100] border-b border-slate-100 bg-white/95 backdrop-blur-xl">
        {limitReason ? (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-amber-900">
            <div className="mx-auto max-w-5xl">
              <p className="text-xs font-black">{copy.limitTitle}</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-5 opacity-80">
                {copy.limitReasonLabel}: {limitReason}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mx-auto flex h-[64px] max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
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

          <div className="relative flex items-center gap-2">
            <NotificationBell
              href="/notifications"
              label={copy.notifications}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:bg-slate-50 active:scale-95"
            />

            <Link
              href="/creator/jobs"
              aria-label={copy.waitingWork}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:bg-slate-50 active:scale-95"
            >
              <CheckCircleIcon className="h-[21px] w-[21px]" />
            </Link>

            <button
              type="button"
              onClick={() => setUserMenuOpen((value) => !value)}
              aria-label={copy.myPage}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:bg-slate-50 active:scale-95"
            >
              <UserIcon className="h-[21px] w-[21px]" />
            </button>

            {userMenuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="close menu"
                  onClick={() => setUserMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                />

                <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-[28px] bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ring-1 ring-slate-100">
                  <div className="px-3 py-3">
                    <p className="text-base font-black tracking-[-0.03em] text-slate-950">
                      {copy.myPage}
                    </p>

                    {userEmail ? (
                      <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                        {userEmail}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-1 space-y-1">
                    <UserMenuLink
                      href="/creator/profile"
                      icon={<ProfileIcon className="h-5 w-5" />}
                      title={copy.profile}
                      body={copy.profileBody}
                      onClick={() => setUserMenuOpen(false)}
                    />

                    <UserMenuLink
                      href="/creator/menus"
                      icon={<EditIcon className="h-5 w-5" />}
                      title={copy.menus}
                      body={copy.menusBody}
                      onClick={() => setUserMenuOpen(false)}
                    />

                    <UserMenuLink
                      href="/creator/payouts"
                      icon={<YenIcon className="h-5 w-5" />}
                      title={copy.payoutSetting}
                      body={copy.payoutBody}
                      onClick={() => setUserMenuOpen(false)}
                    />
                  </div>

                  <div className="my-2 h-px bg-slate-100" />

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 active:scale-[0.99]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs font-black text-slate-700">
                        {locale === "ja" ? "EN" : "JA"}
                      </span>
                      <span>
                        <span className="block text-sm font-black text-slate-950">
                          {copy.language}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                          {locale === "ja" ? "English" : "日本語"}
                        </span>
                      </span>
                    </button>

                    <UserMenuLink
                      href="/help"
                      icon={<HelpIcon className="h-5 w-5" />}
                      title={copy.help}
                      onClick={() => setUserMenuOpen(false)}
                    />

                    <UserMenuLink
                      href="/terms"
                      icon={<ShieldIcon className="h-5 w-5" />}
                      title={copy.terms}
                      onClick={() => setUserMenuOpen(false)}
                    />

                    <UserMenuLink
                      href="/privacy"
                      icon={<ShieldIcon className="h-5 w-5" />}
                      title={copy.privacy}
                      onClick={() => setUserMenuOpen(false)}
                    />
                  </div>

                  <div className="my-2 h-px bg-slate-100" />

                  {userEmail ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex w-full items-center justify-center rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 active:scale-[0.99] disabled:opacity-50"
                    >
                      {loggingOut ? copy.loggingOut : copy.logout}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center justify-center rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                      >
                        {copy.login}
                      </Link>
                      <Link
                        href="/signup/creator"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center justify-center rounded-full bg-[#ff5f67] px-4 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(255,95,103,0.22)]"
                      >
                        {copy.signup}
                      </Link>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full max-w-5xl overflow-x-hidden px-4 pb-28 md:px-6 ${
          limitReason ? "pt-[122px]" : "pt-[84px]"
        }`}
      >
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 px-2 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-[520px] grid-cols-5 gap-1">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href, detailNavContext);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-h-[68px] flex-col items-center justify-center rounded-[24px] px-1.5 py-2 text-[11px] font-black transition duration-200 active:scale-[0.96] ${
                  active
                    ? "text-[#ff5f67]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <span
                  className={`mb-1.5 flex h-9 w-9 items-center justify-center rounded-[18px] transition duration-200 ${
                    active ? "bg-rose-50 shadow-sm" : "bg-transparent"
                  }`}
                >
                  <span
                    className={`transition duration-200 ${
                      active ? "scale-110" : "scale-100"
                    }`}
                  >
                    {item.icon}
                  </span>
                </span>

                <span className="max-w-full truncate text-center leading-4">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}