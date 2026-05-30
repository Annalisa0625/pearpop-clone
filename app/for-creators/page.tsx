// File: app/for-creators/page.tsx
"use client";

import Link from "next/link";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";

type FeatureCardProps = {
  title: string;
  body: string;
  accent: "rose" | "emerald" | "slate";
};

type StepCardProps = {
  number: string;
  title: string;
  body: string;
};

const accentClasses = {
  rose: {
    glow: "bg-rose-100/70",
    icon: "bg-rose-50 text-[#ff5f67]",
  },
  emerald: {
    glow: "bg-emerald-100/70",
    icon: "bg-emerald-50 text-emerald-700",
  },
  slate: {
    glow: "bg-slate-100",
    icon: "bg-slate-100 text-slate-900",
  },
};

function CreatorPublicHeader() {
  const { locale, setLocale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          brandHome: "企業向け",
          login: "ログイン",
          signup: "インフルエンサー登録",
          lang: "EN",
        }
      : {
          brandHome: "For brands",
          login: "Login",
          signup: "Join as an Influencer",
          lang: "日本語",
        };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center px-4 py-4 md:px-6 lg:py-5">
        <Link href="/home" aria-label="Trendre Home" className="flex items-center">
          <img
            src="/brand/trendre-logo-full.png"
            alt="Trendre"
            className="h-8 w-auto object-contain md:h-9"
          />
        </Link>

        <nav className="hidden items-center justify-center gap-9 text-sm font-black text-slate-700 md:flex">
          <Link href="/home" className="transition hover:text-slate-950">
            {copy.brandHome}
          </Link>
          <Link href="/b/creators" className="transition hover:text-slate-950">
            {locale === "ja" ? "インフルエンサー検索" : "Influencer search"}
          </Link>
        </nav>

        <div className="flex items-center justify-end gap-2 md:gap-4">
          <button
            type="button"
            onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
            className="hidden rounded-full bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200 md:inline-flex"
          >
            {copy.lang}
          </button>

          <Link
            href="/login"
            className="hidden text-sm font-black text-slate-700 transition hover:text-slate-950 md:inline-flex"
          >
            {copy.login}
          </Link>

          <Link
            href="/signup/creator"
            className="rounded-full bg-[#ff5f67] px-4 py-2.5 text-xs font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55] md:px-5 md:py-3 md:text-sm"
          >
            {copy.signup}
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({ title, body, accent }: FeatureCardProps) {
  const classes = accentClasses[accent];

  return (
    <article className="group relative overflow-hidden rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.055)] transition hover:-translate-y-1 md:p-7">
      <div
        className={`absolute -right-16 -top-16 h-40 w-40 rounded-full ${classes.glow} blur-2xl transition group-hover:scale-110`}
      />

      <div className="relative">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black ${classes.icon}`}
        >
          ●
        </div>

        <h3 className="mt-6 text-xl font-black tracking-[-0.04em] text-slate-950 md:text-2xl">
          {title}
        </h3>

        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
          {body}
        </p>
      </div>
    </article>
  );
}

function StepCard({ number, title, body }: StepCardProps) {
  return (
    <article className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] md:p-6">
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
          {number}
        </div>

        <div>
          <h3 className="text-lg font-black tracking-[-0.04em] text-slate-950">
            {title}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}

function AppPreviewCard() {
  return (
    <div className="relative mx-auto w-full max-w-[390px] rounded-[36px] bg-slate-950 p-3 shadow-[0_30px_90px_rgba(15,23,42,0.2)]">
      <div className="rounded-[30px] bg-[#f8f9fb] p-4">
        <div className="rounded-[26px] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-slate-400">TODAY</p>
              <p className="mt-1 text-xl font-black text-slate-950">
                新しい注文
              </p>
            </div>

            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-[#ff5f67]">
              返答待ち
            </span>
          </div>

          <div className="mt-5 rounded-[22px] bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-400">MENU</p>
            <p className="mt-1 text-base font-black text-slate-950">
              Instagramリール
            </p>
            <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-slate-950">
              ¥30,000
            </p>
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-full bg-slate-950 py-3 text-sm font-black text-white"
          >
            内容を確認
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center">
            <p className="text-sm font-black text-slate-950">3</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">Jobs</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center">
            <p className="text-sm font-black text-slate-950">¥82k</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">Earned</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center">
            <p className="text-sm font-black text-slate-950">4.9</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">Score</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForCreatorsPage() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          eyebrow: "インフルエンサー向け",
          title1: "好きなブランドや商品と、",
          title2: "もっと自然につながる。",
          body:
            "Trendreは、企業からのPR投稿・UGC制作の注文をオンラインで受けられるマーケットプレイスです。メニューを作成し、価格を設定し、注文・チャット・納品・報酬確認までひとつの画面で進められます。",
          primary: "無料で登録する",
          secondary: "ログイン",
          point1: "価格を自分で設定",
          point2: "注文は承認制",
          point3: "報酬はオンラインで確認",

          featureTitle: "Trendreでできること",
          featureBody:
            "企業とのやり取りをDMだけに頼らず、注文内容・納品・報酬を整理して進められます。",
          f1Title: "メニューを作って待てる",
          f1Body:
            "Instagram投稿、TikTok動画、UGC制作など、自分が受けたい内容と価格を登録できます。",
          f2Title: "受けるかどうか選べる",
          f2Body:
            "企業から注文が届いても、内容を確認してから承認できます。合わない依頼は無理に受ける必要はありません。",
          f3Title: "納品と報酬を見やすく管理",
          f3Body:
            "注文、チャット、納品URL、報酬の履歴をひとつの画面で確認できます。",

          flowTitle: "登録から注文まで",
          flowBody:
            "最初はプロフィールとSNS、ポートフォリオ、メニューを登録するだけ。企業があなたを見つけて注文できます。",
          s1Title: "プロフィールを登録",
          s1Body:
            "表示名、カテゴリ、SNSアカウント、ポートフォリオ画像を登録します。",
          s2Title: "メニューを作成",
          s2Body:
            "投稿やUGC制作など、受けたい内容と価格を設定します。",
          s3Title: "注文を確認",
          s3Body:
            "企業から注文が届いたら、内容を確認して承認または辞退できます。",
          s4Title: "投稿・納品",
          s4Body:
            "チャットで確認しながら進め、投稿URLや納品URLを提出します。",
          s5Title: "報酬を確認",
          s5Body:
            "完了後の報酬履歴をアプリ内で確認できます。",

          requiredTitle: "登録に必要なもの",
          requiredBody:
            "登録時には、SNSアカウント、プロフィール画像、ポートフォリオ画像、受けたいメニュー内容を用意しておくとスムーズです。",
          req1: "Instagram / TikTok などのSNS",
          req2: "プロフィール画像",
          req3: "ポートフォリオ画像 3枚以上",
          req4: "受けたいメニューと価格",

          finalTitle: "まずは、インフルエンサー登録から始めましょう。",
          finalBody:
            "登録後にプロフィールとメニューを整えることで、企業から注文を受けられる状態になります。",
          finalCta: "インフルエンサー登録",
        }
      : {
          eyebrow: "For influencers",
          title1: "Connect with brands",
          title2: "through clear online orders.",
          body:
            "Trendre is a marketplace where influencers can receive PR post and UGC creation orders from brands. Create menus, set pricing, manage orders, chat, delivery, and payouts in one place.",
          primary: "Join for free",
          secondary: "Login",
          point1: "Set your own pricing",
          point2: "Accept orders manually",
          point3: "Track earnings online",

          featureTitle: "What you can do",
          featureBody:
            "Move brand collaborations away from scattered DMs and manage order details, delivery, and earnings clearly.",
          f1Title: "Create your menus",
          f1Body:
            "Add Instagram posts, TikTok videos, UGC creation, and other services you want to offer.",
          f2Title: "Choose what to accept",
          f2Body:
            "Review each order before accepting. You do not have to take orders that do not fit.",
          f3Title: "Manage delivery and earnings",
          f3Body:
            "Track orders, chat, delivery URLs, and payout history in one place.",

          flowTitle: "From signup to orders",
          flowBody:
            "Add your profile, social accounts, portfolio, and menus so brands can find and order from you.",
          s1Title: "Create your profile",
          s1Body:
            "Add display name, category, social accounts, and portfolio images.",
          s2Title: "Set up menus",
          s2Body:
            "Set what you offer and how much each service costs.",
          s3Title: "Review orders",
          s3Body:
            "When a brand orders, you can accept or decline after checking the details.",
          s4Title: "Post or deliver",
          s4Body:
            "Use chat for confirmation and submit post or delivery URLs.",
          s5Title: "Track earnings",
          s5Body:
            "Review completed orders and payout history inside Trendre.",

          requiredTitle: "What you need to prepare",
          requiredBody:
            "Prepare your social accounts, profile image, portfolio images, and menu ideas to complete signup smoothly.",
          req1: "Instagram / TikTok or other social accounts",
          req2: "Profile image",
          req3: "At least 3 portfolio images",
          req4: "Menu ideas and pricing",

          finalTitle: "Start by creating your influencer profile.",
          finalBody:
            "Once your profile and menus are ready, brands can discover and order from you.",
          finalCta: "Join as an Influencer",
        };

  const features: FeatureCardProps[] = [
    {
      title: copy.f1Title,
      body: copy.f1Body,
      accent: "rose",
    },
    {
      title: copy.f2Title,
      body: copy.f2Body,
      accent: "emerald",
    },
    {
      title: copy.f3Title,
      body: copy.f3Body,
      accent: "slate",
    },
  ];

  const steps: StepCardProps[] = [
    { number: "1", title: copy.s1Title, body: copy.s1Body },
    { number: "2", title: copy.s2Title, body: copy.s2Body },
    { number: "3", title: copy.s3Title, body: copy.s3Body },
    { number: "4", title: copy.s4Title, body: copy.s4Body },
    { number: "5", title: copy.s5Title, body: copy.s5Body },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-slate-950">
      <CreatorPublicHeader />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-white via-rose-50/45 to-transparent" />
        <div className="pointer-events-none absolute right-[-260px] top-[180px] h-[560px] w-[560px] rounded-full bg-emerald-100/25 blur-[150px]" />
        <div className="pointer-events-none absolute left-[-280px] top-[620px] h-[520px] w-[520px] rounded-full bg-rose-100/25 blur-[150px]" />

        <section className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:py-18">
          <div>
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-[#ff5f67] shadow-sm ring-1 ring-rose-100">
              {copy.eyebrow}
            </span>

            <h1 className="mt-6 max-w-4xl text-[42px] font-black leading-[1.02] tracking-[-0.07em] text-slate-950 md:text-[64px] lg:text-[72px]">
              {copy.title1}
              <br />
              <span className="text-[#ff5f67]">{copy.title2}</span>
            </h1>

            <p className="mt-6 max-w-2xl text-[15px] font-semibold leading-8 text-slate-600 md:text-base">
              {copy.body}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup/creator"
                className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-7 py-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(255,95,103,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
              >
                {copy.primary}
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                {copy.secondary}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {[copy.point1, copy.point2, copy.point3].map((point) => (
                <span
                  key={point}
                  className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100"
                >
                  {point}
                </span>
              ))}
            </div>
          </div>

          <AppPreviewCard />
        </section>

        <section className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <div className="max-w-2xl">
            <h2 className="text-[30px] font-black tracking-[-0.055em] text-slate-950 md:text-[44px]">
              {copy.featureTitle}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-8 text-slate-500 md:text-base">
              {copy.featureBody}
            </p>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                body={feature.body}
                accent={feature.accent}
              />
            ))}
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <div className="rounded-[34px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] md:p-8">
            <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div>
                <h2 className="text-[30px] font-black tracking-[-0.055em] text-slate-950 md:text-[42px]">
                  {copy.flowTitle}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-8 text-slate-500">
                  {copy.flowBody}
                </p>

                <Link
                  href="/signup/creator"
                  className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  {copy.primary}
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {steps.map((step) => (
                  <StepCard
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

        <section className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="rounded-[34px] bg-white p-7 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:p-8">
              <h2 className="text-[30px] font-black tracking-[-0.055em] text-slate-950 md:text-[42px]">
                {copy.requiredTitle}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-8 text-slate-500">
                {copy.requiredBody}
              </p>
            </div>

            <div className="grid gap-3">
              {[copy.req1, copy.req2, copy.req3, copy.req4].map((item) => (
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

        <section className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16">
          <div className="rounded-[36px] bg-slate-950 p-7 text-white shadow-[0_30px_90px_rgba(15,23,42,0.2)] md:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="max-w-3xl text-[30px] font-black tracking-[-0.055em] md:text-[44px]">
                  {copy.finalTitle}
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-8 text-white/60">
                  {copy.finalBody}
                </p>
              </div>

              <Link
                href="/signup/creator"
                className="inline-flex w-fit items-center justify-center rounded-full bg-[#ff5f67] px-7 py-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(255,95,103,0.26)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
              >
                {copy.finalCta}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}