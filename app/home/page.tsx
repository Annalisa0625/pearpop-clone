// File: app/home/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

type Locale = "ja" | "en";

type SocialAccountRow = {
  platform?: string | null;
  url?: string | null;
  handle?: string | null;
  follower_range?: string | null;
  audience_country?: string | null;
};

type CreatorRow = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  category?: string | null;
  prefecture?: string | null;
  rating?: number | null;
  total_orders?: number | null;
  creator_social_accounts?: SocialAccountRow[] | SocialAccountRow | null;
};

type MenuRow = {
  id: string;
  creator_id: string | null;
  title: string | null;
  price: number | null;
  currency: string | null;
  is_active: boolean | null;
};

type PortfolioAssetRow = {
  id: string;
  creator_id: string;
  asset_url: string;
  asset_type: string;
  sort_order: number | null;
  is_public: boolean | null;
  created_at: string | null;
};

type CreatorPreview = {
  id: string | null;
  displayName: string;
  category: string;
  prefecture: string;
  imageUrl: string | null;
  avatarUrl: string | null;
  platforms: string[];
  followerRange: string | null;
  startingPrice: number | null;
  startingCurrency: string | null;
  menuCount: number;
  tag: string;
  gradient: string;
};

type WorkflowStep = {
  number: string;
  title: string;
  eyebrow: string;
  headline: string;
  body: string;
  bullets: string[];
  metricLabel: string;
  metricValue: string;
  previewTitle: string;
  previewBadge: string;
  previewRows: string[];
  previewCta: string;
};

type UseCaseCardProps = {
  title: string;
  body: string;
  cta: string;
  tone: "rose" | "blue" | "violet" | "orange";
};

const CREATOR_LIST_PATH = "/b/creators";

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "X"] as const;

const CARD_GRADIENTS = [
  "from-rose-200 via-orange-100 to-emerald-200",
  "from-blue-200 via-sky-100 to-slate-200",
  "from-emerald-200 via-lime-100 to-yellow-100",
  "from-slate-300 via-zinc-200 to-stone-100",
];

const MAIN_CATEGORY_LABELS = ["美容", "健康", "グルメ", "旅行", "暮らし", "制作"];

const DETAIL_CATEGORY_LABELS = [
  "すべて",
  "美容サロン",
  "美容室",
  "美容整形",
  "美容医療",
  "スキンケア",
  "コスメ",
  "韓国コスメ",
  "ヘアケア",
  "ネイル",
  "まつ毛・眉毛",
  "香水",
  "メンズ美容",
];

const TREND_MARQUEE_ITEMS = [
  "Hack the trend",
  "Trendre",
  "Ignite the trend again",
];

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getPlatformIcon(value: string | null | undefined, className = "h-4 w-4") {
  const normalized = normalizePlatform(value);

  if (normalized.includes("instagram")) {
    return (
      <img
        src="/brand/social/instagram.png"
        alt=""
        className={`${className} object-contain`}
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("tiktok")) {
    return (
      <img
        src="/brand/social/tiktok.png"
        alt=""
        className={`${className} object-contain`}
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("youtube")) {
    return (
      <img
        src="/brand/social/youtube.png"
        alt=""
        className={`${className} object-contain`}
        aria-hidden="true"
      />
    );
  }

  if (normalized === "x" || normalized.includes("twitter")) {
    return (
      <img
        src="/brand/social/x.png"
        alt=""
        className={`${className} object-contain`}
        aria-hidden="true"
      />
    );
  }

  return <span className="text-xs">●</span>;
}

function formatPrice(value: number | null, currency: string | null | undefined) {
  if (value == null) return "-";

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    return safeCurrency === "USD"
      ? `$${value.toLocaleString()}`
      : `¥${value.toLocaleString()}`;
  }
}

function formatStartingPrice(value: number | null, currency: string | null | undefined) {
  if (value == null) return "価格未設定";
  return `${formatPrice(value, currency)}〜`;
}

function getSocialAccountName(social: SocialAccountRow | null | undefined) {
  if (!social) return null;

  const handle = social.handle?.trim();
  if (handle) return handle.replace(/^@/, "");

  const url = social.url?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = parts[0] ?? parts.at(-1) ?? "";
    return last.replace(/^@/, "") || null;
  } catch {
    return url.replace(/^@/, "") || null;
  }
}

function useTypingPlaceholder(words: string[]) {
  const [wordIndex, setWordIndex] = useState(0);
  const [letterCount, setLetterCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [blankPause, setBlankPause] = useState(true);

  useEffect(() => {
    const currentWord = words[wordIndex] ?? "";

    if (blankPause) {
      const timer = window.setTimeout(() => {
        setBlankPause(false);
      }, 520);

      return () => window.clearTimeout(timer);
    }

    let delay = deleting ? 42 : 88;

    if (!deleting && letterCount >= currentWord.length) {
      delay = 1180;
    }

    const timer = window.setTimeout(() => {
      if (!deleting && letterCount < currentWord.length) {
        setLetterCount((value) => value + 1);
        return;
      }

      if (!deleting && letterCount >= currentWord.length) {
        setDeleting(true);
        return;
      }

      if (deleting && letterCount > 0) {
        setLetterCount((value) => value - 1);
        return;
      }

      setDeleting(false);
      setBlankPause(true);
      setWordIndex((value) => (value + 1) % words.length);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [blankPause, deleting, letterCount, wordIndex, words]);

  if (blankPause) return "";
  return words[wordIndex]?.slice(0, letterCount) ?? "";
}

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
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

function PlatformLink({ platform }: { platform: string }) {
  return (
    <Link
      href={CREATOR_LIST_PATH}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-black text-white/82 transition hover:border-white/25 hover:bg-white hover:text-slate-950"
    >
      {getPlatformIcon(platform)}
      {platform}
    </Link>
  );
}

function CreatorImage({
  creator,
  index,
}: {
  creator: CreatorPreview;
  index: number;
}) {
  const src = creator.imageUrl || creator.avatarUrl;

  if (src) {
    return (
      <img
        src={src}
        alt={creator.displayName}
        className="h-full w-full object-cover object-center transition duration-500 ease-out group-hover/card:scale-105"
        loading={index < 4 ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  return (
    <div
      className={`h-full w-full bg-gradient-to-br ${
        creator.gradient || CARD_GRADIENTS[index % CARD_GRADIENTS.length]
      }`}
    />
  );
}

function CreatorHeroCard({
  creator,
  index,
}: {
  creator: CreatorPreview;
  index: number;
}) {
  const primaryPlatform = creator.platforms[0] ?? "Instagram";

  return (
    <Link href={CREATOR_LIST_PATH} className="group/card block">
      <article className="relative aspect-[1.12/1] overflow-hidden rounded-[22px] bg-slate-200 shadow-[0_18px_45px_rgba(0,0,0,0.22)] ring-1 ring-white/10 transition duration-300 group-hover/card:-translate-y-1">
        <CreatorImage creator={creator} index={index} />

        <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-black/14 to-black/8" />

        <div className="absolute left-4 top-4 max-w-[62%]">
          <p className="truncate text-base font-black leading-tight text-white">
            {creator.displayName}
          </p>
        </div>

        <div className="absolute right-3 top-3 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-sm ring-1 ring-black/5">
          {formatStartingPrice(creator.startingPrice, creator.startingCurrency)}
        </div>

        <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl font-light text-white backdrop-blur-md ring-1 ring-white/20 transition group-hover/card:bg-white group-hover/card:text-slate-900">
          ♡
        </div>

        <div className="absolute bottom-4 left-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-black text-slate-950 shadow-sm ring-1 ring-black/5">
            {getPlatformIcon(primaryPlatform, "h-5 w-5")}
            {primaryPlatform}
          </span>
        </div>
      </article>
    </Link>
  );
}

function SearchCategoryPanel({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 overflow-hidden rounded-[26px] border border-slate-100 bg-white p-4 text-left shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
      <div className="rounded-[24px] bg-slate-50 p-4">
        <p className="mb-3 px-1 text-xs font-black text-slate-400">大カテゴリ</p>

        <div className="flex flex-wrap gap-2">
          {MAIN_CATEGORY_LABELS.map((label, index) => (
            <Link
              key={label}
              href={CREATOR_LIST_PATH}
              className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
                index === 0
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-100 hover:bg-slate-950 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-[24px] bg-white p-4 ring-1 ring-slate-100">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="px-1 text-xs font-black text-slate-400">詳細カテゴリ</p>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-500">
            美容
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {DETAIL_CATEGORY_LABELS.map((label, index) => (
            <Link
              key={label}
              href={CREATOR_LIST_PATH}
              className={`rounded-full px-4 py-2.5 text-sm font-black transition ${
                index === 0
                  ? "bg-rose-500 text-white shadow-[0_10px_25px_rgba(244,63,94,0.22)]"
                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-100 hover:bg-slate-950 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSearch({
  copy,
  suggestions,
}: {
  copy: Record<string, string>;
  suggestions: string[];
}) {
  const typingText = useTypingPlaceholder(suggestions);
  const [query, setQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.location.href = CREATOR_LIST_PATH;
  };

  return (
    <div className="relative mx-auto mt-4 w-full max-w-[900px]">
      <form
        onSubmit={handleSubmit}
        className="flex w-full overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.24)] ring-1 ring-white/10"
      >
        <div className="hidden min-w-[165px] items-center gap-3 border-r border-slate-200 px-5 text-sm font-black text-slate-800 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
            <SearchIcon className="h-4 w-4" />
          </span>
          Search
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setSuggestionsOpen(false), 150);
          }}
          placeholder={typingText ? `${typingText}|` : ""}
          className="min-h-[56px] flex-1 bg-white px-5 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
        />

        <button
          type="submit"
          className="inline-flex min-w-[128px] items-center justify-center gap-2 bg-[#f85b8f] px-5 text-sm font-black text-white transition hover:bg-[#f0447c] sm:min-w-[148px]"
        >
          <SearchIcon />
          {copy.searchButton}
        </button>
      </form>

      <SearchCategoryPanel show={suggestionsOpen} />
    </div>
  );
}

function HeroSection({
  copy,
  creators,
  suggestions,
}: {
  copy: Record<string, string>;
  creators: CreatorPreview[];
  suggestions: string[];
}) {
  const chips = [
    copy.chip1,
    copy.chip2,
    copy.chip3,
    copy.chip4,
    copy.chip5,
    copy.chip6,
  ];

  return (
    <section className="bg-white pb-6 pt-1">
      <div className="mx-auto max-w-[calc(100%-28px)] overflow-hidden rounded-[34px] bg-[#2b2b2b] px-5 pb-8 pt-6 shadow-[0_30px_100px_rgba(0,0,0,0.18)] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-[29px] font-black leading-[1.04] tracking-[-0.055em] text-white md:text-[42px] lg:text-[50px] xl:text-[56px]">
            {copy.heroLine1}
            <br className="hidden md:block" />
            <span className="text-[#f85b8f]">{copy.heroAccent}</span>
            {copy.heroLine2}
            <span className="italic">{copy.heroItalic}</span>
          </h1>

          <p className="mx-auto mt-3 max-w-6xl text-sm font-semibold leading-7 text-white/72 md:whitespace-nowrap md:text-base">
            {copy.heroBody}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {PLATFORM_OPTIONS.map((platform) => (
              <PlatformLink key={platform} platform={platform} />
            ))}
          </div>

          <HeroSearch copy={copy} suggestions={suggestions} />

          <div className="mx-auto mt-3 flex max-w-[920px] flex-wrap justify-center gap-3">
            {chips.map((chip) => (
              <Link
                key={chip}
                href={CREATOR_LIST_PATH}
                className="rounded-full border border-white/18 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/82 transition hover:border-white/25 hover:bg-white hover:text-slate-950"
              >
                {chip}
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-5 grid max-w-[1260px] gap-5 md:grid-cols-2 xl:grid-cols-4">
          {creators.map((creator, index) => (
            <CreatorHeroCard
              key={`${creator.displayName}-${index}`}
              creator={creator}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrendMarqueeSection() {
  const repeated = Array.from({ length: 10 }).flatMap(() => TREND_MARQUEE_ITEMS);

  return (
    <section className="overflow-hidden bg-white py-8 md:py-12">
      <div className="pointer-events-none overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="trendre-trend-marquee flex w-max items-center gap-10 whitespace-nowrap">
          {repeated.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="text-[24px] font-black tracking-[-0.035em] text-slate-200 md:text-[38px] lg:text-[46px]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes trendre-trend-marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .trendre-trend-marquee {
          animation: trendre-trend-marquee-left 38s linear infinite;
        }
      `}</style>
    </section>
  );
}

function WorkflowInfoPill({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 items-center rounded-full bg-white px-3 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100">
      {label}
    </span>
  );
}

function WorkflowMiniCard({
  tone,
  title,
  subtitle,
}: {
  tone: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className={`rounded-[20px] bg-gradient-to-br ${tone} p-3 shadow-sm ring-1 ring-slate-100`}>
      <div className="h-24 rounded-[16px] bg-white/78 shadow-inner" />
      <p className="mt-3 truncate text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-500">{subtitle}</p>
    </div>
  );
}

function SearchWorkflowPreview() {
  return (
    <div className="rounded-[30px] bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.11)] ring-1 ring-white/80">
      <div className="rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-100">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-black text-slate-400">SNSタイプ</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <WorkflowInfoPill label="Instagram" />
              <WorkflowInfoPill label="TikTok" />
              <WorkflowInfoPill label="YouTube" />
            </div>
          </div>

          <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-black text-slate-400">絞り込み</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex h-8 items-center rounded-full bg-emerald-50 px-3 text-xs font-black text-emerald-700">
                東京・大阪
              </span>
              <span className="inline-flex h-8 items-center rounded-full bg-blue-50 px-3 text-xs font-black text-blue-700">
                ¥10,000〜¥50,000
              </span>
              <span className="inline-flex h-8 items-center rounded-full bg-violet-50 px-3 text-xs font-black text-violet-700">
                体験案件
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-black text-slate-950">検索結果</p>
            <p className="text-xs font-bold text-slate-400">条件に合う候補を比較</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <WorkflowMiniCard
              tone="from-rose-50 to-orange-50"
              title="美容レビュー"
              subtitle="¥30,000〜 / 東京"
            />
            <WorkflowMiniCard
              tone="from-sky-50 to-indigo-50"
              title="店舗PR"
              subtitle="¥50,000〜 / 大阪"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestWorkflowPreview() {
  return (
    <div className="rounded-[30px] bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.11)] ring-1 ring-white/80">
      <div className="rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-4 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-500">Brief</p>
            <p className="mt-1 text-lg font-black text-slate-950">新作スキンケアPR</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
            ¥30,000
          </span>
        </div>

        <div className="mt-3 space-y-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
          {["商品URL", "提供内容", "投稿で触れてほしいこと"].map((label, index) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-400">{label}</p>
              <div className={`mt-2 h-3 rounded-full bg-slate-200 ${index === 0 ? "w-11/12" : index === 1 ? "w-8/12" : "w-10/12"}`} />
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {['内容整理', '素材添付', '確認して依頼'].map((item) => (
            <div key={item} className="rounded-2xl bg-white p-3 text-center text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApprovalWorkflowPreview() {
  return (
    <div className="rounded-[30px] bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.11)] ring-1 ring-white/80">
      <div className="grid gap-4 rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-100 md:grid-cols-[190px_1fr] md:items-center">
        <div className="mx-auto flex h-[178px] w-[178px] flex-col items-center justify-center rounded-full border-[14px] border-rose-100 bg-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Limit</p>
          <p className="mt-2 text-5xl font-black tracking-tight text-slate-950">72h</p>
          <p className="mt-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-500">
            自動管理
          </p>
        </div>

        <div className="space-y-3">
          {[
            ["依頼送信", "インフルエンサーへ依頼が届きます。"],
            ["72時間以内に承認", "受ける場合は期限内に承認されます。"],
            ["無応答は自動キャンセル", "待ちっぱなしを防ぐ安心設計です。"],
          ].map(([title, body], index) => (
            <div key={title} className="flex gap-3 rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${index === 1 ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">{title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatWorkflowPreview() {
  return (
    <div className="rounded-[30px] bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.11)] ring-1 ring-white/80">
      <div className="rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-100">
        <div className="rounded-[24px] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-200 to-orange-100" />
            <div>
              <p className="text-sm font-black text-slate-950">インフルエンサーと確認</p>
              <p className="text-xs font-bold text-slate-400">条件のすり合わせ</p>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="max-w-[78%] rounded-[18px] rounded-bl-md bg-slate-100 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
              来店可能日時と撮影条件を確認できますか？
            </div>
            <div className="ml-auto max-w-[78%] rounded-[18px] rounded-br-md bg-slate-950 px-4 py-3 text-sm font-semibold leading-6 text-white">
              はい、平日午後で調整できます。
            </div>
            <div className="max-w-[80%] rounded-[18px] rounded-bl-md bg-slate-100 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
              投稿で触れてほしい内容も共有します。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryWorkflowPreview() {
  return (
    <div className="rounded-[30px] bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.11)] ring-1 ring-white/80">
      <div className="rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-100">
        <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-500">Delivery</p>
              <p className="mt-1 text-xl font-black text-slate-950">納品URLが届きました</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                投稿内容を確認し、必要なら修正依頼できます。
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
              確認待ち
            </span>
          </div>

          <div className="mt-5 rounded-[20px] bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-black text-slate-400">納品URL</p>
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-100">
              <span className="text-rose-500">↗</span>
              https://example.com/delivery-post
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
              URLを開く
            </div>
            <div className="rounded-2xl bg-rose-500 px-4 py-3 text-center text-sm font-black text-white">
              修正依頼
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentWorkflowPreview() {
  return (
    <div className="rounded-[30px] bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.11)] ring-1 ring-white/80">
      <div className="grid gap-4 rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-100 md:grid-cols-[1fr_190px]">
        <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Payment</p>
              <p className="mt-1 text-xl font-black text-slate-950">安全な決済管理</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
              Stripe
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {["注文時に決済を安全に確認", "インフルエンサー承認後に決済確定", "完了承認後に報酬支払いへ"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckIcon />
                </span>
                <p className="text-sm font-black text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] bg-slate-950 p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Secure</p>
          <p className="mt-3 text-3xl font-black tracking-tight">¥33,000</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
            納品確認と修正依頼の流れまで含めて管理できます。
          </p>
        </div>
      </div>
    </div>
  );
}

function WorkflowPreview({ step }: { step: WorkflowStep }) {
  if (step.number === "02") return <RequestWorkflowPreview />;
  if (step.number === "03") return <ApprovalWorkflowPreview />;
  if (step.number === "04") return <ChatWorkflowPreview />;
  if (step.number === "05") return <DeliveryWorkflowPreview />;
  if (step.number === "06") return <PaymentWorkflowPreview />;
  return <SearchWorkflowPreview />;
}

function WorkflowSection({
  copy,
  steps,
}: {
  copy: Record<string, string>;
  steps: WorkflowStep[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = steps[activeIndex] ?? steps[0];

  return (
    <section className="bg-white px-4 py-12 md:px-6 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-[34px] font-black leading-[1.08] tracking-[-0.055em] text-slate-950 md:text-[48px]">
            {copy.workflowTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-500">
            {copy.workflowLead}
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-6xl rounded-full bg-[#23242a] p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <div className="grid grid-cols-2 gap-1 md:grid-cols-6">
            {steps.map((step, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`flex min-h-[58px] w-full flex-col items-start justify-center rounded-full px-5 text-left transition md:items-center md:px-3 md:text-center ${
                    isActive
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-white/76 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-[11px] font-black tracking-[0.14em]">
                    {step.number}
                  </span>
                  <span className="mt-1 text-sm font-black leading-none md:text-[15px]">
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl gap-7 rounded-[34px] bg-[#eeecff] p-5 md:p-7 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div className="px-1 md:px-2">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#7b6fb0]">
              {activeStep.eyebrow}
            </p>

            <h3 className="mt-3 text-[27px] font-black leading-[1.13] tracking-[-0.055em] text-slate-950 md:text-[34px] lg:text-[38px]">
              {activeStep.headline}
            </h3>

            <p className="mt-4 text-[15px] font-semibold leading-8 text-slate-600 md:text-base">
              {activeStep.body}
            </p>

            <div className="mt-6 grid gap-3">
              {activeStep.bullets.map((bullet) => (
                <div
                  key={bullet}
                  className="flex items-center gap-3 rounded-2xl bg-white/86 px-4 py-3 text-sm font-black text-slate-700 shadow-sm ring-1 ring-white/70"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckIcon />
                  </span>
                  {bullet}
                </div>
              ))}
            </div>
          </div>

          <WorkflowPreview step={activeStep} />
        </div>
      </div>
    </section>
  );
}

function IllustrationSection({ copy }: { copy: Record<string, string> }) {
  return (
    <section className="bg-white px-4 py-14 md:px-6 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 rounded-[42px] bg-slate-50 p-8 md:p-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <h2 className="max-w-xl text-[34px] font-black leading-[1.08] tracking-[-0.055em] text-slate-950 md:text-[48px]">
            {copy.illustrationTitle}
          </h2>
          <p className="mt-7 max-w-lg text-base font-semibold leading-8 text-slate-600">
            {copy.illustrationBody}
          </p>

          <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
            {[copy.illustrationMini1, copy.illustrationMini2, copy.illustrationMini3].map(
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

        <div className="flex min-h-[360px] items-center justify-center rounded-[34px] bg-white p-8">
          <img
            src="/brand/trendre-home-hero.png"
            alt=""
            className="max-h-[430px] w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}

function ToolsSection({ copy }: { copy: Record<string, string> }) {
  const tools = [
    { label: "In", text: "Instagram" },
    { label: "Ti", text: "TikTok" },
    { label: "Gm", text: "Gmail" },
    { label: "Sh", text: "Sheet" },
    { label: "Ch", text: "Chat" },
    { label: "St", text: "Stripe" },
    { label: "Dr", text: "Drive" },
    { label: "Pa", text: "Payment" },
  ];

  return (
    <section className="bg-white px-4 py-14 md:px-6 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 rounded-[42px] bg-slate-50 p-8 md:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h2 className="max-w-xl text-[34px] font-black leading-[1.08] tracking-[-0.055em] text-slate-950 md:text-[48px]">
            {copy.toolsTitle}
          </h2>
          <p className="mt-7 max-w-lg text-base font-semibold leading-8 text-slate-600">
            {copy.toolsBody}
          </p>

          <Link
            href={CREATOR_LIST_PATH}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2b2b2b] px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-950"
          >
            {copy.toolsCta}
            <ArrowIcon />
          </Link>
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-[34px] bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(248,91,143,0.12),transparent_56%)]" />

          {tools.map((tool, index) => {
            const positions = [
              "left-[12%] top-[38%]",
              "left-[30%] top-[56%]",
              "left-[42%] top-[32%]",
              "left-[62%] top-[22%]",
              "left-[78%] top-[36%]",
              "left-[68%] top-[56%]",
              "left-[54%] top-[70%]",
              "left-[28%] top-[20%]",
            ];

            return (
              <div
                key={tool.text}
                className={`absolute ${positions[index]} flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xs font-black text-slate-700 shadow-[0_18px_55px_rgba(15,23,42,0.12)] ring-1 ring-slate-100`}
                title={tool.text}
              >
                {tool.label}
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
      <div className="rounded-[22px] bg-white/78 p-5 shadow-[0_16px_35px_rgba(0,0,0,0.08)]">
        <div className="h-3 w-28 rounded-full bg-white/90" />
        <div className="mt-4 h-3 w-44 rounded-full bg-white/70" />
        <div className="mt-3 h-3 w-32 rounded-full bg-white/70" />
      </div>

      <h3 className="mt-8 text-2xl font-black tracking-[-0.04em] text-slate-950">
        {title}
      </h3>

      <p className="mt-5 min-h-[112px] text-base font-semibold leading-8 text-slate-800/78">
        {body}
      </p>

      <Link
        href={CREATOR_LIST_PATH}
        className="mt-6 inline-flex rounded-full border border-slate-900/45 px-7 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-900 hover:text-white"
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
    <section className="bg-white px-4 py-14 md:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-[34px] font-black leading-[1.08] tracking-[-0.055em] text-slate-950 md:text-[48px]">
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
    <section className="bg-white px-4 pb-16 pt-8 md:px-6 lg:pb-24">
      <div className="mx-auto max-w-5xl rounded-[42px] bg-[#2b2b2b] px-8 py-16 text-center shadow-[0_30px_90px_rgba(0,0,0,0.18)] md:px-12 md:py-20">
        <h2 className="mx-auto max-w-4xl text-[36px] font-black leading-[1.1] tracking-[-0.055em] text-white md:text-[56px]">
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
            href={CREATOR_LIST_PATH}
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

function fallbackCreators(copy: Record<string, string>): CreatorPreview[] {
  return [
    {
      id: null,
      displayName: copy.fallbackCreator1Name,
      category: "Food / Travel / Lifestyle",
      prefecture: "東京",
      imageUrl: null,
      avatarUrl: null,
      platforms: ["Instagram", "TikTok"],
      followerRange: null,
      startingPrice: 50000,
      startingCurrency: "JPY",
      menuCount: 8,
      tag: copy.fallbackCreator1Tag,
      gradient: CARD_GRADIENTS[0],
    },
    {
      id: null,
      displayName: copy.fallbackCreator2Name,
      category: "Fashion / Outdoor",
      prefecture: "神奈川",
      imageUrl: null,
      avatarUrl: null,
      platforms: ["TikTok", "X"],
      followerRange: null,
      startingPrice: 80000,
      startingCurrency: "JPY",
      menuCount: 12,
      tag: copy.fallbackCreator2Tag,
      gradient: CARD_GRADIENTS[1],
    },
    {
      id: null,
      displayName: copy.fallbackCreator3Name,
      category: "Beauty / Camera / UGC",
      prefecture: "大阪",
      imageUrl: null,
      avatarUrl: null,
      platforms: ["Instagram", "YouTube"],
      followerRange: null,
      startingPrice: 30000,
      startingCurrency: "JPY",
      menuCount: 6,
      tag: copy.fallbackCreator3Tag,
      gradient: CARD_GRADIENTS[2],
    },
    {
      id: null,
      displayName: copy.fallbackCreator4Name,
      category: "Gadget / Review",
      prefecture: "愛知",
      imageUrl: null,
      avatarUrl: null,
      platforms: ["TikTok", "YouTube"],
      followerRange: null,
      startingPrice: 100000,
      startingCurrency: "JPY",
      menuCount: 10,
      tag: copy.fallbackCreator4Tag,
      gradient: CARD_GRADIENTS[3],
    },
  ];
}

export default function HomePage() {
  const { locale } = useAppLocale();
  const safeLocale: Locale = locale === "en" ? "en" : "ja";

  const copy = useMemo<Record<string, string>>(
    () =>
      safeLocale === "ja"
        ? {
            heroLine1: "インフルエンサーPRを",
            heroAccent: '"探す"',
            heroLine2: "から",
            heroItalic: '"納品確認"まで。',
            heroBody:
              "Trendreは、インフルエンサーを検索し、依頼し、チャット・納品・支払いまで一元管理できるインフルエンサーマーケティングSaaSです。",
            searchButton: "検索",
            chip1: "注目Instagramインフルエンサー",
            chip2: "TikTokレビュー",
            chip3: "UGC制作",
            chip4: "美容・コスメ",
            chip5: "グルメ・店舗PR",
            chip6: "¥30,000以下",

            workflowTitle: "PR案件の流れを、ひとつの画面で。",
            workflowLead:
              "検索、依頼、承認、チャット、納品確認、支払いまで。案件進行に必要な操作をTrendre上で迷わず進められます。",

            illustrationTitle: "インフルエンサー選定を、もっと直感的に。",
            illustrationBody:
              "プロフィール、SNS、価格、メニュー内容を見ながら、ブランドに合う依頼先を比較できます。",
            illustrationMini1: "無料で検索",
            illustrationMini2: "表示価格で依頼",
            illustrationMini3: "納品まで管理",

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
              "職場の雰囲気や働き方を、インフルエンサーの自然な発信で届けられます。",

            finalLine1: "次のPR案件は、",
            finalAccent: "数分後",
            finalLine2: "に始められます。",
            finalBody:
              "まずは検索から。商品や店舗に合うインフルエンサーを見つけて、Trendre上で依頼・納品確認まで進めましょう。",
            finalPrimary: "インフルエンサーを探す",
            finalSecondary: "無料で企業登録",
            finalMini1: "無料で検索",
            finalMini2: "表示価格で依頼",
            finalMini3: "納品・支払いまで管理",

            creatorFallback: "Influencer",
            fallbackCreator1Name: "なつみ",
            fallbackCreator2Name: "yuto",
            fallbackCreator3Name: "emi",
            fallbackCreator4Name: "コウ",
            fallbackCreator1Tag: "店舗PRに強い",
            fallbackCreator2Tag: "自然なレビュー",
            fallbackCreator3Tag: "UGC・商品撮影",
            fallbackCreator4Tag: "レビュー動画",
          }
        : {
            heroLine1: "Run influencer PR",
            heroAccent: '"from search"',
            heroLine2: " to",
            heroItalic: '"final delivery."',
            heroBody:
              "Trendre helps brands search influencers, order with visible pricing, and manage chat, delivery, and payment in one influencer marketing platform.",
            searchButton: "Search",
            chip1: "Rising Instagram influencers",
            chip2: "TikTok reviews",
            chip3: "UGC creation",
            chip4: "Beauty",
            chip5: "Food and store PR",
            chip6: "Under ¥30,000",

            workflowTitle: "Everything in one workflow.",
            workflowLead:
              "Search, request, approval, chat, delivery review, and payment management all happen inside Trendre.",

            illustrationTitle: "Influencer selection, made visual.",
            illustrationBody:
              "Compare influencer profiles, social accounts, pricing, and menu details before you order.",
            illustrationMini1: "Free search",
            illustrationMini2: "Visible pricing",
            illustrationMini3: "Delivery tracking",

            toolsTitle: "Replace DMs, spreadsheets, and payment tracking.",
            toolsBody:
              "Trendre keeps influencer discovery, ordering, messaging, delivery review, and payout management in one place.",
            toolsCta: "Search influencers",

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
              "Show workplace culture and hiring stories through natural influencer content.",

            finalLine1: "Your next influencer campaign is ",
            finalAccent: "minutes",
            finalLine2: " away.",
            finalBody:
              "Start with search. Find influencers that fit your product and manage the request through delivery inside Trendre.",
            finalPrimary: "Search influencers",
            finalSecondary: "Join as a brand",
            finalMini1: "Free to search",
            finalMini2: "Visible pricing",
            finalMini3: "Delivery and payment tracking",

            creatorFallback: "Influencer",
            fallbackCreator1Name: "Natsumi",
            fallbackCreator2Name: "Yuto",
            fallbackCreator3Name: "Emi",
            fallbackCreator4Name: "Kou",
            fallbackCreator1Tag: "Store PR",
            fallbackCreator2Tag: "Natural review",
            fallbackCreator3Tag: "UGC / product photo",
            fallbackCreator4Tag: "Review video",
          },
    [safeLocale]
  );

  const searchSuggestions = useMemo(
    () =>
      safeLocale === "ja"
        ? ["スキンケア", "グルメ", "メンズファッション", "フィットネス", "転職", "インテリア"]
        : ["skincare", "food", "men's fashion", "fitness", "career change", "interior"],
    [safeLocale]
  );

  const workflowSteps = useMemo<WorkflowStep[]>(
    () =>
      safeLocale === "ja"
        ? [
            {
              number: "01",
              title: "探す",
              eyebrow: "Influencer Search",
              headline: "エリア・価格・SNSで絞り込み、ブランドに合うインフルエンサーを探す。",
              body:
                "Instagram、TikTok、YouTubeなどのSNS種別に加え、体験可能なエリア、価格帯、カテゴリで絞り込み。表示価格を見ながら候補を比較できます。",
              bullets: ["体験可能なエリアで絞り込み", "価格帯を見ながら比較", "SNS・カテゴリ別に検索"],
              metricLabel: "最初のアクション",
              metricValue: "検索から開始",
              previewTitle: "インフルエンサー検索",
              previewBadge: "Search",
              previewRows: ["エリア・価格で絞り込み", "SNS別に比較", "表示価格を確認"],
              previewCta: "候補を見る",
            },
            {
              number: "02",
              title: "依頼",
              eyebrow: "Direct Request",
              headline: "依頼内容・条件・希望納期を整理して、そのまま発注する。",
              body:
                "商品情報、投稿条件、PR表記、参考素材、希望納期を入力。インフルエンサーに伝えるべき条件を整理した状態で依頼できます。",
              bullets: ["依頼条件を整理", "参考素材を添付", "表示価格でスムーズに発注"],
              metricLabel: "依頼形式",
              metricValue: "フォームで完結",
              previewTitle: "依頼内容作成",
              previewBadge: "Brief",
              previewRows: ["商品名・URLを入力", "投稿条件を指定", "参考画像を追加"],
              previewCta: "依頼する",
            },
            {
              number: "03",
              title: "承認",
              eyebrow: "72h Approval",
              headline: "72時間以内の承認ルールで、待ちっぱなしを防ぐ。",
              body:
                "インフルエンサーが依頼を受ける場合は72時間以内に承認。注文後72時間レスポンスがない場合は自動キャンセルされるため、安心して次の判断へ進めます。",
              bullets: ["72時間以内に承認可否を確認", "無応答は自動キャンセル", "案件停滞を防ぐ安心設計"],
              metricLabel: "承認期限",
              metricValue: "72時間",
              previewTitle: "承認ステータス",
              previewBadge: "Pending",
              previewRows: ["承認待ち", "期限まで残り時間を表示", "無応答時は自動キャンセル"],
              previewCta: "状況確認",
            },
            {
              number: "04",
              title: "チャット",
              eyebrow: "Project Chat",
              headline: "事前に不明点や条件をすり合わせて、認識ズレを減らす。",
              body:
                "来店日時、撮影条件、投稿内容、配送先など、事前に確認したいことを案件内チャットでやり取りできます。条件の認識ズレを防ぎます。",
              bullets: ["不明点を事前確認", "条件のすり合わせが可能", "案件ごとに履歴を残せる"],
              metricLabel: "連絡手段",
              metricValue: "案件内チャット",
              previewTitle: "Trendre内チャット",
              previewBadge: "Chat",
              previewRows: ["配送先を共有", "投稿条件を確認", "不明点を相談"],
              previewCta: "返信する",
            },
            {
              number: "05",
              title: "納品",
              eyebrow: "Delivery Review",
              headline: "納品物をワンクリックで確認し、必要なら修正依頼。",
              body:
                "インフルエンサーから届いた投稿URLや納品URLをすぐ確認できます。条件に満たない箇所がある場合は、そのまま修正依頼を送れます。",
              bullets: ["納品URLをすぐ確認", "条件違いは修正依頼", "確認から完了承認まで一画面"],
              metricLabel: "確認導線",
              metricValue: "URLを即確認",
              previewTitle: "納品確認",
              previewBadge: "Delivered",
              previewRows: ["納品URLが届く", "内容を確認", "承認または修正依頼"],
              previewCta: "URLを開く",
            },
            {
              number: "06",
              title: "支払い",
              eyebrow: "Secure Payment",
              headline: "Stripeで安全に決済し、確認後の報酬支払いまで管理。",
              body:
                "決済にはStripeを導入。企業の決済はインフルエンサー承認後に確定し、納品確認・修正依頼・完了承認の流れを経て報酬支払いへ進みます。",
              bullets: ["Stripe導入の安全な決済", "承認後に決済確定", "完了承認後に報酬支払いへ"],
              metricLabel: "支払い管理",
              metricValue: "Trendreが管理",
              previewTitle: "支払い情報",
              previewBadge: "Paid",
              previewRows: ["支払い合計を表示", "手数料を確認", "報酬送金を管理"],
              previewCta: "明細を見る",
            },
          ]
        : [
            {
              number: "01",
              title: "Search",
              eyebrow: "Influencer Search",
              headline: "Find influencers by area, price, SNS, and category.",
              body:
                "Filter by social platform, available area, price range, and category so your team can compare influencers with visible pricing before sending a request.",
              bullets: ["Filter by area and price", "Compare by SNS and category", "Review visible pricing"],
              metricLabel: "First action",
              metricValue: "Start with search",
              previewTitle: "Influencer Search",
              previewBadge: "Search",
              previewRows: ["Filter by area and price", "Compare platforms", "Check visible pricing"],
              previewCta: "View matches",
            },
            {
              number: "02",
              title: "Request",
              eyebrow: "Direct Request",
              headline: "Send a clear request with requirements, assets, and deadline.",
              body:
                "Organize product details, posting requirements, PR notes, reference assets, and desired timing before sending the order.",
              bullets: ["Organize requirements", "Attach reference assets", "Order with visible pricing"],
              metricLabel: "Request type",
              metricValue: "Form based",
              previewTitle: "Campaign Brief",
              previewBadge: "Brief",
              previewRows: ["Add product URL", "Set posting notes", "Attach references"],
              previewCta: "Request",
            },
            {
              number: "03",
              title: "Approval",
              eyebrow: "72h Approval",
              headline: "Prevent stalled campaigns with a 72-hour approval window.",
              body:
                "Influencers accept within 72 hours when they take a request. If there is no response, the order is automatically canceled for safer campaign operations.",
              bullets: ["72-hour response window", "Auto-cancel when unanswered", "Avoid stalled projects"],
              metricLabel: "Approval window",
              metricValue: "72 hours",
              previewTitle: "Approval Status",
              previewBadge: "Pending",
              previewRows: ["Waiting for approval", "Deadline visible", "Auto-cancel if unanswered"],
              previewCta: "Check",
            },
            {
              number: "04",
              title: "Chat",
              eyebrow: "Project Chat",
              headline: "Clarify questions and align conditions before work begins.",
              body:
                "Use order-based chat to confirm visit timing, posting requirements, shipping details, and any unclear campaign conditions.",
              bullets: ["Ask questions in advance", "Align campaign conditions", "Keep history per order"],
              metricLabel: "Communication",
              metricValue: "In-order chat",
              previewTitle: "Trendre Chat",
              previewBadge: "Chat",
              previewRows: ["Share shipping details", "Confirm post notes", "Ask questions"],
              previewCta: "Reply",
            },
            {
              number: "05",
              title: "Delivery",
              eyebrow: "Delivery Review",
              headline: "Review delivered URLs in one click and request revisions.",
              body:
                "Open the delivered URL from the order screen. If the content does not meet the brief, send a revision request before completion.",
              bullets: ["Open delivery URL", "Request revisions", "Approve after review"],
              metricLabel: "Review path",
              metricValue: "Open URL",
              previewTitle: "Delivery Review",
              previewBadge: "Delivered",
              previewRows: ["Delivery URL received", "Review content", "Approve or revise"],
              previewCta: "Open URL",
            },
            {
              number: "06",
              title: "Payment",
              eyebrow: "Secure Payment",
              headline: "Secure payments with Stripe and manage payouts after approval.",
              body:
                "Trendre uses Stripe for payment infrastructure. Brand payment is confirmed after influencer approval, then payout flow proceeds after delivery review and completion.",
              bullets: ["Stripe payment infrastructure", "Confirmed after approval", "Payout after completion"],
              metricLabel: "Payment",
              metricValue: "Managed by Trendre",
              previewTitle: "Payment Details",
              previewBadge: "Paid",
              previewRows: ["View total", "Check fees", "Manage payout"],
              previewCta: "Details",
            },
          ],
    [safeLocale]
  );

  const [creators, setCreators] = useState<CreatorPreview[]>(() =>
    fallbackCreators(copy)
  );

  useEffect(() => {
    setCreators(fallbackCreators(copy));
  }, [copy]);

  useEffect(() => {
    let isMounted = true;

    const loadCreators = async () => {
      try {
        const payoutResult = await supabase.rpc("get_payout_ready_creator_ids");

        if (payoutResult.error) {
          console.error("home creator ids load error", payoutResult.error);
          return;
        }

        const payoutReadyCreatorIds = Array.from(
          new Set(
            ((payoutResult.data ?? []) as { creator_id: string | null }[])
              .map((row) => row.creator_id)
              .filter((id): id is string => Boolean(id))
          )
        );

        if (payoutReadyCreatorIds.length === 0) return;

        const creatorsResult = await supabase
          .from("creators")
          .select(
            `
            id,
            display_name,
            avatar_url,
            category,
            prefecture,
            rating,
            total_orders,
            creator_social_accounts (
              platform,
              url,
              handle,
              follower_range,
              audience_country
            )
          `
          )
          .eq("approval_status", "approved")
          .eq("is_public", true)
          .in("id", payoutReadyCreatorIds)
          .order("created_at", { ascending: false })
          .limit(8);

        if (creatorsResult.error) {
          console.error("home creators load error", creatorsResult.error);
          return;
        }

        const creatorRows = (creatorsResult.data ?? []) as CreatorRow[];
        const creatorIds = creatorRows.map((row) => row.id);

        if (creatorIds.length === 0) return;

        const [menusResult, portfolioResult] = await Promise.all([
          supabase
            .from("creator_menus")
            .select("id, creator_id, title, price, currency, is_active")
            .in("creator_id", creatorIds)
            .eq("is_active", true),

          supabase
            .from("creator_portfolio_assets")
            .select(
              "id, creator_id, asset_url, asset_type, sort_order, is_public, created_at"
            )
            .in("creator_id", creatorIds)
            .eq("is_public", true)
            .eq("asset_type", "image")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        ]);

        const menuRows = menusResult.error
          ? []
          : ((menusResult.data ?? []) as MenuRow[]);

        const portfolioRows = portfolioResult.error
          ? []
          : ((portfolioResult.data ?? []) as PortfolioAssetRow[]);

        const menuMap = new Map<string, MenuRow[]>();
        for (const menu of menuRows) {
          if (!menu.creator_id) continue;
          const list = menuMap.get(menu.creator_id) ?? [];
          list.push(menu);
          menuMap.set(menu.creator_id, list);
        }

        const portfolioMap = new Map<string, PortfolioAssetRow[]>();
        for (const asset of portfolioRows) {
          if (!asset.creator_id) continue;
          const list = portfolioMap.get(asset.creator_id) ?? [];
          list.push(asset);
          portfolioMap.set(asset.creator_id, list);
        }

        const nextCreators = creatorRows
          .map((row, index): CreatorPreview | null => {
            const creatorMenus = menuMap.get(row.id) ?? [];

            if (creatorMenus.length === 0) return null;

            const socials = Array.isArray(row.creator_social_accounts)
              ? row.creator_social_accounts
              : row.creator_social_accounts
                ? [row.creator_social_accounts]
                : [];

            const platforms = Array.from(
              new Set(
                socials
                  .map((social) => social.platform?.trim())
                  .filter((value): value is string => Boolean(value))
              )
            );

            const pricedMenus = creatorMenus
              .filter((menu) => typeof menu.price === "number")
              .sort((a, b) => Number(a.price) - Number(b.price));

            const startingMenu = pricedMenus[0] ?? creatorMenus[0] ?? null;
            const portfolio = portfolioMap.get(row.id) ?? [];
            const firstPortfolioImage = portfolio[0]?.asset_url?.trim() || null;
            const primary = socials[0] ?? null;
            const primaryName = getSocialAccountName(primary);

            return {
              id: row.id,
              displayName:
                row.display_name?.trim() ||
                primaryName ||
                copy.creatorFallback,
              category: row.category?.trim() || "Influencer",
              prefecture: row.prefecture?.trim() || "地域未設定",
              imageUrl: firstPortfolioImage,
              avatarUrl: row.avatar_url?.trim() || null,
              platforms: platforms.length > 0 ? platforms : ["Instagram"],
              followerRange: primary?.follower_range?.trim() || null,
              startingPrice:
                typeof startingMenu?.price === "number"
                  ? Number(startingMenu.price)
                  : null,
              startingCurrency: startingMenu?.currency ?? "JPY",
              menuCount: creatorMenus.length,
              tag: startingMenu?.title?.trim() || row.category?.trim() || "PR / UGC",
              gradient: CARD_GRADIENTS[index % CARD_GRADIENTS.length],
            };
          })
          .filter((creator): creator is CreatorPreview => Boolean(creator))
          .slice(0, 4);

        if (nextCreators.length > 0 && isMounted) {
          setCreators(nextCreators);
        }
      } catch (error) {
        console.error("home creators load error", error);
      }
    };

    void loadCreators();

    return () => {
      isMounted = false;
    };
  }, [copy.creatorFallback]);

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
        <HeroSection
          copy={copy}
          creators={creators}
          suggestions={searchSuggestions}
        />
        <TrendMarqueeSection />
        <WorkflowSection copy={copy} steps={workflowSteps} />
        <IllustrationSection copy={copy} />
        <ToolsSection copy={copy} />
        <UseCaseSection copy={copy} useCases={useCases} />
        <FinalCta copy={copy} />
      </main>

      <PublicFooter />
    </div>
  );
}