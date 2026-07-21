"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import type { CreatorLinkInquiryInboxResponse } from "@/lib/trendre-link/inquiry-inbox";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CreatorLinkInboxShortcut() {
  const pathname = usePathname();
  const { locale } = useAppLocale();
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (pathname !== "/creator/link") return;

    const controller = new AbortController();
    const loadCount = async () => {
      try {
        const response = await fetch("/api/creator/link/inquiries", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = (await response.json()) as CreatorLinkInquiryInboxResponse;
        if (body.ok) setNewCount(body.counts.new);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("[trendre-link/inquiries] 新着件数を取得できませんでした。");
        }
      }
    };

    void loadCount();
    return () => controller.abort();
  }, [pathname]);

  if (pathname !== "/creator/link") return null;

  const label = locale === "ja" ? "仕事相談" : "Inquiries";

  return (
    <Link
      href="/creator/link/inquiries"
      aria-label={newCount > 0 ? `${label} ${newCount}` : label}
      className="fixed bottom-[calc(max(12px,env(safe-area-inset-bottom))+72px)] left-3 z-[75] flex min-h-11 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-black text-white shadow-[0_16px_38px_rgba(15,23,42,0.28)] ring-1 ring-white/15 transition active:scale-[0.97]"
    >
      <MailIcon />
      <span>{label}</span>
      {newCount > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3b5c] px-1.5 text-[10px] font-black text-white">
          {newCount > 99 ? "99+" : newCount}
        </span>
      ) : null}
    </Link>
  );
}
