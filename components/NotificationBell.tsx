// File: components/NotificationBell.tsx
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NotificationBellProps = {
  href?: string;
  label?: string;
  className?: string;
  badgeClassName?: string;
  children?: ReactNode;
};

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[21px] w-[21px]"
      aria-hidden="true"
    >
      <path d="M18 8.5a6 6 0 0 0-12 0c0 7-3 7-3 8.7h18c0-1.7-3-1.7-3-8.7Z" />
      <path d="M9.8 20a2.4 2.4 0 0 0 4.4 0" />
    </svg>
  );
}

function formatBadgeCount(count: number) {
  if (count > 99) return "99+";
  return String(count);
}

export default function NotificationBell({
  href = "/notifications",
  label = "通知",
  className,
  badgeClassName,
  children,
}: NotificationBellProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token ?? null;

      if (!token) {
        setCount(0);
        return;
      }

      const res = await fetch("/api/notifications/unread-count", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCount(0);
        return;
      }

      setCount(Number(json?.count ?? 0));
    } catch (error) {
      console.error("notification count load error:", error);
      setCount(0);
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let timerId: number | null = null;

    const setup = async () => {
      await loadCount();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user?.id) return;

      channel = supabase
        .channel(`notification-bell-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_user_id=eq.${user.id}`,
          },
          () => {
            void loadCount();
          }
        )
        .subscribe();

      timerId = window.setInterval(() => {
        void loadCount();
      }, 45000);
    };

    void setup();

    const onFocus = () => {
      void loadCount();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadCount();
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

      if (timerId !== null) {
        window.clearInterval(timerId);
      }

      window.removeEventListener("focus", onFocus);
      window.removeEventListener("trendre:notification-changed", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadCount, supabase]);

  return (
    <Link
      href={href}
      aria-label={label}
      className={
        className ??
        "relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:bg-slate-50 active:scale-95"
      }
    >
      {children ?? <BellIcon />}

      {count > 0 ? (
        <span
          className={
            badgeClassName ??
            "absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-[#ff5f67] px-1.5 py-0.5 text-[10px] font-black leading-none text-white ring-2 ring-white"
          }
        >
          {formatBadgeCount(count)}
        </span>
      ) : null}
    </Link>
  );
}