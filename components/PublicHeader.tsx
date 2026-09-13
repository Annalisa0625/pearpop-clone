// File: components/PublicHeader.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import LocaleSelector from "@/components/i18n/LocaleSelector";
import { useAppLocale } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/types";

function LocaleDropdown({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useAppLocale({ allLocales: true });
  return <LocaleSelector value={locale} onChange={setLocale} variant="select" ariaLabel="UI language" className={className} />;
}

const PUBLIC_HEADER_COPY: Record<AppLocale, {
  overview: string;
  creatorSearch: string;
  pricing: string;
  login: string;
  companySignup: string;
  mobileSignup: string;
}> = {
  ja: {
    overview: "サービス概要",
    creatorSearch: "インフルエンサーを探す",
    pricing: "料金プラン",
    login: "ログイン",
    companySignup: "無料で企業登録",
    mobileSignup: "無料登録",
  },
  en: {
    overview: "Overview",
    creatorSearch: "Find Influencers",
    pricing: "Pricing",
    login: "Login",
    companySignup: "Join as a Brand",
    mobileSignup: "Join",
  },
  ko: {
    overview: "서비스 소개",
    creatorSearch: "크리에이터 찾기",
    pricing: "요금제",
    login: "로그인",
    companySignup: "기업 무료 가입",
    mobileSignup: "무료 가입",
  },
  "zh-TW": {
    overview: "服務介紹",
    creatorSearch: "尋找創作者",
    pricing: "方案與費用",
    login: "登入",
    companySignup: "品牌免費註冊",
    mobileSignup: "免費註冊",
  },
};

export default function PublicHeader() {
  const { locale } = useAppLocale({ allLocales: true });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const copy = PUBLIC_HEADER_COPY[locale];

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
      <div className="relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center px-4 py-4 md:grid-cols-[auto_1fr_auto] md:px-6 lg:py-5">
        <Link
          href="/home"
          className="flex min-w-0 items-center"
          aria-label="Trend Mart Home"
        >
          <img
            src="/brand/trend-mart-logo.png"
            alt="Trend Mart"
            className="h-[22px] max-w-full object-contain object-left md:h-[25px]"
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

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-bold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 md:hidden"
          aria-label="Menu"
          aria-controls="public-header-mobile-menu"
          aria-expanded={mobileMenuOpen}
        >
          <span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span>
        </button>

        {mobileMenuOpen ? (
          <div
            id="public-header-mobile-menu"
            className="absolute inset-x-4 top-full grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl shadow-slate-950/10 md:hidden"
          >
            <LocaleDropdown className="w-full" />
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
            >
              {copy.login}
            </Link>
            <Link
              href="/signup/company"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center justify-center rounded-xl bg-[#ff5f67] px-4 text-sm font-black text-white shadow-md shadow-rose-500/20"
            >
              {copy.mobileSignup}
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
