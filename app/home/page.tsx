"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";

type Locale = "ja" | "en";

type SocialAccountRow = {
  platform?: string | null;
  handle?: string | null;
  follower_range?: string | null;
};

type CreatorRow = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  category?: string | null;
  prefecture?: string | null;
  creator_social_accounts?: SocialAccountRow[] | SocialAccountRow | null;
};

type MenuRow = {
  id: string;
  creator_id: string | null;
  title: string | null;
  price: number | null;
  currency: string | null;
};

type PortfolioAssetRow = {
  creator_id: string;
  asset_url: string;
};

type CreatorPreview = {
  id: string | null;
  displayName: string;
  category: string;
  prefecture: string;
  imageUrl: string | null;
  avatarUrl: string | null;
  platform: string;
  followerRange: string | null;
  startingPrice: number | null;
  currency: string;
  menuTitle: string;
};

type WorkflowStep = {
  number: string;
  title: string;
  headline: string;
  body: string;
};

const CREATOR_LIST_PATH = "/b/creators";
const PINK = "#f04f6d";

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="m4.5 10 3.4 3.4 7.6-7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlatformIcon({ platform, size = 20 }: { platform: string; size?: number }) {
  const normalized = platform.toLowerCase();
  const source = normalized.includes("tiktok")
    ? "/brand/social/tiktok.png"
    : normalized.includes("youtube")
      ? "/brand/social/youtube.png"
      : normalized === "x" || normalized.includes("twitter")
        ? "/brand/social/x.png"
        : "/brand/social/instagram.png";

  return <Image src={source} alt="" width={size} height={size} className="object-contain" aria-hidden="true" />;
}

function formatPrice(value: number | null, currency = "JPY") {
  if (value == null) return "料金を確認";
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    return `¥${value.toLocaleString()}`;
  }
}

function LocaleMenu() {
  const { locale, setLocale } = useAppLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="tm-focus min-h-11 rounded-full px-3 text-[13px] font-medium text-neutral-600 transition hover:text-neutral-950"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {locale === "ja" ? "日本語" : "English"} <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl shadow-neutral-950/10" role="menu">
          {(["ja", "en"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="menuitem"
              onClick={() => {
                setLocale(option);
                setOpen(false);
              }}
              className={`tm-focus block min-h-10 w-full rounded-xl px-3 text-left text-sm transition ${locale === option ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-50"}`}
            >
              {option === "ja" ? "日本語" : "English"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HomeHeader({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-[#fbfaf7]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-5 px-4 sm:px-6 lg:h-[76px] lg:px-8">
        <Link href="/home" aria-label="Trend Mart home" className="tm-focus shrink-0 rounded-md">
          <Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={174} height={34} priority className="h-[21px] w-auto sm:h-[23px]" />
        </Link>
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-neutral-600 md:flex" aria-label={ja ? "メインナビゲーション" : "Main navigation"}>
          <a href="#service-overview" className="tm-focus rounded-md transition hover:text-neutral-950">{ja ? "サービス概要" : "Overview"}</a>
          <Link href={CREATOR_LIST_PATH} className="tm-focus rounded-md transition hover:text-neutral-950">{ja ? "インフルエンサーを探す" : "Find creators"}</Link>
          <Link href="/b/billing" className="tm-focus rounded-md transition hover:text-neutral-950">{ja ? "料金プラン" : "Pricing"}</Link>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/login" className="tm-focus inline-flex min-h-11 items-center rounded-full px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-white sm:px-4 sm:text-[13px]">
            {ja ? "ログイン" : "Log in"}
          </Link>
          <Link href="/signup/company" className="tm-focus inline-flex min-h-11 items-center rounded-full bg-[#f04f6d] px-4 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(240,79,109,0.22)] transition hover:-translate-y-0.5 hover:bg-[#e74362] active:translate-y-0 sm:px-5 sm:text-[13px]">
            <span className="hidden sm:inline">{ja ? "無料で企業登録" : "Join free"}</span>
            <span className="sm:hidden">{ja ? "無料登録" : "Join"}</span>
          </Link>
          <LocaleMenu />
        </div>
      </div>
    </header>
  );
}

function CreatorPortrait({ creator, className = "" }: { creator: CreatorPreview; className?: string }) {
  if (creator.imageUrl || creator.avatarUrl) {
    return <img src={creator.imageUrl || creator.avatarUrl || ""} alt="" className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <div className={`grid h-full w-full place-items-center bg-[linear-gradient(145deg,#eadfd7,#dfe7e4)] text-3xl font-semibold text-neutral-700 ${className}`} aria-hidden="true">
      {creator.displayName.slice(0, 1).toUpperCase()}
    </div>
  );
}

function HeroStage({ creators, locale }: { creators: CreatorPreview[]; locale: Locale }) {
  const ja = locale === "ja";
  const primary = creators[0];
  const secondary = creators[1];

  return (
    <div className="tm-stage relative mx-auto w-full max-w-[620px] lg:mx-0">
      <div className="absolute -inset-8 -z-10 rounded-[48px] bg-[radial-gradient(circle_at_60%_40%,rgba(240,79,109,0.13),transparent_58%)] blur-2xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-[26px] border border-neutral-200/90 bg-white shadow-[0_30px_90px_rgba(35,30,27,0.13)] sm:rounded-[32px]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-neutral-800 sm:text-[13px]"><SearchIcon className="h-4 w-4 text-neutral-400" />{ja ? "インフルエンサー検索" : "Creator search"}</div>
          <Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={96} height={19} className="h-[15px] w-auto object-contain" />
        </div>
        <div className="p-3 sm:p-5">
          <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#f7f6f3] px-4 text-[12px] text-neutral-500 sm:text-[13px]">
            <SearchIcon className="h-4 w-4" />
            <span className="truncate">{ja ? "美容・東京・Instagram" : "Beauty · Tokyo · Instagram"}</span>
            <span className="ml-auto shrink-0 rounded-full bg-neutral-950 px-3 py-1.5 text-[10px] font-semibold text-white">{ja ? "検索" : "Search"}</span>
          </div>
          <div className="mt-3 grid grid-cols-[1.12fr_0.88fr] gap-3">
            <Link href={CREATOR_LIST_PATH} className="tm-focus group overflow-hidden rounded-[20px] bg-neutral-950 text-white sm:rounded-[24px]">
              <div className="relative aspect-[1.08/1] overflow-hidden">
                <CreatorPortrait creator={primary} className="transition duration-700 group-hover:scale-[1.025]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5">
                  <div className="flex items-center gap-2"><PlatformIcon platform={primary.platform} size={18} /><span className="text-[11px] text-white/75">{primary.platform}</span></div>
                  <p className="mt-1.5 truncate text-base font-semibold sm:text-xl">{primary.displayName}</p>
                  <p className="mt-1 text-[10px] text-white/70 sm:text-xs">{primary.category} · {primary.prefecture}</p>
                </div>
              </div>
            </Link>
            <div className="grid gap-3">
              <Link href={CREATOR_LIST_PATH} className="tm-focus group grid grid-cols-[68px_1fr] items-center gap-3 rounded-[18px] border border-neutral-200 bg-white p-2 sm:grid-cols-[92px_1fr] sm:rounded-[22px] sm:p-3">
                <div className="aspect-square overflow-hidden rounded-[13px] bg-neutral-100 sm:rounded-[16px]"><CreatorPortrait creator={secondary} className="transition duration-700 group-hover:scale-[1.03]" /></div>
                <div className="min-w-0"><p className="truncate text-[12px] font-semibold text-neutral-900 sm:text-sm">{secondary.displayName}</p><p className="mt-1 truncate text-[9px] text-neutral-500 sm:text-[11px]">{secondary.menuTitle}</p><p className="mt-2 text-[10px] font-semibold text-neutral-900 sm:text-xs">{formatPrice(secondary.startingPrice, secondary.currency)}〜</p></div>
              </Link>
              <div className="rounded-[18px] bg-[#f3f0ec] p-3.5 sm:rounded-[22px] sm:p-5">
                <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-400">Match details</p>
                <div className="mt-3 space-y-2.5 text-[10px] font-medium text-neutral-700 sm:text-xs">
                  {[ja ? "価格を比較" : "Compare rates", ja ? "メニューを確認" : "Review services", ja ? "そのまま依頼" : "Send a request"].map((item) => <div key={item} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[#f04f6d]"><CheckIcon /></span>{item}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="tm-float absolute -bottom-5 left-5 hidden min-h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 shadow-[0_16px_44px_rgba(35,30,27,0.14)] sm:flex">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#fff0f3] text-[#f04f6d]"><CheckIcon /></span>
        <div><p className="text-[10px] text-neutral-400">{ja ? "表示価格から" : "From visible rates"}</p><p className="text-xs font-semibold text-neutral-900">{ja ? "迷わず依頼へ" : "Request with confidence"}</p></div>
      </div>
    </div>
  );
}

function Hero({ creators, locale }: { creators: CreatorPreview[]; locale: Locale }) {
  const ja = locale === "ja";
  return (
    <section className="relative overflow-hidden border-b border-neutral-200/70 bg-[#fbfaf7]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(41,37,36,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(41,37,36,0.035)_1px,transparent_1px)] [background-size:52px_52px]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="max-w-[610px]">
          <p className="tm-reveal text-[12px] font-semibold tracking-[0.16em] text-[#d94461]">CREATOR MARKETPLACE</p>
          <h1 className="tm-reveal tm-delay-1 mt-5 text-[38px] font-semibold leading-[1.08] tracking-[-0.06em] text-neutral-950 sm:text-[48px] lg:text-[56px]">
            {ja ? <><span className="block">インフルエンサー</span><span className="block">マーケティングを、</span><span className="block"><span className="text-[#e94866]">1件から。</span></span></> : <><span className="block">Creator marketing,</span><span className="block"><span className="text-[#e94866]">one request</span> at a time.</span></>}
          </h1>
          <p className="tm-reveal tm-delay-2 mt-6 max-w-[560px] text-[15px] leading-7 text-neutral-600 sm:text-[17px] sm:leading-8">
            {ja ? "必要なときに、必要な分だけ。Creatorの価格と得意分野を比べて自分で選び、依頼からチャット、納品確認、支払いまでひとつにつながります。" : "Use creator marketing only when you need it. Compare creators and visible rates, then keep requests, chat, delivery, and payment connected."}
          </p>
          <div className="tm-reveal tm-delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={CREATOR_LIST_PATH} className="tm-focus inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#f04f6d] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(240,79,109,0.25)] transition hover:-translate-y-0.5 hover:bg-[#e74362] active:translate-y-0">
              <SearchIcon className="h-4 w-4" />{ja ? "インフルエンサーを探す" : "Explore creators"}
            </Link>
            <Link href="/signup/company" className="tm-focus inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50">
              {ja ? "無料で企業登録" : "Join as a brand"}<ArrowIcon />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-neutral-500 sm:text-xs">
            {[ja ? "1件から依頼" : "Start with one request", ja ? "月額契約なしでも開始" : "Start without a monthly contract", ja ? "価格を見て選べる" : "Compare visible rates"].map((item) => <span key={item} className="flex items-center gap-1.5"><span className="text-[#e94866]">●</span>{item}</span>)}
          </div>
        </div>
        <div className="tm-reveal tm-delay-2"><HeroStage creators={creators} locale={locale} /></div>
      </div>
    </section>
  );
}

function MarketTension({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  const points = ja ? [
    ["予算を決める前に、価格が分からない。", "Trend Martなら、プロフィールに表示されたメニューと料金から検討を始められます。"],
    ["まず小さく試したいのに、契約が大きい。", "月額契約なしでも、1人への1件の依頼からスタートできます。"],
    ["ブランドに合う人を、自分の目で選びたい。", "ジャンル、活動地域、SNS、フォロワー帯を見比べて直接選べます。"],
  ] : [
    ["Pricing is unclear before planning begins.", "Start with visible services and rates on each creator profile."],
    ["You want to test before making a large commitment.", "Begin with one creator and one request, without a monthly contract."],
    ["You want to choose the right voice yourself.", "Compare category, area, platform, and audience before requesting."],
  ];
  return (
    <section className="bg-neutral-950 py-20 text-white sm:py-28">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="tm-reveal lg:sticky lg:top-28 lg:self-start">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#ff8ca1]">WHY MARKETPLACE</p>
            <h2 className="mt-4 text-[clamp(2rem,5vw,3.7rem)] font-semibold leading-[1.12] tracking-[-0.055em]">{ja ? <>施策のたびに、<br />大きく構えなくていい。</> : <>Every campaign<br />doesn&apos;t need a big commitment.</>}</h2>
          </div>
          <div className="border-t border-white/20">
            {points.map(([title, body], index) => <article key={title} className="tm-reveal grid gap-3 border-b border-white/20 py-8 sm:grid-cols-[52px_1fr] sm:gap-5 sm:py-10"><span className="pt-1 text-[11px] font-semibold text-white/35">0{index + 1}</span><div><h3 className="text-xl font-semibold leading-8 tracking-[-0.03em] sm:text-2xl">{title}</h3><p className="mt-3 max-w-xl text-sm leading-7 text-white/58 sm:text-[15px]">{body}</p></div></article>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function UgcSection({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  const uses = ja ? ["商品レビュー", "使用シーン", "縦型ショート動画", "TikTok・Reels", "店舗・体験紹介", "広告クリエイティブ用UGC"] : ["Product reviews", "In-use scenes", "Vertical short video", "TikTok & Reels", "Store experiences", "UGC for ad creative"];
  return (
    <section className="overflow-hidden bg-[#ece7e1] py-20 sm:py-28 lg:py-32">
      <div className="mx-auto grid max-w-[1220px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.03fr_0.97fr] lg:gap-20 lg:px-8">
        <div className="relative mx-auto w-full max-w-[580px]">
          <div className="grid grid-cols-[0.94fr_1.06fr] items-end gap-3 sm:gap-5">
            <div className="tm-reveal overflow-hidden rounded-[24px] bg-white p-2 shadow-[0_22px_60px_rgba(55,45,38,0.12)] sm:rounded-[30px] sm:p-3"><div className="relative aspect-[0.76] overflow-hidden rounded-[18px] sm:rounded-[23px]"><img src="/brand/work-link/beauty-lifestyle.webp" alt="" className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-16 text-white"><p className="text-xs font-semibold">Skincare review</p><p className="mt-1 text-[10px] text-white/70">Vertical video</p></div></div></div>
            <div className="space-y-3 sm:space-y-5"><div className="tm-reveal tm-delay-1 overflow-hidden rounded-[22px] bg-white p-2 shadow-[0_18px_50px_rgba(55,45,38,0.1)] sm:rounded-[28px] sm:p-3"><img src="/brand/work-link/gourmet-travel.webp" alt="" className="aspect-[1.18] w-full rounded-[16px] object-cover sm:rounded-[21px]" /><div className="px-2 pb-2 pt-3"><p className="text-xs font-semibold text-neutral-900">Cafe experience</p><p className="mt-1 text-[10px] text-neutral-500">Photo &amp; social post</p></div></div><div className="tm-reveal tm-delay-2 rounded-[22px] bg-neutral-950 p-5 text-white sm:rounded-[28px] sm:p-7"><p className="text-[10px] font-semibold tracking-[0.16em] text-white/45">CREATOR CONTENT</p><p className="mt-3 text-xl font-semibold leading-7 tracking-[-0.03em] sm:text-2xl">{ja ? "使う人の視点が、商品の魅力になる。" : "Real perspective makes products relatable."}</p></div></div>
          </div>
        </div>
        <div className="tm-reveal">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[#d94461]">UGC &amp; SOCIAL CONTENT</p>
          <h2 className="mt-4 text-[clamp(2rem,5vw,3.65rem)] font-semibold leading-[1.14] tracking-[-0.055em] text-neutral-950">{ja ? <>発信だけでなく、<br />伝わる素材づくりにも。</> : <>Content people trust,<br />made for social.</>}</h2>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-neutral-600 sm:text-base sm:leading-8">{ja ? "Creator本人のSNS投稿はもちろん、商品やサービスの使用感を生活者の視点で伝えるUGC制作も相談できます。利用範囲や納品方法は、各メニューと依頼条件を確認して進めます。" : "Request social posts or UGC that shows products through a real customer perspective. Usage rights and delivery methods are agreed per service and request."}</p>
          <div className="mt-8 grid grid-cols-2 border-y border-neutral-400/30 sm:grid-cols-3">{uses.map((item, index) => <div key={item} className={`flex min-h-[72px] items-center border-neutral-400/25 pr-3 text-[12px] font-medium leading-5 text-neutral-700 sm:text-[13px] ${index < 3 ? "border-b" : ""} ${index % 3 !== 2 ? "sm:border-r" : ""} ${index % 2 === 0 ? "max-sm:border-r" : ""} ${index < 4 ? "max-sm:border-b" : ""}`}>{item}</div>)}</div>
          <Link href={CREATOR_LIST_PATH} className="tm-focus mt-8 inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-neutral-950">{ja ? "UGCを相談できるCreatorを探す" : "Find creators for UGC"}<ArrowIcon /></Link>
        </div>
      </div>
    </section>
  );
}

function TestAndScale({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  const stages = ja ? [["01", "まず1件", "商品やターゲットに合うCreatorへ、小さく依頼。"], ["02", "反応を見る", "届いたクリエイティブや投稿後の反応を確認。"], ["03", "次を広げる", "相性を踏まえ、別のCreatorや地域、表現へ展開。"]] : [["01", "Start with one", "Make a focused request to a creator who fits."], ["02", "Learn from it", "Review the content and audience response."], ["03", "Expand", "Scale to new creators, regions, or formats."]];
  return <section className="bg-[#fbfaf7] py-20 sm:py-28 lg:py-32"><div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8"><div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end"><div className="tm-reveal"><p className="text-[12px] font-semibold tracking-[0.16em] text-[#d94461]">TEST, LEARN, EXPAND</p><h2 className="mt-4 text-[clamp(2rem,5vw,3.65rem)] font-semibold leading-[1.14] tracking-[-0.055em] text-neutral-950">{ja ? <>大きな施策も、<br />最初は1件から。</> : <>Even ambitious programs<br />can begin with one.</>}</h2></div><p className="tm-reveal max-w-xl text-[15px] leading-7 text-neutral-600 sm:text-base lg:pb-2">{ja ? "新規チャネルの検証、地域限定の施策、UGCの試作。企業規模にかかわらず、必要な範囲から始めて次の判断につなげられます。" : "Test a new channel, region, or content direction at a useful scale—then use what you learn for the next decision."}</p></div><div className="mt-12 grid gap-px overflow-hidden rounded-[26px] bg-neutral-200 md:grid-cols-3">{stages.map(([number,title,body]) => <article key={number} className="tm-reveal bg-white p-6 sm:p-8"><span className="text-[11px] font-semibold text-[#e94866]">{number}</span><h3 className="mt-12 text-xl font-semibold tracking-[-0.03em] text-neutral-950">{title}</h3><p className="mt-3 text-sm leading-6 text-neutral-600">{body}</p></article>)}</div></div></section>;
}

function WorkflowPreview({ index, locale }: { index: number; locale: Locale }) {
  const ja = locale === "ja";
  const content: Array<{ title: string; meta: string; body: ReactNode }> = [
    { title: ja ? "インフルエンサー検索" : "Creator search", meta: ja ? "条件に合う候補" : "Matching creators", body: <div className="grid grid-cols-2 gap-3">{["Instagram", "TikTok"].map((platform, i) => <div key={platform} className="rounded-2xl border border-neutral-200 bg-white p-3"><div className={`aspect-[1.4] rounded-xl ${i ? "bg-[#e8e2dc]" : "bg-[#e7e9e6]"}`} /><div className="mt-3 flex items-center gap-2 text-xs font-semibold"><PlatformIcon platform={platform} size={16} />{platform}</div><p className="mt-1 text-[10px] text-neutral-500">{i ? "¥50,000〜" : "¥30,000〜"}</p></div>)}</div> },
    { title: ja ? "依頼内容" : "Campaign brief", meta: ja ? "必要な情報を整理" : "Everything in one brief", body: <div className="space-y-3">{[ja ? "商品・サービス" : "Product", ja ? "投稿について" : "Posting details", ja ? "希望時期" : "Preferred timing"].map((row, i) => <div key={row} className="flex items-center justify-between border-b border-neutral-100 pb-3 text-xs"><span className="text-neutral-500">{row}</span><span className="font-semibold text-neutral-900">{i === 2 ? (ja ? "日程を相談" : "Discuss") : (ja ? "入力済み" : "Ready")}</span></div>)}</div> },
    { title: ja ? "依頼の回答" : "Request response", meta: ja ? "72時間以内に確認" : "Within 72 hours", body: <div className="rounded-2xl bg-[#f7f6f3] p-5"><p className="text-xs text-neutral-500">{ja ? "Creatorが内容を確認しています" : "The creator is reviewing your request"}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-200"><div className="tm-progress h-full w-[72%] rounded-full bg-[#f04f6d]" /></div><p className="mt-3 text-sm font-semibold text-neutral-950">{ja ? "回答期限まで 48時間" : "48 hours remaining"}</p></div> },
    { title: ja ? "案件内チャット" : "Campaign chat", meta: ja ? "条件をすり合わせ" : "Keep details aligned", body: <div className="space-y-3"><div className="mr-10 rounded-2xl rounded-bl-md bg-neutral-100 p-3 text-xs text-neutral-700">{ja ? "投稿内容について確認させてください。" : "Could I confirm the posting details?"}</div><div className="ml-10 rounded-2xl rounded-br-md bg-neutral-950 p-3 text-xs text-white">{ja ? "もちろんです。こちらでお願いします。" : "Of course. Please use these details."}</div></div> },
    { title: ja ? "納品を確認" : "Review delivery", meta: ja ? "URLからすぐ確認" : "Open the delivered URL", body: <div className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-[10px] text-neutral-400">{ja ? "納品URL" : "Delivery URL"}</p><p className="mt-2 truncate text-xs font-medium text-neutral-800">https://instagram.com/p/...</p><div className="mt-4 flex gap-2"><span className="rounded-full bg-neutral-950 px-4 py-2 text-[10px] font-semibold text-white">{ja ? "内容を確認" : "Open"}</span><span className="rounded-full border border-neutral-200 px-4 py-2 text-[10px] text-neutral-600">{ja ? "修正を依頼" : "Request revision"}</span></div></div> },
    { title: ja ? "支払いまで管理" : "Managed payment", meta: "Stripe", body: <div><p className="text-[10px] font-medium text-neutral-400">{ja ? "お支払い合計" : "Payment total"}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">¥55,000</p><div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs"><span className="text-neutral-500">{ja ? "納品確認後に完了" : "Complete after review"}</span><span className="flex items-center gap-1 font-semibold text-emerald-700"><CheckIcon />{ja ? "安全に決済" : "Secure"}</span></div></div> },
  ];
  const item = content[index];

  return (
    <div className="tm-preview-enter overflow-hidden rounded-[26px] border border-neutral-200 bg-white shadow-[0_24px_70px_rgba(35,30,27,0.1)]" key={index}>
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4"><div><p className="text-sm font-semibold text-neutral-950">{item.title}</p><p className="mt-0.5 text-[10px] text-neutral-400">{item.meta}</p></div><Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={112} height={22} className="h-[18px] w-auto object-contain" /></div>
      <div className="min-h-[235px] bg-[#faf9f7] p-5 sm:min-h-[270px] sm:p-7">{item.body}</div>
    </div>
  );
}

function Workflow({ steps, locale }: { steps: WorkflowStep[]; locale: Locale }) {
  const [active, setActive] = useState(0);
  const ja = locale === "ja";
  return (
    <section id="service-overview" className="scroll-mt-20 bg-white py-20 sm:py-28 lg:py-32">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl tm-reveal"><p className="text-[12px] font-semibold tracking-[0.16em] text-[#d94461]">ONE WORKFLOW</p><h2 className="mt-4 text-[clamp(2rem,5vw,3.7rem)] font-semibold leading-[1.14] tracking-[-0.055em] text-neutral-950">{ja ? "PR案件の流れを、ひとつに。" : "One clear workflow for every campaign."}</h2><p className="mt-5 text-[15px] leading-7 text-neutral-600 sm:text-base">{ja ? "探す、依頼する、進める、確認する。分散しがちな業務を、同じ場所で迷わず進められます。" : "Search, request, collaborate, and review — without losing the thread across tools."}</p></div>
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <div className="flex snap-x gap-2 overflow-x-auto pb-3 [scrollbar-width:none] lg:grid lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {steps.map((step, index) => (
                <button key={step.number} type="button" onClick={() => setActive(index)} className={`tm-focus group min-w-[148px] snap-start rounded-2xl border px-4 py-4 text-left transition duration-300 lg:min-w-0 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:px-1 lg:py-5 ${active === index ? "border-[#f04f6d] bg-[#fff7f8] lg:bg-transparent" : "border-neutral-200 bg-white hover:border-neutral-300"}`} aria-pressed={active === index}>
                  <div className="flex items-center gap-3"><span className={`text-[11px] font-semibold ${active === index ? "text-[#e94866]" : "text-neutral-400"}`}>{step.number}</span><span className="text-sm font-semibold text-neutral-950">{step.title}</span><ArrowIcon className={`ml-auto h-4 w-4 transition ${active === index ? "translate-x-0 text-[#e94866] opacity-100" : "-translate-x-1 text-neutral-400 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`} /></div>
                  <p className="mt-2 hidden text-[11px] leading-5 text-neutral-500 lg:block">{step.headline}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 lg:sticky lg:top-28"><div className="mb-5 lg:hidden"><p className="text-[11px] font-semibold text-[#e94866]">{steps[active].number} · {steps[active].title}</p><h3 className="mt-2 text-xl font-semibold leading-7 tracking-[-0.035em] text-neutral-950">{steps[active].headline}</h3><p className="mt-2 text-sm leading-6 text-neutral-600">{steps[active].body}</p></div><WorkflowPreview index={active} locale={locale} /></div>
        </div>
      </div>
    </section>
  );
}

function Discovery({ creators, locale }: { creators: CreatorPreview[]; locale: Locale }) {
  const ja = locale === "ja";
  return (
    <section className="overflow-hidden bg-[#f1efeb] py-20 sm:py-28">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]"><div className="max-w-2xl tm-reveal"><p className="text-[12px] font-semibold tracking-[0.16em] text-[#d94461]">CHOOSE YOUR CREATOR</p><h2 className="mt-4 text-[clamp(2rem,5vw,3.55rem)] font-semibold leading-[1.14] tracking-[-0.055em] text-neutral-950">{ja ? "価格を見て、自分で選ぶ。" : "See the rate. Choose for yourself."}</h2><p className="mt-5 text-[15px] leading-7 text-neutral-600 sm:text-base">{ja ? "美容、ファッション、グルメ、旅行。ジャンルや活動地域、フォロワー帯、表示価格を比べて依頼先を選べます。" : "Compare category, area, audience size, and visible rates across creator profiles."}</p></div><Link href={CREATOR_LIST_PATH} className="tm-focus inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-neutral-950">{ja ? "実際のCreatorを探す" : "Explore real creators"}<ArrowIcon /></Link></div>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {creators.slice(0, 4).map((creator, index) => (
            <Link href={CREATOR_LIST_PATH} key={`${creator.id}-${index}`} className="tm-focus group min-w-0">
              <article>
                <div className="relative aspect-[0.82] overflow-hidden rounded-[18px] bg-white sm:rounded-[24px]"><CreatorPortrait creator={creator} className="transition duration-700 group-hover:scale-[1.025]" /><div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" /><div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[9px] font-medium text-white/90 sm:bottom-4 sm:left-4 sm:text-[10px]"><PlatformIcon platform={creator.platform} size={16} /><span>{creator.platform}</span></div></div>
                <div className="px-1 pt-3 sm:pt-4"><div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-neutral-950 sm:text-base">{creator.displayName}</h3><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-neutral-500 sm:text-xs">{creator.category}</p></div><ArrowIcon className="mt-0.5 hidden h-4 w-4 shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 sm:block" /></div><div className="mt-2 space-y-1 text-[10px] text-neutral-500 sm:text-[11px]"><p>{creator.followerRange} · {creator.prefecture}</p><p className="font-semibold text-neutral-900">{formatPrice(creator.startingPrice, creator.currency)}〜</p></div></div>
              </article>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-[10px] leading-5 text-neutral-400">{ja ? "※プロフィール・料金は掲載イメージです。" : "Profiles and rates shown are illustrative."}</p>
      </div>
    </section>
  );
}

function Comparison({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  const options = ja ? [
    {
      title: "Trend Mart",
      lead: "必要なときだけ、1件から",
      items: ["初期費用 0円", "月額固定費 0円から", "Creatorを自分で選ぶ", "表示価格を見て依頼"],
      fit: "単発・小規模から柔軟に試したい企業",
      featured: true,
    },
    {
      title: "月額制サービス",
      lead: "継続的な募集・運用に",
      items: ["月額契約", "月額5〜6万円程度のサービス例", "継続利用を前提", "募集型の運用に向く"],
      fit: "毎月コンスタントに施策を行う企業",
      featured: false,
    },
    {
      title: "代理店・キャスティング型",
      lead: "企画から任せる大規模施策に",
      items: ["個別見積もり", "候補選定を依頼", "運用代行にも対応", "大規模案件に向く"],
      fit: "企画・進行をまとめて任せたい企業",
      featured: false,
    },
  ] : [
    { title: "Trend Mart", lead: "One request, whenever you need", items: ["No setup fee", "Start without a monthly contract", "Choose creators yourself", "Request at visible rates"], fit: "For flexible, project-by-project campaigns", featured: true },
    { title: "Subscription services", lead: "For ongoing creator programs", items: ["Monthly contract", "Recurring service cost", "Designed for continuous use", "Often recruitment-led"], fit: "For teams running campaigns every month", featured: false },
    { title: "Agency & casting", lead: "For managed, larger campaigns", items: ["Custom quotation", "Delegated casting", "Managed operations", "Suited to larger programs"], fit: "For teams delegating planning and operations", featured: false },
  ];

  return (
    <section className="bg-white py-20 sm:py-28 lg:py-32">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl tm-reveal"><p className="text-[12px] font-semibold tracking-[0.16em] text-[#d94461]">CHOOSE THE RIGHT MODEL</p><h2 className="mt-4 text-[clamp(2rem,5vw,3.65rem)] font-semibold leading-[1.14] tracking-[-0.055em] text-neutral-950">{ja ? "月額制・代理店型との違い。" : "A different way to run creator campaigns."}</h2><p className="mt-5 max-w-2xl text-[15px] leading-7 text-neutral-600 sm:text-base">{ja ? "施策の頻度や規模によって、合う方法は変わります。Trend Martは、必要なときだけ柔軟に依頼したい企業のためのMarketplaceです。" : "The right model depends on campaign scale and frequency. Trend Mart is built for flexible, project-by-project requests."}</p></div>
        <div className="mt-10 grid gap-3 lg:grid-cols-3 lg:gap-4">
          {options.map((option) => (
            <article key={option.title} className={`tm-comparison rounded-[24px] border p-5 sm:p-7 ${option.featured ? "border-[#ef8ba0] bg-[#fff8f9] shadow-[0_18px_55px_rgba(98,54,63,0.09)]" : "border-neutral-200 bg-[#faf9f7]"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>{option.featured ? <Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={132} height={26} className="h-[21px] w-auto object-contain" /> : <h3 className="text-base font-semibold text-neutral-950">{option.title}</h3>}<p className="mt-3 text-sm font-semibold text-neutral-800">{option.lead}</p></div>
                {option.featured ? <span className="shrink-0 text-[10px] font-semibold text-[#d94461]">{ja ? "1件から" : "Flexible"}</span> : null}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-1">
                {option.items.map((item) => <div key={item} className="flex items-start gap-2 text-[11px] leading-5 text-neutral-600 sm:text-xs"><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${option.featured ? "bg-[#f04f6d] text-white" : "bg-neutral-200 text-neutral-600"}`}><CheckIcon /></span>{item}</div>)}
              </div>
              <div className="mt-6 border-t border-neutral-200/80 pt-4"><p className="text-[10px] text-neutral-400">{ja ? "向いている使い方" : "Best suited for"}</p><p className="mt-1 text-xs font-medium leading-5 text-neutral-700">{option.fit}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  const cases = ja
    ? [
        ["01", "ビューティー", "使用感や質感を、Creator自身の言葉とビジュアルで伝える。"],
        ["02", "ファッション", "着用イメージやコーディネートから、商品のある生活を見せる。"],
        ["03", "D2C・EC", "商品レビューやUGC制作を、表示価格を見ながら依頼。"],
        ["04", "飲食店・店舗", "地域やジャンルから、来店・体験につながる発信者を探す。"],
        ["05", "旅行・宿泊", "現地での過ごし方を、写真や短尺動画で具体的に届ける。"],
        ["06", "採用・求人", "職場の空気や働く人の声を、自然なコンテンツで届ける。"],
      ]
    : [
        ["01", "Beauty", "Show texture and product experience through a creator's own perspective."],
        ["02", "Fashion", "Make products tangible through styling and real-life wear."],
        ["03", "D2C & ecommerce", "Request reviews and UGC with visible rates."],
        ["04", "Stores & dining", "Find local creators for visits and real-world experiences."],
        ["05", "Travel & hospitality", "Turn stays and destinations into visual stories."],
        ["06", "Recruiting", "Share workplace stories through natural creator content."],
      ];
  return (
    <section className="bg-[#fbfaf7] py-20 sm:py-28">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl tm-reveal"><p className="text-[12px] font-semibold tracking-[0.16em] text-[#d94461]">BUILT FOR BUSINESS</p><h2 className="mt-4 text-[clamp(2rem,5vw,3.55rem)] font-semibold leading-[1.14] tracking-[-0.055em] text-neutral-950">{ja ? "目的に合わせて、すぐに始める。" : "Start with the outcome you need."}</h2></div>
        <div className="mt-10 border-y border-neutral-200 md:grid md:grid-cols-2">
          {cases.map(([number, title, body], index) => <Link href={CREATOR_LIST_PATH} key={title} className={`tm-focus group grid grid-cols-[auto_1fr_auto] gap-4 border-neutral-200 py-6 transition hover:bg-white md:px-6 md:py-8 ${index < cases.length - 1 ? "border-b" : ""} ${index % 2 === 0 ? "md:border-r" : ""} ${index >= cases.length - 2 ? "md:border-b-0" : ""}`}><span className="pt-1 text-[10px] font-semibold text-[#e94866]">{number}</span><div><h3 className="text-base font-semibold text-neutral-950 sm:text-lg">{title}</h3><p className="mt-2 max-w-md text-[13px] leading-6 text-neutral-600 sm:text-sm">{body}</p></div><ArrowIcon className="mt-1 h-5 w-5 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-neutral-950" /></Link>)}
        </div>
      </div>
    </section>
  );
}

function Assurance({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  const items = ja ? [
    ["Creatorが依頼内容を確認", "一方的に案件が始まらず、依頼後にCreator本人が内容を確認します。"],
    ["案件ごとのチャット", "日程や投稿内容の確認を、依頼ごとの会話にまとめられます。"],
    ["納品確認と修正依頼", "届いたURLを確認し、必要な場合は同じ案件内で修正を依頼できます。"],
    ["Stripeによる決済", "支払いは案件の進行とつながり、決済情報をCreatorへ直接伝える必要はありません。"],
  ] : [
    ["Creator review", "The creator reviews each request before work begins."],
    ["Per-campaign chat", "Keep timing and content discussions attached to the request."],
    ["Delivery review", "Review delivered URLs and request revisions when needed."],
    ["Stripe payments", "Payments stay connected to campaign progress without sharing card details."],
  ];
  return <section className="bg-white py-20 sm:py-28"><div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8"><div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20"><div className="tm-reveal"><p className="text-[12px] font-semibold tracking-[0.16em] text-[#d94461]">A CLEAR WAY TO WORK</p><h2 className="mt-4 text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.14] tracking-[-0.055em] text-neutral-950">{ja ? <>依頼したあとも、<br />迷わず進める。</> : <>Clarity after<br />the request.</>}</h2><p className="mt-5 text-sm leading-7 text-neutral-600">{ja ? "Creatorの回答は原則72時間以内。回答がない場合は自動でキャンセルされます。" : "Creators generally respond within 72 hours. Unanswered requests are cancelled automatically."}</p></div><div className="border-t border-neutral-200">{items.map(([title,body],index) => <article key={title} className="tm-reveal grid gap-3 border-b border-neutral-200 py-6 sm:grid-cols-[42px_0.72fr_1.28fr] sm:items-start sm:gap-5 sm:py-7"><span className="text-[10px] font-semibold text-neutral-400">0{index+1}</span><h3 className="text-[15px] font-semibold text-neutral-950">{title}</h3><p className="text-[13px] leading-6 text-neutral-600">{body}</p></article>)}</div></div></div></section>;
}

function Faq({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  const questions = ja ? [
    ["月額契約は必要ですか？", "月額契約なしでも始められます。必要なときに1件から依頼でき、利用方法に応じて別途プランを選べる場合があります。"],
    ["1人だけでも依頼できますか？", "はい。1人への1件の依頼から利用できます。まず相性を確かめたい施策にも使えます。"],
    ["依頼前に料金は分かりますか？", "Creatorが公開しているメニューと表示価格を確認できます。追加条件がある場合は依頼内容をご確認ください。"],
    ["どのCreatorへ依頼するか自分で選べますか？", "はい。SNS、ジャンル、活動地域、フォロワー帯、メニューなどを見て選べます。"],
    ["UGC制作だけでも相談できますか？", "Creatorの公開メニューに対応内容があれば相談できます。納品形式や利用範囲は各メニューと依頼条件で確認してください。"],
    ["投稿内容はどこで相談できますか？", "依頼が受けられた後、案件ごとのチャットで日程や投稿内容を確認できます。"],
    ["納品後に修正をお願いできますか？", "納品内容を確認し、依頼条件との相違などがある場合は案件内から修正を依頼できます。"],
    ["Creatorから回答がない場合は？", "依頼後72時間以内に回答がない場合、依頼は自動でキャンセルされます。"],
    ["支払いはどのように行いますか？", "Stripeを通じて決済します。具体的な決済タイミングと金額は注文画面で確認できます。"],
    ["店舗や地域限定の依頼にも使えますか？", "はい。活動地域やジャンルを見ながら、来店・体験型の依頼先を探せます。"],
    ["大企業のテスト施策にも使えますか？", "はい。新規チャネル、地域限定、UGC試作など、範囲を絞った施策から始められます。"],
  ] : [
    ["Is a monthly contract required?", "You can start without one and request one project when needed. Other plans may be available depending on usage."],
    ["Can I request just one creator?", "Yes. Start with one creator and one request."],
    ["Can I see pricing before requesting?", "Published creator services show visible rates. Review any additional conditions in the request."],
    ["Can I choose the creator myself?", "Yes. Compare platform, category, area, audience range, and services."],
    ["Can I request UGC only?", "Yes, when a creator offers it. Delivery format and usage rights are agreed per service and request."],
    ["Where do we discuss content?", "After acceptance, use the per-campaign chat to align timing and content."],
    ["Can I request revisions?", "Review the delivery and request a revision if it differs from the agreed requirements."],
    ["What if the creator does not respond?", "Requests are automatically cancelled if there is no response within 72 hours."],
    ["How does payment work?", "Payments are processed through Stripe. Timing and totals are shown in the order."],
    ["Can I run local store campaigns?", "Yes. Search by activity area and category for in-person experiences."],
    ["Can enterprise teams use it for tests?", "Yes. Start with a focused channel, region, or UGC test before expanding."],
  ];
  return <section className="bg-[#f3f0eb] py-20 sm:py-28"><div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8"><div className="tm-reveal text-center"><p className="text-[12px] font-semibold tracking-[0.16em] text-[#d94461]">FAQ</p><h2 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.14] tracking-[-0.055em] text-neutral-950">{ja ? "始める前に知っておきたいこと。" : "What to know before you begin."}</h2></div><div className="mt-10 border-t border-neutral-300/80">{questions.map(([question,answer]) => <details key={question} className="tm-faq group border-b border-neutral-300/80"><summary className="tm-focus flex min-h-[74px] cursor-pointer list-none items-center justify-between gap-5 py-5 text-left text-[15px] font-semibold leading-6 text-neutral-950 sm:min-h-[80px] sm:text-base"><span>{question}</span><span className="relative h-5 w-5 shrink-0 text-neutral-500" aria-hidden="true"><span className="absolute left-1 top-[9px] h-px w-3 bg-current" /><span className="absolute left-[9px] top-1 h-3 w-px bg-current transition group-open:rotate-90 group-open:opacity-0" /></span></summary><p className="max-w-3xl pb-6 pr-8 text-[13px] leading-7 text-neutral-600 sm:text-sm">{answer}</p></details>)}</div></div></section>;
}

function FinalCta({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[30px] bg-[#f3f0eb] px-5 py-12 text-center sm:rounded-[38px] sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#d94461]">START WITH SEARCH</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1.14] tracking-[-0.055em] text-neutral-950">{ja ? "必要なCreatorへ、1件から。" : "Start with one creator, one request."}</h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-neutral-600 sm:text-base">{ja ? "月額契約なしでも始められます。表示価格を見ながら、商品やサービスに合うCreatorを探してみてください。" : "Start without a monthly contract. Explore visible rates and find the right creator for your brand."}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href={CREATOR_LIST_PATH} className="tm-focus inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"><SearchIcon className="h-4 w-4" />{ja ? "インフルエンサーを探す" : "Explore creators"}</Link><Link href="/signup/company" className="tm-focus inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#f04f6d] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(240,79,109,0.22)] transition hover:-translate-y-0.5 hover:bg-[#e74362]">{ja ? "無料で企業登録" : "Join free"}<ArrowIcon /></Link></div>
      </div>
    </section>
  );
}

function HomeFooter({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-[1220px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto_auto] md:gap-16 lg:px-8">
        <div><Link href="/home" className="tm-focus inline-block rounded-md"><Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={174} height={34} className="h-[23px] w-auto" /></Link><p className="mt-4 max-w-xs text-xs leading-6 text-neutral-500">{ja ? "必要なCreatorへ、必要なときに1件から。" : "One creator at a time, whenever your brand needs one."}</p></div>
        <div><p className="text-xs font-semibold text-neutral-950">{ja ? "サービス" : "Service"}</p><div className="mt-2 grid text-xs text-neutral-500"><a href="#service-overview" className="flex min-h-11 items-center hover:text-neutral-950">{ja ? "サービス概要" : "Overview"}</a><Link href={CREATOR_LIST_PATH} className="flex min-h-11 items-center hover:text-neutral-950">{ja ? "インフルエンサー検索" : "Creator search"}</Link><Link href="/login" className="flex min-h-11 items-center hover:text-neutral-950">{ja ? "ログイン" : "Log in"}</Link><Link href="/signup/company" className="flex min-h-11 items-center hover:text-neutral-950">{ja ? "企業登録" : "Brand signup"}</Link></div></div>
        <div><p className="text-xs font-semibold text-neutral-950">{ja ? "ポリシー" : "Policy"}</p><div className="mt-2 grid text-xs text-neutral-500"><Link href="/terms" className="flex min-h-11 items-center hover:text-neutral-950">{ja ? "利用規約" : "Terms"}</Link><Link href="/privacy" className="flex min-h-11 items-center hover:text-neutral-950">{ja ? "プライバシーポリシー" : "Privacy"}</Link><Link href="/legal" className="flex min-h-11 items-center hover:text-neutral-950">{ja ? "事業者情報" : "Legal"}</Link></div></div>
      </div>
      <div className="border-t border-neutral-100 px-4 py-5 text-center text-[10px] text-neutral-400">© {new Date().getFullYear()} Trendre</div>
    </footer>
  );
}

function fallbackCreators(locale: Locale): CreatorPreview[] {
  const ja = locale === "ja";
  return [
    { id: null, displayName: "Maya", category: ja ? "美容・スキンケア Creator" : "Beauty / Skincare Creator", prefecture: ja ? "東京" : "Tokyo", imageUrl: "/brand/work-link/beauty-lifestyle.webp", avatarUrl: null, platform: "Instagram / TikTok", followerRange: "30K–50K", startingPrice: 30000, currency: "JPY", menuTitle: ja ? "美容レビュー投稿" : "Beauty review" },
    { id: null, displayName: "Ren", category: ja ? "アパレル・ファッション Creator" : "Fashion / Lifestyle Creator", prefecture: ja ? "東京・大阪" : "Tokyo / Osaka", imageUrl: "/brand/work-link/fashion-music.webp", avatarUrl: null, platform: "Instagram", followerRange: "50K–100K", startingPrice: 50000, currency: "JPY", menuTitle: ja ? "ファッション投稿" : "Fashion post" },
    { id: null, displayName: "Aoi", category: ja ? "グルメ・カフェ Creator" : "Food / Cafe Creator", prefecture: ja ? "大阪・福岡" : "Osaka / Fukuoka", imageUrl: "/brand/work-link/gourmet-travel.webp", avatarUrl: null, platform: "Instagram / TikTok", followerRange: "10K–30K", startingPrice: 25000, currency: "JPY", menuTitle: ja ? "店舗体験レビュー" : "Cafe review" },
    { id: null, displayName: "Rina", category: ja ? "トラベル・旅行 Creator" : "Travel / Hotel Creator", prefecture: ja ? "全国・旅行対応" : "Japan-wide travel", imageUrl: "/brand/work-link/talent-sunset.webp", avatarUrl: null, platform: "Instagram / TikTok", followerRange: "30K–50K", startingPrice: 60000, currency: "JPY", menuTitle: ja ? "ホテル・旅行紹介" : "Hotel / travel post" },
  ];
}

export default function HomePage() {
  const { locale } = useAppLocale();
  const safeLocale: Locale = locale === "en" ? "en" : "ja";
  const [creators, setCreators] = useState<CreatorPreview[]>(() => fallbackCreators(safeLocale));

  const workflowSteps = useMemo<WorkflowStep[]>(() => safeLocale === "ja" ? [
    { number: "01", title: "探す", headline: "条件を比べて、ブランドに合うCreatorを見つける。", body: "SNS、カテゴリ、エリア、表示価格から候補を絞り込みます。" },
    { number: "02", title: "依頼", headline: "伝えるべき内容を整理して、そのまま依頼。", body: "商品情報、投稿条件、参考素材、希望時期をまとめて送れます。" },
    { number: "03", title: "承認", headline: "72時間以内の回答で、待ち続けない。", body: "回答期限を明確にし、無応答の場合は自動でキャンセルされます。" },
    { number: "04", title: "チャット", headline: "案件ごとの会話で、認識を揃える。", body: "日程や投稿内容など、不明点を案件内で確認できます。" },
    { number: "05", title: "納品", headline: "届いたURLを確認し、必要なら修正を依頼。", body: "納品確認から完了承認まで、同じ画面で進められます。" },
    { number: "06", title: "支払い", headline: "決済から報酬支払いまで、流れを止めない。", body: "Stripeを通じた決済を、案件の進行と一緒に管理します。" },
  ] : [
    { number: "01", title: "Search", headline: "Compare creators who fit your brand.", body: "Filter by platform, category, area, and visible rates." },
    { number: "02", title: "Request", headline: "Create a clear brief and send it directly.", body: "Organize product details, requirements, assets, and timing." },
    { number: "03", title: "Approval", headline: "Get a response within 72 hours.", body: "Clear response windows prevent campaigns from stalling." },
    { number: "04", title: "Chat", headline: "Keep every detail aligned in one conversation.", body: "Discuss timing, content, and requirements per campaign." },
    { number: "05", title: "Delivery", headline: "Review delivery and request revisions if needed.", body: "Open delivered URLs and approve once the work is ready." },
    { number: "06", title: "Payment", headline: "Keep payment connected to campaign progress.", body: "Stripe-powered payments move with the project workflow." },
  ], [safeLocale]);

  useEffect(() => {
    setCreators(fallbackCreators(safeLocale));
  }, [safeLocale]);

  useEffect(() => {
    let mounted = true;
    async function loadCreators() {
      try {
        const payoutResult = await supabase.rpc("get_payout_ready_creator_ids");
        if (payoutResult.error) return;
        const ids = Array.from(new Set(((payoutResult.data ?? []) as { creator_id: string | null }[]).map((row) => row.creator_id).filter((id): id is string => Boolean(id))));
        if (ids.length === 0) return;

        const creatorResult = await supabase.from("creators").select(`id, display_name, avatar_url, category, prefecture, creator_social_accounts ( platform, handle, follower_range )`).eq("approval_status", "approved").eq("is_public", true).in("id", ids).order("created_at", { ascending: false }).limit(8);
        if (creatorResult.error) return;
        const rows = (creatorResult.data ?? []) as CreatorRow[];
        const creatorIds = rows.map((row) => row.id);
        if (creatorIds.length === 0) return;

        const [menuResult, portfolioResult] = await Promise.all([
          supabase.from("creator_menus").select("id, creator_id, title, price, currency").in("creator_id", creatorIds).eq("is_active", true),
          supabase.from("creator_portfolio_assets").select("creator_id, asset_url").in("creator_id", creatorIds).eq("is_public", true).eq("asset_type", "image").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
        ]);
        const menus = menuResult.error ? [] : (menuResult.data ?? []) as MenuRow[];
        const assets = portfolioResult.error ? [] : (portfolioResult.data ?? []) as PortfolioAssetRow[];
        const next = rows.map((row): CreatorPreview | null => {
          const menu = menus.filter((item) => item.creator_id === row.id).sort((a, b) => Number(a.price ?? Infinity) - Number(b.price ?? Infinity))[0];
          if (!menu) return null;
          const socials = Array.isArray(row.creator_social_accounts) ? row.creator_social_accounts : row.creator_social_accounts ? [row.creator_social_accounts] : [];
          const social = socials[0];
          return { id: row.id, displayName: row.display_name?.trim() || social?.handle?.replace(/^@/, "") || "Creator", category: row.category?.trim() || "Creator", prefecture: row.prefecture?.trim() || (safeLocale === "ja" ? "地域未設定" : "Area not set"), imageUrl: assets.find((item) => item.creator_id === row.id)?.asset_url || null, avatarUrl: row.avatar_url?.trim() || null, platform: social?.platform?.trim() || "Instagram", followerRange: social?.follower_range?.trim() || null, startingPrice: typeof menu.price === "number" ? menu.price : null, currency: menu.currency || "JPY", menuTitle: menu.title?.trim() || "PR" };
        }).filter((item): item is CreatorPreview => Boolean(item)).slice(0, 4);
        if (mounted && next.length >= 2) setCreators([...next, ...fallbackCreators(safeLocale)].slice(0, 4));
      } catch (error) {
        console.error("home creators load error", error);
      }
    }
    void loadCreators();
    return () => { mounted = false; };
  }, [safeLocale]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".tm-reveal"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("tm-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("tm-visible"); observer.unobserve(entry.target); } }), { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="tm-home min-h-screen overflow-x-clip bg-[#fbfaf7] font-sans text-neutral-950">
      <HomeHeader locale={safeLocale} />
      <main>
        <Hero creators={fallbackCreators(safeLocale)} locale={safeLocale} />
        <MarketTension locale={safeLocale} />
        <Discovery creators={fallbackCreators(safeLocale)} locale={safeLocale} />
        <UgcSection locale={safeLocale} />
        <TestAndScale locale={safeLocale} />
        <Comparison locale={safeLocale} />
        <Workflow steps={workflowSteps} locale={safeLocale} />
        <Assurance locale={safeLocale} />
        <UseCases locale={safeLocale} />
        <Faq locale={safeLocale} />
        <FinalCta locale={safeLocale} />
      </main>
      <HomeFooter locale={safeLocale} />
      <style jsx global>{`
        .tm-home { --tm-pink: ${PINK}; }
        .tm-home ::selection { background: rgba(240, 79, 109, 0.2); }
        .tm-focus:focus-visible { outline: 3px solid rgba(240, 79, 109, 0.28); outline-offset: 3px; }
        .tm-reveal { opacity: 0; transform: translateY(18px); transition: opacity 760ms cubic-bezier(.22,.8,.3,1), transform 760ms cubic-bezier(.22,.8,.3,1); }
        .tm-reveal.tm-visible { opacity: 1; transform: translateY(0); }
        .tm-delay-1 { transition-delay: 80ms; }
        .tm-delay-2 { transition-delay: 150ms; }
        .tm-delay-3 { transition-delay: 220ms; }
        .tm-float { animation: tmFloat 5.2s ease-in-out infinite; }
        .tm-preview-enter { animation: tmPreviewIn 480ms cubic-bezier(.22,.8,.3,1) both; }
        .tm-progress { animation: tmProgress 1.1s cubic-bezier(.22,.8,.3,1) both; transform-origin: left; }
        @keyframes tmFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes tmPreviewIn { from { opacity: 0; transform: translateY(8px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes tmProgress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) {
          .tm-home *, .tm-home *::before, .tm-home *::after { scroll-behavior: auto !important; }
          .tm-reveal { opacity: 1; transform: none; transition: none; }
          .tm-float, .tm-preview-enter, .tm-progress { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
