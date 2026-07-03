// File: app/b/billing/BillingClient.tsx
"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useAppLocale } from "@/lib/i18n/locale";

type FuturePlan = {
  name: string;
  price: string;
  badgeJa?: string;
  badgeEn?: string;
  leadJa: string;
  leadEn: string;
  orderJa: string;
  orderEn: string;
  publicJa: string;
  publicEn: string;
  featuresJa: string[];
  featuresEn: string[];
  tone: "free" | "basic" | "pro" | "premium";
};

const FUTURE_PLANS: FuturePlan[] = [
  {
    name: "Free",
    price: "¥0",
    badgeJa: "初期利用",
    badgeEn: "Starter",
    leadJa: "まずは注文型の依頼を試したい企業向け。",
    leadEn: "For brands that want to try direct requests first.",
    orderJa: "注文型：月6件まで",
    orderEn: "Direct requests: up to 6 / month",
    publicJa: "公募型：利用不可",
    publicEn: "Open campaigns: unavailable",
    featuresJa: ["インフルエンサー検索", "公開メニューへの依頼", "注文内チャット", "納品確認"],
    featuresEn: ["Influencer search", "Request public menus", "In-order chat", "Delivery review"],
    tone: "free",
  },
  {
    name: "Basic",
    price: "¥7,990",
    badgeJa: "注文型向け",
    badgeEn: "Direct requests",
    leadJa: "毎月安定してインフルエンサーへ依頼したい企業向け。",
    leadEn: "For brands that use influencer requests regularly.",
    orderJa: "注文型：無制限",
    orderEn: "Direct requests: unlimited",
    publicJa: "公募型：利用不可",
    publicEn: "Open campaigns: unavailable",
    featuresJa: ["Freeの全機能", "注文型案件の上限なし", "保存済みリスト活用", "継続依頼に最適"],
    featuresEn: ["Everything in Free", "Unlimited direct requests", "Saved influencer list", "Built for repeat requests"],
    tone: "basic",
  },
  {
    name: "Pro",
    price: "¥28,800",
    badgeJa: "公募を試せる",
    badgeEn: "Open campaign trial",
    leadJa: "商品提供や報酬ありの公募型施策も試したい企業向け。",
    leadEn: "For brands that want to test open campaigns.",
    orderJa: "注文型：無制限",
    orderEn: "Direct requests: unlimited",
    publicJa: "公募型：月1件 / 採用10件まで",
    publicEn: "Open campaigns: 1 / month, up to 10 hires",
    featuresJa: ["Basicの全機能", "公募型案件ページ 月1件", "応募者から最大10件採用", "商品提供・報酬ありに対応"],
    featuresEn: ["Everything in Basic", "1 open campaign page / month", "Hire up to 10 applicants", "Product or paid campaigns"],
    tone: "pro",
  },
  {
    name: "Premium",
    price: "¥49,900",
    badgeJa: "成長企業向け",
    badgeEn: "Scale",
    leadJa: "注文型も公募型も本格的に回したい企業向け。",
    leadEn: "For teams scaling both direct and open campaigns.",
    orderJa: "注文型：無制限",
    orderEn: "Direct requests: unlimited",
    publicJa: "公募型：無制限",
    publicEn: "Open campaigns: unlimited",
    featuresJa: ["Proの全機能", "公募型案件ページ 無制限", "採用数 無制限", "優先サポート"],
    featuresEn: ["Everything in Pro", "Unlimited open campaigns", "Unlimited hires", "Priority support"],
    tone: "premium",
  },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="none" aria-hidden="true">
      <path
        d="m4.5 10.5 3.2 3.2 7.8-8.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-sm font-bold leading-6 text-slate-600">
      <span className="text-emerald-600">
        <CheckIcon />
      </span>
      <span>{children}</span>
    </li>
  );
}

function PlanCard({
  plan,
  safeLocale,
}: {
  plan: FuturePlan;
  safeLocale: "ja" | "en";
}) {
  const features = safeLocale === "ja" ? plan.featuresJa : plan.featuresEn;
  const isRecommended = plan.tone === "pro";
  const isPremium = plan.tone === "premium";

  return (
    <article
      className={`relative flex min-h-[510px] flex-col overflow-hidden rounded-[34px] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.07)] ring-1 transition md:p-6 ${
        isRecommended
          ? "ring-[#ff5f67]/35"
          : isPremium
          ? "ring-slate-900/10"
          : "ring-slate-100"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-28 ${
          isRecommended
            ? "bg-gradient-to-b from-rose-50 to-transparent"
            : isPremium
            ? "bg-gradient-to-b from-slate-100 to-transparent"
            : "bg-gradient-to-b from-slate-50 to-transparent"
        }`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black tracking-[0.18em] text-slate-400">
            {safeLocale === "ja" ? "準備中プラン" : "COMING SOON"}
          </p>
          <h2 className="mt-3 text-[31px] font-black tracking-[-0.06em] text-slate-950">
            {plan.name}
          </h2>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ring-1 ${
            isRecommended
              ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
              : "bg-slate-50 text-slate-500 ring-slate-100"
          }`}
        >
          {safeLocale === "ja" ? plan.badgeJa : plan.badgeEn}
        </span>
      </div>

      <p className="relative mt-4 min-h-[48px] text-sm font-semibold leading-7 text-slate-500">
        {safeLocale === "ja" ? plan.leadJa : plan.leadEn}
      </p>

      <div className="relative mt-6 rounded-[26px] bg-slate-950 p-5 text-white">
        <div className="flex items-end gap-2">
          <span className="text-[42px] font-black leading-none tracking-[-0.075em]">
            {plan.price}
          </span>
          <span className="pb-1 text-sm font-black text-white/45">
            {safeLocale === "ja" ? "/月" : "/month"}
          </span>
        </div>
        <p className="mt-3 text-xs font-bold leading-5 text-white/60">
          {safeLocale === "ja"
            ? "月額プランは今後提供予定です。現在は契約できません。"
            : "Monthly subscriptions are planned and cannot be activated yet."}
        </p>
      </div>

      <div className="relative mt-5 grid gap-2">
        <div className="rounded-[20px] bg-slate-50 px-4 py-3">
          <p className="text-xs font-black text-slate-400">
            {safeLocale === "ja" ? "注文型案件" : "Direct requests"}
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {safeLocale === "ja" ? plan.orderJa : plan.orderEn}
          </p>
        </div>
        <div className="rounded-[20px] bg-slate-50 px-4 py-3">
          <p className="text-xs font-black text-slate-400">
            {safeLocale === "ja" ? "公募型案件" : "Open campaigns"}
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {safeLocale === "ja" ? plan.publicJa : plan.publicEn}
          </p>
        </div>
      </div>

      <ul className="relative mt-5 space-y-2.5">
        {features.map((feature) => (
          <FeatureItem key={feature}>{feature}</FeatureItem>
        ))}
      </ul>

      <div className="relative mt-auto pt-6">
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-full bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-400"
        >
          {safeLocale === "ja" ? "準備中" : "Coming soon"}
        </button>
      </div>
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
            title: "料金プラン",
            body:
              "現在は初期提供期間のため、月額プラン契約なしでインフルエンサーへ依頼できます。",
            currentBadge: "現在の提供方針",
            currentTitle: "月額なしで利用できます",
            currentBody:
              "まずは注文型の依頼体験を磨くため、月額プランは準備中です。今は公開メニューから依頼し、案件ごとの手数料で利用できます。",
            primary: "インフルエンサーを探す",
            secondary: "ダッシュボードへ戻る",
            includedTitle: "今できること",
            includedBody:
              "企業登録後、インフルエンサー検索・メニュー確認・依頼・支払い・納品確認まで利用できます。",
            futureTitle: "今後の月額プラン",
            futureBody:
              "注文型だけでなく、公募型案件ページも使えるプランを段階的に開放予定です。",
            noteTitle: "表示について",
            noteBody:
              "下記プランは今後の提供予定です。現在は選択できないため、契約や請求は発生しません。",
            faqTitle: "確認しておきたいこと",
            faq1Title: "今すぐ月額料金は発生しますか？",
            faq1Body: "発生しません。現在は月額プランを契約できない状態にしています。",
            faq2Title: "依頼はできますか？",
            faq2Body: "できます。公開メニューからインフルエンサーへ依頼できます。",
            faq3Title: "公募型案件は使えますか？",
            faq3Body: "現在は準備中です。まずは注文型の依頼フローを優先しています。",
          }
        : {
            title: "Billing plans",
            body:
              "During the initial release, you can request influencers without activating a monthly subscription.",
            currentBadge: "Current access",
            currentTitle: "No monthly subscription required",
            currentBody:
              "Monthly plans are being prepared while we refine the direct request experience. For now, you can request public menus and use Trendre with per-order fees.",
            primary: "Find influencers",
            secondary: "Back to dashboard",
            includedTitle: "Available now",
            includedBody:
              "After creating a brand account, you can search influencers, review menus, send requests, pay, and review delivery.",
            futureTitle: "Future monthly plans",
            futureBody:
              "Plans will gradually unlock open campaign pages in addition to direct requests.",
            noteTitle: "Availability",
            noteBody:
              "The plans below are planned for later. They cannot be selected now, so no subscription will be charged.",
            faqTitle: "Good to know",
            faq1Title: "Will I be charged a monthly fee now?",
            faq1Body: "No. Monthly subscriptions cannot be activated at this stage.",
            faq2Title: "Can I still send requests?",
            faq2Body: "Yes. You can request influencers from public menus.",
            faq3Title: "Can I use open campaigns?",
            faq3Body: "Not yet. We are focusing on the direct request flow first.",
          },
    [safeLocale]
  );

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-gradient-to-b from-white via-rose-50/25 to-transparent" />
      <div className="pointer-events-none absolute left-[-260px] top-[160px] h-[520px] w-[520px] rounded-full bg-rose-100/18 blur-[150px]" />
      <div className="pointer-events-none absolute right-[-260px] top-[120px] h-[560px] w-[560px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 pb-12 md:px-6 md:py-8">
        <section className="overflow-hidden rounded-[34px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
          <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="p-6 md:p-8 lg:p-10">
              <p className="text-[12px] font-black tracking-[0.2em] text-[#ff5f67]">
                TRENDRE BILLING
              </p>
              <h1 className="mt-5 max-w-2xl text-[34px] font-black leading-[1.08] tracking-[-0.07em] text-slate-950 md:text-[52px]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-sm font-semibold leading-8 text-slate-500 md:text-base">
                {copy.body}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/b/creators"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_rgba(255,95,103,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {copy.primary}
                </Link>
                <Link
                  href="/b/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3.5 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
                >
                  {copy.secondary}
                </Link>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-950 p-6 text-white md:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70 ring-1 ring-white/10">
                {copy.currentBadge}
              </p>
              <h2 className="mt-5 text-[30px] font-black leading-tight tracking-[-0.06em] md:text-[40px]">
                {copy.currentTitle}
              </h2>
              <p className="mt-4 text-sm font-semibold leading-8 text-white/65">
                {copy.currentBody}
              </p>

              <div className="mt-7 grid gap-3">
                {[
                  safeLocale === "ja" ? "月額プラン契約なし" : "No monthly subscription",
                  safeLocale === "ja" ? "公開メニューから依頼可能" : "Request public menus",
                  safeLocale === "ja" ? "支払い・納品確認まで利用可能" : "Payment and delivery review included",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[22px] bg-white/10 px-4 py-3 ring-1 ring-white/10"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-200">
                      <CheckIcon />
                    </span>
                    <span className="text-sm font-black text-white">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-7">
            <h2 className="text-[26px] font-black tracking-[-0.06em] text-slate-950">
              {copy.includedTitle}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
              {copy.includedBody}
            </p>

            <div className="mt-6 grid gap-3">
              {[
                safeLocale === "ja" ? "インフルエンサー検索" : "Influencer search",
                safeLocale === "ja" ? "公開メニューへの依頼" : "Request public menus",
                safeLocale === "ja" ? "Stripe決済" : "Stripe payment",
                safeLocale === "ja" ? "チャット・納品確認" : "Chat and delivery review",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100"
                >
                  <span className="text-sm font-black text-slate-800">{item}</span>
                  <span className="text-sm font-black text-emerald-600">
                    {safeLocale === "ja" ? "利用可" : "Available"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-7">
            <h2 className="text-[26px] font-black tracking-[-0.06em] text-slate-950">
              {copy.noteTitle}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
              {copy.noteBody}
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] bg-rose-50 p-4 ring-1 ring-rose-100">
                <p className="text-xs font-black text-[#ff5f67]">01</p>
                <p className="mt-2 text-sm font-black text-slate-950">
                  {safeLocale === "ja" ? "今は契約不可" : "Not selectable yet"}
                </p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">02</p>
                <p className="mt-2 text-sm font-black text-slate-950">
                  {safeLocale === "ja" ? "月額請求なし" : "No monthly charge"}
                </p>
              </div>
              <div className="rounded-[24px] bg-emerald-50 p-4 ring-1 ring-emerald-100">
                <p className="text-xs font-black text-emerald-700">03</p>
                <p className="mt-2 text-sm font-black text-slate-950">
                  {safeLocale === "ja" ? "依頼は利用可能" : "Requests available"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-9">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-black tracking-[0.18em] text-[#ff5f67]">
                COMING SOON
              </p>
              <h2 className="mt-2 text-[30px] font-black tracking-[-0.065em] text-slate-950 md:text-[42px]">
                {copy.futureTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {copy.futureBody}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {FUTURE_PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} safeLocale={safeLocale} />
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-7">
          <h2 className="text-[26px] font-black tracking-[-0.06em] text-slate-950">
            {copy.faqTitle}
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              [copy.faq1Title, copy.faq1Body],
              [copy.faq2Title, copy.faq2Body],
              [copy.faq3Title, copy.faq3Body],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
                <h3 className="text-sm font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                  {body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs font-semibold leading-6 text-slate-400">
            <Link href="/terms" target="_blank" className="underline underline-offset-4">
              {safeLocale === "ja" ? "利用規約" : "Terms"}
            </Link>
            {" / "}
            <Link href="/legal" target="_blank" className="underline underline-offset-4">
              {safeLocale === "ja" ? "事業者情報" : "Business information"}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
