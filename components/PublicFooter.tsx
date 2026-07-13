// File: components/PublicFooter.tsx
"use client";

import Link from "next/link";
import { useAppLocale } from "@/lib/i18n/locale";

export default function PublicFooter() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          service: "サービス",
          overview: "サービス概要",
          search: "インフルエンサー検索",
          login: "ログイン",
          companySignup: "企業登録",
          policy: "ポリシー",
          terms: "利用規約",
          privacy: "プライバシーポリシー",
          legal: "事業者情報",
        }
      : {
          service: "Service",
          overview: "Overview",
          search: "Influencer Search",
          login: "Login",
          companySignup: "Brand Signup",
          policy: "Policy",
          terms: "Terms",
          privacy: "Privacy Policy",
          legal: "Business Information",
        };

  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 md:grid-cols-[1.3fr_0.7fr_0.7fr] md:px-6">
        <div>
          <Link href="/home" className="inline-flex items-center">
            <img
              src="/brand/trend-mart-logo.png"
              alt="Trendre"
              className="h-11 w-auto object-contain"
            />
          </Link>
        </div>

        <div>
          <p className="text-sm font-black text-slate-950">{copy.service}</p>

          <div className="mt-5 grid gap-3 text-sm font-medium text-slate-500">
            <Link href="/home#service-overview" className="hover:text-slate-950">
              {copy.overview}
            </Link>

            <Link href="/b/creators" className="hover:text-slate-950">
              {copy.search}
            </Link>

            <Link href="/login" className="hover:text-slate-950">
              {copy.login}
            </Link>

            <Link href="/signup/company" className="hover:text-slate-950">
              {copy.companySignup}
            </Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-black text-slate-950">{copy.policy}</p>

          <div className="mt-5 grid gap-3 text-sm font-medium text-slate-500">
            <Link href="/terms" className="hover:text-slate-950">
              {copy.terms}
            </Link>

            <Link href="/privacy" className="hover:text-slate-950">
              {copy.privacy}
            </Link>

            <Link href="/legal" className="hover:text-slate-950">
              {copy.legal}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 text-xs font-medium text-slate-400 md:px-6">
          <p>© 2026 Trendre</p>
        </div>
      </div>
    </footer>
  );
}