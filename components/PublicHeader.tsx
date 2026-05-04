//app/components/PublicHeader.tsx
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
        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
          locale === "ja"
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        JA
      </button>

      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
          locale === "en"
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
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
          brand: "Trendre",
          home: "Home",
          creators: "クリエイター向け",
          companies: "企業向け",
          login: "ログイン",
          signupCreator: "クリエイター登録",
          signupCompany: "企業登録",
        }
      : {
          brand: "Trendre",
          home: "Home",
          creators: "For Creators",
          companies: "For Companies",
          login: "Login",
          signupCreator: "Creator Signup",
          signupCompany: "Company Signup",
        };

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            {copy.brand}
          </Link>
          <div className="lg:hidden">
            <LocaleTabs />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
            <Link href="/" className="hover:text-black">
              {copy.home}
            </Link>
            <Link href="/for-creators" className="hover:text-black">
              {copy.creators}
            </Link>
            <Link href="/for-companies" className="hover:text-black">
              {copy.companies}
            </Link>
          </nav>

          <div className="hidden lg:block">
            <LocaleTabs />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {copy.login}
            </Link>

            <Link
              href="/signup/creator-entry"
              className="rounded-xl border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              {copy.signupCreator}
            </Link>

            <Link
              href="/signup/company-entry"
              className="rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {copy.signupCompany}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}