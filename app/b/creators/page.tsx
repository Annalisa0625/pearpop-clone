// app/b/creators/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";

type FilterMenu = "platform" | "category" | "location" | "contentType" | "followers" | null;

type SocialAccountRow = {
  platform?: string | null;
  url?: string | null;
  follower_range?: string | null;
  audience_country?: string | null;
};

type CreatorRow = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  category?: string | null;
  stripe_onboarding_completed?: boolean | null;
  creator_social_accounts?: SocialAccountRow[] | null;
};

type MenuRow = {
  id: string;
  creator_id: string | null;
  title: string | null;
  price: number | null;
  currency: string | null;
  is_active: boolean | null;
};

type SavedCreatorRow = {
  creator_id: string;
};

type CreatorCard = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  category: string | null;
  platforms: string[];
  primaryPlatform: string | null;
  primaryAudienceCountry: string | null;
  followerRange: string | null;
  menuCount: number;
  startingPrice: number | null;
  startingCurrency: string | null;
  topMenuTitle: string | null;
};

const POPULAR_CATEGORIES = [
  "Lifestyle",
  "Beauty",
  "Fashion",
  "Travel",
  "Health & Fitness",
  "Family & Children",
  "Food & Drink",
  "Comedy & Entertainment",
  "Animals & Pets",
  "Music & Dance",
  "Art & Photography",
  "Model",
  "Adventure & Outdoors",
  "Education",
  "Entrepreneur & Business",
  "Athlete & Sports",
  "Technology",
  "Gaming",
  "Healthcare",
];

const CONTENT_TYPE_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "ugc", label: "UGC" },
  { value: "post", label: "Post" },
  { value: "video", label: "Video" },
  { value: "short_video", label: "Short video" },
];

const FOLLOWER_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "nano", label: "Nano" },
  { value: "micro", label: "Micro" },
  { value: "mid", label: "Mid-tier" },
  { value: "macro", label: "Macro" },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function cleanCountryInput(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  const normalized = raw
    .toLowerCase()
    .replace(/\u3000/g, " ")
    .replace(/[_\-/:|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const compact = normalized.replace(/\s+/g, "");

  if (
    normalized === "日本" ||
    normalized === "japan" ||
    normalized === "jp" ||
    normalized === "jpn" ||
    normalized.startsWith("jp ") ||
    compact === "jp日本" ||
    compact === "japan日本" ||
    compact.includes("日本")
  ) {
    return "japan";
  }

  if (
    normalized === "韓国" ||
    normalized === "korea" ||
    normalized === "south korea" ||
    normalized === "republic of korea" ||
    normalized === "kr" ||
    normalized.startsWith("kr ") ||
    compact === "kr韓国" ||
    compact.includes("韓国")
  ) {
    return "korea";
  }

  if (
    normalized === "台湾" ||
    normalized === "taiwan" ||
    normalized === "tw" ||
    normalized.startsWith("tw ") ||
    compact === "tw台湾" ||
    compact.includes("台湾")
  ) {
    return "taiwan";
  }

  if (
    normalized === "香港" ||
    normalized === "hong kong" ||
    normalized === "hk" ||
    normalized.startsWith("hk ") ||
    compact === "hk香港" ||
    compact.includes("香港")
  ) {
    return "hong_kong";
  }

  if (
    normalized === "中国" ||
    normalized === "china" ||
    normalized === "cn" ||
    normalized.startsWith("cn ") ||
    compact === "cn中国" ||
    compact.includes("中国")
  ) {
    return "china";
  }

  if (
    normalized === "タイ" ||
    normalized === "thailand" ||
    normalized === "th" ||
    normalized.startsWith("th ") ||
    compact === "thタイ" ||
    compact.includes("タイ")
  ) {
    return "thailand";
  }

  if (
    normalized === "ベトナム" ||
    normalized === "vietnam" ||
    normalized === "vn" ||
    normalized.startsWith("vn ") ||
    compact === "vnベトナム" ||
    compact.includes("ベトナム")
  ) {
    return "vietnam";
  }

  if (
    normalized === "インドネシア" ||
    normalized === "indonesia" ||
    normalized === "id" ||
    normalized.startsWith("id ") ||
    compact.includes("インドネシア")
  ) {
    return "indonesia";
  }

  if (
    normalized === "フィリピン" ||
    normalized === "philippines" ||
    normalized === "ph" ||
    normalized.startsWith("ph ") ||
    compact.includes("フィリピン")
  ) {
    return "philippines";
  }

  if (
    normalized === "マレーシア" ||
    normalized === "malaysia" ||
    normalized === "my" ||
    normalized.startsWith("my ") ||
    compact.includes("マレーシア")
  ) {
    return "malaysia";
  }

  if (
    normalized === "シンガポール" ||
    normalized === "singapore" ||
    normalized === "sg" ||
    normalized.startsWith("sg ") ||
    compact.includes("シンガポール")
  ) {
    return "singapore";
  }

  if (
    normalized === "インド" ||
    normalized === "india" ||
    normalized === "in" ||
    normalized.startsWith("in ") ||
    compact.includes("インド")
  ) {
    return "india";
  }

  if (
    normalized === "アメリカ" ||
    normalized === "united states" ||
    normalized === "usa" ||
    normalized === "us" ||
    normalized.startsWith("us ") ||
    compact.includes("アメリカ")
  ) {
    return "united_states";
  }

  if (
    normalized === "カナダ" ||
    normalized === "canada" ||
    normalized === "ca" ||
    normalized.startsWith("ca ") ||
    compact.includes("カナダ")
  ) {
    return "canada";
  }

  if (
    normalized === "イギリス" ||
    normalized === "united kingdom" ||
    normalized === "uk" ||
    normalized === "gb" ||
    normalized.startsWith("uk ") ||
    compact.includes("イギリス")
  ) {
    return "united_kingdom";
  }

  if (
    normalized === "フランス" ||
    normalized === "france" ||
    normalized === "fr" ||
    normalized.startsWith("fr ") ||
    compact.includes("フランス")
  ) {
    return "france";
  }

  if (
    normalized === "ドイツ" ||
    normalized === "germany" ||
    normalized === "de" ||
    normalized.startsWith("de ") ||
    compact.includes("ドイツ")
  ) {
    return "germany";
  }

  if (
    normalized === "その他" ||
    normalized === "other" ||
    compact.includes("その他")
  ) {
    return "other";
  }

  return raw;
}

function getCountryLabel(
  country: string | null | undefined,
  locale: "ja" | "en"
) {
  const cleaned = cleanCountryInput(country);

  const jaMap: Record<string, string> = {
    japan: "日本",
    korea: "韓国",
    taiwan: "台湾",
    hong_kong: "香港",
    china: "中国",
    thailand: "タイ",
    vietnam: "ベトナム",
    indonesia: "インドネシア",
    philippines: "フィリピン",
    malaysia: "マレーシア",
    singapore: "シンガポール",
    india: "インド",
    united_states: "アメリカ",
    canada: "カナダ",
    united_kingdom: "イギリス",
    france: "フランス",
    germany: "ドイツ",
    other: "その他",
  };

  const enMap: Record<string, string> = {
    japan: "Japan",
    korea: "Korea",
    taiwan: "Taiwan",
    hong_kong: "Hong Kong",
    china: "China",
    thailand: "Thailand",
    vietnam: "Vietnam",
    indonesia: "Indonesia",
    philippines: "Philippines",
    malaysia: "Malaysia",
    singapore: "Singapore",
    india: "India",
    united_states: "United States",
    canada: "Canada",
    united_kingdom: "United Kingdom",
    france: "France",
    germany: "Germany",
    other: "Other",
  };

  return locale === "ja"
    ? jaMap[cleaned] ?? ((country ?? "").trim() || "不明")
    : enMap[cleaned] ?? ((country ?? "").trim() || "Unknown");
}

function formatPrice(
  value: number | null,
  currency: string | null | undefined
) {
  if (value == null) return "価格未設定";

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    if (safeCurrency === "USD") return `$${value.toLocaleString()}`;
    return `¥${value.toLocaleString()}`;
  }
}

function formatStartingPrice(
  value: number | null,
  currency: string | null | undefined
) {
  if (value == null) return "-";
  return `${formatPrice(value, currency)}〜`;
}

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getPlatformLabel(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (!normalized || normalized === "all") return "Any";
  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("tiktok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized === "x" || normalized.includes("twitter")) return "X";
  if (normalized.includes("ugc")) return "UGC";

  return value?.trim() || "SNS";
}

function getPlatformShortLabel(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("tiktok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized === "x" || normalized.includes("twitter")) return "X";
  if (normalized.includes("ugc")) return "UGC";

  return value?.trim() || "SNS";
}

function getPlatformIcon(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (normalized.includes("instagram")) return "◎";
  if (normalized.includes("tiktok")) return "♪";
  if (normalized.includes("youtube")) return "▶";
  if (normalized === "x" || normalized.includes("twitter")) return "𝕏";
  if (normalized.includes("ugc")) return "▣";

  return "●";
}

function formatFollowerLabel(
  platform: string | null | undefined,
  followerRange: string | null | undefined
) {
  const range = followerRange?.trim();
  if (!range) return null;

  return `${getPlatformShortLabel(platform)}・${range}`;
}

function getCreatorInitial(name: string) {
  return (name || "C").trim().slice(0, 1).toUpperCase();
}

function getFollowerBucket(value: string | null | undefined) {
  const text = normalizeText(value);

  if (!text) return "unknown";

  if (
    text.includes("1k") ||
    text.includes("3k") ||
    text.includes("5k") ||
    text.includes("10k") ||
    text.includes("1,000") ||
    text.includes("5,000") ||
    text.includes("10,000") ||
    text.includes("nano")
  ) {
    return "nano";
  }

  if (
    text.includes("50k") ||
    text.includes("100k") ||
    text.includes("50,000") ||
    text.includes("100,000") ||
    text.includes("micro")
  ) {
    return "micro";
  }

  if (
    text.includes("500k") ||
    text.includes("500,000") ||
    text.includes("mid")
  ) {
    return "mid";
  }

  if (
    text.includes("1m") ||
    text.includes("1,000,000") ||
    text.includes("million") ||
    text.includes("macro")
  ) {
    return "macro";
  }

  return "unknown";
}

function getContentTypeMatch(creator: CreatorCard, filter: string) {
  if (filter === "all") return true;

  const haystack = [
    creator.category,
    creator.topMenuTitle,
    ...creator.platforms,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (filter === "ugc") {
    return haystack.includes("ugc") || haystack.includes("ユーザー生成");
  }

  if (filter === "post") {
    return (
      haystack.includes("post") ||
      haystack.includes("投稿") ||
      haystack.includes("instagram")
    );
  }

  if (filter === "video") {
    return (
      haystack.includes("video") ||
      haystack.includes("動画") ||
      haystack.includes("youtube")
    );
  }

  if (filter === "short_video") {
    return (
      haystack.includes("short") ||
      haystack.includes("reel") ||
      haystack.includes("tiktok") ||
      haystack.includes("ショート")
    );
  }

  return true;
}

function toNumberOrNull(value: string) {
  const cleaned = value.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10.8 18.1a7.3 7.3 0 1 1 0-14.6 7.3 7.3 0 0 1 0 14.6Z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="m16.4 16.4 4.1 4.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5 10 12l5-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path
        d="M20.8 5.7c-1.9-2.2-5.1-2-6.9.1L12 8l-1.9-2.2c-1.8-2.1-5-2.3-6.9-.1-2.1 2.4-1.7 6 .7 8.1l6.8 6a2 2 0 0 0 2.6 0l6.8-6c2.4-2.1 2.8-5.7.7-8.1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CreatorImage({
  creator,
  index,
}: {
  creator: CreatorCard;
  index: number;
}) {
  const gradients = [
    "from-rose-200 via-orange-100 to-yellow-200",
    "from-slate-800 via-slate-600 to-slate-300",
    "from-blue-200 via-indigo-100 to-purple-200",
    "from-emerald-200 via-teal-100 to-cyan-200",
  ];

  if (creator.avatarUrl) {
    return (
      <img
        src={creator.avatarUrl}
        alt={creator.displayName}
        className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${
        gradients[index % gradients.length]
      }`}
    >
      <div className="text-center">
        <span className="block text-6xl font-black text-white drop-shadow-sm">
          {getCreatorInitial(creator.displayName)}
        </span>
        <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.3em] text-white/75">
          Trendre
        </span>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  value,
  active,
  disabled,
  premium,
  onClick,
}: {
  label: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
  premium?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`relative inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition duration-150 ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : disabled
          ? "cursor-not-allowed border-slate-200 bg-white text-slate-300"
          : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {premium ? (
        <span className="absolute -top-3 right-3 rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-bold leading-none text-white">
          Premium
        </span>
      ) : null}
      <span>{label}</span>
      {value ? <span className="text-slate-400">{value}</span> : null}
      <ChevronDownIcon />
    </button>
  );
}

function OptionDropdown({
  widthClass = "w-72",
  children,
}: {
  widthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute left-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[28px] border border-slate-100 bg-white p-2 shadow-[rgba(0,0,0,0.14)_0_24px_60px_-24px] ${widthClass}`}
    >
      {children}
    </div>
  );
}

function PlainOption({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
        active
          ? "bg-slate-100 text-slate-950"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function PriceModal({
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  onClose,
  onSave,
  copy,
}: {
  minPrice: string;
  maxPrice: string;
  setMinPrice: (value: string) => void;
  setMaxPrice: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  copy: {
    price: string;
    minPrice: string;
    maxPrice: string;
    save: string;
    clear: string;
  };
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-xl rounded-[32px] bg-white p-6 shadow-2xl transition duration-300 md:p-8">
        <div className="mb-10 flex items-center justify-between">
          <div className="w-10" />
          <h2 className="text-xl font-black text-slate-950">{copy.price}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-800 transition hover:bg-slate-100"
            aria-label="Close price filter"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              {copy.minPrice}
            </span>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              inputMode="numeric"
              placeholder="¥50"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-4 text-2xl font-black outline-none transition focus:border-slate-900"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              {copy.maxPrice}
            </span>
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              inputMode="numeric"
              placeholder="¥300,000+"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-4 text-2xl font-black outline-none transition focus:border-slate-900"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            ["", ""],
            ["0", "50000"],
            ["50000", "150000"],
            ["150000", "300000"],
            ["300000", ""],
          ].map(([min, max]) => (
            <button
              key={`${min}-${max}`}
              type="button"
              onClick={() => {
                setMinPrice(min);
                setMaxPrice(max);
              }}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
            >
              {!min && !max
                ? copy.clear
                : `${min ? `¥${Number(min).toLocaleString()}` : "¥0"} - ${
                    max ? `¥${Number(max).toLocaleString()}` : "¥300,000+"
                  }`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onSave}
          className="mt-10 w-full rounded-2xl bg-slate-950 px-6 py-4 text-base font-black text-white transition duration-150 hover:-translate-y-0.5 hover:shadow-xl"
        >
          {copy.save}
        </button>
      </div>
    </div>
  );
}

function CreatorCardItem({
  creator,
  index,
  isSaved,
  isSaving,
  safeLocale,
  copy,
  onToggleSave,
}: {
  creator: CreatorCard;
  index: number;
  isSaved: boolean;
  isSaving: boolean;
  safeLocale: "ja" | "en";
  copy: {
    noSns: string;
    trusted: string;
    topCreator: string;
    menu: string;
    menus: string;
    priceFrom: string;
    noLocation: string;
  };
  onToggleSave: (creatorId: string) => void;
}) {
  const followerLabel = formatFollowerLabel(
    creator.primaryPlatform,
    creator.followerRange
  );

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-[18px] bg-slate-100 shadow-sm transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[rgba(0,0,0,0.16)_0_18px_40px_-22px]">
        <Link href={`/b/creators/${creator.id}`} className="block">
          <div className="relative aspect-[1.08/1] overflow-hidden">
            <CreatorImage creator={creator} index={index} />

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-black/70 px-2 py-1 text-xs font-black text-white backdrop-blur">
                {index < 3 ? copy.topCreator : copy.trusted}
              </span>
            </div>

            <div className="absolute left-3 bottom-3 flex flex-wrap items-center gap-2">
              {creator.primaryPlatform ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-black text-slate-900 shadow-sm">
                  <span>{getPlatformIcon(creator.primaryPlatform)}</span>
                  <span>{getPlatformShortLabel(creator.primaryPlatform)}</span>
                </span>
              ) : null}

              {followerLabel ? (
                <span className="inline-flex items-center rounded-md bg-white/95 px-2 py-1 text-xs font-black text-slate-900 shadow-sm">
                  {followerLabel}
                </span>
              ) : null}
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(creator.id);
          }}
          disabled={isSaving}
          className={`absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-white transition duration-150 hover:scale-105 disabled:opacity-60 ${
            isSaved ? "bg-pink-500" : "bg-black/25 backdrop-blur"
          }`}
          aria-label={isSaved ? "Remove saved creator" : "Save creator"}
        >
          <HeartIcon filled={isSaved} />
        </button>
      </div>

      <Link href={`/b/creators/${creator.id}`} className="mt-3 block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium leading-tight text-slate-900">
              {creator.category || creator.topMenuTitle || creator.displayName}
            </p>

            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-black text-slate-950">
                {creator.displayName}
              </span>
              <span className="text-sm text-yellow-500">★</span>
              <span className="text-sm font-semibold text-slate-800">5.0</span>
            </div>

            <p className="mt-1 truncate text-sm text-slate-400">
              {creator.primaryAudienceCountry
                ? getCountryLabel(creator.primaryAudienceCountry, safeLocale)
                : copy.noLocation}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-base font-black text-slate-950">
              {formatStartingPrice(
                creator.startingPrice,
                creator.startingCurrency
              )}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {creator.menuCount} {creator.menuCount === 1 ? copy.menu : copy.menus}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function CompanyCreatorsPage() {
  const router = useRouter();
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            fetchError: "クリエイター一覧の取得に失敗しました。",
            platform: "Platform",
            category: "Category",
            keywordPlaceholder: "キーワード、ニッチ、カテゴリで検索",
            any: "Any",
            creators: "Creators",
            countSuffix: "件のクリエイター",
            clearAll: "Clear All",
            clear: "Clear",
            clearKeyword: "Clear keyword",
            noCreatorsTitle: "表示できるクリエイターがいません",
            noCreatorsBody:
              "検索条件を変更するか、報酬受け取り設定が完了したクリエイターの追加をお待ちください。",
            creatorFallback: "Creator",
            noSns: "SNS未設定",
            trusted: "Trusted",
            topCreator: "Top Creator",
            contentType: "Content Type",
            followers: "Followers",
            location: "Location",
            price: "Price",
            gender: "Gender",
            age: "Age",
            ethnicity: "Ethnicity",
            language: "Language",
            premiumOnly: "Premium",
            minPrice: "Min Price",
            maxPrice: "Max Price",
            save: "Save",
            popular: "Popular",
            allCategories: "All categories",
            allPlatforms: "All platforms",
            allLocations: "All locations",
            menu: "menu",
            menus: "menus",
            priceFrom: "from",
            noLocation: "Location not set",
            search: "Search",
          }
        : {
            loading: "Loading...",
            fetchError: "Failed to load creators.",
            platform: "Platform",
            category: "Category",
            keywordPlaceholder: "Enter keywords, niches or categories",
            any: "Any",
            creators: "Creators",
            countSuffix: "creators",
            clearAll: "Clear All",
            clear: "Clear",
            clearKeyword: "Clear keyword",
            noCreatorsTitle: "No creators found",
            noCreatorsBody:
              "Try changing your search filters or wait for more creators to complete payout setup.",
            creatorFallback: "Creator",
            noSns: "SNS not set",
            trusted: "Trusted",
            topCreator: "Top Creator",
            contentType: "Content Type",
            followers: "Followers",
            location: "Location",
            price: "Price",
            gender: "Gender",
            age: "Age",
            ethnicity: "Ethnicity",
            language: "Language",
            premiumOnly: "Premium",
            minPrice: "Min Price",
            maxPrice: "Max Price",
            save: "Save",
            popular: "Popular",
            allCategories: "All categories",
            allPlatforms: "All platforms",
            allLocations: "All locations",
            menu: "menu",
            menus: "menus",
            priceFrom: "from",
            noLocation: "Location not set",
            search: "Search",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [savedCreatorIds, setSavedCreatorIds] = useState<string[]>([]);
  const [savingCreatorId, setSavingCreatorId] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [followersFilter, setFollowersFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [openFilter, setOpenFilter] = useState<FilterMenu>(null);
  const [priceModalOpen, setPriceModalOpen] = useState(false);

  const platformOptions = useMemo(() => {
    const values = creators.flatMap((creator) => creator.platforms);
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [creators]);

  const categoryOptions = useMemo(() => {
    const values = creators
      .map((creator) => creator.category)
      .filter((value): value is string => !!value);

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [creators]);

  const locationOptions = useMemo(() => {
    const values = creators
      .map((creator) => creator.primaryAudienceCountry)
      .filter((value): value is string => !!value);

    return Array.from(new Set(values));
  }, [creators]);

  const minPriceNumber = useMemo(() => toNumberOrNull(minPrice), [minPrice]);
  const maxPriceNumber = useMemo(() => toNumberOrNull(maxPrice), [maxPrice]);

  const filteredCreators = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return creators.filter((creator) => {
      const matchesKeyword =
        !q ||
        creator.displayName.toLowerCase().includes(q) ||
        (creator.category ?? "").toLowerCase().includes(q) ||
        creator.platforms.some((platform) =>
          platform.toLowerCase().includes(q)
        ) ||
        (creator.topMenuTitle ?? "").toLowerCase().includes(q) ||
        getCountryLabel(creator.primaryAudienceCountry, safeLocale)
          .toLowerCase()
          .includes(q);

      const matchesPlatform =
        platformFilter === "all" ||
        creator.platforms.some(
          (platform) =>
            normalizePlatform(platform) === normalizePlatform(platformFilter)
        );

      const matchesCategory =
        categoryFilter === "all" ||
        normalizeText(creator.category) === normalizeText(categoryFilter);

      const matchesLocation =
        locationFilter === "all" ||
        cleanCountryInput(creator.primaryAudienceCountry) ===
          cleanCountryInput(locationFilter);

      const matchesFollowers =
        followersFilter === "all" ||
        getFollowerBucket(creator.followerRange) === followersFilter;

      const matchesContentType = getContentTypeMatch(
        creator,
        contentTypeFilter
      );

      const hasPriceFilter = minPriceNumber !== null || maxPriceNumber !== null;
      const matchesPrice =
        !hasPriceFilter ||
        (creator.startingPrice !== null &&
          (minPriceNumber === null || creator.startingPrice >= minPriceNumber) &&
          (maxPriceNumber === null || creator.startingPrice <= maxPriceNumber));

      return (
        matchesKeyword &&
        matchesPlatform &&
        matchesCategory &&
        matchesLocation &&
        matchesFollowers &&
        matchesContentType &&
        matchesPrice
      );
    });
  }, [
    creators,
    keyword,
    platformFilter,
    categoryFilter,
    locationFilter,
    followersFilter,
    contentTypeFilter,
    minPriceNumber,
    maxPriceNumber,
    safeLocale,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (keyword.trim()) count += 1;
    if (platformFilter !== "all") count += 1;
    if (categoryFilter !== "all") count += 1;
    if (locationFilter !== "all") count += 1;
    if (followersFilter !== "all") count += 1;
    if (contentTypeFilter !== "all") count += 1;
    if (minPriceNumber !== null || maxPriceNumber !== null) count += 1;
    return count;
  }, [
    keyword,
    platformFilter,
    categoryFilter,
    locationFilter,
    followersFilter,
    contentTypeFilter,
    minPriceNumber,
    maxPriceNumber,
  ]);

  const priceFilterLabel = useMemo(() => {
    if (minPriceNumber === null && maxPriceNumber === null) return "";
    if (minPriceNumber !== null && maxPriceNumber !== null) {
      return `¥${minPriceNumber.toLocaleString()} - ¥${maxPriceNumber.toLocaleString()}`;
    }
    if (minPriceNumber !== null) return `¥${minPriceNumber.toLocaleString()}+`;
    return `〜¥${maxPriceNumber?.toLocaleString()}`;
  }, [minPriceNumber, maxPriceNumber]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data: roleRow, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "company")
          .maybeSingle();

        if (roleError || !roleRow) {
          router.replace("/login");
          return;
        }

        const [creatorsResult, savedResult] = await Promise.all([
          supabase
            .from("creators")
            .select(
              `
              id,
              display_name,
              avatar_url,
              category,
              stripe_onboarding_completed,
              creator_social_accounts (
                platform,
                url,
                follower_range,
                audience_country
              )
              `
            )
            .eq("approval_status", "approved")
            .eq("is_public", true)
            .eq("stripe_onboarding_completed", true)
            .order("created_at", { ascending: false }),

          supabase
            .from("saved_creators")
            .select("creator_id")
            .eq("b_user_id", user.id),
        ]);

        if (creatorsResult.error || savedResult.error) {
          console.error({
            creatorsError: creatorsResult.error,
            savedError: savedResult.error,
          });
          if (isMounted) {
            setError(copy.fetchError);
          }
          return;
        }

        const rows = (creatorsResult.data ?? []) as CreatorRow[];
        const creatorIds = rows.map((row) => row.id);

        let menuRows: MenuRow[] = [];

        if (creatorIds.length > 0) {
          const { data: menusData, error: menusError } = await supabase
            .from("creator_menus")
            .select("id, creator_id, title, price, currency, is_active")
            .in("creator_id", creatorIds)
            .eq("is_active", true);

          if (menusError) {
            console.error("creator menus load error", menusError);
          } else {
            menuRows = (menusData ?? []) as MenuRow[];
          }
        }

        const menuMap = new Map<string, MenuRow[]>();

        for (const menu of menuRows) {
          if (!menu.creator_id) continue;

          const list = menuMap.get(menu.creator_id) ?? [];
          list.push(menu);
          menuMap.set(menu.creator_id, list);
        }

        const nextCreators: CreatorCard[] = rows
          .filter((row) => row.stripe_onboarding_completed === true)
          .map((row) => {
            const socials = Array.isArray(row.creator_social_accounts)
              ? row.creator_social_accounts
              : [];

            const primary = socials[0] ?? null;

            const platforms = Array.from(
              new Set(
                socials
                  .map((social) => social.platform?.trim())
                  .filter((value): value is string => !!value)
              )
            );

            const creatorMenus = menuMap.get(row.id) ?? [];
            const pricedMenus = creatorMenus
              .filter((menu) => typeof menu.price === "number")
              .sort((a, b) => Number(a.price) - Number(b.price));

            const startingMenu = pricedMenus[0] ?? creatorMenus[0] ?? null;

            return {
              id: row.id,
              displayName: row.display_name?.trim() || copy.creatorFallback,
              avatarUrl: row.avatar_url?.trim() || null,
              category: row.category?.trim() || null,
              platforms,
              primaryPlatform: platforms[0] || primary?.platform?.trim() || null,
              primaryAudienceCountry: primary?.audience_country?.trim() || null,
              followerRange: primary?.follower_range?.trim() || null,
              menuCount: creatorMenus.length,
              startingPrice:
                typeof startingMenu?.price === "number"
                  ? Number(startingMenu.price)
                  : null,
              startingCurrency: startingMenu?.currency ?? "JPY",
              topMenuTitle: startingMenu?.title ?? null,
            };
          });

        if (isMounted) {
          setCreators(nextCreators);
          setSavedCreatorIds(
            ((savedResult.data ?? []) as SavedCreatorRow[]).map(
              (row) => row.creator_id
            )
          );
        }
      } catch (e) {
        console.error(e);
        if (isMounted) {
          setError(copy.fetchError);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [router, copy.fetchError, copy.creatorFallback]);

  const resetFilters = () => {
    setKeyword("");
    setPlatformFilter("all");
    setCategoryFilter("all");
    setLocationFilter("all");
    setFollowersFilter("all");
    setContentTypeFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setOpenFilter(null);
    setPriceModalOpen(false);
  };

  const toggleSaveCreator = async (creatorId: string) => {
    if (savingCreatorId) return;

    setSavingCreatorId(creatorId);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const isSaved = savedCreatorIds.includes(creatorId);

      if (isSaved) {
        const { error: deleteError } = await supabase
          .from("saved_creators")
          .delete()
          .eq("b_user_id", user.id)
          .eq("creator_id", creatorId);

        if (deleteError) throw deleteError;

        setSavedCreatorIds((prev) => prev.filter((id) => id !== creatorId));
      } else {
        const { error: insertError } = await supabase
          .from("saved_creators")
          .insert({
            b_user_id: user.id,
            creator_id: creatorId,
          });

        if (insertError) throw insertError;

        setSavedCreatorIds((prev) =>
          prev.includes(creatorId) ? prev : [...prev, creatorId]
        );
      }
    } catch (e) {
      console.error("saved creator toggle error:", e);
    } finally {
      setSavingCreatorId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <section className="mx-auto max-w-5xl rounded-[32px] border border-slate-100 bg-white p-5 shadow-[rgba(120,120,170,0.15)_0_2px_16px_0]">
          <div className="grid gap-3 md:grid-cols-[220px_1fr_64px]">
            <div className="h-16 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-16 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-16 animate-pulse rounded-[24px] bg-slate-950/10" />
          </div>
        </section>

        <section>
          <div className="mb-7 h-8 w-40 animate-pulse rounded-xl bg-slate-100" />
          <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-[1.08/1] animate-pulse rounded-[18px] bg-slate-100" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-9 pb-10">
      <section className="mx-auto max-w-5xl rounded-[32px] border border-slate-100 bg-white p-3 shadow-[rgba(120,120,170,0.15)_0_2px_16px_0] md:p-4">
        <div className="grid gap-0 md:grid-cols-[220px_1fr_64px]">
          <div className="relative border-b border-slate-100 p-4 md:border-b-0 md:border-r">
            <button
              type="button"
              onClick={() =>
                setOpenFilter((prev) =>
                  prev === "platform" ? null : "platform"
                )
              }
              className="flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="block text-sm font-black text-slate-950">
                  {copy.platform}
                </span>
                <span className="mt-1 block text-base font-medium text-slate-900">
                  {platformFilter === "all"
                    ? copy.any
                    : getPlatformLabel(platformFilter)}
                </span>
              </span>
              <ChevronDownIcon />
            </button>

            {openFilter === "platform" ? (
              <OptionDropdown widthClass="w-[min(520px,calc(100vw-48px))]">
                <PlainOption
                  active={platformFilter === "all"}
                  onClick={() => {
                    setPlatformFilter("all");
                    setOpenFilter(null);
                  }}
                >
                  {copy.any}
                </PlainOption>

                {platformOptions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">
                    {copy.noSns}
                  </div>
                ) : (
                  platformOptions.map((platform) => (
                    <PlainOption
                      key={platform}
                      active={
                        normalizePlatform(platformFilter) ===
                        normalizePlatform(platform)
                      }
                      onClick={() => {
                        setPlatformFilter(platform);
                        setOpenFilter(null);
                      }}
                    >
                      <span className="mr-2">{getPlatformIcon(platform)}</span>
                      {getPlatformLabel(platform)}
                    </PlainOption>
                  ))
                )}
              </OptionDropdown>
            ) : null}
          </div>

          <div className="relative p-4">
            <label className="block text-sm font-black text-slate-950">
              {copy.category}
            </label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={copy.keywordPlaceholder}
              className="mt-1 w-full bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />

            {keyword ? (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-200 md:block"
              >
                {copy.clear}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpenFilter(null);
              setPriceModalOpen(false);
            }}
            className="flex min-h-[62px] items-center justify-center rounded-[22px] bg-slate-950 text-white transition duration-150 hover:-translate-y-0.5 hover:shadow-xl md:min-h-full"
            aria-label={copy.search}
          >
            <SearchIcon />
          </button>
        </div>
      </section>

      <section className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2">
          <div className="relative shrink-0">
            <FilterChip
              label={copy.contentType}
              value={
                contentTypeFilter === "all"
                  ? ""
                  : CONTENT_TYPE_OPTIONS.find(
                      (item) => item.value === contentTypeFilter
                    )?.label
              }
              active={contentTypeFilter !== "all"}
              onClick={() =>
                setOpenFilter((prev) =>
                  prev === "contentType" ? null : "contentType"
                )
              }
            />

            {openFilter === "contentType" ? (
              <OptionDropdown>
                {CONTENT_TYPE_OPTIONS.map((item) => (
                  <PlainOption
                    key={item.value}
                    active={contentTypeFilter === item.value}
                    onClick={() => {
                      setContentTypeFilter(item.value);
                      setOpenFilter(null);
                    }}
                  >
                    {item.label}
                  </PlainOption>
                ))}
              </OptionDropdown>
            ) : null}
          </div>

          <div className="relative shrink-0">
            <FilterChip
              label={copy.followers}
              value={
                followersFilter === "all"
                  ? ""
                  : FOLLOWER_OPTIONS.find(
                      (item) => item.value === followersFilter
                    )?.label
              }
              active={followersFilter !== "all"}
              onClick={() =>
                setOpenFilter((prev) =>
                  prev === "followers" ? null : "followers"
                )
              }
            />

            {openFilter === "followers" ? (
              <OptionDropdown>
                {FOLLOWER_OPTIONS.map((item) => (
                  <PlainOption
                    key={item.value}
                    active={followersFilter === item.value}
                    onClick={() => {
                      setFollowersFilter(item.value);
                      setOpenFilter(null);
                    }}
                  >
                    {item.label}
                  </PlainOption>
                ))}
              </OptionDropdown>
            ) : null}
          </div>

          <div className="relative shrink-0">
            <FilterChip
              label={copy.location}
              value={
                locationFilter === "all"
                  ? ""
                  : getCountryLabel(locationFilter, safeLocale)
              }
              active={locationFilter !== "all"}
              onClick={() =>
                setOpenFilter((prev) =>
                  prev === "location" ? null : "location"
                )
              }
            />

            {openFilter === "location" ? (
              <OptionDropdown>
                <PlainOption
                  active={locationFilter === "all"}
                  onClick={() => {
                    setLocationFilter("all");
                    setOpenFilter(null);
                  }}
                >
                  {copy.allLocations}
                </PlainOption>

                {locationOptions.map((location) => (
                  <PlainOption
                    key={location}
                    active={
                      cleanCountryInput(locationFilter) ===
                      cleanCountryInput(location)
                    }
                    onClick={() => {
                      setLocationFilter(location);
                      setOpenFilter(null);
                    }}
                  >
                    {getCountryLabel(location, safeLocale)}
                  </PlainOption>
                ))}
              </OptionDropdown>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              setPriceModalOpen(true);
              setOpenFilter(null);
            }}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition duration-150 ${
              priceFilterLabel
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <span>{copy.price}</span>
            {priceFilterLabel ? (
              <span className="max-w-[170px] truncate text-xs opacity-80">
                {priceFilterLabel}
              </span>
            ) : null}
            <ChevronDownIcon />
          </button>

          <div className="relative shrink-0">
            <FilterChip
              label={copy.category}
              value={categoryFilter === "all" ? "" : categoryFilter}
              active={categoryFilter !== "all"}
              onClick={() =>
                setOpenFilter((prev) =>
                  prev === "category" ? null : "category"
                )
              }
            />

            {openFilter === "category" ? (
              <OptionDropdown widthClass="w-[min(560px,calc(100vw-48px))]">
                <div className="px-3 py-2">
                  <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
                    {copy.popular}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter("all");
                        setOpenFilter(null);
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        categoryFilter === "all"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      {copy.any}
                    </button>

                    {POPULAR_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(category);
                          setOpenFilter(null);
                        }}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          normalizeText(categoryFilter) ===
                          normalizeText(category)
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {categoryOptions.length > 0 ? (
                    <>
                      <p className="mb-3 mt-5 text-xs font-black uppercase tracking-wide text-slate-400">
                        {copy.allCategories}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {categoryOptions.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setCategoryFilter(category);
                              setOpenFilter(null);
                            }}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              normalizeText(categoryFilter) ===
                              normalizeText(category)
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </OptionDropdown>
            ) : null}
          </div>

          <FilterChip label={copy.gender} disabled premium />
          <FilterChip label={copy.age} disabled premium />
          <FilterChip label={copy.ethnicity} disabled premium />
          <FilterChip label={copy.language} disabled premium />

          <button
            type="button"
            onClick={resetFilters}
            className="shrink-0 px-2 py-2 text-sm font-semibold text-slate-700 underline underline-offset-4 transition hover:text-slate-950"
          >
            {copy.clearAll}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
          {error}
        </section>
      ) : null}

      <section>
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              {copy.creators}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {safeLocale === "ja"
                ? `${filteredCreators.length}${copy.countSuffix}`
                : `${filteredCreators.length} ${copy.countSuffix}`}
            </p>
          </div>

          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={resetFilters}
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950 md:inline-flex"
            >
              {copy.clearAll}
            </button>
          ) : null}
        </div>

        {filteredCreators.length === 0 ? (
          <div className="rounded-[28px] border border-slate-100 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              {copy.noCreatorsTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              {copy.noCreatorsBody}
            </p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {copy.clearAll}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
            {filteredCreators.map((creator, index) => (
              <CreatorCardItem
                key={creator.id}
                creator={creator}
                index={index}
                isSaved={savedCreatorIds.includes(creator.id)}
                isSaving={savingCreatorId === creator.id}
                safeLocale={safeLocale}
                copy={{
                  noSns: copy.noSns,
                  trusted: copy.trusted,
                  topCreator: copy.topCreator,
                  menu: copy.menu,
                  menus: copy.menus,
                  priceFrom: copy.priceFrom,
                  noLocation: copy.noLocation,
                }}
                onToggleSave={toggleSaveCreator}
              />
            ))}
          </div>
        )}
      </section>

      {priceModalOpen ? (
        <PriceModal
          minPrice={minPrice}
          maxPrice={maxPrice}
          setMinPrice={setMinPrice}
          setMaxPrice={setMaxPrice}
          onClose={() => setPriceModalOpen(false)}
          onSave={() => setPriceModalOpen(false)}
          copy={{
            price: copy.price,
            minPrice: copy.minPrice,
            maxPrice: copy.maxPrice,
            save: copy.save,
            clear: copy.clear,
          }}
        />
      ) : null}
    </div>
  );
}