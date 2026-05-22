// File: app/home/page.tsx
"use client";

import Link from "next/link";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

type FeatureCardProps = {
  eyebrow: string;
  title: string;
  body: string;
};

function FeatureCard({ eyebrow, title, body }: FeatureCardProps) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {eyebrow}
      </p>
      <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">
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
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
        {number}
      </div>
      <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-500">{body}</p>
    </div>
  );
}

type UseCaseCardProps = {
  title: string;
  body: string;
};

function UseCaseCard({ title, body }: UseCaseCardProps) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
      <p className="text-base font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-500">{body}</p>
    </div>
  );
}

export default function HomePage() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          badge: "Creator & UGC Marketplace",
          title: "商品に合うクリエイターを見つけて、そのまま依頼。",
          body:
            "Trendreは、企業がInstagram・TikTok・UGC制作などをクリエイターに直接依頼できるマーケットプレイスです。価格、SNS、ポートフォリオを見て比較し、支払いから納品確認までオンラインで管理できます。",
          note:
            "PR投稿も、UGC素材制作も。まずは小さく1件から、クリエイター施策を始められます。",

          primaryCta: "無料で企業登録",
          secondaryCta: "クリエイターを探す",
          loginCta: "ログイン",

          stat1Label: "Start",
          stat1Value: "1件から",
          stat1Body: "小さくテスト可能",
          stat2Label: "Payment",
          stat2Value: "Stripe",
          stat2Body: "支払い方法を確認",
          stat3Label: "Flow",
          stat3Value: "Online",
          stat3Body: "依頼から納品まで",

          visualTitle: "クリエイターを比較して、依頼までスムーズに。",
          visualCreatorName: "Beauty Creator",
          visualMenu1: "Instagram投稿",
          visualMenu2: "TikTok動画",
          visualMenu3: "UGC素材制作",
          visualTotal: "お支払い合計",
          visualButton: "注文へ進む",

          sectionLabel: "Why Trendre",
          sectionTitle: "インフルエンサーPRを、もっと探しやすく、頼みやすく。",
          sectionBody:
            "DMでの営業、見積もり調整、支払い確認、納品管理をバラバラに行うのではなく、Trendre上で一つの流れとして管理できます。",

          feature1Eyebrow: "Search",
          feature1Title: "商品に合うクリエイターを探せる",
          feature1Body:
            "SNS、カテゴリ、価格、フォロワー帯、ポートフォリオを見ながら、PRしたい商品に合うクリエイターを比較できます。",
          feature2Eyebrow: "Price",
          feature2Title: "価格が見えるから依頼しやすい",
          feature2Body:
            "メニュー価格を確認してから依頼できるため、はじめてのPR依頼でも予算感をつかみやすくなります。",
          feature3Eyebrow: "UGC",
          feature3Title: "PR投稿もUGC制作も依頼できる",
          feature3Body:
            "Instagram投稿、TikTok動画、商品レビュー、広告素材に使えるUGC制作など、ブランドに必要なクリエイター施策に対応できます。",
          feature4Eyebrow: "Payment",
          feature4Title: "支払い方法を確認してから案件開始",
          feature4Body:
            "Stripe Checkoutで支払い方法を確認し、クリエイターが承認した場合に決済が確定して案件が開始されます。",
          feature5Eyebrow: "Workflow",
          feature5Title: "案件ごとに進行状況を管理",
          feature5Body:
            "注文内容、承認状況、納品URL、完了状態を案件ごとに確認できます。DMで埋もれがちなやり取りを整理できます。",
          feature6Eyebrow: "Small start",
          feature6Title: "代理店に頼む前に小さく試せる",
          feature6Body:
            "大きな予算をかける前に、まずは数件のクリエイター施策からテストできます。D2C・美容・ライフスタイル領域に向いています。",

          howLabel: "How it works",
          howTitle: "依頼までの流れ",
          step1Title: "クリエイターを探す",
          step1Body:
            "カテゴリ、SNS、価格、フォロワー帯などから、自社の商品に合うクリエイターを検索します。",
          step2Title: "メニューを選んで注文",
          step2Body:
            "Instagram投稿、TikTok動画、UGC素材などのメニューを選び、商品URLや希望内容を入力します。",
          step3Title: "承認後に案件開始",
          step3Body:
            "クリエイターが承認すると決済が確定し、案件が開始されます。辞退された場合、請求は確定しません。",
          step4Title: "納品を確認して完了",
          step4Body:
            "投稿URLや成果物URLを確認し、問題なければ完了できます。案件の状態は画面上で確認できます。",

          useCaseLabel: "Use cases",
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
            "Trendreなら、検索・比較・注文・納品確認までオンラインで進められます。",
          finalPrimary: "無料で企業登録",
          finalSecondary: "クリエイター検索を見る",
        }
      : {
          badge: "Creator & UGC Marketplace",
          title: "Find creators that fit your product. Order content directly.",
          body:
            "Trendre is a creator marketplace where brands can request Instagram posts, TikTok videos, UGC content, and product promotion directly from creators. Compare profiles, prices, social accounts, and portfolios, then manage payment and delivery online.",
          note:
            "From influencer posts to UGC assets, start creator marketing with one small order.",

          primaryCta: "Join as a Brand",
          secondaryCta: "Search Creators",
          loginCta: "Login",

          stat1Label: "Start",
          stat1Value: "1 order",
          stat1Body: "Test small",
          stat2Label: "Payment",
          stat2Value: "Stripe",
          stat2Body: "Payment method check",
          stat3Label: "Flow",
          stat3Value: "Online",
          stat3Body: "Request to delivery",

          visualTitle: "Compare creators and move from discovery to order.",
          visualCreatorName: "Beauty Creator",
          visualMenu1: "Instagram post",
          visualMenu2: "TikTok video",
          visualMenu3: "UGC asset",
          visualTotal: "Payment total",
          visualButton: "Place order",

          sectionLabel: "Why Trendre",
          sectionTitle: "Influencer PR made easier to search, compare, and order.",
          sectionBody:
            "Instead of managing outreach, price checks, payments, and delivery across DMs and spreadsheets, Trendre gives brands one clear workflow.",

          feature1Eyebrow: "Search",
          feature1Title: "Find creators that fit your product",
          feature1Body:
            "Compare social accounts, category, price, follower range, and portfolio images before sending a request.",
          feature2Eyebrow: "Price",
          feature2Title: "Visible prices make ordering easier",
          feature2Body:
            "Review menu prices before ordering, so early creator campaigns are easier to budget and test.",
          feature3Eyebrow: "UGC",
          feature3Title: "Request both PR posts and UGC",
          feature3Body:
            "Use Trendre for Instagram posts, TikTok videos, product reviews, and UGC assets for ads or social content.",
          feature4Eyebrow: "Payment",
          feature4Title: "Payment starts after creator acceptance",
          feature4Body:
            "Stripe Checkout confirms the payment method, and payment is captured when the creator accepts the order.",
          feature5Eyebrow: "Workflow",
          feature5Title: "Manage each job in one place",
          feature5Body:
            "Track order details, approval status, delivery URLs, and completion status from one page.",
          feature6Eyebrow: "Small start",
          feature6Title: "Test before committing to large campaigns",
          feature6Body:
            "Start with small creator campaigns before investing in larger influencer or agency-led initiatives.",

          howLabel: "How it works",
          howTitle: "From search to delivery",
          step1Title: "Search creators",
          step1Body:
            "Browse creators by category, social platform, price, follower range, and audience fit.",
          step2Title: "Choose a menu and order",
          step2Body:
            "Select an Instagram, TikTok, or UGC menu and send your product URL, timeline, and request details.",
          step3Title: "Creator accepts",
          step3Body:
            "When the creator accepts, payment is captured and the job begins. If declined, the charge is not finalized.",
          step4Title: "Review delivery",
          step4Body:
            "Check submitted post URLs or deliverable links and complete the order when everything looks good.",

          useCaseLabel: "Use cases",
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden border-b border-slate-100 bg-white">
          <div className="absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-[#FFF1F1] blur-3xl" />
          <div className="absolute right-[-120px] top-24 h-80 w-80 rounded-full bg-[#F0FAF3] blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div>
              <p className="inline-flex rounded-full border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-black text-[#ff6b6b]">
                {copy.badge}
              </p>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 md:text-6xl">
                {copy.title}
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                {copy.body}
              </p>

              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-500 md:text-base">
                {copy.note}
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href="/signup/company"
                  className="rounded-full bg-slate-950 px-7 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {copy.primaryCta}
                </Link>

                <Link
                  href="/b/creators"
                  className="rounded-full border border-slate-200 bg-white px-7 py-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-950"
                >
                  {copy.secondaryCta}
                </Link>

                <Link
                  href="/login"
                  className="rounded-full px-7 py-4 text-sm font-black text-slate-500 transition hover:text-slate-950"
                >
                  {copy.loginCta}
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                {[
                  [copy.stat1Label, copy.stat1Value, copy.stat1Body],
                  [copy.stat2Label, copy.stat2Value, copy.stat2Body],
                  [copy.stat3Label, copy.stat3Value, copy.stat3Body],
                ].map(([label, value, body]) => (
                  <div
                    key={label}
                    className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-xl font-black text-slate-950">
                      {value}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[36px] border border-slate-100 bg-white p-5 shadow-2xl shadow-slate-950/10">
                <div className="rounded-[28px] bg-slate-950 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                        Trendre
                      </p>
                      <p className="mt-2 text-xl font-black">
                        {copy.visualTitle}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl">
                      🌱
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-slate-50">
                    <div className="h-44 bg-gradient-to-br from-rose-100 via-white to-emerald-100" />
                    <div className="p-5">
                      <p className="text-lg font-black text-slate-950">
                        {copy.visualCreatorName}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Instagram / TikTok
                      </p>
                      <div className="mt-4 flex gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm">
                          10k〜30k
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm">
                          Japan
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="space-y-3">
                      {[copy.visualMenu1, copy.visualMenu2, copy.visualMenu3].map(
                        (menu, index) => (
                          <div
                            key={menu}
                            className={`rounded-2xl border p-4 ${
                              index === 0
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-100 bg-slate-50 text-slate-950"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-black">{menu}</span>
                              <span className="text-sm font-black">
                                ¥20,000~
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-500">
                          {copy.visualTotal}
                        </span>
                        <span className="font-black text-slate-950">
                          ¥22,000
                        </span>
                      </div>
                    </div>

                    <button className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white">
                      {copy.visualButton}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7bae6c]">
              {copy.sectionLabel}
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              {copy.sectionTitle}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-500">
              {copy.sectionBody}
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              eyebrow={copy.feature1Eyebrow}
              title={copy.feature1Title}
              body={copy.feature1Body}
            />
            <FeatureCard
              eyebrow={copy.feature2Eyebrow}
              title={copy.feature2Title}
              body={copy.feature2Body}
            />
            <FeatureCard
              eyebrow={copy.feature3Eyebrow}
              title={copy.feature3Title}
              body={copy.feature3Body}
            />
            <FeatureCard
              eyebrow={copy.feature4Eyebrow}
              title={copy.feature4Title}
              body={copy.feature4Body}
            />
            <FeatureCard
              eyebrow={copy.feature5Eyebrow}
              title={copy.feature5Title}
              body={copy.feature5Body}
            />
            <FeatureCard
              eyebrow={copy.feature6Eyebrow}
              title={copy.feature6Title}
              body={copy.feature6Body}
            />
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ff6b6b]">
                  {copy.howLabel}
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                  {copy.howTitle}
                </h2>
              </div>

              <Link
                href="/signup/company"
                className="w-fit rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white"
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

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
          <div className="rounded-[36px] border border-slate-100 bg-white p-6 shadow-sm md:p-10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7bae6c]">
              {copy.useCaseLabel}
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              {copy.useCaseTitle}
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <UseCaseCard title={copy.useCase1Title} body={copy.useCase1Body} />
              <UseCaseCard title={copy.useCase2Title} body={copy.useCase2Body} />
              <UseCaseCard title={copy.useCase3Title} body={copy.useCase3Body} />
              <UseCaseCard title={copy.useCase4Title} body={copy.useCase4Body} />
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 md:px-6">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-slate-950 p-8 text-white md:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
                  {copy.finalTitle}
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                  {copy.finalBody}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup/company"
                  className="rounded-full bg-white px-6 py-4 text-sm font-black text-slate-950"
                >
                  {copy.finalPrimary}
                </Link>

                <Link
                  href="/b/creators"
                  className="rounded-full border border-white/20 px-6 py-4 text-sm font-black text-white"
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