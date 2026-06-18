// File: app/b/creators/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";

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

type PayoutProfileRow = {
  creator_id: string;
  status: "not_submitted" | "submitted" | "verified" | "rejected" | null;
};

type SavedCreatorRow = {
  creator_id: string;
};

type CreatorCard = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  cardImageUrl: string | null;
  category: string | null;
  platforms: string[];
  socialLinks: {
    platform: string;
    url: string | null;
  }[];
  primaryAccountName: string | null;
  primaryAudienceCountry: string | null;
  followerRange: string | null;
  menuCount: number;
  menuTitles: string[];
  startingPrice: number | null;
  startingCurrency: string | null;
  topMenuTitle: string | null;
  rating: number | null;
  reviewCount: number;
};

const CONTENT_TYPE_OPTIONS = [
  { value: "all", ja: "すべて", en: "Any" },
  { value: "ugc", ja: "UGC", en: "UGC" },
  { value: "post", ja: "投稿", en: "Post" },
  { value: "video", ja: "動画", en: "Video" },
  { value: "short_video", ja: "ショート動画", en: "Short video" },
];

const FOLLOWER_OPTIONS = [
  { value: "all", ja: "すべて", en: "Any" },
  { value: "nano", ja: "Nano", en: "Nano" },
  { value: "micro", ja: "Micro", en: "Micro" },
  { value: "mid", ja: "Mid", en: "Mid-tier" },
  { value: "macro", ja: "Macro", en: "Macro" },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeNumberInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function toNumberOrNull(value: string) {
  const cleaned = normalizeNumberInput(value);
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
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
    compact.includes("日本")
  ) {
    return "japan";
  }

  if (
    normalized === "韓国" ||
    normalized === "korea" ||
    normalized === "south korea" ||
    normalized === "kr" ||
    compact.includes("韓国")
  ) {
    return "korea";
  }

  if (
    normalized === "台湾" ||
    normalized === "taiwan" ||
    normalized === "tw" ||
    compact.includes("台湾")
  ) {
    return "taiwan";
  }

  if (
    normalized === "香港" ||
    normalized === "hong kong" ||
    normalized === "hk" ||
    compact.includes("香港")
  ) {
    return "hong_kong";
  }

  if (
    normalized === "中国" ||
    normalized === "china" ||
    normalized === "cn" ||
    compact.includes("中国")
  ) {
    return "china";
  }

  if (
    normalized === "タイ" ||
    normalized === "thailand" ||
    normalized === "th" ||
    compact.includes("タイ")
  ) {
    return "thailand";
  }

  if (
    normalized === "ベトナム" ||
    normalized === "vietnam" ||
    normalized === "vn" ||
    compact.includes("ベトナム")
  ) {
    return "vietnam";
  }

  if (
    normalized === "インドネシア" ||
    normalized === "indonesia" ||
    normalized === "id" ||
    compact.includes("インドネシア")
  ) {
    return "indonesia";
  }

  if (
    normalized === "フィリピン" ||
    normalized === "philippines" ||
    normalized === "ph" ||
    compact.includes("フィリピン")
  ) {
    return "philippines";
  }

  if (
    normalized === "マレーシア" ||
    normalized === "malaysia" ||
    normalized === "my" ||
    compact.includes("マレーシア")
  ) {
    return "malaysia";
  }

  if (
    normalized === "シンガポール" ||
    normalized === "singapore" ||
    normalized === "sg" ||
    compact.includes("シンガポール")
  ) {
    return "singapore";
  }

  if (
    normalized === "アメリカ" ||
    normalized === "united states" ||
    normalized === "usa" ||
    normalized === "us" ||
    compact.includes("アメリカ")
  ) {
    return "united_states";
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
    united_states: "アメリカ",
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
    united_states: "United States",
    other: "Other",
  };

  return locale === "ja"
    ? jaMap[cleaned] ?? ((country ?? "").trim() || "未設定")
    : enMap[cleaned] ?? ((country ?? "").trim() || "Unknown");
}

function formatPrice(
  value: number | null,
  currency: string | null | undefined
) {
  if (value == null) return "-";

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

function getPlatformIcon(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (normalized.includes("instagram")) {
    return (
      <img
        src="/brand/social/instagram.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("tiktok")) {
    return (
      <img
        src="/brand/social/tiktok.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("youtube")) {
    return (
      <img
        src="/brand/social/youtube.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized === "x" || normalized.includes("twitter")) {
    return (
      <img
        src="/brand/social/x.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  return "●";
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

function formatFollowerLabel(followerRange: string | null | undefined) {
  const range = followerRange?.trim();
  if (!range) return null;
  return range;
}

function getCreatorInitial(name: string) {
  return (name || "I").trim().slice(0, 1).toUpperCase();
}

function getRatingValue(value: number | null | undefined) {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
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
    text.includes("300k") ||
    text.includes("500k") ||
    text.includes("300,000") ||
    text.includes("500,000") ||
    text.includes("mid")
  ) {
    return "mid";
  }

  if (
    text.includes("1m") ||
    text.includes("1,000,000") ||
    text.includes("100万") ||
    text.includes("macro")
  ) {
    return "macro";
  }

  return "unknown";
}

function getContentTypeMatch(card: CreatorCard, filter: string) {
  if (filter === "all") return true;

  const haystack = [
    card.topMenuTitle,
    ...card.menuTitles,
    card.category,
    ...card.platforms,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (filter === "ugc") {
    return (
      haystack.includes("ugc") ||
      haystack.includes("素材") ||
      haystack.includes("納品") ||
      haystack.includes("photo asset") ||
      haystack.includes("video asset")
    );
  }

  if (filter === "post") {
    return (
      haystack.includes("投稿") ||
      haystack.includes("post") ||
      haystack.includes("feed")
    );
  }

  if (filter === "video") {
    return (
      haystack.includes("動画") ||
      haystack.includes("video") ||
      haystack.includes("youtube")
    );
  }

  if (filter === "short_video") {
    return (
      haystack.includes("リール") ||
      haystack.includes("reel") ||
      haystack.includes("short") ||
      haystack.includes("ショート") ||
      haystack.includes("tiktok")
    );
  }

  return true;
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

function CreatorImage({
  creator,
  index,
}: {
  creator: CreatorCard;
  index: number;
}) {
  const src = creator.cardImageUrl || creator.avatarUrl;

  const gradients = [
    "from-rose-200 via-rose-100 to-white",
    "from-emerald-200 via-emerald-100 to-white",
    "from-slate-200 via-slate-100 to-white",
    "from-orange-200 via-rose-100 to-white",
  ];

  if (src) {
    return (
      <img
        src={src}
        alt={creator.displayName}
        className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
        loading={index < 4 ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${
        gradients[index % gradients.length]
      }`}
    >
      <span className="text-6xl font-black text-slate-950/70">
        {getCreatorInitial(creator.displayName)}
      </span>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-950"
    >
      {children}
    </select>
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
    menu: string;
    menus: string;
    noLocation: string;
  };
  onToggleSave: (creatorId: string) => void;
}) {
  const followerLabel = formatFollowerLabel(creator.followerRange);
  const rating = getRatingValue(creator.rating);
  const shouldShowRating = rating !== null && creator.reviewCount > 0;

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-[22px] bg-slate-100 shadow-sm transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[rgba(0,0,0,0.16)_0_18px_40px_-22px]">
        <Link href={`/b/creators/${creator.id}`} className="block">
          <div className="relative aspect-[1.08/1] overflow-hidden">
            <CreatorImage creator={creator} index={index} />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          </div>
        </Link>

        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2">
          {creator.socialLinks.slice(0, 5).map((social, socialIndex) => {
            const key = `${social.platform}-${social.url ?? "no-url"}-${socialIndex}`;

            if (social.url) {
              return (
                <a
                  key={key}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  title={getPlatformLabel(social.platform)}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-xs font-black text-slate-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                >
                  {getPlatformIcon(social.platform)}
                </a>
              );
            }

            return (
              <span
                key={key}
                title={getPlatformLabel(social.platform)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-xs font-black text-slate-900 shadow-sm backdrop-blur"
              >
                {getPlatformIcon(social.platform)}
              </span>
            );
          })}

          {followerLabel ? (
            <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-slate-900 shadow-sm">
              {followerLabel}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSave(creator.id);
          }}
          disabled={isSaving}
          className={`absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-white transition duration-150 hover:scale-105 disabled:opacity-60 ${
            isSaved ? "bg-pink-500" : "bg-black/25 backdrop-blur"
          }`}
          aria-label={isSaved ? "Remove saved influencer" : "Save influencer"}
        >
          <HeartIcon filled={isSaved} />
        </button>
      </div>

      <Link href={`/b/creators/${creator.id}`} className="mt-3 block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black leading-tight text-slate-950">
              {creator.displayName}
            </p>

            {creator.primaryAccountName ? (
              <p className="mt-1 truncate text-sm font-bold text-slate-500">
                @{creator.primaryAccountName}
              </p>
            ) : null}

            <div className="mt-1 flex min-w-0 items-center gap-2">
              <p className="truncate text-sm text-slate-400">
                {creator.primaryAudienceCountry
                  ? getCountryLabel(creator.primaryAudienceCountry, safeLocale)
                  : copy.noLocation}
              </p>

              {shouldShowRating ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-800">
                    <span className="text-yellow-500">★</span>
                    {rating.toFixed(1)}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-base font-black text-slate-950">
              {formatStartingPrice(creator.startingPrice, creator.startingCurrency)}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {creator.menuCount}{" "}
              {creator.menuCount === 1 ? copy.menu : copy.menus}
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
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            fetchError: "インフルエンサー一覧の取得に失敗しました。",
            keywordPlaceholder: "名前・カテゴリ・SNSで検索",
            platform: "媒体",
            category: "カテゴリ",
            location: "地域",
            contentType: "内容",
            followers: "フォロワー",
            minPrice: "最低金額",
            maxPrice: "最高金額",
            any: "すべて",
            clearAll: "条件をリセット",
            noCreatorsTitle: "表示できるインフルエンサーがいません",
            noCreatorsBody:
              "検索条件を変更するか、公開中のインフルエンサーが追加されるまでお待ちください。",
            creatorFallback: "Influencer",
            noLocation: "地域未設定",
            menu: "menu",
            menus: "menus",
            signupRequired: "保存するには企業登録またはログインが必要です。",
          }
        : {
            loading: "Loading...",
            fetchError: "Failed to load influencers.",
            keywordPlaceholder: "Search name, category or social",
            platform: "Platform",
            category: "Category",
            location: "Location",
            contentType: "Content",
            followers: "Followers",
            minPrice: "Min price",
            maxPrice: "Max price",
            any: "Any",
            clearAll: "Clear all",
            noCreatorsTitle: "No influencers found",
            noCreatorsBody:
              "Try changing your search filters or wait for more public influencers.",
            creatorFallback: "Influencer",
            noLocation: "Location not set",
            menu: "menu",
            menus: "menus",
            signupRequired: "Please sign up or log in as a brand to save influencers.",
          },
    [safeLocale]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [savedCreatorIds, setSavedCreatorIds] = useState<string[]>([]);
  const [savingCreatorId, setSavingCreatorId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [followersFilter, setFollowersFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

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
        (creator.primaryAccountName ?? "").toLowerCase().includes(q) ||
        (creator.category ?? "").toLowerCase().includes(q) ||
        creator.platforms.some((platform) => platform.toLowerCase().includes(q)) ||
        creator.menuTitles.some((title) => title.toLowerCase().includes(q)) ||
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

      const matchesContentType = getContentTypeMatch(creator, contentTypeFilter);

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

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (isMounted) {
          setCurrentUserId(user?.id ?? null);
        }

        const payoutResult = await supabase
          .from("creator_payout_profiles")
          .select("creator_id, status")
          .in("status", ["submitted", "verified"]);

        if (payoutResult.error) {
          console.error("creator payout profile load error", payoutResult.error);
          if (isMounted) {
            setCreators([]);
            setSavedCreatorIds([]);
            setError(copy.fetchError);
          }
          return;
        }

        const payoutRows = (payoutResult.data ?? []) as PayoutProfileRow[];

        const payoutReadyCreatorIds = Array.from(
          new Set(
            payoutRows
              .filter(
                (row) => row.status === "submitted" || row.status === "verified"
              )
              .map((row) => row.creator_id)
              .filter(Boolean)
          )
        );

        let savedRows: SavedCreatorRow[] = [];

        if (user) {
          const savedResult = await supabase
            .from("saved_creators")
            .select("creator_id")
            .eq("b_user_id", user.id);

          if (savedResult.error) {
            console.error("saved creators load error", savedResult.error);
          } else {
            savedRows = (savedResult.data ?? []) as SavedCreatorRow[];
          }
        }

        if (payoutReadyCreatorIds.length === 0) {
          if (isMounted) {
            setCreators([]);
            setSavedCreatorIds(savedRows.map((row) => row.creator_id));
          }
          return;
        }

        const creatorsResult = await supabase
          .from("creators")
          .select(
            `
            id,
            display_name,
            avatar_url,
            category,
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
          .order("created_at", { ascending: false });

        if (creatorsResult.error) {
          console.error({
            creatorsError: creatorsResult.error,
          });

          if (isMounted) {
            setError(copy.fetchError);
          }

          return;
        }

        const rows = (creatorsResult.data ?? []) as CreatorRow[];
        const creatorIds = rows.map((row) => row.id);

        let menuRows: MenuRow[] = [];
        let portfolioRows: PortfolioAssetRow[] = [];

        if (creatorIds.length > 0) {
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

          if (menusResult.error) {
            console.error("creator menus load error", menusResult.error);
          } else {
            menuRows = (menusResult.data ?? []) as MenuRow[];
          }

          if (portfolioResult.error) {
            console.error("creator portfolio load error", portfolioResult.error);
          } else {
            portfolioRows = (portfolioResult.data ?? []) as PortfolioAssetRow[];
          }
        }

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

        const nextCreators: CreatorCard[] = rows
          .map((row) => {
            const socials = Array.isArray(row.creator_social_accounts)
              ? row.creator_social_accounts
              : row.creator_social_accounts
                ? [row.creator_social_accounts]
                : [];

            const primary = socials[0] ?? null;

            const platforms = Array.from(
              new Set(
                socials
                  .map((social) => social.platform?.trim())
                  .filter((value): value is string => !!value)
              )
            );

            const socialLinks = socials
              .map((social) => ({
                platform: social.platform?.trim() || "",
                url: social.url?.trim() || null,
              }))
              .filter((social) => social.platform);

            const creatorMenus = menuMap.get(row.id) ?? [];

            const pricedMenus = creatorMenus
              .filter((menu) => typeof menu.price === "number")
              .sort((a, b) => Number(a.price) - Number(b.price));

            const startingMenu = pricedMenus[0] ?? creatorMenus[0] ?? null;

            const portfolio = portfolioMap.get(row.id) ?? [];
            const firstPortfolioImage = portfolio[0]?.asset_url?.trim() || null;

            const rating = getRatingValue(row.rating ?? null);
            const reviewCount = row.total_orders ?? 0;

            return {
              id: row.id,
              displayName: row.display_name?.trim() || copy.creatorFallback,
              primaryAccountName: getSocialAccountName(primary),
              avatarUrl: row.avatar_url?.trim() || null,
              cardImageUrl: firstPortfolioImage,
              category: row.category?.trim() || null,
              platforms,
              socialLinks,
              primaryAudienceCountry: primary?.audience_country?.trim() || null,
              followerRange: primary?.follower_range?.trim() || null,
              menuCount: creatorMenus.length,
              menuTitles: creatorMenus
                .map((menu) => menu.title?.trim())
                .filter((value): value is string => !!value),
              startingPrice:
                typeof startingMenu?.price === "number"
                  ? Number(startingMenu.price)
                  : null,
              startingCurrency: startingMenu?.currency ?? "JPY",
              topMenuTitle: startingMenu?.title ?? null,
              rating,
              reviewCount,
            };
          })
          .filter((card) => card.menuCount > 0);

        if (isMounted) {
          setCreators(nextCreators);
          setSavedCreatorIds(savedRows.map((row) => row.creator_id));
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
  }, [copy.fetchError, copy.creatorFallback]);

  const resetFilters = () => {
    setKeyword("");
    setPlatformFilter("all");
    setCategoryFilter("all");
    setLocationFilter("all");
    setContentTypeFilter("all");
    setFollowersFilter("all");
    setMinPrice("");
    setMaxPrice("");
  };

  const toggleSaveCreator = async (creatorId: string) => {
    if (savingCreatorId) return;

    setNotice("");

    if (!currentUserId) {
      setNotice(copy.signupRequired);
      router.push("/signup/company");
      return;
    }

    setSavingCreatorId(creatorId);

    try {
      const isSaved = savedCreatorIds.includes(creatorId);

      if (isSaved) {
        const { error: deleteError } = await supabase
          .from("saved_creators")
          .delete()
          .eq("b_user_id", currentUserId)
          .eq("creator_id", creatorId);

        if (deleteError) throw deleteError;

        setSavedCreatorIds((prev) => prev.filter((id) => id !== creatorId));
      } else {
        const { error: insertError } = await supabase
          .from("saved_creators")
          .insert({
            b_user_id: currentUserId,
            creator_id: creatorId,
          });

        if (insertError) throw insertError;

        setSavedCreatorIds((prev) =>
          prev.includes(creatorId) ? prev : [...prev, creatorId]
        );
      }
    } catch (e) {
      console.error("saved creator toggle error:", e);
      setNotice(copy.signupRequired);
    } finally {
      setSavingCreatorId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <section className="mx-auto max-w-5xl rounded-[32px] border border-slate-100 bg-white p-5 shadow-[rgba(120,120,170,0.15)_0_2px_16px_0]">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
            <div className="h-12 animate-pulse rounded-full bg-slate-100" />
            <div className="h-12 animate-pulse rounded-full bg-slate-100" />
            <div className="h-12 animate-pulse rounded-full bg-slate-100" />
          </div>
        </section>

        <section>
          <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-[1.08/1] animate-pulse rounded-[22px] bg-slate-100" />
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
    <div className="space-y-8 pb-10">
      <section className="mx-auto max-w-5xl rounded-[32px] border border-slate-100 bg-white p-4 shadow-[rgba(120,120,170,0.15)_0_2px_16px_0]">
        <div className="grid gap-3 md:grid-cols-[1fr_150px_150px]">
          <label className="flex h-12 items-center gap-3 rounded-full border border-slate-200 bg-white px-4">
            <SearchIcon />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={copy.keywordPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>

          <FilterSelect value={platformFilter} onChange={setPlatformFilter}>
            <option value="all">{copy.platform}: {copy.any}</option>
            {platformOptions.map((platform) => (
              <option key={platform} value={platform}>
                {getPlatformLabel(platform)}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={categoryFilter} onChange={setCategoryFilter}>
            <option value="all">{copy.category}: {copy.any}</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <FilterSelect value={contentTypeFilter} onChange={setContentTypeFilter}>
            {CONTENT_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {copy.contentType}: {safeLocale === "ja" ? item.ja : item.en}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={followersFilter} onChange={setFollowersFilter}>
            {FOLLOWER_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {copy.followers}: {safeLocale === "ja" ? item.ja : item.en}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={locationFilter} onChange={setLocationFilter}>
            <option value="all">{copy.location}: {copy.any}</option>
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {getCountryLabel(location, safeLocale)}
              </option>
            ))}
          </FilterSelect>

          <input
            value={minPrice}
            onChange={(event) => setMinPrice(normalizeNumberInput(event.target.value))}
            inputMode="numeric"
            placeholder={copy.minPrice}
            className="h-11 w-[130px] rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-950"
          />

          <input
            value={maxPrice}
            onChange={(event) => setMaxPrice(normalizeNumberInput(event.target.value))}
            inputMode="numeric"
            placeholder={copy.maxPrice}
            className="h-11 w-[130px] rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-950"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="h-11 rounded-full bg-slate-50 px-4 text-sm font-black text-slate-700 ring-1 ring-slate-100 transition hover:bg-slate-100"
          >
            {copy.clearAll}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </section>

      {notice ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
          {notice}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          {error}
        </section>
      ) : null}

      <section>
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
                  menu: copy.menu,
                  menus: copy.menus,
                  noLocation: copy.noLocation,
                }}
                onToggleSave={toggleSaveCreator}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}