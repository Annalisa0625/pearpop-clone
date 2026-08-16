"use client";

import Link from "next/link";
import { useState } from "react";
import { LEGAL_UPDATED_AT, SUPPORT_EMAIL } from "@/lib/legal/release";

type Lang = "ja" | "en";
const UPDATED_AT = LEGAL_UPDATED_AT;

const copy = {
  ja: {
    eyebrow: "Trendre", title: "事業者情報", updated: `最終更新日：${UPDATED_AT}`,
    intro: "このページは、現在公開しているTrendreおよびTrendre Linkに関する運営情報です。Trendre Linkは、Creatorがプロフィールや活動内容を公開し、仕事の相談を受け取るための機能です。",
    rows: [
      ["サービス名", "Trendre / Trendre Link"],
      ["現在提供している内容", "Creator登録、公開プロフィール、Linkページ、仕事相談フォーム"],
      ["対価・決済", "現在の公開機能には、利用者へ課金する申込み・決済機能は含まれません。"],
      ["動作環境", "インターネット接続および最新の主要ブラウザでの利用を推奨します。通信費等は利用者の負担となります。"],
    ],
    disclosure: "代表者・所在地・電話番号その他、法令上の表示事項のうち本ページに掲載していない事項については、請求があった場合に法令に従い遅滞なく開示します。開示請求およびサービスに関する連絡は、サービス内で案内する正式なお問い合わせ窓口で受け付けます。",
    links: ["利用規約", "プライバシーポリシー", "ログインへ戻る"],
  },
  en: {
    eyebrow: "Trendre", title: "Business information", updated: `Last updated: ${UPDATED_AT}`,
    intro: "This page describes the operator information for the currently available Trendre and Trendre Link services. Trendre Link lets creators publish a profile and receive work inquiries.",
    rows: [
      ["Service", "Trendre / Trendre Link"],
      ["Currently available features", "Creator registration, public profiles, Link pages, and work inquiry forms"],
      ["Fees and payments", "The currently available public features do not include a paid application or payment flow for users."],
      ["Environment", "An internet connection and a current major browser are recommended. Users are responsible for their own connectivity costs."],
    ],
    disclosure: "Representative, address, telephone number, and other statutory information not shown on this page will be disclosed without delay in accordance with applicable law upon request. Requests for disclosure and service-related contact are accepted through the official contact channel announced in the Service.",
    links: ["Terms of Service", "Privacy Policy", "Back to login"],
  },
} as const;

export default function LegalPage() {
  const [lang, setLang] = useState<Lang>("ja");
  const t = copy[lang];
  return <main className="min-h-screen bg-white text-slate-900"><div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
    <header className="mb-9 flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-medium text-slate-500">{t.eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{t.title}</h1><p className="mt-3 text-sm text-slate-500">{t.updated}</p></div><div className="inline-flex rounded-full border border-slate-200 p-1"><button type="button" onClick={() => setLang("ja")} className={`rounded-full px-3 py-1.5 text-sm ${lang === "ja" ? "bg-slate-900 text-white" : "text-slate-600"}`}>日本語</button><button type="button" onClick={() => setLang("en")} className={`rounded-full px-3 py-1.5 text-sm ${lang === "en" ? "bg-slate-900 text-white" : "text-slate-600"}`}>English</button></div></header>
    <p className="text-sm leading-7 text-slate-700">{t.intro}</p>
    <dl className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-5">{t.rows.map(([label, value]) => <div key={label} className="grid gap-1 py-4 sm:grid-cols-[190px_1fr] sm:gap-5"><dt className="text-sm font-semibold">{label}</dt><dd className="text-sm leading-7 text-slate-700">{value}</dd></div>)}</dl>
    <section className="mt-5 rounded-2xl border border-slate-200 p-5"><h2 className="text-sm font-semibold">{lang === "ja" ? "お問い合わせ" : "Contact"}</h2><p className="mt-2 text-sm leading-7 text-slate-700">{lang === "ja" ? "サービスに関するお問い合わせ、利用規約・プライバシーポリシーに関するお問い合わせ、個人情報に関する請求、ならびに常時掲載していない事業者情報の開示請求は、以下の窓口で受け付けます。" : "For service support, questions about these Terms or the Privacy Policy, personal-information requests, and requests for statutory business information not continuously displayed on this page, please contact:"}</p><a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">{SUPPORT_EMAIL}</a></section>
    <section className="mt-7 rounded-2xl bg-slate-50 p-5"><h2 className="text-sm font-semibold">{lang === "ja" ? "法定表示事項について" : "Statutory information"}</h2><p className="mt-2 text-sm leading-7 text-slate-700">{t.disclosure}</p></section>
    <nav className="mt-10 flex flex-wrap gap-4 text-sm"><Link href="/terms" className="underline underline-offset-4">{t.links[0]}</Link><Link href="/privacy" className="underline underline-offset-4">{t.links[1]}</Link><Link href="/login" className="underline underline-offset-4">{t.links[2]}</Link></nav>
  </div></main>;
}
