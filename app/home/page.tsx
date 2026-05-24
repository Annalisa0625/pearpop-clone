// File: app/home/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

type CapabilityCardProps = {
  label: string;
  title: string;
  body: string;
  icon: string;
};

function CapabilityCard({ label, title, body, icon }: CapabilityCardProps) {
  return (
    <div className="group rounded-[30px] border border-slate-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/5">
      <div className="flex items-start justify-between gap-5">
        <div className="inline-flex rounded-full border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          {label}
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-xl">
          {icon}
        </div>
      </div>

      <h3 className="mt-7 text-xl font-black tracking-tight text-slate-950">
        {title}
      </h3>

      <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
        {body}
      </p>
    </div>
  );
}

type FlowStepProps = {
  number: string;
  title: string;
  body: string;
};

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

type UseCaseCardProps = {
  title: string;
  body: string;
};

function UseCaseCard({ title, body }: UseCaseCardProps) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
      <p className="text-lg font-black text-white">{title}</p>
      <p className="mt-3 text-sm font-medium leading-7 text-white/60">
        {body}
      </p>
    </div>
  );
}

type TrustCardProps = {
  title: string;
  body: string;
};

function TrustCard({ title, body }: TrustCardProps) {
  return (
    <div className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-600">
        ✓
      </div>

      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
        {body}
      </p>
    </div>
  );
}

function OverviewVisual() {
  return (
    <div className="relative overflow-hidden rounded-[38px] border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-950/5">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-100/60 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl" />

      <div className="relative rounded-[30px] border border-slate-100 bg-slate-50/70 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
              Trendre Flow
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              PR案件をオンラインで管理
            </p>
          </div>

          <div className="rounded-full bg-[#ff5f67] px-4 py-2 text-xs font-black text-white">
            Live
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {[
            ["01", "インフルエンサー検索", "SNS・価格・カテゴリで比較"],
            ["02", "メニュー選択", "PR投稿・UGC制作を選択"],
            ["03", "注文・支払い確認", "Stripeで安全に支払い方法を確認"],
            ["04", "納品確認", "投稿URL・成果物URLで確認"],
          ].map(([number, title, body]) => (
            <div
              key={number}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                {number}
              </div>

              <div>
                <p className="text-sm font-black text-slate-950">{title}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{body}</p>
              </div>

              <div className="h-2 w-2 rounded-full bg-[#7bae6c]" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-black text-slate-400">Search</p>
          <p className="mt-1 text-lg font-black text-slate-950">比較</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-black text-slate-400">Order</p>
          <p className="mt-1 text-lg font-black text-slate-950">依頼</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-black text-slate-400">Delivery</p>
          <p className="mt-1 text-lg font-black text-slate-950">納品</p>
        </div>
      </div>
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

          overviewLabel: "SERVICE OVERVIEW",
          overviewTitle:
            "探す・比較・依頼・納品確認まで、PR案件をひとつの流れに。",
          overviewBody:
            "Trendreは、インフルエンサーPRやUGC制作で発生する相場確認、見積もり、支払い、納品確認の手間をまとめて整理します。企業は一覧からインフルエンサーを比較し、表示価格のまま依頼できます。",

          capabilityLabel: "WHAT YOU CAN DO",
          capabilityTitle: "Trendreでできること",
          capabilityBody:
            "はじめてのPR依頼でも迷わないように、検索・価格比較・注文・支払い・納品確認までをシンプルに設計しています。",

          capability1Label: "SEARCH",
          capability1Title: "SNSアカウントを見て比較",
          capability1Body:
            "InstagramやTikTokなどのSNS情報、投稿イメージ、価格帯を確認しながら、商品に合うインフルエンサーを探せます。",
          capability2Label: "PRICE",
          capability2Title: "表示価格でそのまま依頼",
          capability2Body:
            "メニュー価格が見えるので、相場が分からない企業でも予算に合わせて小額から試せます。",
          capability3Label: "UGC",
          capability3Title: "PR投稿もUGC制作も対応",
          capability3Body:
            "SNS投稿だけでなく、広告素材や商品ページに使える画像・動画UGCの制作依頼にも対応できます。",
          capability4Label: "PAYMENT",
          capability4Title: "Stripeで支払い方法を確認",
          capability4Body:
            "支払い方法をオンラインで確認し、インフルエンサーが承認した場合のみ案件が開始されます。",
          capability5Label: "APPROVAL",
          capability5Title: "承認後に案件開始",
          capability5Body:
            "インフルエンサーが内容を確認して承認すると案件が進行します。辞退された場合、請求は確定しません。",
          capability6Label: "DELIVERY",
          capability6Title: "納品URLで確認",
          capability6Body:
            "投稿URLや成果物URLを画面上で確認し、問題なければ完了できます。案件状況も一覧で管理できます。",

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

          trustLabel: "TRUST & CONTROL",
          trustTitle: "安心して依頼できる理由",
          trustBody:
            "はじめてのインフルエンサー施策でも、価格・支払い・承認・納品確認の流れが見えるため、社内でも説明しやすくなります。",
          trust1Title: "表示価格で依頼できる",
          trust1Body:
            "見積もりのやり取りを減らし、メニュー価格を見てそのまま依頼できます。",
          trust2Title: "承認後に案件開始",
          trust2Body:
            "インフルエンサーが内容を確認し、承認した場合のみ案件が進行します。",
          trust3Title: "支払いと納品をオンライン管理",
          trust3Body:
            "支払い確認、納品URL、完了確認まで、案件ごとに画面上で管理できます。",

          finalTitle: "まずは、商品や店舗に合うインフルエンサーを探してみましょう。",
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

          overviewLabel: "SERVICE OVERVIEW",
          overviewTitle:
            "Search, compare, order, and review delivery in one workflow.",
          overviewBody:
            "Trendre organizes influencer discovery, pricing, payment, and delivery into one clear flow. Brands can compare influencers and order directly from visible menu pricing.",

          capabilityLabel: "WHAT YOU CAN DO",
          capabilityTitle: "What you can do with Trendre",
          capabilityBody:
            "Designed for simple influencer PR and UGC ordering, from discovery to delivery confirmation.",

          capability1Label: "SEARCH",
          capability1Title: "Compare social accounts",
          capability1Body:
            "Check Instagram and TikTok profiles, content examples, and pricing before choosing influencers.",
          capability2Label: "PRICE",
          capability2Title: "Order with visible pricing",
          capability2Body:
            "Start small with clear menu pricing and reduce back-and-forth estimation work.",
          capability3Label: "UGC",
          capability3Title: "Request posts and UGC",
          capability3Body:
            "Order social posts or UGC assets for ads, product pages, and social content.",
          capability4Label: "PAYMENT",
          capability4Title: "Confirm payment with Stripe",
          capability4Body:
            "Payment is handled online and the order begins after influencer acceptance.",
          capability5Label: "APPROVAL",
          capability5Title: "Start after acceptance",
          capability5Body:
            "Influencers review the request and accept before the job begins.",
          capability6Label: "DELIVERY",
          capability6Title: "Review delivery URLs",
          capability6Body:
            "Check submitted post URLs or deliverable links and complete the order online.",

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

          trustLabel: "TRUST & CONTROL",
          trustTitle: "Designed for safer ordering",
          trustBody:
            "Clear pricing, online payment, influencer acceptance, and delivery review make campaigns easier to manage.",
          trust1Title: "Visible menu pricing",
          trust1Body:
            "Reduce estimation work and order directly from clear influencer menus.",
          trust2Title: "Starts after acceptance",
          trust2Body:
            "The job begins only after the influencer reviews and accepts the request.",
          trust3Title: "Payment and delivery online",
          trust3Body:
            "Track payment, delivery URL, and completion status for each order.",

          finalTitle: "Start by finding influencers that fit your product.",
          finalBody:
            "Search, compare, order, and review delivery in one online workflow.",
          finalPrimary: "Join as a Brand",
          finalSecondary: "Search Influencers",
        };

  const capabilities = [
    {
      label: copy.capability1Label,
      title: copy.capability1Title,
      body: copy.capability1Body,
      icon: "🔎",
    },
    {
      label: copy.capability2Label,
      title: copy.capability2Title,
      body: copy.capability2Body,
      icon: "¥",
    },
    {
      label: copy.capability3Label,
      title: copy.capability3Title,
      body: copy.capability3Body,
      icon: "▶",
    },
    {
      label: copy.capability4Label,
      title: copy.capability4Title,
      body: copy.capability4Body,
      icon: "□",
    },
    {
      label: copy.capability5Label,
      title: copy.capability5Title,
      body: copy.capability5Body,
      icon: "✓",
    },
    {
      label: copy.capability6Label,
      title: copy.capability6Title,
      body: copy.capability6Body,
      icon: "↗",
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

  const trustCards = [
    { title: copy.trust1Title, body: copy.trust1Body },
    { title: copy.trust2Title, body: copy.trust2Body },
    { title: copy.trust3Title, body: copy.trust3Body },
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
          className="scroll-mt-24 border-y border-slate-100 bg-[#F8FAFC]"
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-18 md:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-24">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7bae6c]">
                {copy.overviewLabel}
              </p>

              <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 md:text-5xl">
                {copy.overviewTitle}
              </h2>

              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-500">
                {copy.overviewBody}
              </p>

              <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Search
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    比較
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Order
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    依頼
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Manage
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    管理
                  </p>
                </div>
              </div>
            </div>

            <OverviewVisual />
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-18 md:px-6 lg:py-24">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff5f67]">
                {copy.capabilityLabel}
              </p>

              <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 md:text-5xl">
                {copy.capabilityTitle}
              </h2>

              <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-slate-500">
                {copy.capabilityBody}
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item) => (
                <CapabilityCard
                  key={item.label}
                  label={item.label}
                  title={item.title}
                  body={item.body}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F8FAFC]">
          <div className="mx-auto max-w-7xl px-4 py-18 md:px-6 lg:py-24">
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

        <section className="bg-white px-4 py-18 md:px-6 lg:py-24">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[44px] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-950/10 md:p-10 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff7a82]">
                  {copy.useCaseLabel}
                </p>

                <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] text-white md:text-5xl">
                  {copy.useCaseTitle}
                </h2>

                <p className="mt-5 text-base font-medium leading-8 text-white/60">
                  {copy.useCaseBody}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {useCases.map((item) => (
                  <UseCaseCard
                    key={item.title}
                    title={item.title}
                    body={item.body}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F8FAFC]">
          <div className="mx-auto max-w-7xl px-4 py-18 md:px-6 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7bae6c]">
                  {copy.trustLabel}
                </p>

                <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 md:text-5xl">
                  {copy.trustTitle}
                </h2>

                <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-500">
                  {copy.trustBody}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                {trustCards.map((item) => (
                  <TrustCard
                    key={item.title}
                    title={item.title}
                    body={item.body}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-18 md:px-6 lg:py-24">
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