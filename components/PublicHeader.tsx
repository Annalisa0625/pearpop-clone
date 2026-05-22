// File: components/PublicHeader.tsx
"use client";

import Link from "next/link";
import { useAppLocale } from "@/lib/i18n/locale";

function LocaleTabs() {
  const { locale, setLocale } = useAppLocale();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLocale("ja")}
        className={`rounded-full border px-4 py-2 text-sm font-black transition ${
          locale === "ja"
            ? "border-slate-950 bg-slate-950 text-white"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        }`}
      >
        JA
      </button>

      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full border px-4 py-2 text-sm font-black transition ${
          locale === "en"
            ? "border-slate-950 bg-slate-950 text-white"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default function PublicHeader() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          home: "Home",
          companies: "企業向け",
          creators: "クリエイター向け",
          login: "ログイン",
          companySignup: "無料で企業登録",
          creatorSignup: "クリエイター登録",
        }
      : {
          home: "Home",
          companies: "For Brands",
          creators: "For Creators",
          login: "Login",
          companySignup: "Join as a Brand",
          creatorSignup: "Creator Signup",
        };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/home" className="flex items-center">
          <img
            src="/brand/trendre-logo-full.png"
            alt="Trendre"
            className="h-10 w-auto object-contain md:h-11"
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-black text-slate-700 md:flex">
          <Link href="/home" className="transition hover:text-slate-950">
            {copy.home}
          </Link>
          <Link href="/for-companies" className="transition hover:text-slate-950">
            {copy.companies}
          </Link>
          <Link href="/for-creators" className="transition hover:text-slate-950">
            {copy.creators}
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LocaleTabs />

          <Link
            href="/login"
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300"
          >
            {copy.login}
          </Link>

          <Link
            href="/signup/company"
            className="rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
          >
            {copy.companySignup}
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/signup/company"
            className="rounded-full bg-[#ff5f67] px-4 py-2 text-xs font-black text-white shadow-md shadow-rose-500/20"
          >
            {locale === "ja" ? "企業登録" : "Join"}
          </Link>
        </div>
      </div>
    </header>
  );
}