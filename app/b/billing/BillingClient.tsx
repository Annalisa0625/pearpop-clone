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
  index,
  safeLocale,
}: {
  plan: FuturePlan;
  index: number;
  safeLocale: "ja" | "en";
}) {
  const highlighted = plan.name === "Pro";

  return (
    <article
      className={`group relative flex min-h-[520px] w-[82vw] max-w-[340px] shrink-0 snap-center flex-col overflow-hidden rounded-[34px] bg-white p-6 ring-1 transition duration-300 hover:-translate-y-2 hover:shadow-[0_32px_90px_rgba(15,23,42,0.13)] sm:w-[340px] ${
        highlighted
          ? "ring-[#ff5f67]/25 shadow-[0_24px_80px_rgba(255,95,103,0.12)]"
          : "ring-slate-100 shadow-[0_22px_70px_rgba(15,23,42,0.06)]"
      }`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-50 to-transparent" />
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl transition duration-300 group-hover:scale-125 ${
          highlighted ? "bg-rose-100/80" : "bg-slate-100/90"
        }`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black tracking-[0.2em] text-slate-400">
            {safeLocale === "ja" ? "準備中" : "COMING SOON"}
          </p>
          <h2 className="mt-3 text-[34px] font-black tracking-[-0.075em] text-slate-950">
            {plan.name}
          </h2>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
            highlighted
              ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
              : "bg-slate-50 text-slate-500 ring-slate-100"
          }`}
        >
          {safeLocale === "ja" ? plan.badgeJa : plan.badgeEn}
        </span>
      </div>

      <p className="relative mt-5 min-h-[56px] text-sm font-semibold leading-7 text-slate-500">
        {safeLocale === "ja" ? plan.leadJa : plan.leadEn}
      </p>

      <div className="relative mt-7 rounded-[28px] bg-slate-950 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="flex items-end gap-2">
          <p className="text-[42px] font-black leading-none tracking-[-0.08em]">
            {plan.price}
          </p>
          <p className="pb-1 text-sm font-black text-white/45">
            {safeLocale === "ja" ? "/月" : "/month"}
          </p>
        </div>
        <p className="mt-3 text-xs font-bold leading-5 text-white/55">
          {safeLocale === "ja"
            ? "現在は選択できません。"
            : "Not available yet."}
        </p>
      </div>

      <div className="relative mt-5 grid gap-2">
        <div className="rounded-[22px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
          <p className="text-[11px] font-black text-slate-400">
            {safeLocale === "ja" ? "注文型" : "Direct"}
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {safeLocale === "ja" ? plan.directJa : plan.directEn}
          </p>
        </div>

        <div className="rounded-[22px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
          <p className="text-[11px] font-black text-slate-400">
            {safeLocale === "ja" ? "公募型" : "Open"}
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {safeLocale === "ja" ? plan.openJa : plan.openEn}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="relative mt-auto cursor-not-allowed rounded-full bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-400"
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
              "現在、月額プランは準備中です。月額のサービス利用料はかかりません。案件が成立した場合のみ、案件ごとの手数料が発生します。",
            search: "インフルエンサーを探す",
            dashboard: "ダッシュボードへ戻る",
            note:
              "下記プランは現在選択できません。契約や月額請求は発生しません。",
            terms: "利用規約",
            legal: "事業者情報",
          }
        : {
            title: "Monthly plans",
            body:
              "Monthly plans are being prepared. There is no monthly service fee today. A per-order fee applies only when an order is successfully placed.",
            search: "Find influencers",
            dashboard: "Back to dashboard",
            note:
              "The plans below cannot be selected yet. No subscription or monthly charge will be created.",
            terms: "Terms",
            legal: "Business information",
          },
    [safeLocale]
  );

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute left-[-240px] top-[180px] h-[480px] w-[480px] rounded-full bg-rose-100/30 blur-[160px]" />
      <div className="pointer-events-none absolute right-[-260px] top-[160px] h-[520px] w-[520px] rounded-full bg-emerald-100/25 blur-[170px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 pb-14 md:px-6 md:py-8">
        <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[12px] font-black tracking-[0.2em] text-[#ff5f67]">
              COMING SOON
            </p>
            <h1 className="mt-3 text-[40px] font-black leading-[1.05] tracking-[-0.075em] text-slate-950 md:text-[64px]">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-8 text-slate-500 md:text-base">
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
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-black text-slate-800 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              {copy.dashboard}
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {FUTURE_PLANS.map((plan, index) => (
              <PlanCard
                key={plan.name}
                plan={plan}
                index={index}
                safeLocale={safeLocale}
              />
            ))}
          </div>
        </section>

        <section className="mt-2 flex flex-col gap-3 rounded-[28px] bg-white/80 p-5 ring-1 ring-slate-100 backdrop-blur md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm font-semibold leading-7 text-slate-500">
            {copy.note}
          </p>

          <p className="shrink-0 text-xs font-semibold leading-6 text-slate-400">
            <Link href="/terms" target="_blank" className="underline underline-offset-4">
              {copy.terms}
            </Link>
            {" / "}
            <Link href="/legal" target="_blank" className="underline underline-offset-4">
              {copy.legal}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
