// File: app/b/billing/BillingClient.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppLocale } from "@/lib/i18n/locale";

type FuturePlan = {
  name: string;
  price: string;
  badgeJa: string;
  badgeEn: string;
  leadJa: string;
  leadEn: string;
  directJa: string;
  directEn: string;
  openJa: string;
  openEn: string;
};

const FUTURE_PLANS: FuturePlan[] = [
  {
    name: "Free",
    price: "¥0",
    badgeJa: "初期利用",
    badgeEn: "Starter",
    leadJa: "まずは少数の依頼から試したい企業向け。",
    leadEn: "For teams starting with a small number of requests.",
    directJa: "注文型：月6件まで",
    directEn: "Direct requests: up to 6 / month",
    openJa: "公募型：利用不可",
    openEn: "Open campaigns: unavailable",
  },
  {
    name: "Basic",
    price: "¥7,990",
    badgeJa: "注文型向け",
    badgeEn: "Direct",
    leadJa: "公開メニューから継続的に依頼したい企業向け。",
    leadEn: "For teams regularly using direct menu requests.",
    directJa: "注文型：無制限",
    directEn: "Direct requests: unlimited",
    openJa: "公募型：利用不可",
    openEn: "Open campaigns: unavailable",
  },
  {
    name: "Pro",
    price: "¥28,800",
    badgeJa: "公募も利用",
    badgeEn: "Open campaigns",
    leadJa: "商品提供や報酬ありの募集も試したい企業向け。",
    leadEn: "For teams testing product or paid open campaigns.",
    directJa: "注文型：無制限",
    directEn: "Direct requests: unlimited",
    openJa: "公募型：月1件 / 採用10件まで",
    openEn: "Open campaigns: 1 / month, up to 10 hires",
  },
  {
    name: "Premium",
    price: "¥49,900",
    badgeJa: "本格運用",
    badgeEn: "Scale",
    leadJa: "注文型・公募型をどちらも本格的に使いたい企業向け。",
    leadEn: "For teams scaling both direct and open campaigns.",
    directJa: "注文型：無制限",
    directEn: "Direct requests: unlimited",
    openJa: "公募型：無制限",
    openEn: "Open campaigns: unlimited",
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 10h10.5M10.5 5.5 15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanCard({
  plan,
  safeLocale,
}: {
  plan: FuturePlan;
  safeLocale: "ja" | "en";
}) {
  return (
    <article className="relative flex min-h-[480px] flex-col rounded-[32px] bg-slate-50/80 p-6 opacity-55 grayscale ring-1 ring-slate-200 shadow-[0_18px_55px_rgba(15,23,42,0.035)]">
      <div className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-400 ring-1 ring-slate-200">
        {safeLocale === "ja" ? "準備中" : "Preparing"}
      </div>

      <div className="pr-24">
        <p className="text-[11px] font-black tracking-[0.2em] text-slate-400">
          {safeLocale === "ja" ? plan.badgeJa : plan.badgeEn}
        </p>
        <h2 className="mt-3 text-[34px] font-black tracking-[-0.075em] text-slate-900">
          {plan.name}
        </h2>
      </div>

      <p className="mt-5 min-h-[56px] text-sm font-semibold leading-7 text-slate-500">
        {safeLocale === "ja" ? plan.leadJa : plan.leadEn}
      </p>

      <div className="mt-7 rounded-[26px] bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-end gap-2">
          <p className="text-[42px] font-black leading-none tracking-[-0.08em] text-slate-900">
            {plan.price}
          </p>
          <p className="pb-1 text-sm font-black text-slate-400">
            {safeLocale === "ja" ? "/月" : "/month"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <div className="rounded-[20px] bg-white px-4 py-3 ring-1 ring-slate-200">
          <p className="text-[11px] font-black text-slate-400">
            {safeLocale === "ja" ? "注文型" : "Direct"}
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {safeLocale === "ja" ? plan.directJa : plan.directEn}
          </p>
        </div>

        <div className="rounded-[20px] bg-white px-4 py-3 ring-1 ring-slate-200">
          <p className="text-[11px] font-black text-slate-400">
            {safeLocale === "ja" ? "公募型" : "Open"}
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {safeLocale === "ja" ? plan.openJa : plan.openEn}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="mt-auto cursor-not-allowed rounded-full bg-slate-200 px-5 py-3.5 text-sm font-black text-slate-500"
      >
        {safeLocale === "ja" ? "現在は選択できません" : "Not available yet"}
      </button>
    </article>
  );
}

export default function BillingClient() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "月額プラン",
            body:
              "月額プランは準備中です。現在、月額のサービス利用料はかかりません。案件が成立した場合のみ、案件ごとの手数料が発生します。",
            search: "インフルエンサーを探す",
            dashboard: "ダッシュボードへ戻る",
            terms: "利用規約",
            legal: "事業者情報",
          }
        : {
            title: "Monthly plans",
            body:
              "Monthly plans are being prepared. There is no monthly service fee today. A per-order fee applies only when an order is successfully placed.",
            search: "Find influencers",
            dashboard: "Back to dashboard",
            terms: "Terms",
            legal: "Business information",
          },
    [safeLocale]
  );

  return (
    <div className="relative min-h-[calc(100vh-80px)] bg-[#f8f9fb]">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-12 md:px-6 md:py-8">
        <section className="rounded-[34px] border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.055)] md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-black tracking-[0.2em] text-[#ff5f67]">
                COMING SOON
              </p>
              <h1 className="mt-3 text-[40px] font-black leading-[1.05] tracking-[-0.075em] text-slate-950 md:text-[58px]">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-8 text-slate-500 md:text-base">
                {copy.body}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
              <Link
                href="/b/creators"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_rgba(255,95,103,0.18)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
              >
                {copy.search}
                <ArrowIcon />
              </Link>
              <Link
                href="/b/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3.5 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
              >
                {copy.dashboard}
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FUTURE_PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} safeLocale={safeLocale} />
          ))}
        </section>

        <p className="mt-5 text-xs font-semibold leading-6 text-slate-400">
          <Link href="/terms" target="_blank" className="underline underline-offset-4">
            {copy.terms}
          </Link>
          {" / "}
          <Link href="/legal" target="_blank" className="underline underline-offset-4">
            {copy.legal}
          </Link>
        </p>
      </div>
    </div>
  );
}
