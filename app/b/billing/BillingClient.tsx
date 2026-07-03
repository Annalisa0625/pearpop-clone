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

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m4.75 10.3 3.05 3.05 7.45-7.7"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CurrentItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white/10 px-4 py-4 ring-1 ring-white/10">
      <p className="text-xs font-bold text-white/45">{label}</p>
      <p className="mt-2 text-lg font-black tracking-[-0.04em] text-white">{value}</p>
    </div>
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
    <article className="relative overflow-hidden rounded-[28px] bg-slate-50/85 p-5 opacity-70 grayscale-[0.25] ring-1 ring-slate-200/80">
      <div className="absolute inset-x-0 top-0 h-1 bg-slate-200" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black tracking-[0.18em] text-slate-400">
            {safeLocale === "ja" ? "準備中" : "COMING SOON"}
          </p>
          <h3 className="mt-2 text-[28px] font-black tracking-[-0.06em] text-slate-900">
            {plan.name}
          </h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          {safeLocale === "ja" ? plan.badgeJa : plan.badgeEn}
        </span>
      </div>

      <p className="mt-4 min-h-[52px] text-sm font-semibold leading-7 text-slate-500">
        {safeLocale === "ja" ? plan.leadJa : plan.leadEn}
      </p>

      <div className="mt-5 rounded-[24px] bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-end gap-2">
          <p className="text-[38px] font-black leading-none tracking-[-0.075em] text-slate-900">
            {plan.price}
          </p>
          <p className="pb-1 text-sm font-black text-slate-400">
            {safeLocale === "ja" ? "/月" : "/month"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-slate-200">
          <p className="text-[11px] font-black text-slate-400">
            {safeLocale === "ja" ? "注文型" : "Direct"}
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {safeLocale === "ja" ? plan.directJa : plan.directEn}
          </p>
        </div>
        <div className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-slate-200">
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
        className="mt-5 w-full cursor-not-allowed rounded-full bg-slate-200 px-5 py-3 text-sm font-black text-slate-500"
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
            title: "料金",
            body:
              "現在は月額プラン契約なしで利用できます。インフルエンサーへの依頼、支払い、納品確認までそのまま進められます。",
            currentTitle: "現在の利用条件",
            currentBody:
              "月額料金は発生しません。公開メニューからインフルエンサーへ依頼できます。",
            search: "インフルエンサーを探す",
            dashboard: "ダッシュボードへ戻る",
            now1: "月額",
            now1Value: "なし",
            now2: "注文型依頼",
            now2Value: "利用可能",
            now3: "案件手数料",
            now3Value: "10%",
            futureTitle: "月額プラン",
            futureBody:
              "下記プランは準備中です。現在は選択できないため、契約や請求は発生しません。",
            noteTitle: "現在できること",
            noteBody:
              "企業登録後、公開メニューの確認、依頼、Stripe決済、チャット、納品確認まで利用できます。公募型案件は今後追加予定です。",
            terms: "利用規約",
            legal: "事業者情報",
          }
        : {
            title: "Billing",
            body:
              "You can currently use Trendre without a monthly subscription. Send influencer requests, pay, and review delivery as usual.",
            currentTitle: "Current access",
            currentBody:
              "No monthly fee is charged. You can request influencers from public menus.",
            search: "Find influencers",
            dashboard: "Back to dashboard",
            now1: "Monthly fee",
            now1Value: "None",
            now2: "Direct requests",
            now2Value: "Available",
            now3: "Order fee",
            now3Value: "10%",
            futureTitle: "Monthly plans",
            futureBody:
              "The plans below are being prepared. They cannot be selected now, so no subscription will be charged.",
            noteTitle: "Available now",
            noteBody:
              "After creating a brand account, you can view public menus, send requests, pay with Stripe, chat, and review deliveries. Open campaigns will be added later.",
            terms: "Terms",
            legal: "Business information",
          },
    [safeLocale]
  );

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/25 to-transparent" />
      <div className="pointer-events-none absolute right-[-280px] top-[120px] h-[560px] w-[560px] rounded-full bg-emerald-100/18 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 pb-12 md:px-6 md:py-8">
        <section className="overflow-hidden rounded-[34px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="p-6 md:p-8 lg:p-10">
              <p className="text-[12px] font-black tracking-[0.2em] text-[#ff5f67]">
                BILLING
              </p>
              <h1 className="mt-4 text-[38px] font-black leading-[1.05] tracking-[-0.075em] text-slate-950 md:text-[58px]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-xl text-sm font-semibold leading-8 text-slate-500 md:text-base">
                {copy.body}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/b/creators"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_rgba(255,95,103,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
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

            <div className="bg-slate-950 p-6 text-white md:p-8 lg:p-10">
              <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70 ring-1 ring-white/10">
                {copy.currentTitle}
              </p>

              <h2 className="mt-5 text-[32px] font-black leading-tight tracking-[-0.07em] md:text-[44px]">
                月額なしで利用できます
              </h2>

              <p className="mt-4 max-w-xl text-sm font-semibold leading-8 text-white/65">
                {copy.currentBody}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <CurrentItem label={copy.now1} value={copy.now1Value} />
                <CurrentItem label={copy.now2} value={copy.now2Value} />
                <CurrentItem label={copy.now3} value={copy.now3Value} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[30px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[28px] font-black tracking-[-0.06em] text-slate-950">
                {copy.noteTitle}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                {copy.noteBody}
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-2">
              {[
                safeLocale === "ja" ? "検索" : "Search",
                safeLocale === "ja" ? "依頼" : "Request",
                safeLocale === "ja" ? "納品確認" : "Review",
              ].map((item) => (
                <div
                  key={item}
                  className="flex min-w-[72px] flex-col items-center rounded-2xl bg-emerald-50 px-3 py-3 text-emerald-700 ring-1 ring-emerald-100"
                >
                  <CheckIcon />
                  <span className="mt-1 text-xs font-black">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-9">
          <div className="max-w-3xl">
            <p className="text-[12px] font-black tracking-[0.18em] text-slate-400">
              COMING SOON
            </p>
            <h2 className="mt-2 text-[32px] font-black tracking-[-0.07em] text-slate-950 md:text-[46px]">
              {copy.futureTitle}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
              {copy.futureBody}
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FUTURE_PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} safeLocale={safeLocale} />
            ))}
          </div>

          <p className="mt-5 text-xs font-semibold leading-6 text-slate-400">
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
