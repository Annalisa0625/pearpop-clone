// File: app/for-creators/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";

type ProductCardProps = {
  title: string;
  body: string;
  accent: "rose" | "emerald" | "blue" | "amber" | "slate";
};

type FlowStepProps = {
  number: string;
  title: string;
  body: string;
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
  blue: {
    bg: "bg-blue-50",
    main: "bg-blue-500",
    sub: "bg-blue-300",
    line: "bg-blue-500/20",
  },
  amber: {
    bg: "bg-amber-50",
    main: "bg-amber-500",
    sub: "bg-amber-300",
    line: "bg-amber-500/20",
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl">
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
    <article className="group relative min-h-[250px] overflow-hidden rounded-[30px] bg-white p-7 shadow-[0_22px_70px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(15,23,42,0.1)]">
      <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-slate-50 opacity-80 transition group-hover:scale-110" />

      <div className="relative flex items-start gap-5">
        <ProductMark accent={accent} />

        <div>
          <h3 className="text-2xl font-black leading-tight tracking-[-0.03em] text-slate-950">
            {title}
          </h3>

          <p className="mt-5 text-[15px] font-medium leading-8 text-slate-600">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}

function FlowStep({ number, title, body }: FlowStepProps) {
  return (
    <article className="group relative overflow-hidden rounded-[28px] bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] ring-1 ring-slate-100 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-slate-50 transition duration-300 group-hover:scale-110" />

      <div className="relative flex gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/10">
          {number}
        </div>

        <div className="pt-1">
          <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">
            {title}
          </h3>

          <p className="mt-3 text-[15px] font-medium leading-8 text-slate-500">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}

function HeroPlaceholder() {
  return (
    <div className="flex min-h-[330px] items-center justify-center rounded-[30px] bg-white">
      <div className="w-full max-w-[360px] rounded-[28px] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-950/5">
        <div className="rounded-[22px] bg-slate-50 p-5">
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

        <div className="mt-4 rounded-2xl bg-slate-950 px-5 py-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
            Payout
          </p>
          <p className="mt-1 text-2xl font-black">¥25,500</p>
        </div>
      </div>
    </div>
  );
}

function HeroVisual() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="relative mx-auto flex w-full max-w-[535px] items-center justify-center lg:-mt-6 lg:translate-x-2 xl:-mt-8">
      {imageFailed ? (
        <HeroPlaceholder />
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
            "DMだけで案件を管理するのではなく、注文内容、チャット、納品URL、報酬履歴をTrendre上で整理できます。受けたい内容と価格をメニューとして公開し、企業からの注文を待つことができます。",

          card1Title: "メニューを作成",
          card1Body:
            "Instagram投稿、TikTok動画、UGC制作など、自分が受けたい内容と価格を登録できます。",
          card2Title: "注文を確認して承認",
          card2Body:
            "企業から注文が届いたら、内容を確認してから承認できます。合わない依頼は無理に受ける必要はありません。",
          card3Title: "チャットで確認",
          card3Body:
            "商品や投稿内容の確認は、注文ごとのチャットでやり取りできます。",
          card4Title: "投稿URLを納品",
          card4Body:
            "投稿や制作が完了したら、投稿URLや納品URLを提出します。",
          card5Title: "報酬を確認",
          card5Body:
            "完了した注文の報酬履歴を画面上で確認できます。",
          card6Title: "ポートフォリオを見せる",
          card6Body:
            "写真や過去の投稿イメージを登録して、企業に雰囲気を伝えられます。",

          howTitle: "登録から注文までの流れ",
          howBody:
            "最初にプロフィールとメニューを整えることで、企業があなたを見つけて注文できる状態になります。",
          howCta: "インフルエンサー登録",
          step1Title: "プロフィールを登録",
          step1Body:
            "表示名、カテゴリ、SNS、ポートフォリオ画像を登録します。",
          step2Title: "メニューを作成",
          step2Body:
            "受けたい投稿形式やUGC制作内容、価格を設定します。",
          step3Title: "注文を確認",
          step3Body:
            "企業から注文が届いたら、内容を見て承認または辞退できます。",
          step4Title: "制作・投稿",
          step4Body:
            "必要な確認をチャットで行い、投稿や制作を進めます。",
          step5Title: "納品・完了",
          step5Body:
            "投稿URLや納品URLを提出し、完了後に報酬履歴を確認できます。",

          useCaseTitle: "登録前に用意しておくもの",
          useCaseBody:
            "プロフィール画像、SNSアカウント、ポートフォリオ画像、受けたいメニュー内容があるとスムーズです。",
          prep1: "SNSアカウント",
          prep2: "プロフィール画像",
          prep3: "ポートフォリオ画像 3枚以上",
          prep4: "受けたいメニューと価格",

          finalTitle:
            "まずは、インフルエンサー登録から始めましょう。",
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
          productTitle1: "Manage influencer work",
          productTitle2: "more clearly",
          productTitleAccent: "in one place",
          productBody:
            "Instead of managing everything through DMs, Trendre organizes order details, chat, delivery URLs, and earnings history. Publish the services you want to offer and wait for brand orders.",

          card1Title: "Create menus",
          card1Body:
            "Add Instagram posts, TikTok videos, UGC creation, and other services you want to offer.",
          card2Title: "Review and accept orders",
          card2Body:
            "When a brand orders, you can review the details before accepting. You do not have to accept requests that do not fit.",
          card3Title: "Confirm through chat",
          card3Body:
            "Use order-based chat to confirm products, posting details, and delivery expectations.",
          card4Title: "Submit delivery URLs",
          card4Body:
            "After posting or creating content, submit the post URL or delivery URL.",
          card5Title: "Track earnings",
          card5Body:
            "Review completed orders and earnings history in your account.",
          card6Title: "Show your portfolio",
          card6Body:
            "Upload images and content examples so brands can understand your style.",

          howTitle: "From signup to orders",
          howBody:
            "Add your profile and menus so brands can discover and order from you.",
          howCta: "Join as an Influencer",
          step1Title: "Create your profile",
          step1Body:
            "Add display name, category, social accounts, and portfolio images.",
          step2Title: "Set up menus",
          step2Body:
            "Choose what you offer and how much each service costs.",
          step3Title: "Review orders",
          step3Body:
            "When a brand orders, accept or decline after checking the details.",
          step4Title: "Create or post",
          step4Body:
            "Use chat for confirmation and create or post the requested content.",
          step5Title: "Deliver and complete",
          step5Body:
            "Submit post or delivery URLs and review earnings after completion.",

          useCaseTitle: "What to prepare",
          useCaseBody:
            "Prepare your social accounts, profile image, portfolio images, and menu ideas to complete signup smoothly.",
          prep1: "Social accounts",
          prep2: "Profile image",
          prep3: "At least 3 portfolio images",
          prep4: "Menu ideas and pricing",

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
      accent: "blue",
    },
    {
      title: copy.card3Title,
      body: copy.card3Body,
      accent: "emerald",
    },
    {
      title: copy.card4Title,
      body: copy.card4Body,
      accent: "amber",
    },
    {
      title: copy.card5Title,
      body: copy.card5Body,
      accent: "slate",
    },
    {
      title: copy.card6Title,
      body: copy.card6Body,
      accent: "rose",
    },
  ];

  const flowSteps: FlowStepProps[] = [
    { number: "1", title: copy.step1Title, body: copy.step1Body },
    { number: "2", title: copy.step2Title, body: copy.step2Body },
    { number: "3", title: copy.step3Title, body: copy.step3Body },
    { number: "4", title: copy.step4Title, body: copy.step4Body },
    { number: "5", title: copy.step5Title, body: copy.step5Body },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-slate-950">
      <CreatorPublicHeader />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-gradient-to-b from-white via-rose-50/45 to-transparent" />
        <div className="pointer-events-none absolute right-[-260px] top-[220px] h-[560px] w-[560px] rounded-full bg-emerald-100/25 blur-[150px]" />
        <div className="pointer-events-none absolute left-[-280px] top-[760px] h-[520px] w-[520px] rounded-full bg-rose-100/25 blur-[150px]" />

        <section className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 md:px-6 lg:grid-cols-[minmax(0,1fr)_535px] lg:items-center lg:py-20">
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
        </section>

        <section
          id="service-overview"
          className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16"
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

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

        <section className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16">
          <div className="rounded-[34px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] md:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div>
                <h2 className="text-[32px] font-black tracking-[-0.055em] text-slate-950 md:text-[44px]">
                  {copy.howTitle}
                </h2>

                <p className="mt-4 text-sm font-semibold leading-8 text-slate-500 md:text-base">
                  {copy.howBody}
                </p>

                <Link
                  href="/signup/creator"
                  className="mt-7 inline-flex rounded-full bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  {copy.howCta}
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {flowSteps.map((step) => (
                  <FlowStep
                    key={step.number}
                    number={step.number}
                    title={step.title}
                    body={step.body}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
            <div className="rounded-[34px] bg-white p-7 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:p-8">
              <h2 className="text-[32px] font-black tracking-[-0.055em] text-slate-950 md:text-[44px]">
                {copy.useCaseTitle}
              </h2>

              <p className="mt-4 text-sm font-semibold leading-8 text-slate-500 md:text-base">
                {copy.useCaseBody}
              </p>
            </div>

            <div className="grid gap-3">
              {[copy.prep1, copy.prep2, copy.prep3, copy.prep4].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-[0_14px_45px_rgba(15,23,42,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-18">
          <div className="overflow-hidden rounded-[36px] bg-slate-950 p-7 text-white shadow-[0_30px_90px_rgba(15,23,42,0.2)] md:p-10">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="max-w-3xl text-[32px] font-black leading-tight tracking-[-0.055em] md:text-[50px]">
                  {copy.finalTitle}
                </h2>

                <p className="mt-4 max-w-2xl text-sm font-semibold leading-8 text-white/60 md:text-base">
                  {copy.finalBody}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/signup/creator"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-7 py-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(255,95,103,0.26)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {copy.finalPrimary}
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-white/10 px-7 py-4 text-sm font-black text-white ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-white/15"
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