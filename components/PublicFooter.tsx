//app/components/PublicFooter.tsx
"use client";

import Link from "next/link";
import { useAppLocale } from "@/lib/i18n/locale";

export default function PublicFooter() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          brand: "Trendre",
          description:
            "企業がクリエイターを探して直接依頼できるインフルエンサーマッチングサービス。",
          home: "Home",
          creators: "クリエイター向け",
          companies: "企業向け",
          login: "ログイン",
          creatorSignup: "クリエイター登録",
          companySignup: "企業登録",
          terms: "利用規約",
          privacy: "プライバシーポリシー",
          legal: "事業者情報",
          copyright: "© 2026 Trendre",
        }
      : {
          brand: "Trendre",
          description:
            "An influencer matching service where companies can discover creators and send direct requests.",
          home: "Home",
          creators: "For Creators",
          companies: "For Companies",
          login: "Login",
          creatorSignup: "Creator Signup",
          companySignup: "Company Signup",
          terms: "Terms of Service",
          privacy: "Privacy Policy",
          legal: "Business Information",
          copyright: "© 2026 Trendre",
        };

  return (
    <footer className="mt-16 border-t bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-bold tracking-tight">{copy.brand}</p>
          <p className="mt-3 max-w-md text-sm leading-7 text-gray-600">
            {copy.description}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900">
            {locale === "ja" ? "サービス" : "Service"}
          </p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600">
            <Link href="/" className="hover:text-black">
              {copy.home}
            </Link>
            <Link href="/for-creators" className="hover:text-black">
              {copy.creators}
            </Link>
            <Link href="/for-companies" className="hover:text-black">
              {copy.companies}
            </Link>
            <Link href="/login" className="hover:text-black">
              {copy.login}
            </Link>
            <Link href="/signup/creator-entry" className="hover:text-black">
              {copy.creatorSignup}
            </Link>
            <Link href="/signup/company-entry" className="hover:text-black">
              {copy.companySignup}
            </Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900">
            {locale === "ja" ? "ポリシー" : "Policies"}
          </p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600">
            <Link href="/terms" className="hover:text-black">
              {copy.terms}
            </Link>
            <Link href="/privacy" className="hover:text-black">
              {copy.privacy}
            </Link>
            <Link href="/legal" className="hover:text-black">
              {copy.legal}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-gray-500 md:px-6">
          {copy.copyright}
        </div>
      </div>
    </footer>
  );
}