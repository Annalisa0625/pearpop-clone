"use client";

import Link from "next/link";
import { useState } from "react";
import { LEGAL_UPDATED_AT, SUPPORT_EMAIL } from "@/lib/legal/release";

type Lang = "ja" | "en";
const UPDATED_AT = LEGAL_UPDATED_AT;

const copy = {
  ja: {
    eyebrow: "Trendre",
    title: "事業者情報",
    updated: `最終更新日：${UPDATED_AT}`,
    intro:
      "このページは、現在公開しているTrendre、TrendMartおよびTrendre Linkに関する運営情報です。Creator向け機能を先行公開しており、企業向けMarketplaceの正式発注・決済機能は順次公開予定です。",
    rows: [
      ["サービス名", "Trendre / TrendMart / Trendre Link"],
      ["現在提供している内容", "Creator登録、公開プロフィール、SNS・ポートフォリオ、メニュー・価格の登録・公開、Trendre Linkページ、仕事相談、LINE通知連携"],
      ["企業向けMarketplace", "正式発注・決済・Creatorへの報酬支払機能は順次公開予定です。公開時には、価格、手数料、支払時期・方法、提供時期、キャンセル・返金その他必要な取引条件を申込み前に表示します。"],
      ["現在の対価・決済", "現在公開中のCreator登録・プロフィール公開等について、Creatorに登録料はかかりません。現時点では一般利用者向けの有料申込み・決済フローは公開していません。"],
      ["動作環境", "インターネット接続および最新の主要ブラウザでの利用を推奨します。通信費等は利用者の負担となります。"],
    ],
    disclosure:
      "代表者・所在地・電話番号その他、法令上の表示事項のうち本ページに掲載していない事項については、法令上開示が必要な場合、請求に応じて遅滞なく対応します。企業向け有料申込み・決済機能を正式公開する際は、適用法令に応じて必要な表示を追加・更新します。",
    links: ["利用規約", "プライバシーポリシー", "Creator向けページ"],
  },
  en: {
    eyebrow: "Trendre",
    title: "Business information",
    updated: `Last updated: ${UPDATED_AT}`,
    intro:
      "This page describes operator information for Trendre, TrendMart, and Trendre Link. Creator-side features are currently available first, while formal Marketplace ordering and payment features for brands will be released in stages.",
    rows: [
      ["Service", "Trendre / TrendMart / Trendre Link"],
      ["Currently available features", "Creator registration, public profiles, social accounts and portfolios, menu and price publishing, Trendre Link pages, work inquiries, and LINE notification linking"],
      ["Brand Marketplace", "Formal ordering, payment, and creator payout features will be released in stages. Before launch, applicable prices, fees, payment timing and methods, delivery timing, cancellation and refund rules, and other required transaction terms will be shown before an order is placed."],
      ["Current fees and payments", "Creator registration and currently available creator-profile features are free for creators. A general paid ordering or payment flow is not currently open to users."],
      ["Environment", "An internet connection and a current major browser are recommended. Users are responsible for their own connectivity costs."],
    ],
    disclosure:
      "Representative, address, telephone number, and other statutory information not continuously shown on this page will be provided without delay when disclosure is required by applicable law. When paid ordering and payment features are formally launched, required legal disclosures will be added or updated as appropriate.",
    links: ["Terms of Service", "Privacy Policy", "For Creators"],
  },
} as const;

export default function LegalPage() {
  const [lang, setLang] = useState<Lang>("ja");
  const t = copy[lang];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <header className="mb-9 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-slate-500">{t.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{t.title}</h1>
            <p className="mt-3 text-sm text-slate-500">{t.updated}</p>
          </div>
          <div className="inline-flex rounded-full border border-slate-200 p-1">
            <button type="button" onClick={() => setLang("ja")} className={`rounded-full px-3 py-1.5 text-sm ${lang === "ja" ? "bg-slate-900 text-white" : "text-slate-600"}`}>日本語</button>
            <button type="button" onClick={() => setLang("en")} className={`rounded-full px-3 py-1.5 text-sm ${lang === "en" ? "bg-slate-900 text-white" : "text-slate-600"}`}>English</button>
          </div>
        </header>

        <p className="text-sm leading-7 text-slate-700">{t.intro}</p>

        <dl className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-5">
          {t.rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-4 sm:grid-cols-[190px_1fr] sm:gap-5">
              <dt className="text-sm font-semibold">{label}</dt>
              <dd className="text-sm leading-7 text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-5 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold">{lang === "ja" ? "お問い合わせ" : "Contact"}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {lang === "ja"
              ? "サービスに関するお問い合わせ、利用規約・プライバシーポリシーに関するお問い合わせ、個人情報に関する請求、ならびに常時掲載していない事業者情報の開示請求は、以下の窓口で受け付けます。"
              : "For service support, questions about the Terms or Privacy Policy, personal-information requests, and requests for statutory business information not continuously displayed on this page, please contact:"}
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">{SUPPORT_EMAIL}</a>
        </section>

        <section className="mt-7 rounded-2xl bg-slate-50 p-5">
          <h2 className="text-sm font-semibold">{lang === "ja" ? "法定表示事項について" : "Statutory information"}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">{t.disclosure}</p>
        </section>

        <nav className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/terms" className="underline underline-offset-4">{t.links[0]}</Link>
          <Link href="/privacy" className="underline underline-offset-4">{t.links[1]}</Link>
          <Link href="/for-creators" className="underline underline-offset-4">{t.links[2]}</Link>
        </nav>
      </div>
    </main>
  );
}
