// File: components/PublicHeader.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppLocale } from "@/lib/i18n/locale";

function LocaleDropdown() {
  const { locale, setLocale } = useAppLocale();
  const [open, setOpen] = useState(false);

  const currentLabel = locale === "ja" ? "日本語" : "English";

  const options = [
    { value: "en" as const, label: "English" },
    { value: "ja" as const, label: "日本語" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-bold text-slate-800 transition hover:text-slate-950"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {currentLabel}
        <span className="text-[10px] text-slate-700">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-36 overflow-hidden rounded-xl border border-slate-100 bg-white py-2 shadow-xl shadow-slate-950/10">
          {options.map((item) => {
            const active = locale === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setLocale(item.value);
                  setOpen(false);
                }}
                className={`block w-full px-5 py-3 text-left text-sm font-black transition ${
                  active
                    ? "bg-rose-50 text-[#ff5f67]"
                    : "bg-white text-slate-900 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PublicHeader() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          overview: "サービス概要",
          creatorSearch: "インフルエンサーを探す",
          pricing: "料金プラン",
          login: "ログイン",
          companySignup: "無料で企業登録",
        }
      : {
          overview: "Overview",
          creatorSearch: "Find Influencers",
          pricing: "Pricing",
          login: "Login",
          companySignup: "Join as a Brand",
        };

  const scrollToOverview = () => {
    const target = document.getElementById("service-overview");

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    window.location.href = "/home#service-overview";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center px-4 py-4 md:px-6 lg:py-5">
        <Link
          href="/home"
          className="flex items-center"
          aria-label="Trendre Home"
        >
          <img
            src="/brand/trend-mart-logo.png"
            alt="Trendre"
            className="h-8 w-auto object-contain md:h-9"
          />
        </Link>

        <nav className="hidden items-center justify-center gap-9 text-sm font-black text-slate-700 md:flex">
          <button
            type="button"
            onClick={scrollToOverview}
            className="transition hover:text-slate-950"
          >
            {copy.overview}
          </button>

          <Link href="/b/creators" className="transition hover:text-slate-950">
            {copy.creatorSearch}
          </Link>

          <Link href="/b/billing" className="transition hover:text-slate-950">
            {copy.pricing}
          </Link>
        </nav>

        <div className="hidden items-center justify-end gap-4 md:flex">
          <Link
            href="/login"
            className="text-sm font-black text-slate-700 transition hover:text-slate-950"
          >
            {copy.login}
          </Link>

          <Link
            href="/signup/company"
            className="rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
          >
            {copy.companySignup}
          </Link>

          <LocaleDropdown />
        </div>

        <div className="flex items-center justify-end gap-2 md:hidden">
          <Link
            href="/login"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
          >
            {copy.login}
          </Link>

          <Link
            href="/signup/company"
            className="rounded-full bg-[#ff5f67] px-3 py-2 text-xs font-black text-white shadow-md shadow-rose-500/20"
          >
            {locale === "ja" ? "無料登録" : "Join"}
          </Link>
        </div>
      </div>
    </header>
  );
}