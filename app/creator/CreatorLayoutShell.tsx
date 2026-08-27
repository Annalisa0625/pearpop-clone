"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeHelp,
  Banknote,
  BriefcaseBusiness,
  House,
  Landmark,
  Link2,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import NotificationBell from "@/components/NotificationBell";
import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useCreatorOnlyRelease } from "./CreatorReleaseMode";

type IconProps = { className?: string };
type DetailNavContext = "orders" | "jobs" | null;
type NavItem = { href: string; label: string; icon: ReactNode };

function HomeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m3 10.8 9-7.2 9 7.2" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function OrderIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z" />
      <path d="M8 9h8M8 13h6" />
    </svg>
  );
}

function JobIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3.5" y="6.5" width="17" height="13" rx="3" />
      <path d="M8.5 6.5V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3.5 11h17M9.5 11v2h5v-2" />
    </svg>
  );
}

function LinkFeatureIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  );
}

function ProfileIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function UserIcon({ className = "" }: IconProps) {
  return <ProfileIcon className={className} />;
}

function SettingsIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.06.06-2.76 2.76-.06-.06a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.08 1.65V21h-3.9v-.09A1.8 1.8 0 0 0 8.94 19.3a1.8 1.8 0 0 0-2 .36l-.06.06-2.76-2.76.06-.06a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.65-1.08H2.8v-3.9h.09A1.8 1.8 0 0 0 4.5 8.84a1.8 1.8 0 0 0-.36-2l-.06-.06 2.76-2.76.06.06a1.8 1.8 0 0 0 2 .36A1.8 1.8 0 0 0 9.98 2.8V2.7h3.9v.1a1.8 1.8 0 0 0 1.08 1.64 1.8 1.8 0 0 0 2-.36l.06-.06 2.76 2.76-.06.06a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.65 1.08h.09v3.9h-.09A1.8 1.8 0 0 0 19.4 15Z" />
    </svg>
  );
}

function BankIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m3 9 9-5 9 5" />
      <path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18M4 17h16" />
    </svg>
  );
}

function YenIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 4 6 8 6-8M12 12v8M8 13h8M8 17h8" />
    </svg>
  );
}

function HelpIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.7 9a2.6 2.6 0 1 1 4.6 1.7c-.9.8-1.5 1.3-1.5 2.8M12 17h.01" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10Z" />
    </svg>
  );
}

function getOrderIdFromPath(pathname: string) {
  const orderMatch = pathname.match(/^\/creator\/orders\/([^/]+)/);
  if (orderMatch?.[1]) return orderMatch[1];
  const chatMatch = pathname.match(/^\/creator\/chats\/([^/]+)/);
  return chatMatch?.[1] ?? null;
}

function getDetailNavContext(status: string | null): DetailNavContext {
  const value = (status ?? "").trim().toLowerCase();
  if (["accepted", "accepted_captured", "in_progress", "delivered", "revision_requested", "completed"].includes(value)) return "jobs";
  if (["pending", "rejected", "authorized_pending_creator", "checkout_pending"].includes(value)) return "orders";
  return null;
}

function isActivePath(pathname: string, href: string, detailContext: DetailNavContext) {
  if (href === "/creator/dashboard") return pathname === "/creator" || pathname === "/creator/dashboard";
  if (href === "/creator/orders") {
    if (pathname === "/creator/orders" || pathname.startsWith("/creator/requests") || pathname.startsWith("/creator/link/inquiries")) return true;
    if (pathname.startsWith("/creator/orders/")) return detailContext !== "jobs";
    return false;
  }
  if (href === "/creator/jobs") {
    if (pathname.startsWith("/creator/jobs") || pathname.startsWith("/creator/chats")) return true;
    if (pathname.startsWith("/creator/orders/")) return detailContext === "jobs";
    return false;
  }
  if (href === "/creator/link") return pathname === "/creator/link";
  if (href === "/creator/profile") return pathname.startsWith("/creator/profile") || pathname.startsWith("/creator/menus");
  return pathname.startsWith(href);
}

function MenuLink({ href, icon, title, body, onClick }: { href: string; icon: ReactNode; title: string; body?: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex min-h-[58px] items-center gap-3 rounded-[14px] px-3 py-2 outline-none transition duration-150 hover:bg-[#f6f5f2] focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-[0.99] motion-reduce:transition-none">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-500">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-slate-950">{title}</span>
        {body ? <span className="mt-0.5 block truncate text-[12px] font-normal text-slate-500">{body}</span> : null}
      </span>
    </Link>
  );
}

function AccountSheet({
  open,
  email,
  locale,
  loggingOut,
  copy,
  isCreatorOnly,
  onClose,
  onToggleLocale,
  onLogout,
}: {
  open: boolean;
  email: string | null;
  locale: string;
  loggingOut: boolean;
  copy: Record<string, string>;
  isCreatorOnly: boolean;
  onClose: () => void;
  onToggleLocale: () => void;
  onLogout: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button
        type="button"
        aria-label="close menu"
        onClick={onClose}
        className="creator-sheet-backdrop absolute inset-0 cursor-default bg-slate-950/30 backdrop-blur-[3px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={copy.accountMenu}
        className="creator-account-sheet absolute inset-x-0 bottom-0 max-h-[calc(100dvh-24px)] overflow-y-auto rounded-t-[30px] bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-24px_70px_rgba(15,23,42,0.20)] sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[76px] sm:w-[368px] sm:rounded-[24px] sm:border sm:border-slate-200/70 sm:p-3 sm:shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="rounded-[18px] bg-[#f6f5f2] px-4 py-4">
          <p className="text-[18px] font-semibold tracking-[-0.035em]">{copy.accountMenu}</p>
          {email ? <p className="mt-1.5 truncate text-[13px] font-normal text-slate-600">{email}</p> : null}
        </div>

        <div className="mt-2 space-y-0.5">
          <MenuLink href="/creator/settings" icon={<Settings className="h-5 w-5" />} title={copy.accountSettings} body={copy.accountSettingsBody} onClick={onClose} />
          {!isCreatorOnly ? <>
            <MenuLink href="/creator/payouts?tab=bank" icon={<Landmark className="h-5 w-5" />} title={copy.bank} body={copy.bankBody} onClick={onClose} />
            <MenuLink href="/creator/payouts" icon={<Banknote className="h-5 w-5" />} title={copy.earnings} body={copy.earningsBody} onClick={onClose} />
          </> : null}
        </div>

        <div className="my-2 h-px bg-slate-200/70" />

        <button type="button" onClick={onToggleLocale} className="flex min-h-14 w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left outline-none transition duration-150 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-[0.99] motion-reduce:transition-none">
          <span className="flex h-9 w-9 items-center justify-center text-[11px] font-semibold text-slate-600">{locale === "ja" ? "EN" : "JA"}</span>
          <span>
            <span className="block text-[14px] font-medium">{copy.language}</span>
            <span className="mt-0.5 block text-[12px] font-normal text-slate-500">{locale === "ja" ? "English" : "日本語"}</span>
          </span>
        </button>
        <MenuLink href="/help" icon={<BadgeHelp className="h-5 w-5" />} title={copy.help} onClick={onClose} />
        <MenuLink href="/terms" icon={<ShieldCheck className="h-5 w-5" />} title={copy.terms} onClick={onClose} />
        <MenuLink href="/privacy" icon={<ShieldCheck className="h-5 w-5" />} title={copy.privacy} onClick={onClose} />

        {email ? (
          <>
            <div className="my-2 h-px bg-slate-200/70" />
            <button type="button" onClick={onLogout} disabled={loggingOut} className="flex min-h-12 w-full items-center justify-center rounded-[14px] px-4 py-2.5 text-[14px] font-medium text-rose-600 outline-none transition duration-150 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-200 disabled:opacity-50 motion-reduce:transition-none">
              {loggingOut ? copy.loggingOut : copy.logout}
            </button>
          </>
        ) : null}
      </section>
    </div>
  );
}

export default function CreatorLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale();
  const isCreatorOnly = useCreatorOnlyRelease();

  const isStandaloneLinkEditor = pathname === "/creator/link" || pathname.startsWith("/creator/link/onboarding");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [detailContext, setDetailContext] = useState<DetailNavContext>(null);

  const copy = locale === "ja"
    ? {
        notifications: "通知",
        accountMenu: "アカウント",
        accountSettings: "アカウント設定",
        accountSettingsBody: "ログイン情報・本人情報",
        bank: "銀行口座",
        bankBody: "報酬の受取口座",
        earnings: "報酬",
        earningsBody: "売上・振込履歴",
        language: "言語",
        help: "ヘルプ",
        terms: "利用規約",
        privacy: "プライバシーポリシー",
        logout: "ログアウト",
        loggingOut: "ログアウト中…",
        limitTitle: "現在、取引が一部制限されています",
        limitReason: "理由",
      }
    : {
        notifications: "Notifications",
        accountMenu: "Account",
        accountSettings: "Account settings",
        accountSettingsBody: "Login and identity information",
        bank: "Bank account",
        bankBody: "Payout destination",
        earnings: "Earnings",
        earningsBody: "Sales and payout history",
        language: "Language",
        help: "Help",
        terms: "Terms",
        privacy: "Privacy Policy",
        logout: "Log out",
        loggingOut: "Logging out…",
        limitTitle: "Some account actions are restricted",
        limitReason: "Reason",
      };

  const navItems: NavItem[] = [
    { href: "/creator/dashboard", label: "Home", icon: <House className="h-[22px] w-[22px]" /> },
    { href: "/creator/orders", label: "Order", icon: <ReceiptText className="h-[22px] w-[22px]" /> },
    ...(!isCreatorOnly ? [{ href: "/creator/jobs", label: "Job", icon: <BriefcaseBusiness className="h-[22px] w-[22px]" /> }] : []),
    { href: "/creator/link", label: "Link", icon: <Link2 className="h-[22px] w-[22px]" /> },
    { href: "/creator/profile", label: "Profile", icon: <UserRound className="h-[22px] w-[22px]" /> },
  ];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled) setUserEmail(user?.email ?? null);
    };
    void load();
    return () => { cancelled = true; };
  }, [supabase]);

  useEffect(() => setUserMenuOpen(false), [pathname]);

  useEffect(() => {
    let cancelled = false;
    const loadLimit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      if (!cancelled && !error) setLimitReason(data?.reason ?? null);
    };
    void loadLimit();
    return () => { cancelled = true; };
  }, [supabase]);

  useEffect(() => {
    const orderId = getOrderIdFromPath(pathname);
    if (!orderId) {
      setDetailContext(null);
      return;
    }
    if (pathname.startsWith("/creator/chats/")) {
      setDetailContext("jobs");
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .eq("creator_user_id", user.id)
        .maybeSingle();
      if (!cancelled) setDetailContext(getDetailNavContext((data as { status?: string | null } | null)?.status ?? null) ?? "orders");
    };
    void load();
    return () => { cancelled = true; };
  }, [pathname, supabase]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  if (isStandaloneLinkEditor) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#f7f6f3] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-[#f7f6f3]/95 backdrop-blur-xl">
        {limitReason ? (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-amber-900">
            <div className="mx-auto max-w-5xl">
              <p className="text-xs font-bold">{copy.limitTitle}</p>
              <p className="mt-0.5 text-[11px] font-medium opacity-80">{copy.limitReason}: {limitReason}</p>
            </div>
          </div>
        ) : null}

        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/creator/dashboard" aria-label="Trend Mart Home" className="flex min-h-11 min-w-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-rose-200">
            <img src="/brand/trend-mart-logo.png" alt="Trend Mart" className="h-[27px] w-auto object-contain" />
          </Link>

          <div className="relative flex items-center gap-2">
            <NotificationBell
              href="/notifications"
              label={copy.notifications}
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-700 outline-none transition duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-95 motion-reduce:transition-none"
              badgeClassName="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3860] px-1 text-[9px] font-semibold leading-none tabular-nums text-white ring-2 ring-white"
            />
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-label={copy.accountMenu}
              aria-expanded={userMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full text-slate-700 outline-none transition duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-95 motion-reduce:transition-none"
            >
              <UserRound className="h-[21px] w-[21px]" />
            </button>

          </div>
        </div>
      </header>

      <AccountSheet
        open={userMenuOpen}
        email={userEmail}
        locale={locale}
        loggingOut={loggingOut}
        copy={copy}
        isCreatorOnly={isCreatorOnly}
        onClose={() => setUserMenuOpen(false)}
        onToggleLocale={() => setLocale(locale === "ja" ? "en" : "ja")}
        onLogout={() => void handleLogout()}
      />

      <main className="mx-auto w-full max-w-5xl overflow-x-hidden px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-[60] bg-gradient-to-t from-[#f7f6f3] via-[#f7f6f3]/96 to-transparent px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-3">
        <div className={`mx-auto grid max-w-[560px] gap-1 rounded-[24px] bg-white/94 px-1 shadow-[0_10px_36px_rgba(32,28,36,0.10)] ring-1 ring-black/[0.045] backdrop-blur-xl ${isCreatorOnly ? "grid-cols-4" : "grid-cols-5"}`}>
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href, detailContext);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex min-h-[62px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-200 active:scale-[0.95] motion-reduce:transition-none ${active ? "text-[#ed3155]" : "text-slate-400 hover:text-slate-600"}`}>
                <span className={`flex h-8 w-10 items-center justify-center transition duration-200 motion-reduce:transition-none ${active ? "-translate-y-0.5 scale-105" : ""}`}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
