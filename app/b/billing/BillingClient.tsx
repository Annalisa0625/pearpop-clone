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

function CurrentLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] bg-slate-50 px-4 py-4">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-sm font-black text-slate-950">{value}</span>
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
    <article className="relative overflow-hidden rounded-[28px] bg-slate-50/85 p-5 opacity-60 grayscale ring-1 ring-slate-200/90">
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
              "月額のサービス利用料はかかりません。案件が成立した場合のみ、案件ごとの手数料が発生します。",
            search: "インフルエンサーを探す",
            dashboard: "ダッシュボードへ戻る",
            currentTitle: "現在の料金",
            currentLead: "まずは公開メニューから、月額なしで依頼できます。",
            line1: "月額サービス利用料",
            line1Value: "¥0",
            line2: "請求タイミング",
            line2Value: "案件成立時のみ",
            line3: "案件手数料",
            line3Value: "10%",
            flowTitle: "利用の流れ",
            futureTitle: "月額プラン",
            futureBody:
              "下記プランは準備中です。現在は選択できないため、契約や月額請求は発生しません。",
            terms: "利用規約",
            legal: "事業者情報",
          }
        : {
            title: "Billing",
            body:
              "There is no monthly service fee. A per-order fee applies only when an order is successfully placed.",
            search: "Find influencers",
            dashboard: "Back to dashboard",
            currentTitle: "Current pricing",
            currentLead: "You can start with public menu requests without a monthly plan.",
            line1: "Monthly service fee",
            line1Value: "¥0",
            line2: "When you pay",
            line2Value: "Only when an order is placed",
            line3: "Order fee",
            line3Value: "10%",
            flowTitle: "How it works",
            futureTitle: "Monthly plans",
            futureBody:
              "The plans below are being prepared. They cannot be selected now, so no monthly subscription will be charged.",
            terms: "Terms",
            legal: "Business information",
          },
    [safeLocale]
  );

  const flow =
    safeLocale === "ja"
      ? [
          { label: "探す", body: "公開メニューから候補を確認" },
          { label: "依頼", body: "内容を確認して注文" },
          { label: "支払い", body: "Stripeで安全に決済" },
          { label: "納品確認", body: "内容を確認して完了" },
        ]
      : [
          { label: "Search", body: "Review public menus" },
          { label: "Request", body: "Confirm and order" },
          { label: "Pay", body: "Secure Stripe payment" },
          { label: "Review", body: "Review delivery" },
        ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] bg-[#f8f9fb]">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-12 md:px-6 md:py-8">
        <section className="rounded-[34px] border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.055)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)] lg:items-center">
            <div>
              <p className="text-[12px] font-black tracking-[0.2em] text-[#ff5f67]">
                BILLING
              </p>
              <h1 className="mt-4 text-[42px] font-black leading-[1.05] tracking-[-0.075em] text-slate-950 md:text-[58px]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-xl text-sm font-semibold leading-8 text-slate-500 md:text-base">
                {copy.body}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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

            <div className="rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-100 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-black tracking-[0.18em] text-slate-400">
                    CURRENT
                  </p>
                  <h2 className="mt-2 text-[28px] font-black tracking-[-0.06em] text-slate-950">
                    {copy.currentTitle}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                    {copy.currentLead}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  利用可能
                </span>
              </div>

              <div className="mt-5 grid gap-2">
                <CurrentLine label={copy.line1} value={copy.line1Value} />
                <CurrentLine label={copy.line2} value={copy.line2Value} />
                <CurrentLine label={copy.line3} value={copy.line3Value} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.04)] md:p-6">
          <h2 className="text-[24px] font-black tracking-[-0.055em] text-slate-950">
            {copy.flowTitle}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {flow.map((item, index) => (
              <div key={item.label} className="rounded-[22px] bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-black tracking-[0.16em] text-[#ff5f67]">
                  0{index + 1}
                </p>
                <p className="mt-2 text-sm font-black text-slate-950">{item.label}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                  {item.body}
                </p>
              </div>
            ))}
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
