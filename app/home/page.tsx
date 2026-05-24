// File: app/home/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

type ProductCardProps = {
  title: string;
  body: string;
  accent: "rose" | "emerald" | "blue" | "amber" | "violet" | "slate";
};

type FlowStepProps = {
  number: string;
  title: string;
  body: string;
};

type UseCaseCardProps = {
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
  violet: {
    bg: "bg-violet-50",
    main: "bg-violet-500",
    sub: "bg-violet-300",
    line: "bg-violet-500/20",
  },
  slate: {
    bg: "bg-slate-100",
    main: "bg-slate-900",
    sub: "bg-slate-400",
    line: "bg-slate-300",
  },
};

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
    <article className="group relative min-h-[280px] overflow-hidden rounded-[30px] bg-white p-8 shadow-[0_22px_70px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(15,23,42,0.1)]">
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
    <div className="relative rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
          {number}
        </div>

        <h3 className="text-lg font-black tracking-tight text-slate-950">
          {title}
        </h3>
      </div>

      <p className="mt-4 text-sm font-medium leading-7 text-slate-500">
        {body}
      </p>
    </div>
  );
}

function UseCaseCard({ title, body }: UseCaseCardProps) {
  return (
    <div className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/5">
      <p className="text-lg font-black text-slate-950">{title}</p>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
        {body}
      </p>
    </div>
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
                Direct Order
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
              <p className="text-sm font-black text-slate-950">¥20k</p>
              <p className="mt-1 text-[10px] font-bold text-slate-400">
                Price
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-950 px-5 py-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
            Order
          </p>
          <p className="mt-1 text-2xl font-black">¥22,000</p>
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

export default function HomePage() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          eyebrow: "インフルエンサーPRを、もっと手軽に",
          titleLine1: "商品や店舗、求人のPRも",
          titleLine2: "すぐに探して依頼できる。",
          titleAccent: "価格、成果を可視化し。",
          titleLine3: "認知拡大へ。",
          body:
            "Trendreは、Instagram・TikTokなど各種媒体でのPR投稿やUGC制作（広告素材）をインフルエンサーに直接依頼できるマーケットプレイスです。一覧から実際のSNSアカウントや価格を確認・比較し、支払いから納品確認までオンラインで完結できます。",
          primaryCta: "無料で企業登録",
          secondaryCta: "インフルエンサーを探す",
          mini1: "SNSを確認",
          mini2: "表示価格で依頼",
          mini3: "納品まで管理",

          productPill: "サービス概要",
          productTitle1: "インフルエンサーPRの",
          productTitle2: "すべてがこれ",
          productTitleAccent: "1つで完結",
          productBody:
            "検索、価格比較、注文、支払い確認、承認、納品確認までをひとつの流れに整理。DM営業や個別見積もりに頼らず、商品や店舗に合うインフルエンサーへスムーズに依頼できます。",

          card1Title: "インフルエンサー検索",
          card1Body:
            "SNS、カテゴリ、価格、フォロワー帯などを見ながら、商品や店舗に合うインフルエンサーを探せます。",
          card2Title: "表示価格で即依頼",
          card2Body:
            "メニュー価格を見て比較できるため、相場が分からない企業でも小額からPR施策を試せます。",
          card3Title: "PR投稿・UGC制作",
          card3Body:
            "Instagram投稿、TikTok動画、商品レビュー、広告素材向けUGCなどを依頼できます。",
          card4Title: "支払い・承認フロー",
          card4Body:
            "Stripeで支払い方法を確認し、インフルエンサーが承認した場合のみ案件が開始されます。",
          card5Title: "納品URLで確認",
          card5Body:
            "投稿URLや成果物URLを画面上で確認し、問題なければ案件を完了できます。",
          card6Title: "案件をオンライン管理",
          card6Body:
            "承認待ち、進行中、納品済み、完了まで、案件状況を一覧で確認できます。",

          howLabel: "HOW IT WORKS",
          howTitle: "依頼までの流れ",
          howBody:
            "DMで個別交渉するのではなく、検索から納品確認までをオンラインで完結できます。",
          step1Title: "探す",
          step1Body:
            "SNS、カテゴリ、価格、フォロワー帯などから、商品や店舗に合うインフルエンサーを検索します。",
          step2Title: "比較する",
          step2Body:
            "SNSアカウント、投稿イメージ、価格、メニュー内容を見ながら候補を比較します。",
          step3Title: "依頼する",
          step3Body:
            "商品URL、希望内容、納期、UGC利用の希望などを入力して注文します。",
          step4Title: "承認を待つ",
          step4Body:
            "インフルエンサーが承認すると決済が確定し、案件が開始されます。",
          step5Title: "納品確認",
          step5Body:
            "投稿URLや成果物URLを確認し、問題なければ案件完了です。",

          useCaseLabel: "USE CASES",
          useCaseTitle: "こんなPRに使えます",
          useCaseBody:
            "美容・コスメだけでなく、店舗、求人、D2C、EC、海外ブランドの日本展開まで幅広く活用できます。",
          useCase1Title: "美容・コスメPR",
          useCase1Body:
            "新商品やブランド認知を、マイクロインフルエンサーの投稿やレビューで広げたい企業に。",
          useCase2Title: "店舗PR",
          useCase2Body:
            "飲食店、サロン、ジム、体験サービスなど、来店や予約につながるSNS発信を依頼できます。",
          useCase3Title: "求人PR",
          useCase3Body:
            "職場の雰囲気や働き方を、SNS上で自然に伝えたい採用・求人施策にも活用できます。",
          useCase4Title: "D2C・ECブランド",
          useCase4Body:
            "広告素材やSNS運用に使えるUGCを継続的に集めたいブランドに。",
          useCase5Title: "UGC広告素材",
          useCase5Body:
            "広告、LP、商品ページ、SNS運用に使える画像・動画素材の制作を依頼できます。",
          useCase6Title: "海外ブランドの日本展開",
          useCase6Body:
            "日本の生活者に届くインフルエンサーを探し、日本向けPRを始めたい企業に。",

          finalTitle:
            "まずは、商品や店舗に合うインフルエンサーを探してみましょう。",
          finalBody:
            "検索・比較・注文・納品確認まで、Trendre上でスムーズに進められます。",
          finalPrimary: "無料で企業登録",
          finalSecondary: "インフルエンサー検索を見る",
        }
      : {
          eyebrow: "Influencer PR made easier",
          titleLine1: "Find influencers",
          titleLine2: "and order PR faster.",
          titleAccent: "See pricing and results.",
          titleLine3: "Start from one request.",
          body:
            "Trendre is a marketplace where brands can request Instagram and TikTok PR posts or UGC creation, including ad-ready photo and video assets, directly from influencers. Compare real social accounts and prices, then manage payment and delivery online.",
          primaryCta: "Join as a Brand",
          secondaryCta: "Search Influencers",
          mini1: "Check social accounts",
          mini2: "Order with visible pricing",
          mini3: "Manage delivery online",

          productPill: "Overview",
          productTitle1: "Everything for",
          productTitle2: "influencer PR",
          productTitleAccent: "in one place",
          productBody:
            "Search, compare pricing, order, confirm payment, wait for acceptance, and review delivery in one workflow. Trendre helps brands request influencer PR and UGC without relying on manual DMs.",

          card1Title: "Influencer search",
          card1Body:
            "Find influencers by social platform, category, price, follower range, and audience fit.",
          card2Title: "Order with visible pricing",
          card2Body:
            "Compare menu prices and start small without spending time on individual estimates.",
          card3Title: "PR posts and UGC",
          card3Body:
            "Request Instagram posts, TikTok videos, product reviews, and UGC assets.",
          card4Title: "Payment and approval flow",
          card4Body:
            "Confirm payment with Stripe and start only after the influencer accepts.",
          card5Title: "Review delivery URLs",
          card5Body:
            "Check submitted post URLs or deliverable links and complete the order online.",
          card6Title: "Manage orders online",
          card6Body:
            "Track pending, active, delivered, and completed orders from one place.",

          howLabel: "HOW IT WORKS",
          howTitle: "From search to delivery",
          howBody:
            "Move from discovery to delivery without managing everything through DMs.",
          step1Title: "Search",
          step1Body:
            "Find influencers by platform, category, price, follower range, and audience fit.",
          step2Title: "Compare",
          step2Body:
            "Review social accounts, content examples, pricing, and menu details.",
          step3Title: "Order",
          step3Body:
            "Send product URLs, request details, deadline, and usage preferences.",
          step4Title: "Wait for acceptance",
          step4Body:
            "The order begins once the influencer accepts and payment is captured.",
          step5Title: "Review delivery",
          step5Body:
            "Check submitted post URLs or deliverable links and complete the order.",

          useCaseLabel: "USE CASES",
          useCaseTitle: "Built for different PR needs",
          useCaseBody:
            "Use Trendre for beauty, stores, recruiting, D2C, UGC assets, and Japan market entry.",
          useCase1Title: "Beauty and cosmetics",
          useCase1Body:
            "Promote new products and build awareness with influencer posts and reviews.",
          useCase2Title: "Local store PR",
          useCase2Body:
            "Support restaurants, salons, gyms, and local services with social content.",
          useCase3Title: "Recruiting PR",
          useCase3Body:
            "Share workplace culture and job appeal through natural social content.",
          useCase4Title: "D2C and ecommerce",
          useCase4Body:
            "Collect UGC assets for ads, product pages, and social media content.",
          useCase5Title: "UGC ad assets",
          useCase5Body:
            "Request photo and video assets for ads, LPs, and product pages.",
          useCase6Title: "Japan market entry",
          useCase6Body:
            "Find influencers who can reach Japanese consumers and support Japan PR.",

          finalTitle: "Start by finding influencers that fit your product.",
          finalBody:
            "Search, compare, order, and review delivery in one online workflow.",
          finalPrimary: "Join as a Brand",
          finalSecondary: "Search Influencers",
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
      accent: "amber",
    },
    {
      title: copy.card4Title,
      body: copy.card4Body,
      accent: "emerald",
    },
    {
      title: copy.card5Title,
      body: copy.card5Body,
      accent: "violet",
    },
    {
      title: copy.card6Title,
      body: copy.card6Body,
      accent: "slate",
    },
  ];

  const flowSteps = [
    { number: "1", title: copy.step1Title, body: copy.step1Body },
    { number: "2", title: copy.step2Title, body: copy.step2Body },
    { number: "3", title: copy.step3Title, body: copy.step3Body },
    { number: "4", title: copy.step4Title, body: copy.step4Body },
    { number: "5", title: copy.step5Title, body: copy.step5Body },
  ];

  const useCases = [
    { title: copy.useCase1Title, body: copy.useCase1Body },
    { title: copy.useCase2Title, body: copy.useCase2Body },
    { title: copy.useCase3Title, body: copy.useCase3Body },
    { title: copy.useCase4Title, body: copy.useCase4Body },
    { title: copy.useCase5Title, body: copy.useCase5Body },
    { title: copy.useCase6Title, body: copy.useCase6Body },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-16 pt-12 md:px-6 md:pb-20 md:pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20 lg:pb-20 lg:pt-16">
            <div className="max-w-[660px]">
              <p className="text-sm font-black leading-7 text-slate-600 md:text-base">
                {copy.eyebrow}
              </p>

              <h1 className="mt-6 max-w-2xl text-[30px] font-black leading-[1.24] tracking-[-0.035em] text-slate-950 md:text-[38px] lg:text-[44px]">
                {copy.titleLine1}
                <br />
                {copy.titleLine2}
                <br />
                <span className="text-[#ff5f67]">{copy.titleAccent}</span>
                <br />
                {copy.titleLine3}
              </h1>

              <p className="mt-8 max-w-[640px] text-[15px] font-medium leading-8 text-slate-600 md:text-base md:leading-9">
                {copy.body}
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/signup/company"
                  className="rounded-full bg-[#ff5f67] px-8 py-4 text-sm font-black text-white shadow-xl shadow-rose-500/20 transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {copy.primaryCta}
                </Link>

                <Link
                  href="/b/creators"
                  className="rounded-full border-2 border-[#ff5f67] bg-white px-8 py-4 text-sm font-black text-[#ff5f67] transition hover:-translate-y-0.5 hover:bg-rose-50"
                >
                  {copy.secondaryCta}
                </Link>
              </div>

              <div className="mt-12 grid max-w-xl gap-3 sm:grid-cols-3">
                {[copy.mini1, copy.mini2, copy.mini3].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 text-xs font-black text-slate-700 shadow-sm backdrop-blur md:text-[13px]"
                  >
                    <span className="mr-2 text-[#7bae6c]">●</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <HeroVisual />
          </div>
        </section>

        <section
          id="service-overview"
          className="scroll-mt-24 bg-[#F3F7FB]"
        >
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 md:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:py-28">
            <div className="lg:sticky lg:top-28 lg:self-start lg:pt-28">
              <div className="inline-flex rounded-full border-2 border-[#ff5f67] bg-white px-5 py-3 text-sm font-black text-slate-950">
                {copy.productPill}
              </div>

              <h2 className="mt-8 max-w-lg text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 md:text-5xl">
                {copy.productTitle1}
                <br />
                {copy.productTitle2}
                <br />
                <span className="text-[#ff5f67]">
                  {copy.productTitleAccent}
                </span>
              </h2>

              <p className="mt-7 max-w-xl text-[15px] font-medium leading-8 text-slate-600">
                {copy.productBody}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {productCards.map((card) => (
                <ProductCard key={card.title} {...card} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 lg:py-24">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div className="lg:sticky lg:top-28">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7bae6c]">
                  {copy.howLabel}
                </p>

                <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 md:text-5xl">
                  {copy.howTitle}
                </h2>

                <p className="mt-5 text-base font-medium leading-8 text-slate-500">
                  {copy.howBody}
                </p>

                <Link
                  href="/signup/company"
                  className="mt-8 inline-flex rounded-full bg-slate-950 px-7 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5"
                >
                  {copy.primaryCta}
                </Link>
              </div>

              <div className="grid gap-4">
                {flowSteps.map((item) => (
                  <FlowStep
                    key={item.number}
                    number={item.number}
                    title={item.title}
                    body={item.body}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F3F7FB] px-4 py-20 md:px-6 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff5f67]">
                {copy.useCaseLabel}
              </p>

              <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 md:text-5xl">
                {copy.useCaseTitle}
              </h2>

              <p className="mt-5 text-base font-medium leading-8 text-slate-500">
                {copy.useCaseBody}
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {useCases.map((item) => (
                <UseCaseCard
                  key={item.title}
                  title={item.title}
                  body={item.body}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-20 md:px-6 lg:py-24">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[42px] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/10 md:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.03em] md:text-5xl">
                  {copy.finalTitle}
                </h2>

                <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-white/60 md:text-base">
                  {copy.finalBody}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup/company"
                  className="rounded-full bg-[#ff5f67] px-7 py-4 text-sm font-black text-white shadow-lg shadow-rose-500/20"
                >
                  {copy.finalPrimary}
                </Link>

                <Link
                  href="/b/creators"
                  className="rounded-full border border-white/20 bg-white/10 px-7 py-4 text-sm font-black text-white"
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