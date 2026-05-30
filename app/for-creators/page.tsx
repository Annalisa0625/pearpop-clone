// File: app/for-creators/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";

type ProductCardProps = {
  title: string;
  body: string;
  accent: "rose" | "emerald" | "slate";
};

const markClasses = {
  rose: {
    bg: "bg-rose-50",
    main: "bg-[#ff5f67]",
    sub: "bg-[#ffb3b8]",
    line: "bg-[#ff5f67]/20",
  },
  emerald: {
    bg: "bg-emerald-50",
    main: "bg-[#7bae6c]",
    sub: "bg-emerald-300",
    line: "bg-[#7bae6c]/20",
  },
  slate: {
    bg: "bg-slate-100",
    main: "bg-slate-900",
    sub: "bg-slate-400",
    line: "bg-slate-300",
  },
};

function LocaleToggle() {
  const { locale, setLocale } = useAppLocale();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
      className="hidden rounded-full bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200 md:inline-flex"
    >
      {locale === "ja" ? "EN" : "日本語"}
    </button>
  );
}

function CreatorPublicHeader() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          forBrands: "企業向け",
          search: "インフルエンサー検索",
          login: "ログイン",
          signup: "インフルエンサー登録",
        }
      : {
          forBrands: "For brands",
          search: "Influencer search",
          login: "Login",
          signup: "Join as an Influencer",
        };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center px-4 py-4 md:px-6 lg:py-5">
        <Link
          href="/home"
          className="flex items-center"
          aria-label="Trendre Home"
        >
          <img
            src="/brand/trendre-logo-full.png"
            alt="Trendre"
            className="h-8 w-auto object-contain md:h-9"
          />
        </Link>

        <nav className="hidden items-center justify-center gap-9 text-sm font-black text-slate-700 md:flex">
          <Link href="/home" className="transition hover:text-slate-950">
            {copy.forBrands}
          </Link>

          <Link href="/b/creators" className="transition hover:text-slate-950">
            {copy.search}
          </Link>
        </nav>

        <div className="flex items-center justify-end gap-2 md:gap-4">
          <Link
            href="/login"
            className="hidden text-sm font-black text-slate-700 transition hover:text-slate-950 md:inline-flex"
          >
            {copy.login}
          </Link>

          <Link
            href="/signup/creator"
            className="rounded-full bg-[#ff5f67] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:bg-[#ff4b55] md:px-5 md:py-3 md:text-sm"
          >
            {copy.signup}
          </Link>

          <LocaleToggle />
        </div>
      </div>
    </header>
  );
}

function ProductMark({ accent }: { accent: ProductCardProps["accent"] }) {
  const classes = markClasses[accent];

  return (
    <div
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${classes.bg}`}
    >
      <span
        className={`absolute left-3 top-3 h-3 w-3 rounded-full ${classes.main}`}
      />
      <span
        className={`absolute right-3 top-4 h-2.5 w-2.5 rounded-full ${classes.sub}`}
      />
      <span
        className={`absolute bottom-3 left-4 h-2 w-5 rounded-full ${classes.line}`}
      />
    </div>
  );
}

function ProductCard({ title, body, accent }: ProductCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-[30px] bg-white p-7 shadow-[0_22px_70px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-slate-50 transition group-hover:scale-110" />

      <div className="relative">
        <ProductMark accent={accent} />

        <h3 className="mt-6 text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950">
          {title}
        </h3>

        <p className="mt-4 text-[15px] font-semibold leading-8 text-slate-500">
          {body}
        </p>
      </div>
    </article>
  );
}

function HeroFallback() {
  return (
    <div className="mx-auto w-full max-w-[460px] rounded-[34px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <div className="rounded-[28px] bg-slate-50 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ff5f67]/10 text-lg font-black text-[#ff5f67]">
            PR
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Influencer
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              New Order
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-3 text-center">
            <p className="text-sm font-black text-slate-950">12.8k</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">
              Followers
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3 text-center">
            <p className="text-sm font-black text-slate-950">4.9</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">
              Rating
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3 text-center">
            <p className="text-sm font-black text-slate-950">¥30k</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">
              Price
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroVisual() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="relative mx-auto flex w-full max-w-[560px] items-center justify-center">
      {imageFailed ? (
        <HeroFallback />
      ) : (
        <img
          src="/brand/trendre-home-hero.png"
          alt=""
          onError={() => setImageFailed(true)}
          className="block h-auto w-full object-contain"
        />
      )}
    </div>
  );
}

export default function ForCreatorsPage() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          eyebrow: "インフルエンサー向け",
          titleLine1: "好きな商品やブランドのPRを",
          titleLine2: "オンラインで受けられる。",
          titleAccent: "価格を決めて、",
          titleLine3: "注文を待つだけ。",
          body:
            "Trendreは、Instagram・TikTokなどでPR投稿やUGC制作を受けたいインフルエンサー向けのマーケットプレイスです。プロフィール、SNS、ポートフォリオ、メニューを登録すると、企業があなたを見つけて注文できます。",
          primaryCta: "無料で登録する",
          secondaryCta: "ログイン",
          mini1: "メニュー価格を設定",
          mini2: "注文は承認制",
          mini3: "納品・報酬を管理",

          productPill: "できること",
          productTitle1: "PRの受注を",
          productTitle2: "もっと分かりやすく",
          productTitleAccent: "ひとつの画面で",
          productBody:
            "注文内容、チャット、納品URL、報酬履歴をTrendre上で整理できます。受けたい内容と価格をメニューとして公開し、企業からの注文を待つことができます。",

          card1Title: "メニューを公開",
          card1Body:
            "Instagram投稿、TikTok動画、UGC制作など、自分が受けたい内容と価格を登録できます。",
          card2Title: "注文を選んで受ける",
          card2Body:
            "企業から注文が届いたら、内容を確認してから承認できます。合わない依頼は無理に受ける必要はありません。",
          card3Title: "納品と報酬を管理",
          card3Body:
            "投稿URLや納品URLを提出し、完了した注文の報酬履歴を確認できます。",

          finalTitle: "まずは、インフルエンサー登録から始めましょう。",
          finalBody:
            "登録後にプロフィールとメニューを整えることで、企業から注文を受けられる状態になります。",
          finalPrimary: "無料で登録する",
          finalSecondary: "ログイン",
        }
      : {
          eyebrow: "For influencers",
          titleLine1: "Receive PR and UGC orders",
          titleLine2: "from brands online.",
          titleAccent: "Set your price.",
          titleLine3: "Accept what fits.",
          body:
            "Trendre is a marketplace for influencers who want to receive PR post and UGC creation orders on Instagram, TikTok, and other platforms. Add your profile, social accounts, portfolio, and menus so brands can discover and order from you.",
          primaryCta: "Join for free",
          secondaryCta: "Login",
          mini1: "Set menu pricing",
          mini2: "Accept orders manually",
          mini3: "Manage delivery and earnings",

          productPill: "What you can do",
          productTitle1: "Manage PR orders",
          productTitle2: "more clearly",
          productTitleAccent: "in one place",
          productBody:
            "Trendre organizes order details, chat, delivery URLs, and earnings history. Publish the services you want to offer and wait for brand orders.",

          card1Title: "Publish menus",
          card1Body:
            "Add Instagram posts, TikTok videos, UGC creation, and other services you want to offer.",
          card2Title: "Choose what to accept",
          card2Body:
            "When a brand orders, you can review the details before accepting. You do not have to accept requests that do not fit.",
          card3Title: "Manage delivery and earnings",
          card3Body:
            "Submit post or delivery URLs and review completed order earnings in your account.",

          finalTitle: "Start by creating your influencer profile.",
          finalBody:
            "Once your profile and menus are ready, brands can discover and order from you.",
          finalPrimary: "Join for free",
          finalSecondary: "Login",
        };

  const productCards: ProductCardProps[] = [
    {
      title: copy.card1Title,
      body: copy.card1Body,
      accent: "rose",
    },
    {
      title: copy.card2Title,
      body: copy.card2Body,
      accent: "emerald",
    },
    {
      title: copy.card3Title,
      body: copy.card3Body,
      accent: "slate",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-slate-950">
      <CreatorPublicHeader />

      <main className="overflow-hidden">
        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-10 md:px-6 lg:grid-cols-[minmax(0,1fr)_540px] lg:items-center lg:pb-18 lg:pt-18">
            <div>
              <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-[#ff5f67] shadow-sm ring-1 ring-rose-100">
                {copy.eyebrow}
              </span>

              <h1 className="mt-6 max-w-4xl text-[42px] font-black leading-[1.02] tracking-[-0.07em] text-slate-950 md:text-[64px] lg:text-[74px]">
                {copy.titleLine1}
                <br />
                {copy.titleLine2}
                <br />
                <span className="text-[#ff5f67]">{copy.titleAccent}</span>
                <br />
                {copy.titleLine3}
              </h1>

              <p className="mt-6 max-w-2xl text-[15px] font-semibold leading-8 text-slate-600 md:text-base">
                {copy.body}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup/creator"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-7 py-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(255,95,103,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {copy.primaryCta}
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  {copy.secondaryCta}
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {[copy.mini1, copy.mini2, copy.mini3].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <HeroVisual />
          </div>
        </section>

        <section
          id="service-overview"
          className="relative mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16"
        >
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-[#ff5f67] shadow-sm ring-1 ring-rose-100">
              {copy.productPill}
            </span>

            <h2 className="mt-5 text-[34px] font-black leading-tight tracking-[-0.06em] text-slate-950 md:text-[56px]">
              {copy.productTitle1}
              <br />
              {copy.productTitle2}
              <br />
              <span className="text-[#ff5f67]">
                {copy.productTitleAccent}
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-[15px] font-semibold leading-8 text-slate-500 md:text-base">
              {copy.productBody}
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {productCards.map((card) => (
              <ProductCard
                key={card.title}
                title={card.title}
                body={card.body}
                accent={card.accent}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 pt-4 md:px-6 md:pb-18 md:pt-8">
          <div className="relative overflow-hidden rounded-[36px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 md:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-100/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-72 rounded-full bg-emerald-100/30 blur-3xl" />

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="max-w-3xl text-[32px] font-black leading-tight tracking-[-0.055em] text-slate-950 md:text-[50px]">
                  {copy.finalTitle}
                </h2>

                <p className="mt-4 max-w-2xl text-sm font-semibold leading-8 text-slate-500 md:text-base">
                  {copy.finalBody}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/signup/creator"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-7 py-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(255,95,103,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {copy.finalPrimary}
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-slate-100 px-7 py-4 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
                >
                  {copy.finalSecondary}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}