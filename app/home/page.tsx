// File: app/home/page.tsx
"use client";

import Link from "next/link";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

type FeatureCardProps = {
  icon: string;
  title: string;
  body: string;
};

function FeatureCard({ icon, title, body }: FeatureCardProps) {
  return (
    <div className="group rounded-[30px] border border-slate-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/5">
      <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-slate-50 text-2xl ring-1 ring-slate-100">
        {icon}
      </div>
      <h3 className="mt-6 text-xl font-black tracking-tight text-slate-950">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-500">{body}</p>
    </div>
  );
}

type StepCardProps = {
  number: string;
  title: string;
  body: string;
};

function StepCard({ number, title, body }: StepCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-slate-100 bg-white p-7 shadow-sm">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-50" />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
        {number}
      </div>
      <h3 className="relative mt-6 text-xl font-black tracking-tight text-slate-950">
        {title}
      </h3>
      <p className="relative mt-3 text-sm leading-7 text-slate-500">{body}</p>
    </div>
  );
}

type UseCaseCardProps = {
  title: string;
  body: string;
};

function UseCaseCard({ title, body }: UseCaseCardProps) {
  return (
    <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-6">
      <p className="text-lg font-black text-slate-950">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-500">{body}</p>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -left-8 top-10 hidden rounded-3xl bg-white p-5 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-100 md:block">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-xl font-black text-[#ff5f67]">
            72%
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Match Rate
            </p>
            <p className="mt-1 text-sm font-black text-slate-950">
              Creator Fit
            </p>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 top-28 hidden rounded-2xl bg-white p-3 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-100 md:block">
        <div className="space-y-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600">
            f
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-sm font-black text-rose-600">
            ◎
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
            ♪
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-sm font-black text-red-600">
            ▶
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 left-8 hidden rounded-3xl bg-white px-6 py-4 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-100 md:block">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Followers
        </p>
        <p className="mt-1 text-2xl font-black text-slate-950">128,000</p>
      </div>

      <div className="absolute -bottom-8 right-8 hidden rounded-3xl bg-white p-5 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-100 md:block">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Order
        </p>
        <p className="mt-1 text-lg font-black text-slate-950">¥22,000</p>
      </div>

      <div className="relative rounded-[46px] bg-white p-4 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-100">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-rose-50 via-white to-emerald-50">
          <div className="absolute inset-0 bg-[radial-gradient(#ff6b6b_1px,transparent_1px)] [background-size:18px_18px] opacity-[0.12]" />

          <img
            src="/brand/trendre-home-hero.png"
            alt="Trendre creator marketing visual"
            className="relative h-auto w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          eyebrow: "インフルエンサー検索・UGC制作・商品PRをこれひとつで",
          titleLine1: "商品に合うクリエイターを見つけて",
          titleAccent1: "ブランドの認知と売上",
          titleLine2: "につながる",
          titleAccent2: "クリエイターマーケティング",
          body:
            "Trendreは、企業がInstagram・TikTok・UGC制作をクリエイターに直接依頼できるマーケットプレイスです。価格・SNS・ポートフォリオを見て比較し、支払いから納品確認までオンラインで完結できます。",
          primaryCta: "無料で企業登録",
          secondaryCta: "クリエイターを探す",
          mini1: "1件から依頼",
          mini2: "Stripeで支払い確認",
          mini3: "納品までオンライン管理",

          sectionLabel: "WHY TRENDRE",
          sectionTitle: "DM営業ではなく、探して・比較して・そのまま依頼。",
          sectionBody:
            "インフルエンサーPRやUGC制作で起こりがちな、相場確認・見積もり・支払い・納品管理の手間を、ひとつの流れに整理します。",

          feature1Title: "価格が見えるから依頼しやすい",
          feature1Body:
            "クリエイターごとのメニュー価格を見て比較できます。はじめてのPR依頼でも予算感をつかみやすくなります。",
          feature2Title: "SNS投稿もUGC素材も依頼できる",
          feature2Body:
            "Instagram投稿、TikTok動画、商品レビュー、広告素材用のUGC制作など、ブランド施策に合わせて依頼できます。",
          feature3Title: "支払いから納品確認までオンラインで完結",
          feature3Body:
            "Stripe Checkoutで支払い方法を確認し、クリエイター承認後に案件が開始。納品URLや完了状態も画面上で確認できます。",

          howLabel: "HOW IT WORKS",
          howTitle: "依頼までの流れ",
          step1Title: "クリエイターを探す",
          step1Body:
            "SNS、カテゴリ、価格、フォロワー帯などから、商品に合うクリエイターを検索します。",
          step2Title: "メニューを選んで注文",
          step2Body:
            "Instagram投稿、TikTok動画、UGC素材などのメニューを選び、商品URLや希望内容を入力します。",
          step3Title: "承認後に案件開始",
          step3Body:
            "クリエイターが承認すると決済が確定し、案件が開始されます。辞退された場合、請求は確定しません。",
          step4Title: "納品を確認して完了",
          step4Body:
            "投稿URLや成果物URLを確認し、問題なければ完了できます。案件状況は画面で管理できます。",

          useCaseLabel: "USE CASES",
          useCaseTitle: "こんな企業におすすめ",
          useCase1Title: "美容・コスメ・スキンケア",
          useCase1Body:
            "新商品やブランド認知を、マイクロクリエイターの投稿やレビューで広げたい企業に。",
          useCase2Title: "D2C・ECブランド",
          useCase2Body:
            "広告素材やSNS運用に使えるUGCを継続的に集めたいブランドに。",
          useCase3Title: "アパレル・ライフスタイル",
          useCase3Body:
            "複数クリエイターの世界観や投稿表現を比較しながらPRしたい企業に。",
          useCase4Title: "海外ブランドの日本展開",
          useCase4Body:
            "日本の生活者に届くクリエイターを探し、日本向けPRを始めたい企業に。",

          finalTitle: "まずは、商品に合うクリエイターを探してみましょう。",
          finalBody:
            "検索・比較・注文・納品確認まで、Trendre上でスムーズに進められます。",
          finalPrimary: "無料で企業登録",
          finalSecondary: "クリエイター検索を見る",
        }
      : {
          eyebrow: "Influencer search, UGC creation, and product promotion in one place",
          titleLine1: "Find creators that fit your product",
          titleAccent1: "grow brand awareness",
          titleLine2: "and unlock",
          titleAccent2: "creator marketing",
          body:
            "Trendre is a creator marketplace where brands can request Instagram posts, TikTok videos, UGC assets, and product promotion directly from creators. Compare prices, social accounts, and portfolios, then manage payment and delivery online.",
          primaryCta: "Join as a Brand",
          secondaryCta: "Search Creators",
          mini1: "Start with one order",
          mini2: "Stripe payment check",
          mini3: "Manage delivery online",

          sectionLabel: "WHY TRENDRE",
          sectionTitle: "Search, compare, and order without messy DMs.",
          sectionBody:
            "Trendre turns creator discovery, pricing, payment, and delivery into one clear workflow for influencer PR and UGC creation.",

          feature1Title: "Visible pricing makes ordering easier",
          feature1Body:
            "Compare creator menu prices before ordering, making early creator campaigns easier to budget and test.",
          feature2Title: "Request both social posts and UGC",
          feature2Body:
            "Use Trendre for Instagram posts, TikTok videos, product reviews, and UGC assets for ads or social content.",
          feature3Title: "Payment and delivery in one workflow",
          feature3Body:
            "Stripe Checkout confirms the payment method, and the order begins after creator acceptance. Delivery URLs and status are managed online.",

          howLabel: "HOW IT WORKS",
          howTitle: "From search to delivery",
          step1Title: "Search creators",
          step1Body:
            "Browse creators by social platform, category, price, follower range, and audience fit.",
          step2Title: "Choose a menu and order",
          step2Body:
            "Select an Instagram, TikTok, or UGC menu and send your product URL, timeline, and request details.",
          step3Title: "Creator accepts",
          step3Body:
            "When the creator accepts, payment is captured and the job begins. If declined, the charge is not finalized.",
          step4Title: "Review delivery",
          step4Body:
            "Check submitted post URLs or deliverable links and complete the order when everything looks good.",

          useCaseLabel: "USE CASES",
          useCaseTitle: "Built for growing brands",
          useCase1Title: "Beauty and skincare",
          useCase1Body:
            "Promote new products and build early awareness with creator-led posts and reviews.",
          useCase2Title: "D2C and ecommerce",
          useCase2Body:
            "Collect UGC assets for paid ads, product pages, and social media content.",
          useCase3Title: "Fashion and lifestyle",
          useCase3Body:
            "Compare multiple creators and test different content styles for your brand.",
          useCase4Title: "Brands entering Japan",
          useCase4Body:
            "Find creators who can reach Japanese consumers and support Japan-focused PR.",

          finalTitle: "Start by finding creators that fit your product.",
          finalBody:
            "Search, compare, order, and review delivery in one online workflow.",
          finalPrimary: "Join as a Brand",
          finalSecondary: "Search Creators",
        };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(#ff6b6b_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.08]" />
          <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-rose-100/60 blur-3xl" />
          <div className="absolute -right-40 top-36 h-[420px] w-[420px] rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 md:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-24">
            <div>
              <p className="text-base font-black leading-7 text-slate-600 md:text-lg">
                {copy.eyebrow}
              </p>

              <h1 className="mt-6 max-w-4xl text-[42px] font-black leading-[1.08] tracking-[-0.04em] text-slate-950 md:text-[64px] lg:text-[72px]">
                {copy.titleLine1}
                <br />
                <span className="text-[#ff5f67]">{copy.titleAccent1}</span>
                {copy.titleLine2}
                <br />
                <span className="text-[#ff5f67]">{copy.titleAccent2}</span>
              </h1>

              <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-slate-600">
                {copy.body}
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
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

              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                {[copy.mini1, copy.mini2, copy.mini3].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 text-sm font-black text-slate-700 shadow-sm backdrop-blur"
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

        <section className="border-y border-slate-100 bg-[#F8FAFC]">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7bae6c]">
                {copy.sectionLabel}
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.03em] text-slate-950 md:text-5xl">
                {copy.sectionTitle}
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-500">
                {copy.sectionBody}
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <FeatureCard
                icon="💰"
                title={copy.feature1Title}
                body={copy.feature1Body}
              />
              <FeatureCard
                icon="🎬"
                title={copy.feature2Title}
                body={copy.feature2Body}
              />
              <FeatureCard
                icon="🛡️"
                title={copy.feature3Title}
                body={copy.feature3Body}
              />
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff5f67]">
                  {copy.howLabel}
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
                  {copy.howTitle}
                </h2>
              </div>

              <Link
                href="/signup/company"
                className="w-fit rounded-full bg-slate-950 px-7 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5"
              >
                {copy.primaryCta}
              </Link>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <StepCard
                number="1"
                title={copy.step1Title}
                body={copy.step1Body}
              />
              <StepCard
                number="2"
                title={copy.step2Title}
                body={copy.step2Body}
              />
              <StepCard
                number="3"
                title={copy.step3Title}
                body={copy.step3Body}
              />
              <StepCard
                number="4"
                title={copy.step4Title}
                body={copy.step4Body}
              />
            </div>
          </div>
        </section>

        <section className="bg-[#F8FAFC]">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
            <div className="rounded-[40px] border border-slate-100 bg-white p-7 shadow-sm md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7bae6c]">
                {copy.useCaseLabel}
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
                {copy.useCaseTitle}
              </h2>

              <div className="mt-10 grid gap-5 md:grid-cols-2">
                <UseCaseCard title={copy.useCase1Title} body={copy.useCase1Body} />
                <UseCaseCard title={copy.useCase2Title} body={copy.useCase2Body} />
                <UseCaseCard title={copy.useCase3Title} body={copy.useCase3Body} />
                <UseCaseCard title={copy.useCase4Title} body={copy.useCase4Body} />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 md:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[42px] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/10 md:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.03em] md:text-5xl">
                  {copy.finalTitle}
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
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