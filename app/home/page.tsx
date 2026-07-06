// File: app/home/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

type Locale = "ja" | "en";

type CreatorCardProps = {
  name: string;
  category: string;
  location: string;
  price: string;
  platforms: string[];
  tag: string;
  gradient: string;
};

type WorkflowStepProps = {
  number: string;
  title: string;
};

type UseCaseCardProps = {
  title: string;
  body: string;
  cta: string;
  tone: "rose" | "blue" | "violet" | "orange";
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m14.5 14.5 3 3M16 8.5A7.5 7.5 0 1 1 1 8.5a7.5 7.5 0 0 1 15 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 10h11M11 5l5 5-5 5"
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
        d="m4 10.5 3.6 3.6L16 6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M10 2.5 11.7 7l4.8 1.3-4.8 1.8L10 17.5 8.3 10.1 3.5 8.3 8.3 7 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlatformPill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-900 shadow-sm ring-1 ring-black/5">
      {children}
    </span>
  );
}

function CreatorCard({
  name,
  category,
  location,
  price,
  platforms,
  tag,
  gradient,
}: CreatorCardProps) {
  return (
    <article className="group relative h-[235px] overflow-hidden rounded-[24px] bg-slate-800 shadow-[0_20px_55px_rgba(0,0,0,0.22)] ring-1 ring-white/10 transition duration-300 hover:-translate-y-1">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10" />

      <div className="relative flex h-full flex-col justify-between p-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black leading-tight">{name}</p>
            <p className="mt-1 max-w-[150px] truncate text-xs font-semibold text-white/80">
              {category}
            </p>
          </div>

          <p className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-950">
            {price}
          </p>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {platforms.map((item) => (
              <PlatformPill key={item}>{item}</PlatformPill>
            ))}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                {tag}
              </p>
              <p className="mt-2 text-[11px] font-semibold text-white/70">
                {location}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur ring-1 ring-white/20">
              ♡
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function HeroSearchBox({
  placeholder,
  button,
}: {
  placeholder: string;
  button: string;
}) {
  return (
    <form
      action="/b/creators"
      method="get"
      className="mx-auto mt-9 flex w-full max-w-[920px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] ring-1 ring-white/10"
    >
      <div className="hidden min-w-[165px] items-center gap-3 border-r border-slate-200 px-5 text-sm font-black text-slate-800 sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
          ◎
        </span>
        Instagram
      </div>

      <input
        name="q"
        placeholder={placeholder}
        className="min-h-[64px] flex-1 bg-white px-5 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
      />

      <button
        type="submit"
        className="inline-flex min-w-[140px] items-center justify-center gap-2 bg-[#f85b8f] px-6 text-sm font-black text-white transition hover:bg-[#f0447c]"
      >
        <SearchIcon />
        {button}
      </button>
    </form>
  );
}

function HeroMock({
  copy,
  creatorCards,
}: {
  copy: Record<string, string>;
  creatorCards: CreatorCardProps[];
}) {
  return (
    <section className="mx-auto max-w-[calc(100%-32px)] overflow-hidden rounded-[34px] bg-[#2b2b2b] px-5 pb-7 pt-14 shadow-[0_30px_100px_rgba(0,0,0,0.18)] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-[42px] font-black leading-[1.05] tracking-[-0.055em] text-white md:text-[64px] lg:text-[76px]">
          {copy.heroLine1}
          <br />
          <span className="text-[#f85b8f]">{copy.heroAccent}</span>
          {copy.heroLine2}
          <br />
          <span className="italic">{copy.heroItalic}</span>
        </h1>

        <p className="mx-auto mt-7 max-w-3xl text-base font-semibold leading-8 text-white/72 md:text-lg">
          {copy.heroBody}
        </p>

        <HeroSearchBox placeholder={copy.searchPlaceholder} button={copy.searchButton} />

        <div className="mx-auto mt-6 flex max-w-[920px] flex-wrap justify-center gap-3">
          {[
            copy.chip1,
            copy.chip2,
            copy.chip3,
            copy.chip4,
            copy.chip5,
            copy.chip6,
          ].map((item) => (
            <Link
              key={item}
              href="/b/creators"
              className="rounded-full border border-white/14 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/86 transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              {item}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-9 grid max-w-[920px] gap-4 md:grid-cols-2 xl:grid-cols-4">
        {creatorCards.map((card) => (
          <CreatorCard key={card.name} {...card} />
        ))}
      </div>
    </section>
  );
}

function TrustStrip({ copy }: { copy: Record<string, string> }) {
  return (
    <section className="bg-white px-4 py-12 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-center">
        <p className="text-sm font-black text-slate-900">{copy.trustedBy}</p>

        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-black text-slate-300">
          <span>JPY Payment</span>
          <span>Stripe</span>
          <span>Instagram</span>
          <span>TikTok</span>
          <span>UGC</span>
          <span>Direct Order</span>
        </div>
      </div>
    </section>
  );
}

function WorkflowStep({ number, title }: WorkflowStepProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-white/75">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/12 text-[11px] text-white">
        {number}
      </span>
      {title}
    </div>
  );
}

function CampaignPreview({ copy }: { copy: Record<string, string> }) {
  return (
    <div className="relative overflow-hidden rounded-[34px] bg-[#eeecff] p-6 md:p-10">
      <div className="grid min-h-[430px] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h3 className="text-4xl font-black leading-[1.1] tracking-[-0.05em] text-slate-900 md:text-5xl">
            {copy.workflowCardTitle}
          </h3>

          <p className="mt-6 max-w-md text-base font-semibold leading-8 text-slate-500">
            {copy.workflowCardBody}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600">
              {copy.workflowBadge1}
            </span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600">
              {copy.workflowBadge2}
            </span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600">
              {copy.workflowBadge3}
            </span>
          </div>
        </div>

        <div className="rounded-[30px] bg-white p-5 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
          <div className="rounded-[24px] bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f85b8f]/15 text-[#f85b8f]">
                <SparkIcon />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Campaign
                </p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {copy.workflowCampaignName}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-500">
                  Beauty
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                  UGC
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
                  ¥30,000
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="h-3 w-full rounded-full bg-slate-100" />
                <div className="h-3 w-[82%] rounded-full bg-slate-100" />
                <div className="h-3 w-[62%] rounded-full bg-slate-100" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                copy.workflowMini1,
                copy.workflowMini2,
                copy.workflowMini3,
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckIcon />
                  </div>
                  <p className="mt-3 text-sm font-black text-slate-900">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowSection({
  copy,
  steps,
}: {
  copy: Record<string, string>;
  steps: WorkflowStepProps[];
}) {
  return (
    <section className="bg-white px-4 py-16 md:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mx-auto max-w-4xl text-center text-4xl font-black leading-[1.08] tracking-[-0.055em] text-slate-950 md:text-6xl">
          {copy.workflowTitle}
        </h2>

        <div className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center rounded-full bg-[#2b2b2b] p-2">
          {steps.map((step) => (
            <WorkflowStep key={step.number} {...step} />
          ))}
        </div>

        <div className="mx-auto mt-9 max-w-5xl">
          <CampaignPreview copy={copy} />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="relative flex min-h-[210px] items-center justify-center overflow-hidden rounded-[34px] bg-slate-50 p-8">
      {children ? <div className="absolute inset-0">{children}</div> : null}
      <div className="relative text-center">
        <p className="text-5xl font-black tracking-[-0.06em] text-slate-950 md:text-6xl">
          {value}
        </p>
        <p className="mt-3 text-base font-semibold tracking-wide text-slate-500">
          {label}
        </p>
      </div>
    </article>
  );
}

function StatsSection({ copy }: { copy: Record<string, string> }) {
  return (
    <section className="bg-white px-4 py-16 md:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mx-auto max-w-5xl text-center text-4xl font-black leading-[1.08] tracking-[-0.055em] text-slate-950 md:text-6xl">
          {copy.statsTitle}
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <StatCard value={copy.stat1Value} label={copy.stat1Label}>
            <div className="absolute right-10 top-8 grid grid-cols-2 gap-3 opacity-80">
              <div className="h-20 w-28 rounded-3xl bg-gradient-to-br from-rose-200 to-rose-400" />
              <div className="h-16 w-24 rounded-3xl bg-gradient-to-br from-amber-200 to-orange-300" />
              <div className="h-16 w-24 rounded-3xl bg-gradient-to-br from-blue-200 to-blue-400" />
              <div className="h-20 w-28 rounded-3xl bg-gradient-to-br from-emerald-200 to-emerald-400" />
            </div>
          </StatCard>

          <StatCard value={copy.stat2Value} label={copy.stat2Label} />

          <StatCard value={copy.stat3Value} label={copy.stat3Label} />

          <StatCard value={copy.stat4Value} label={copy.stat4Label}>
            <div className="absolute right-8 top-10 rotate-[-8deg] rounded-2xl bg-[#2b2b2b] p-4 text-left text-white shadow-2xl">
              <p className="text-xs text-yellow-300">★★★★★</p>
              <p className="mt-2 max-w-[230px] text-xs font-semibold leading-5 text-white/80">
                {copy.reviewText}
              </p>
            </div>
          </StatCard>
        </div>
      </div>
    </section>
  );
}

function HomeHeroIllustration() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-[34px] bg-white">
        <div className="rounded-[30px] border border-slate-100 bg-slate-50 p-8 text-center">
          <p className="text-5xl">📱</p>
          <p className="mt-4 text-lg font-black text-slate-900">PR / UGC</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Search, order, chat, delivery
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-[34px] bg-white p-8">
      <img
        src="/brand/trendre-home-hero.png"
        alt=""
        onError={() => setFailed(true)}
        className="max-h-[430px] w-full object-contain"
      />
    </div>
  );
}

function ToolsSection({ copy }: { copy: Record<string, string> }) {
  const tools = ["Instagram", "TikTok", "Gmail", "Sheets", "Stripe", "Chat", "Drive", "Pay"];

  return (
    <section className="bg-white px-4 py-16 md:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 rounded-[42px] bg-slate-50 p-8 md:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h2 className="max-w-xl text-4xl font-black leading-[1.08] tracking-[-0.055em] text-slate-950 md:text-5xl">
            {copy.toolsTitle}
          </h2>
          <p className="mt-7 max-w-lg text-base font-semibold leading-8 text-slate-600">
            {copy.toolsBody}
          </p>

          <Link
            href="/b/creators"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2b2b2b] px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-950"
          >
            {copy.toolsCta}
            <ArrowIcon />
          </Link>
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-[34px] bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(248,91,143,0.10),transparent_55%)]" />

          {tools.map((tool, index) => {
            const positions = [
              "left-[12%] top-[36%]",
              "left-[28%] top-[54%]",
              "left-[40%] top-[30%]",
              "left-[58%] top-[18%]",
              "left-[64%] top-[46%]",
              "left-[76%] top-[32%]",
              "left-[52%] top-[66%]",
              "left-[26%] top-[18%]",
            ];

            return (
              <div
                key={tool}
                className={`absolute ${positions[index]} flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xs font-black text-slate-700 shadow-[0_18px_55px_rgba(15,23,42,0.12)] ring-1 ring-slate-100`}
              >
                {tool.slice(0, 2)}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UseCaseCard({ title, body, cta, tone }: UseCaseCardProps) {
  const toneClass = {
    rose: "bg-[#f774aa]",
    blue: "bg-[#9bb6ff]",
    violet: "bg-[#b9adff]",
    orange: "bg-[#ff995f]",
  }[tone];

  return (
    <article className={`rounded-[34px] ${toneClass} p-7 md:p-8`}>
      <div className="rounded-[22px] bg-white/88 p-5 shadow-[0_16px_35px_rgba(0,0,0,0.08)]">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="mt-4 h-3 w-44 rounded-full bg-slate-100" />
        <div className="mt-3 h-3 w-32 rounded-full bg-slate-100" />
      </div>

      <h3 className="mt-8 text-2xl font-black tracking-[-0.04em] text-slate-950">
        {title}
      </h3>

      <p className="mt-5 min-h-[112px] text-base font-semibold leading-8 text-slate-700">
        {body}
      </p>

      <Link
        href="/b/creators"
        className="mt-6 inline-flex rounded-full border border-slate-900/50 px-7 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-900 hover:text-white"
      >
        {cta}
      </Link>
    </article>
  );
}

function UseCaseSection({
  copy,
  useCases,
}: {
  copy: Record<string, string>;
  useCases: UseCaseCardProps[];
}) {
  return (
    <section className="bg-white px-4 py-16 md:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-4xl font-black leading-[1.08] tracking-[-0.055em] text-slate-950 md:text-5xl">
          {copy.useCaseTitle}
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map((item) => (
            <UseCaseCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ copy }: { copy: Record<string, string> }) {
  return (
    <section className="bg-white px-4 pb-16 pt-10 md:px-6 lg:pb-24">
      <div className="mx-auto max-w-5xl rounded-[42px] bg-[#2b2b2b] px-8 py-16 text-center shadow-[0_30px_90px_rgba(0,0,0,0.18)] md:px-12 md:py-20">
        <h2 className="mx-auto max-w-4xl text-4xl font-black leading-[1.1] tracking-[-0.055em] text-white md:text-6xl">
          {copy.finalLine1}
          <br />
          <span className="italic text-[#f85b8f]">{copy.finalAccent}</span>
          {copy.finalLine2}
        </h2>

        <p className="mx-auto mt-7 max-w-2xl text-base font-semibold leading-8 text-white/65">
          {copy.finalBody}
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/b/creators"
            className="inline-flex min-w-[240px] items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
          >
            {copy.finalPrimary}
          </Link>

          <Link
            href="/signup/company"
            className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
          >
            {copy.finalSecondary}
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-bold text-white/50">
          <span>{copy.finalMini1}</span>
          <span>{copy.finalMini2}</span>
          <span>{copy.finalMini3}</span>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { locale } = useAppLocale();
  const safeLocale: Locale = locale === "en" ? "en" : "ja";

  const copy =
    safeLocale === "ja"
      ? {
          heroLine1: "インフルエンサーPRを",
          heroAccent: "探す",
          heroLine2: "から",
          heroItalic: "納品確認まで。",
          heroBody:
            "Trendreは、企業がクリエイターを検索し、表示価格で依頼し、チャット・納品・支払いまで一元管理できる日本向けインフルエンサーマーケティングSaaSです。",
          searchPlaceholder: "美容、店舗PR、UGC、TikTokレビューなど",
          searchButton: "検索",
          chip1: "注目Instagramクリエイター",
          chip2: "TikTokレビュー",
          chip3: "UGC制作",
          chip4: "美容・コスメ",
          chip5: "店舗PR",
          chip6: "¥30,000以下",

          trustedBy: "Built for:",

          workflowTitle: "PR案件の流れを、ひとつの画面で。",
          workflowCardTitle:
            "依頼文作成から納品確認まで、運用をシンプルに。",
          workflowCardBody:
            "候補探し、依頼、承認待ち、チャット、納品URL確認、支払い管理までをTrendre内で完結できます。",
          workflowBadge1: "AI Brief",
          workflowBadge2: "Direct Order",
          workflowBadge3: "Payment Control",
          workflowCampaignName: "新作スキンケアPR",
          workflowMini1: "依頼作成",
          workflowMini2: "承認管理",
          workflowMini3: "納品確認",

          step1Title: "探す",
          step2Title: "依頼",
          step3Title: "承認",
          step4Title: "チャット",
          step5Title: "納品",
          step6Title: "支払い",

          statsTitle: "日本企業のインフルエンサー施策に必要なものを、最短距離で。",
          stat1Value: "国内特化",
          stat1Label: "日本企業・日本クリエイター向け",
          stat2Value: "JPY",
          stat2Label: "日本円固定の注文・決済",
          stat3Value: "3タイプ",
          stat3Label: "素材提供・商品発送・来店体験",
          stat4Value: "72時間",
          stat4Label: "承認期限と自動進行管理",
          reviewText:
            "依頼、チャット、納品確認、支払いまで一画面で進められるから運用が軽くなる。",

          toolsTitle: "DM、スプレッドシート、請求管理を1つに。",
          toolsBody:
            "インフルエンサー探し、条件確認、発注、やり取り、納品URL確認、報酬管理を分断せず、Trendreでまとめて進められます。",
          toolsCta: "インフルエンサーを探す",

          useCaseTitle: "チームの目的に合わせて使える",
          useCaseCta: "探してみる",
          useCase1Title: "マーケティング担当",
          useCase1Body:
            "新商品PR、認知拡大、SNS投稿施策を、表示価格でスピーディーに発注できます。",
          useCase2Title: "店舗・体験サービス",
          useCase2Body:
            "飲食店、サロン、ジム、イベントなど、来店や予約につながる発信を依頼できます。",
          useCase3Title: "D2C・ECブランド",
          useCase3Body:
            "商品レビュー、UGC素材、LPや広告で使える投稿素材の獲得に活用できます。",
          useCase4Title: "採用・求人PR",
          useCase4Body:
            "職場の雰囲気や働き方を、クリエイターの自然な発信で届けられます。",

          illustrationTitle: "クリエイター選定を、もっと直感的に。",
          illustrationBody:
            "プロフィール、SNS、価格、メニュー内容を見ながら、ブランドに合う依頼先を比較できます。",

          finalLine1: "次のPR案件は、",
          finalAccent: "数分後",
          finalLine2: "に始められます。",
          finalBody:
            "まずは検索から。商品や店舗に合うクリエイターを見つけて、Trendre上で依頼・納品確認まで進めましょう。",
          finalPrimary: "インフルエンサーを探す",
          finalSecondary: "無料で企業登録",
          finalMini1: "無料で検索",
          finalMini2: "表示価格で依頼",
          finalMini3: "納品・支払いまで管理",
        }
      : {
          heroLine1: "Run influencer PR",
          heroAccent: "from search",
          heroLine2: " to",
          heroItalic: "final delivery.",
          heroBody:
            "Trendre helps brands search creators, order with visible pricing, and manage chat, delivery, and payment in one Japan-focused influencer marketing platform.",
          searchPlaceholder: "Beauty, UGC, TikTok reviews, store PR",
          searchButton: "Search",
          chip1: "Rising Instagram creators",
          chip2: "TikTok reviews",
          chip3: "UGC creation",
          chip4: "Beauty",
          chip5: "Store PR",
          chip6: "Under ¥30,000",

          trustedBy: "Built for:",

          workflowTitle: "Everything in one workflow.",
          workflowCardTitle:
            "From campaign brief to delivery review, without scattered tools.",
          workflowCardBody:
            "Search, request, approval, chat, delivery URL review, and payment management all happen inside Trendre.",
          workflowBadge1: "AI Brief",
          workflowBadge2: "Direct Order",
          workflowBadge3: "Payment Control",
          workflowCampaignName: "Skincare Launch",
          workflowMini1: "Brief",
          workflowMini2: "Approval",
          workflowMini3: "Delivery",

          step1Title: "Search",
          step2Title: "Brief",
          step3Title: "Order",
          step4Title: "Chat",
          step5Title: "Delivery",
          step6Title: "Payment",

          statsTitle: "Built for influencer campaigns in Japan.",
          stat1Value: "Japan",
          stat1Label: "For Japanese brands and creators",
          stat2Value: "JPY",
          stat2Label: "Japanese yen fixed payments",
          stat3Value: "3 flows",
          stat3Label: "Assets, shipping, and visits",
          stat4Value: "72h",
          stat4Label: "Acceptance deadline control",
          reviewText:
            "Search, order, chat, delivery review, and payment are finally in one workflow.",

          toolsTitle: "Replace DMs, spreadsheets, and payment tracking.",
          toolsBody:
            "Trendre keeps creator discovery, ordering, messaging, delivery review, and payout management in one place.",
          toolsCta: "Search creators",

          useCaseTitle: "Built for teams of every size",
          useCaseCta: "Start",
          useCase1Title: "Marketing teams",
          useCase1Body:
            "Launch product PR, awareness campaigns, and social posts with visible pricing.",
          useCase2Title: "Local businesses",
          useCase2Body:
            "Request store visits, restaurant PR, salons, gyms, and local experiences.",
          useCase3Title: "D2C and ecommerce",
          useCase3Body:
            "Collect reviews, UGC assets, and content for ads and landing pages.",
          useCase4Title: "Recruiting PR",
          useCase4Body:
            "Show workplace culture and hiring stories through natural creator content.",

          illustrationTitle: "Creator selection, made visual.",
          illustrationBody:
            "Compare creator profiles, social accounts, pricing, and menu details before you order.",

          finalLine1: "Your next creator campaign is ",
          finalAccent: "minutes",
          finalLine2: " away.",
          finalBody:
            "Start with search. Find creators that fit your product and manage the request through delivery inside Trendre.",
          finalPrimary: "Search creators",
          finalSecondary: "Join as a brand",
          finalMini1: "Free to search",
          finalMini2: "Visible pricing",
          finalMini3: "Delivery and payment tracking",
        };

  const creatorCards: CreatorCardProps[] = [
    {
      name: "なつみ｜旅するグルメ日記",
      category: "Food / Travel / Lifestyle",
      location: "東京",
      price: "¥50,000〜",
      platforms: ["Instagram", "TikTok"],
      tag: "店舗PRに強い",
      gradient: "from-rose-200 via-orange-100 to-emerald-200",
    },
    {
      name: "yuto｜ライフスタイル",
      category: "Fashion / Outdoor",
      location: "神奈川",
      price: "¥80,000〜",
      platforms: ["TikTok", "X"],
      tag: "自然なレビュー",
      gradient: "from-blue-200 via-sky-100 to-slate-300",
    },
    {
      name: "emi｜カメラ日常",
      category: "Beauty / Camera / UGC",
      location: "大阪",
      price: "¥30,000〜",
      platforms: ["Instagram", "YouTube"],
      tag: "UGC・商品撮影",
      gradient: "from-emerald-200 via-lime-100 to-yellow-100",
    },
    {
      name: "コウ｜ガジェットレビュー",
      category: "Gadget / Review",
      location: "愛知",
      price: "¥100,000〜",
      platforms: ["TikTok", "YouTube"],
      tag: "レビュー動画",
      gradient: "from-slate-300 via-zinc-200 to-stone-100",
    },
  ];

  const workflowSteps: WorkflowStepProps[] = [
    { number: "01", title: copy.step1Title },
    { number: "02", title: copy.step2Title },
    { number: "03", title: copy.step3Title },
    { number: "04", title: copy.step4Title },
    { number: "05", title: copy.step5Title },
    { number: "06", title: copy.step6Title },
  ];

  const useCases: UseCaseCardProps[] = [
    {
      title: copy.useCase1Title,
      body: copy.useCase1Body,
      cta: copy.useCaseCta,
      tone: "rose",
    },
    {
      title: copy.useCase2Title,
      body: copy.useCase2Body,
      cta: copy.useCaseCta,
      tone: "blue",
    },
    {
      title: copy.useCase3Title,
      body: copy.useCase3Body,
      cta: copy.useCaseCta,
      tone: "violet",
    },
    {
      title: copy.useCase4Title,
      body: copy.useCase4Body,
      cta: copy.useCaseCta,
      tone: "orange",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <PublicHeader />

      <main>
        <section className="bg-white pb-8 pt-5">
          <HeroMock copy={copy} creatorCards={creatorCards} />
        </section>

        <TrustStrip copy={copy} />

        <WorkflowSection copy={copy} steps={workflowSteps} />

        <StatsSection copy={copy} />

        <section className="bg-white px-4 py-16 md:px-6 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 rounded-[42px] bg-slate-50 p-8 md:p-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <h2 className="max-w-xl text-4xl font-black leading-[1.08] tracking-[-0.055em] text-slate-950 md:text-5xl">
                {copy.illustrationTitle}
              </h2>
              <p className="mt-7 max-w-lg text-base font-semibold leading-8 text-slate-600">
                {copy.illustrationBody}
              </p>

              <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
                {[copy.finalMini1, copy.finalMini2, copy.finalMini3].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100"
                    >
                      <span className="mr-2 text-emerald-500">●</span>
                      {item}
                    </div>
                  )
                )}
              </div>
            </div>

            <HomeHeroIllustration />
          </div>
        </section>

        <ToolsSection copy={copy} />

        <UseCaseSection copy={copy} useCases={useCases} />

        <FinalCta copy={copy} />
      </main>

      <PublicFooter />
    </div>
  );
}