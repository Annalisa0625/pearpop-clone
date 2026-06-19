// File: app/b/creators/page.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";

type FilterMenu =
  | "platform"
  | "category"
  | "dealType"
  | "menuContent"
  | "location"
  | null;

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
  can_receive_products?: boolean | null;
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

type SavedCreatorRow = {
  creator_id: string;
};

type CreatorCard = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  cardImageUrl: string | null;
  category: string | null;
  prefecture: string | null;
  canReceiveProducts: boolean;
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

const FOLLOWER_MIN = 0;
const FOLLOWER_MAX = 100000;
const FOLLOWER_STEP = 1000;

const PRICE_MIN = 0;
const PRICE_MAX = 300000;
const PRICE_STEP = 10000;

const PLATFORM_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "Instagram", label: "Instagram" },
  { value: "TikTok", label: "TikTok" },
  { value: "YouTube", label: "YouTube" },
  { value: "X", label: "X" },
];

const DEAL_TYPE_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "experience", label: "体験型" },
  { value: "product", label: "商品提供型" },
  { value: "asset", label: "素材提供型" },
];

const MENU_CONTENT_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "Instagram投稿", label: "Instagram投稿" },
  { value: "Instagramリール", label: "Instagramリール" },
  { value: "Instagramストーリーズ", label: "Instagramストーリーズ" },
  { value: "TikTok投稿", label: "TikTok投稿" },
  { value: "YouTubeショート", label: "YouTubeショート" },
  { value: "YouTube動画", label: "YouTube動画" },
  { value: "写真素材のみ", label: "写真素材のみ" },
  { value: "動画素材のみ", label: "動画素材のみ" },
  { value: "イベント訪問", label: "イベント訪問" },
];

const PRICE_PRESETS = [
  { label: "すべて", min: PRICE_MIN, max: PRICE_MAX },
  { label: "〜1万円", min: 0, max: 10000 },
  { label: "1万円〜3万円", min: 10000, max: 30000 },
  { label: "3万円〜5万円", min: 30000, max: 50000 },
  { label: "5万円〜10万円", min: 50000, max: 100000 },
  { label: "10万円〜30万円", min: 100000, max: 300000 },
  { label: "30万円〜", min: 300000, max: 300000 },
];

const FOLLOWER_PRESETS = [
  { label: "すべて", min: FOLLOWER_MIN, max: FOLLOWER_MAX },
  { label: "1,000未満", min: 0, max: 1000 },
  { label: "1,000〜5,000", min: 1000, max: 5000 },
  { label: "5,000〜10,000", min: 5000, max: 10000 },
  { label: "10,000〜30,000", min: 10000, max: 30000 },
  { label: "30,000〜50,000", min: 30000, max: 50000 },
  { label: "50,000〜100,000", min: 50000, max: 100000 },
  { label: "100,000以上", min: 100000, max: 100000 },
];

const PREFECTURE_OPTIONS = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

const GENRE_GROUPS = [
  {
    key: "beauty",
    ja: "美容",
    items: [
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
    ],
  },
  {
    key: "fitness",
    ja: "健康",
    items: [
      "ジム",
      "パーソナルジム",
      "ヨガ",
      "ピラティス",
      "ダイエット",
      "筋トレ",
      "ランニング",
      "スポーツウェア",
      "健康食品",
      "プロテイン",
      "サウナ",
      "整体・ストレッチ",
    ],
  },
  {
    key: "food",
    ja: "グルメ",
    items: [
      "カフェ",
      "レストラン",
      "居酒屋",
      "スイーツ",
      "大食い",
      "お酒",
      "料理",
      "節約レシピ",
      "時短レシピ",
      "お取り寄せ",
      "食品レビュー",
      "ヴィーガン",
    ],
  },
  {
    key: "travel",
    ja: "旅行",
    items: [
      "国内旅行",
      "海外旅行",
      "ホテル",
      "旅館",
      "観光地",
      "温泉",
      "グランピング",
      "テーマパーク",
      "インバウンド",
      "地方PR",
      "街歩き",
      "カップル旅行",
    ],
  },
  {
    key: "life",
    ja: "暮らし",
    items: [
      "ファッション",
      "インテリア",
      "雑貨",
      "ガジェット",
      "ペット",
      "子育て",
      "家事",
      "暮らし",
      "節約",
      "勉強",
      "仕事術",
      "Vlog",
    ],
  },
  {
    key: "creative",
    ja: "制作",
    items: [
      "写真撮影",
      "動画制作",
      "UGC制作",
      "商品レビュー",
      "開封動画",
      "ライブ配信",
      "イベント体験",
      "モデル",
      "ダンス",
      "音楽",
      "イラスト",
      "その他",
    ],
  },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatFollowerValue(value: number) {
  if (value >= FOLLOWER_MAX) return `${formatCompactNumber(FOLLOWER_MAX)}+`;
  return formatCompactNumber(value);
}

function formatPriceValue(value: number) {
  if (value >= PRICE_MAX) return `¥${formatCompactNumber(PRICE_MAX)}+`;
  return `¥${formatCompactNumber(value)}`;
}

function formatRangeLabel({
  min,
  max,
  maxLimit,
  prefix = "",
  suffix = "",
}: {
  min: number;
  max: number;
  maxLimit: number;
  prefix?: string;
  suffix?: string;
}) {
  const minLabel = `${prefix}${formatCompactNumber(min)}${suffix}`;
  const maxLabel =
    max >= maxLimit
      ? `${prefix}${formatCompactNumber(maxLimit)}+${suffix}`
      : `${prefix}${formatCompactNumber(max)}${suffix}`;

  return `${minLabel} 〜 ${maxLabel}`;
}

function parseFollowerRange(value: string | null | undefined) {
  const text = (value ?? "").normalize("NFKC").trim();

  if (!text) return null;

  const numbers = Array.from(text.matchAll(/\d[\d,]*/g)).map((match) =>
    Number(match[0].replace(/,/g, ""))
  );

  if (numbers.length === 0) return null;

  if (
    text.includes("未満") ||
    text.toLowerCase().includes("under") ||
    text.includes("以下")
  ) {
    return {
      min: 0,
      max: numbers[0],
    };
  }

  if (
    text.includes("以上") ||
    text.includes("+") ||
    text.toLowerCase().includes("over")
  ) {
    return {
      min: numbers[0],
      max: Number.POSITIVE_INFINITY,
    };
  }

  if (numbers.length >= 2) {
    return {
      min: Math.min(numbers[0], numbers[1]),
      max: Math.max(numbers[0], numbers[1]),
    };
  }

  return {
    min: numbers[0],
    max: numbers[0],
  };
}

function getFollowerRangeMatch(
  followerRange: string | null | undefined,
  minFilter: number,
  maxFilter: number
) {
  const isDefault =
    minFilter === FOLLOWER_MIN && maxFilter === FOLLOWER_MAX;

  if (isDefault) return true;

  const parsed = parseFollowerRange(followerRange);
  if (!parsed) return false;

  const filterMax =
    maxFilter >= FOLLOWER_MAX ? Number.POSITIVE_INFINITY : maxFilter;

  return parsed.max >= minFilter && parsed.min <= filterMax;
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

  if (!normalized || normalized === "all") return "すべて";
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
        className="h-5 w-5 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("tiktok")) {
    return (
      <img
        src="/brand/social/tiktok.png"
        alt=""
        className="h-5 w-5 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("youtube")) {
    return (
      <img
        src="/brand/social/youtube.png"
        alt=""
        className="h-5 w-5 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized === "x" || normalized.includes("twitter")) {
    return (
      <img
        src="/brand/social/x.png"
        alt=""
        className="h-5 w-5 object-contain"
        aria-hidden="true"
      />
    );
  }

  return <span className="text-sm">●</span>;
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

function getDealTypeMatch(card: CreatorCard, filter: string) {
  if (filter === "all") return true;

  const text = [
    card.category,
    card.topMenuTitle,
    ...card.menuTitles,
    ...card.platforms,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (filter === "experience") {
    return (
      text.includes("体験") ||
      text.includes("訪問") ||
      text.includes("来店") ||
      text.includes("イベント") ||
      text.includes("event") ||
      text.includes("visit")
    );
  }

  if (filter === "product") {
    return card.canReceiveProducts === true;
  }

  if (filter === "asset") {
    return (
      text.includes("素材") ||
      text.includes("納品") ||
      text.includes("ugc") ||
      text.includes("asset") ||
      text.includes("photo") ||
      text.includes("video")
    );
  }

  return true;
}

function getMenuContentMatch(card: CreatorCard, filter: string) {
  if (filter === "all") return true;

  const text = card.menuTitles.join(" ").toLowerCase();
  const normalizedFilter = filter.toLowerCase();

  if (filter === "写真素材のみ") {
    return text.includes("写真素材") || text.includes("photo asset");
  }

  if (filter === "動画素材のみ") {
    return text.includes("動画素材") || text.includes("video asset");
  }

  return text.includes(normalizedFilter);
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

function DropdownShell({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute left-0 top-[calc(100%+12px)] z-[80] overflow-hidden rounded-[28px] border border-slate-100 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)] ${className}`}
    >
      {children}
    </div>
  );
}

function DropdownOption({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
        active
          ? "bg-slate-950 text-white"
          : "text-slate-800 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function FilterPill({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <span>{label}</span>
      {value ? (
        <span className="max-w-[180px] truncate text-xs opacity-75">{value}</span>
      ) : null}
      <ChevronDownIcon />
    </button>
  );
}

function CategoryDropdown({
  activeGroup,
  setActiveGroup,
  selectedCategory,
  setSelectedCategory,
  close,
}: {
  activeGroup: string;
  setActiveGroup: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  close: () => void;
}) {
  const group =
    GENRE_GROUPS.find((item) => item.key === activeGroup) ?? GENRE_GROUPS[0];

  return (
    <DropdownShell className="w-[min(720px,calc(100vw-40px))] p-4">
      <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GENRE_GROUPS.map((item) => {
          const active = item.key === activeGroup;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveGroup(item.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                active
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {item.ja}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory("all");
            close();
          }}
          className={`rounded-xl px-3 py-2 text-sm font-black transition ${
            selectedCategory === "all"
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-800 hover:bg-slate-200"
          }`}
        >
          すべて
        </button>

        {group.items.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => {
              setSelectedCategory(category);
              close();
            }}
            className={`rounded-xl px-3 py-2 text-sm font-black transition ${
              normalizeText(selectedCategory) === normalizeText(category)
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </DropdownShell>
  );
}

function MultiPrefectureDropdown({
  selectedPrefectures,
  setSelectedPrefectures,
  clear,
}: {
  selectedPrefectures: string[];
  setSelectedPrefectures: (value: string[]) => void;
  clear: () => void;
}) {
  const togglePrefecture = (prefecture: string) => {
    if (selectedPrefectures.includes(prefecture)) {
      setSelectedPrefectures(
        selectedPrefectures.filter((item) => item !== prefecture)
      );
      return;
    }

    setSelectedPrefectures([...selectedPrefectures, prefecture]);
  };

  return (
    <DropdownShell className="w-[min(520px,calc(100vw-40px))] p-4">
      <p className="mb-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-500">
        ※体験型での体験可能範囲です。複数選択できます。
      </p>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black text-slate-400">
          選択中：{selectedPrefectures.length}件
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-black text-slate-700 underline underline-offset-4"
        >
          すべて解除
        </button>
      </div>

      <div className="grid max-h-[360px] grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
        {PREFECTURE_OPTIONS.map((prefecture) => {
          const checked = selectedPrefectures.includes(prefecture);

          return (
            <button
              key={prefecture}
              type="button"
              onClick={() => togglePrefecture(prefecture)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-black transition ${
                checked
                  ? "bg-slate-950 text-white"
                  : "bg-slate-50 text-slate-800 hover:bg-slate-100"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                  checked
                    ? "border-white bg-white text-slate-950"
                    : "border-slate-300 bg-white text-transparent"
                }`}
              >
                ✓
              </span>
              <span>{prefecture}</span>
            </button>
          );
        })}
      </div>
    </DropdownShell>
  );
}

function RangeFilterModal({
  title,
  minCaption,
  maxCaption,
  minValue,
  maxValue,
  minLimit,
  maxLimit,
  step,
  minDisplay,
  maxDisplay,
  presets,
  onMinChange,
  onMaxChange,
  onClose,
}: {
  title: string;
  minCaption: string;
  maxCaption: string;
  minValue: number;
  maxValue: number;
  minLimit: number;
  maxLimit: number;
  step: number;
  minDisplay: (value: number) => string;
  maxDisplay: (value: number) => string;
  presets: {
    label: string;
    min: number;
    max: number;
  }[];
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  onClose: () => void;
}) {
  const safeMin = Math.max(minLimit, Math.min(minValue, maxLimit));
  const safeMax = Math.max(minLimit, Math.min(maxValue, maxLimit));

  const leftPercent = ((safeMin - minLimit) / (maxLimit - minLimit)) * 100;
  const rightPercent = 100 - ((safeMax - minLimit) / (maxLimit - minLimit)) * 100;

  const handleMinChange = (value: number) => {
    const next = Math.min(value, safeMax);
    onMinChange(next);
  };

  const handleMaxChange = (value: number) => {
    const next = Math.max(value, safeMin);
    onMaxChange(next);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-xl rounded-[34px] bg-white p-6 shadow-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="w-10" />
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-xl font-black text-slate-700 shadow-sm transition hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-bold text-slate-500">{minCaption}</p>
            <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">
              {minDisplay(safeMin)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-bold text-slate-500">{maxCaption}</p>
            <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">
              {maxDisplay(safeMax)}
            </p>
          </div>
        </div>

        <div className="relative mt-7 h-10">
          <div className="absolute left-0 right-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-slate-200" />
          <div
            className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-slate-950"
            style={{
              left: `${leftPercent}%`,
              right: `${rightPercent}%`,
            }}
          />

          <input
            type="range"
            min={minLimit}
            max={maxLimit}
            step={step}
            value={safeMin}
            onChange={(event) => handleMinChange(Number(event.target.value))}
            className="trendre-range-input absolute left-0 top-0 h-10 w-full"
          />

          <input
            type="range"
            min={minLimit}
            max={maxLimit}
            step={step}
            value={safeMax}
            onChange={(event) => handleMaxChange(Number(event.target.value))}
            className="trendre-range-input absolute left-0 top-0 h-10 w-full"
          />
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onMinChange(preset.min);
                onMaxChange(preset.max);
              }}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 h-14 w-full rounded-2xl bg-slate-950 text-base font-black text-white transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          適用する
        </button>

        <style>{`
          .trendre-range-input {
            pointer-events: none;
            appearance: none;
            -webkit-appearance: none;
            background: transparent;
          }

          .trendre-range-input::-webkit-slider-thumb {
            pointer-events: auto;
            appearance: none;
            -webkit-appearance: none;
            width: 22px;
            height: 22px;
            border-radius: 9999px;
            background: #0f172a;
            border: 0;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.28);
            cursor: pointer;
          }

          .trendre-range-input::-moz-range-thumb {
            pointer-events: auto;
            width: 22px;
            height: 22px;
            border-radius: 9999px;
            background: #0f172a;
            border: 0;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.28);
            cursor: pointer;
          }

          .trendre-range-input::-webkit-slider-runnable-track {
            background: transparent;
          }

          .trendre-range-input::-moz-range-track {
            background: transparent;
          }
        `}</style>
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
  const filterRootRef = useRef<HTMLDivElement | null>(null);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            fetchError: "インフルエンサー一覧の取得に失敗しました。",
            platform: "SNSタイプ",
            category: "カテゴリ",
            categoryPlaceholder: "カテゴリを選択",
            location: "地域",
            locationHelp: "※体験型での体験可能範囲です",
            contentType: "メニュー内容",
            dealType: "案件タイプ",
            followers: "フォロワー数",
            followersMin: "下限",
            followersMax: "上限",
            price: "価格",
            priceMin: "下限価格",
            priceMax: "上限価格",
            any: "すべて",
            clearAll: "条件をクリア",
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
            platform: "SNS type",
            category: "Category",
            categoryPlaceholder: "Select category",
            location: "Location",
            locationHelp: "Available area for experience-based projects.",
            contentType: "Menu content",
            dealType: "Project type",
            followers: "Followers",
            followersMin: "Min followers",
            followersMax: "Max followers",
            price: "Price",
            priceMin: "Min price",
            priceMax: "Max price",
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

  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeCategoryGroup, setActiveCategoryGroup] = useState(
    GENRE_GROUPS[0].key
  );
  const [minFollowers, setMinFollowers] = useState(FOLLOWER_MIN);
  const [maxFollowers, setMaxFollowers] = useState(FOLLOWER_MAX);
  const [dealTypeFilter, setDealTypeFilter] = useState("all");
  const [menuContentFilter, setMenuContentFilter] = useState("all");
  const [selectedPrefectures, setSelectedPrefectures] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(PRICE_MIN);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);

  const [openFilter, setOpenFilter] = useState<FilterMenu>(null);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);

  const followersFilterLabel = useMemo(() => {
    if (minFollowers === FOLLOWER_MIN && maxFollowers === FOLLOWER_MAX) {
      return "";
    }

    return `${formatFollowerValue(minFollowers)} 〜 ${formatFollowerValue(maxFollowers)}`;
  }, [minFollowers, maxFollowers]);

  const priceFilterLabel = useMemo(() => {
    if (minPrice === PRICE_MIN && maxPrice === PRICE_MAX) {
      return "";
    }

    return `${formatPriceValue(minPrice)} 〜 ${formatPriceValue(maxPrice)}`;
  }, [minPrice, maxPrice]);

  const locationFilterLabel = useMemo(() => {
    if (selectedPrefectures.length === 0) return "";
    if (selectedPrefectures.length === 1) return selectedPrefectures[0];
    return `${selectedPrefectures.length}件選択中`;
  }, [selectedPrefectures]);

  const filteredCreators = useMemo(() => {
    return creators.filter((creator) => {
      const matchesPlatform =
        platformFilter === "all" ||
        creator.platforms.some(
          (platform) =>
            normalizePlatform(platform) === normalizePlatform(platformFilter)
        );

      const matchesCategory =
        categoryFilter === "all" ||
        normalizeText(creator.category) === normalizeText(categoryFilter);

      const matchesFollowers = getFollowerRangeMatch(
        creator.followerRange,
        minFollowers,
        maxFollowers
      );

      const matchesDealType = getDealTypeMatch(creator, dealTypeFilter);

      const matchesMenuContent = getMenuContentMatch(
        creator,
        menuContentFilter
      );

      const matchesLocation =
        selectedPrefectures.length === 0 ||
        selectedPrefectures.some(
          (prefecture) =>
            normalizeText(creator.prefecture) === normalizeText(prefecture)
        );

      const isDefaultPriceRange = minPrice === PRICE_MIN && maxPrice === PRICE_MAX;

      const filterMaxPrice =
        maxPrice >= PRICE_MAX ? Number.POSITIVE_INFINITY : maxPrice;

      const matchesPrice =
        isDefaultPriceRange ||
        (creator.startingPrice !== null &&
          creator.startingPrice >= minPrice &&
          creator.startingPrice <= filterMaxPrice);

      return (
        matchesPlatform &&
        matchesCategory &&
        matchesFollowers &&
        matchesDealType &&
        matchesMenuContent &&
        matchesLocation &&
        matchesPrice
      );
    });
  }, [
    creators,
    platformFilter,
    categoryFilter,
    minFollowers,
    maxFollowers,
    dealTypeFilter,
    menuContentFilter,
    selectedPrefectures,
    minPrice,
    maxPrice,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (platformFilter !== "all") count += 1;
    if (categoryFilter !== "all") count += 1;
    if (minFollowers !== FOLLOWER_MIN || maxFollowers !== FOLLOWER_MAX) count += 1;
    if (dealTypeFilter !== "all") count += 1;
    if (menuContentFilter !== "all") count += 1;
    if (selectedPrefectures.length > 0) count += 1;
    if (minPrice !== PRICE_MIN || maxPrice !== PRICE_MAX) count += 1;

    return count;
  }, [
    platformFilter,
    categoryFilter,
    minFollowers,
    maxFollowers,
    dealTypeFilter,
    menuContentFilter,
    selectedPrefectures,
    minPrice,
    maxPrice,
  ]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (!target) return;

      const filterRoot = filterRootRef.current;

      if (filterRoot && filterRoot.contains(target)) {
        return;
      }

      setOpenFilter(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFilter(null);
        setFollowersModalOpen(false);
        setPriceModalOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

        const payoutResult = await supabase.rpc("get_payout_ready_creator_ids");

        if (payoutResult.error) {
          console.error("payout ready creator ids load error", payoutResult.error);

          if (isMounted) {
            setCreators([]);
            setSavedCreatorIds([]);
            setError(copy.fetchError);
          }

          return;
        }

        const payoutReadyCreatorIds = Array.from(
          new Set(
            ((payoutResult.data ?? []) as { creator_id: string | null }[])
              .map((row) => row.creator_id)
              .filter((id): id is string => Boolean(id))
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
            prefecture,
            can_receive_products,
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
              prefecture: row.prefecture?.trim() || null,
              canReceiveProducts: row.can_receive_products === true,
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
    setPlatformFilter("all");
    setCategoryFilter("all");
    setMinFollowers(FOLLOWER_MIN);
    setMaxFollowers(FOLLOWER_MAX);
    setDealTypeFilter("all");
    setMenuContentFilter("all");
    setSelectedPrefectures([]);
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    setOpenFilter(null);
    setFollowersModalOpen(false);
    setPriceModalOpen(false);
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
        <section className="mx-auto max-w-[1320px] rounded-[34px] border border-slate-100 bg-white p-5 shadow-[rgba(120,120,170,0.15)_0_2px_16px_0]">
          <div className="grid gap-3 md:grid-cols-[220px_1fr_64px]">
            <div className="h-16 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-16 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-16 animate-pulse rounded-full bg-slate-950/10" />
          </div>
        </section>

        <section className="mx-auto max-w-[1320px]">
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
    <div className="space-y-9 pb-10">
      <div ref={filterRootRef} className="relative z-50 mx-auto max-w-[1320px]">
        <section className="mx-auto max-w-[1120px] rounded-[34px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:p-5">
          <div className="grid gap-0 overflow-visible rounded-[28px] border border-slate-100 md:grid-cols-[260px_minmax(0,1fr)_68px]">
            <div className="relative border-b border-slate-100 p-4 md:border-b-0 md:border-r">
              <button
                type="button"
                onClick={() =>
                  setOpenFilter((prev) => (prev === "platform" ? null : "platform"))
                }
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <span className="block text-sm font-black text-slate-950">
                    {copy.platform}
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-base font-medium text-slate-900">
                    {platformFilter === "all" ? null : getPlatformIcon(platformFilter)}
                    {platformFilter === "all"
                      ? copy.any
                      : getPlatformLabel(platformFilter)}
                  </span>
                </span>
                <ChevronDownIcon />
              </button>

              {openFilter === "platform" ? (
                <DropdownShell className="w-[min(380px,calc(100vw-40px))]">
                  {PLATFORM_OPTIONS.map((item) => (
                    <DropdownOption
                      key={item.value}
                      active={platformFilter === item.value}
                      onClick={() => {
                        setPlatformFilter(item.value);
                        setOpenFilter(null);
                      }}
                    >
                      {item.value === "all" ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500">
                          All
                        </span>
                      ) : (
                        getPlatformIcon(item.value)
                      )}
                      <span>{item.label}</span>
                    </DropdownOption>
                  ))}
                </DropdownShell>
              ) : null}
            </div>

            <div className="relative p-4">
              <button
                type="button"
                onClick={() =>
                  setOpenFilter((prev) => (prev === "category" ? null : "category"))
                }
                className="flex w-full items-center justify-between text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-950">
                    {copy.category}
                  </span>
                  <span className="mt-2 block truncate text-base font-medium text-slate-900">
                    {categoryFilter === "all"
                      ? copy.categoryPlaceholder
                      : categoryFilter}
                  </span>
                </span>
                <ChevronDownIcon />
              </button>

              {openFilter === "category" ? (
                <CategoryDropdown
                  activeGroup={activeCategoryGroup}
                  setActiveGroup={setActiveCategoryGroup}
                  selectedCategory={categoryFilter}
                  setSelectedCategory={setCategoryFilter}
                  close={() => setOpenFilter(null)}
                />
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                setOpenFilter(null);
                setFollowersModalOpen(false);
                setPriceModalOpen(false);
              }}
              className="flex min-h-[64px] items-center justify-center rounded-full bg-slate-950 text-white transition duration-150 hover:-translate-y-0.5 hover:shadow-xl md:m-2 md:min-h-0"
              aria-label="Search"
            >
              <SearchIcon />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-start justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFollowersModalOpen(true);
                setPriceModalOpen(false);
                setOpenFilter(null);
              }}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black transition ${
                followersFilterLabel
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <span>{copy.followers}</span>
              {followersFilterLabel ? (
                <span className="max-w-[180px] truncate text-xs opacity-75">
                  {followersFilterLabel}
                </span>
              ) : null}
              <ChevronDownIcon />
            </button>

            <div className="relative shrink-0">
              <FilterPill
                label={copy.dealType}
                value={
                  dealTypeFilter === "all"
                    ? ""
                    : DEAL_TYPE_OPTIONS.find((item) => item.value === dealTypeFilter)
                        ?.label
                }
                active={dealTypeFilter !== "all"}
                onClick={() =>
                  setOpenFilter((prev) => (prev === "dealType" ? null : "dealType"))
                }
              />

              {openFilter === "dealType" ? (
                <DropdownShell className="w-[min(300px,calc(100vw-40px))]">
                  {DEAL_TYPE_OPTIONS.map((item) => (
                    <DropdownOption
                      key={item.value}
                      active={dealTypeFilter === item.value}
                      onClick={() => {
                        setDealTypeFilter(item.value);
                        setOpenFilter(null);
                      }}
                    >
                      {item.label}
                    </DropdownOption>
                  ))}
                </DropdownShell>
              ) : null}
            </div>

            <div className="relative shrink-0">
              <FilterPill
                label={copy.contentType}
                value={
                  menuContentFilter === "all"
                    ? ""
                    : MENU_CONTENT_OPTIONS.find(
                        (item) => item.value === menuContentFilter
                      )?.label
                }
                active={menuContentFilter !== "all"}
                onClick={() =>
                  setOpenFilter((prev) =>
                    prev === "menuContent" ? null : "menuContent"
                  )
                }
              />

              {openFilter === "menuContent" ? (
                <DropdownShell className="w-[min(340px,calc(100vw-40px))]">
                  {MENU_CONTENT_OPTIONS.map((item) => (
                    <DropdownOption
                      key={item.value}
                      active={menuContentFilter === item.value}
                      onClick={() => {
                        setMenuContentFilter(item.value);
                        setOpenFilter(null);
                      }}
                    >
                      {item.label}
                    </DropdownOption>
                  ))}
                </DropdownShell>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                setPriceModalOpen(true);
                setFollowersModalOpen(false);
                setOpenFilter(null);
              }}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black transition ${
                priceFilterLabel
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <span>{copy.price}</span>
              {priceFilterLabel ? (
                <span className="max-w-[170px] truncate text-xs opacity-75">
                  {priceFilterLabel}
                </span>
              ) : null}
              <ChevronDownIcon />
            </button>

            <div className="relative shrink-0">
              <FilterPill
                label={copy.location}
                value={locationFilterLabel}
                active={selectedPrefectures.length > 0}
                onClick={() =>
                  setOpenFilter((prev) => (prev === "location" ? null : "location"))
                }
              />

              {openFilter === "location" ? (
                <MultiPrefectureDropdown
                  selectedPrefectures={selectedPrefectures}
                  setSelectedPrefectures={setSelectedPrefectures}
                  clear={() => setSelectedPrefectures([])}
                />
              ) : null}
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="h-11 shrink-0 px-2 text-sm font-bold text-slate-700 underline underline-offset-4 transition hover:text-slate-950"
            >
              {copy.clearAll}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>

          <p className="mt-3 text-center text-xs font-bold text-slate-400">
            {copy.locationHelp}
          </p>
        </section>
      </div>

      {notice ? (
        <section className="mx-auto max-w-[1320px] rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
          {notice}
        </section>
      ) : null}

      {error ? (
        <section className="mx-auto max-w-[1320px] rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          {error}
        </section>
      ) : null}

      <section className="relative z-0 mx-auto max-w-[1320px]">
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

      {followersModalOpen ? (
        <RangeFilterModal
          title={copy.followers}
          minCaption={copy.followersMin}
          maxCaption={copy.followersMax}
          minValue={minFollowers}
          maxValue={maxFollowers}
          minLimit={FOLLOWER_MIN}
          maxLimit={FOLLOWER_MAX}
          step={FOLLOWER_STEP}
          minDisplay={formatFollowerValue}
          maxDisplay={formatFollowerValue}
          presets={FOLLOWER_PRESETS}
          onMinChange={setMinFollowers}
          onMaxChange={setMaxFollowers}
          onClose={() => setFollowersModalOpen(false)}
        />
      ) : null}

      {priceModalOpen ? (
        <RangeFilterModal
          title={copy.price}
          minCaption={copy.priceMin}
          maxCaption={copy.priceMax}
          minValue={minPrice}
          maxValue={maxPrice}
          minLimit={PRICE_MIN}
          maxLimit={PRICE_MAX}
          step={PRICE_STEP}
          minDisplay={formatPriceValue}
          maxDisplay={formatPriceValue}
          presets={PRICE_PRESETS}
          onMinChange={setMinPrice}
          onMaxChange={setMaxPrice}
          onClose={() => setPriceModalOpen(false)}
        />
      ) : null}
    </div>
  );
}