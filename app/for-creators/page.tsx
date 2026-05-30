// File: app/for-creators/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";

type FeatureCardProps = {
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
          signup: "Join",
        };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center px-4 py-3.5 md:px-6 lg:py-5">
        <Link
          href="/home"
          className="flex items-center"
          aria-label="Trendre Home"
        >
          <img
            src="/brand/trendre-logo-full.png"
            alt="Trendre"
            className="h-7 w-auto object-contain md:h-9"
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
            className="text-xs font-black text-slate-700 transition hover:text-slate-950 md:text-sm"
          >
            {copy.login}
          </Link>

          <Link
            href="/signup/creator"
            className="rounded-full bg-[#ff5f67] px-3.5 py-2.5 text-[11px] font-black text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:bg-[#ff4b55] md:px-5 md:py-3 md:text-sm"
          >
            {copy.signup}
          </Link>

          <LocaleToggle />
        </div>
      </div>
    </header>
  );
}

function FeatureMark({ accent }: { accent: FeatureCardProps["accent"] }) {
  const classes = markClasses[accent];

  return (
    <div
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${classes.bg}`}
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

function FeatureCard({ title, body, accent }: FeatureCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.07)] md:p-6">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-slate-50 transition group-hover:scale-110" />

      <div className="relative flex gap-4 md:block">
        <FeatureMark accent={accent} />

        <div>
          <h3 className="text-lg font-black leading-tight tracking-[-0.035em] text-slate-950 md:mt-5 md:text-xl">
            {title}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500 md:mt-3">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}

function HeroFallback() {
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[30px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <div className="rounded-[24px] bg-slate-50 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff5f67]/10 text-base font-black text-[#ff5f67]">
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

        <div className="mt-5 grid grid-cols-3 gap-3">
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
    <div className="relative mx-auto flex w-full max-w-[430px] items-center justify-center md:max-w-[500px] lg:max-w-[520px]">
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
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowStickyCta(window.scrollY > 520);
    };

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const copy =
    locale === "ja"
      ? {
          titleLine1: "PRやUGC制作の注文を",
          titleLine2: "オンラインで受けられる。",
          titleAccent: "価格を決めて、",
          titleLine3: "自分のペースで受ける。",
          body:
            "Trendreは、Instagram・TikTokなどでPR投稿やUGC制作を受けたいインフルエンサー向けのマーケットプレイスです。プロフィール、SNS、ポートフォリオ、メニューを登録すると、企業があなたを見つけて注文できます。",
          primaryCta: "無料で登録する",
          mini1: "メニュー価格を設定",
          mini2: "注文は承認制",
          mini3: "納品・報酬を管理",

          productTitle1: "PRの受注を",
          productTitle2: "もっと分かりやすく。",
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

          finalTitle: "プロフィールとメニューを整えるだけで、注文を受けられる状態に。",
          finalBody:
            "まずは登録して、SNS・ポートフォリオ・メニューを追加してください。",
        }
      : {
          titleLine1: "Receive PR and UGC orders",
          titleLine2: "from brands online.",
          titleAccent: "Set your price.",
          titleLine3: "Accept what fits.",
          body:
            "Trendre is a marketplace for influencers who want to receive PR post and UGC creation orders on Instagram, TikTok, and other platforms. Add your profile, social accounts, portfolio, and menus so brands can discover and order from you.",
          primaryCta: "Join for free",
          mini1: "Set menu pricing",
          mini2: "Accept orders manually",
          mini3: "Manage delivery and earnings",

          productTitle1: "Manage PR orders",
          productTitle2: "more clearly.",
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

          finalTitle: "Set up your profile and menus, then start receiving orders.",
          finalBody:
            "Create your account first, then add social accounts, portfolio images, and menus.",
        };

  const featureCards: FeatureCardProps[] = [
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

      <main className="overflow-hidden pb-20 md:pb-0">
        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-7 px-4 pb-8 pt-8 md:px-6 md:pb-12 md:pt-12 lg:grid-cols-[minmax(0,1fr)_510px] lg:items-center lg:pb-16 lg:pt-16">
            <div className="relative z-10">
              <h1 className="max-w-3xl text-[38px] font-black leading-[1.08] tracking-[-0.065em] text-slate-950 md:text-[48px] lg:text-[54px]">
                {copy.titleLine1}
                <br />
                {copy.titleLine2}
                <br />
                <span className="text-[#ff5f67]">{copy.titleAccent}</span>
                <br />
                {copy.titleLine3}
              </h1>

              <p className="mt-5 max-w-2xl text-[14px] font-semibold leading-7 text-slate-600 md:text-[15px] md:leading-8">
                {copy.body}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
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

            <div className="relative -mt-2 md:mt-0">
              <div className="pointer-events-none absolute inset-0 rounded-[40px] bg-gradient-to-b from-transparent via-white/40 to-white blur-2xl" />
              <HeroVisual />
            </div>
          </div>
        </section>

        <section
          id="service-overview"
          className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14"
        >
          <div className="max-w-2xl md:max-w-3xl">
            <h2 className="text-[32px] font-black leading-tight tracking-[-0.06em] text-slate-950 md:text-[44px]">
              {copy.productTitle1}
              <br />
              {copy.productTitle2}
            </h2>

            <p className="mt-4 max-w-3xl text-[14px] font-semibold leading-7 text-slate-500 md:text-[15px] md:leading-8">
              {copy.productBody}
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {featureCards.map((card) => (
              <FeatureCard
                key={card.title}
                title={card.title}
                body={card.body}
                accent={card.accent}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 pt-0 md:px-6 md:pb-16 md:pt-4">
          <div className="relative overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-100/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-72 rounded-full bg-emerald-100/25 blur-3xl" />

            <div className="relative">
              <h2 className="max-w-3xl text-[28px] font-black leading-tight tracking-[-0.055em] text-slate-950 md:text-[40px]">
                {copy.finalTitle}
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500 md:text-[15px] md:leading-8">
                {copy.finalBody}
              </p>
            </div>
          </div>
        </section>
      </main>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 px-4 py-3 shadow-[0_-18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl transition md:hidden ${
          showStickyCta
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        }`}
      >
        <Link
          href="/signup/creator"
          className="flex w-full items-center justify-center rounded-full bg-[#ff5f67] px-5 py-3.5 text-sm font-black text-white shadow-[0_14px_28px_rgba(255,95,103,0.22)]"
        >
          {copy.primaryCta}
        </Link>
      </div>

      <PublicFooter />
    </div>
  );
}