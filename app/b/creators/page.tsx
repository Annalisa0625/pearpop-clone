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
  | "followers"
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

const PLATFORM_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "Instagram", label: "Instagram" },
  { value: "TikTok", label: "TikTok" },
  { value: "YouTube", label: "YouTube" },
  { value: "X", label: "X" },
];

const FOLLOWER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "1,000未満", label: "1,000未満" },
  { value: "1,000〜5,000", label: "1,000〜5,000" },
  { value: "5,000〜10,000", label: "5,000〜10,000" },
  { value: "10,000〜30,000", label: "10,000〜30,000" },
  { value: "30,000〜50,000", label: "30,000〜50,000" },
  { value: "50,000〜100,000", label: "50,000〜100,000" },
  { value: "100,000以上", label: "100,000以上" },
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
  { label: "すべて", min: "", max: "" },
  { label: "〜1万円", min: "0", max: "10000" },
  { label: "1万円〜3万円", min: "10000", max: "30000" },
  { label: "3万円〜5万円", min: "30000", max: "50000" },
  { label: "5万円〜10万円", min: "50000", max: "100000" },
  { label: "10万円〜30万円", min: "100000", max: "300000" },
  { label: "30万円〜", min: "300000", max: "" },
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

function getFollowerMatch(
  followerRange: string | null | undefined,
  filter: string
) {
  if (filter === "all") return true;

  const text = normalizeText(followerRange);
  if (!text) return false;

  if (filter === "100,000以上") {
    return (
      text.includes("100,000") ||
      text.includes("300,000") ||
      text.includes("500,000") ||
      text.includes("1,000,000") ||
      text.includes("100000") ||
      text.includes("300000") ||
      text.includes("500000") ||
      text.includes("100万") ||
      text.includes("1m")
    );
  }

  return text === normalizeText(filter) || text.includes(normalizeText(filter));
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
  disabled,
  children,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
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
  disabled,
  onClick,
}: {
  label: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black transition ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          : active
            ? "border-slate-950 bg-slate-950 text-white shadow-sm"
            : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <span>{label}</span>
      {value ? (
        <span className="max-w-[160px] truncate text-xs opacity-75">{value}</span>
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
    <DropdownShell className="w-[min(700px,calc(100vw-40px))] p-4">
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

function PriceModal({
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  onClose,
}: {
  minPrice: string;
  maxPrice: string;
  setMinPrice: (value: string) => void;
  setMaxPrice: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-xl rounded-[34px] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">価格</h2>
            <p className="mt-1 text-sm font-bold text-slate-400">
              下限は0円、上限は300,000円以上まで設定できます。
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-700 transition hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-slate-700">下限</span>
            <input
              value={minPrice}
              onChange={(event) =>
                setMinPrice(normalizeNumberInput(event.target.value))
              }
              inputMode="numeric"
              placeholder="0"
              className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-2xl font-black outline-none transition focus:border-slate-950"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">上限</span>
            <input
              value={maxPrice}
              onChange={(event) =>
                setMaxPrice(normalizeNumberInput(event.target.value))
              }
              inputMode="numeric"
              placeholder="300,000+"
              className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-2xl font-black outline-none transition focus:border-slate-950"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {PRICE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setMinPrice(preset.min);
                setMaxPrice(preset.max);
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
          className="mt-7 h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          決定
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
            price: "価格",
            any: "すべて",
            clearAll: "Clear All",
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
            price: "Price",
            any: "Any",
            clearAll: "Clear All",
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
  const [followersFilter, setFollowersFilter] = useState("all");
  const [dealTypeFilter, setDealTypeFilter] = useState("all");
  const [menuContentFilter, setMenuContentFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [openFilter, setOpenFilter] = useState<FilterMenu>(null);
  const [priceModalOpen, setPriceModalOpen] = useState(false);

  const minPriceNumber = useMemo(() => toNumberOrNull(minPrice), [minPrice]);
  const maxPriceNumber = useMemo(() => toNumberOrNull(maxPrice), [maxPrice]);

  const priceFilterLabel = useMemo(() => {
    if (minPriceNumber === null && maxPriceNumber === null) return "";

    if (minPriceNumber !== null && maxPriceNumber !== null) {
      return `¥${minPriceNumber.toLocaleString()} - ¥${maxPriceNumber.toLocaleString()}`;
    }

    if (minPriceNumber !== null) {
      return `¥${minPriceNumber.toLocaleString()}+`;
    }

    return `〜¥${maxPriceNumber?.toLocaleString()}`;
  }, [minPriceNumber, maxPriceNumber]);

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

      const matchesFollowers = getFollowerMatch(
        creator.followerRange,
        followersFilter
      );

      const matchesDealType = getDealTypeMatch(creator, dealTypeFilter);

      const matchesMenuContent = getMenuContentMatch(
        creator,
        menuContentFilter
      );

      const matchesLocation =
        locationFilter === "all" ||
        normalizeText(creator.prefecture) === normalizeText(locationFilter);

      const hasPriceFilter = minPriceNumber !== null || maxPriceNumber !== null;

      const matchesPrice =
        !hasPriceFilter ||
        (creator.startingPrice !== null &&
          (minPriceNumber === null || creator.startingPrice >= minPriceNumber) &&
          (maxPriceNumber === null || creator.startingPrice <= maxPriceNumber));

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
    followersFilter,
    dealTypeFilter,
    menuContentFilter,
    locationFilter,
    minPriceNumber,
    maxPriceNumber,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (platformFilter !== "all") count += 1;
    if (categoryFilter !== "all") count += 1;
    if (followersFilter !== "all") count += 1;
    if (dealTypeFilter !== "all") count += 1;
    if (menuContentFilter !== "all") count += 1;
    if (locationFilter !== "all") count += 1;
    if (minPriceNumber !== null || maxPriceNumber !== null) count += 1;

    return count;
  }, [
    platformFilter,
    categoryFilter,
    followersFilter,
    dealTypeFilter,
    menuContentFilter,
    locationFilter,
    minPriceNumber,
    maxPriceNumber,
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
    setFollowersFilter("all");
    setDealTypeFilter("all");
    setMenuContentFilter("all");
    setLocationFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setOpenFilter(null);
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
        <section className="mx-auto max-w-5xl rounded-[34px] border border-slate-100 bg-white p-5 shadow-[rgba(120,120,170,0.15)_0_2px_16px_0]">
          <div className="grid gap-3 md:grid-cols-[220px_1fr_64px]">
            <div className="h-16 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-16 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-16 animate-pulse rounded-full bg-slate-950/10" />
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
    <div className="space-y-9 pb-10">
      <div ref={filterRootRef} className="relative z-50 mx-auto max-w-5xl">
        <section className="rounded-[34px] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:p-5">
          <div className="grid gap-0 overflow-visible rounded-[28px] border border-slate-100 md:grid-cols-[220px_minmax(0,1fr)_64px]">
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
                  <span className="mt-1 flex items-center gap-2 text-base font-medium text-slate-900">
                    {platformFilter === "all" ? null : getPlatformIcon(platformFilter)}
                    {platformFilter === "all"
                      ? copy.any
                      : getPlatformLabel(platformFilter)}
                  </span>
                </span>
                <ChevronDownIcon />
              </button>

              {openFilter === "platform" ? (
                <DropdownShell className="w-[min(360px,calc(100vw-40px))]">
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
                  <span className="mt-1 block truncate text-base font-medium text-slate-900">
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
                setPriceModalOpen(false);
              }}
              className="flex min-h-[62px] items-center justify-center rounded-full bg-slate-950 text-white transition duration-150 hover:-translate-y-0.5 hover:shadow-xl md:m-2 md:min-h-0"
              aria-label="Search"
            >
              <SearchIcon />
            </button>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative shrink-0">
              <FilterPill
                label={copy.followers}
                value={
                  followersFilter === "all"
                    ? ""
                    : FOLLOWER_OPTIONS.find((item) => item.value === followersFilter)
                        ?.label
                }
                active={followersFilter !== "all"}
                onClick={() =>
                  setOpenFilter((prev) =>
                    prev === "followers" ? null : "followers"
                  )
                }
              />

              {openFilter === "followers" ? (
                <DropdownShell className="w-[min(320px,calc(100vw-40px))]">
                  {FOLLOWER_OPTIONS.map((item) => (
                    <DropdownOption
                      key={item.value}
                      active={followersFilter === item.value}
                      onClick={() => {
                        setFollowersFilter(item.value);
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
                value={locationFilter === "all" ? "" : locationFilter}
                active={locationFilter !== "all"}
                onClick={() =>
                  setOpenFilter((prev) => (prev === "location" ? null : "location"))
                }
              />

              {openFilter === "location" ? (
                <DropdownShell className="w-[min(360px,calc(100vw-40px))] p-4">
                  <p className="mb-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-500">
                    {copy.locationHelp}
                  </p>

                  <div className="max-h-[320px] space-y-1 overflow-y-auto">
                    <DropdownOption
                      active={locationFilter === "all"}
                      onClick={() => {
                        setLocationFilter("all");
                        setOpenFilter(null);
                      }}
                    >
                      すべて
                    </DropdownOption>

                    {PREFECTURE_OPTIONS.map((prefecture) => (
                      <DropdownOption
                        key={prefecture}
                        active={locationFilter === prefecture}
                        onClick={() => {
                          setLocationFilter(prefecture);
                          setOpenFilter(null);
                        }}
                      >
                        {prefecture}
                      </DropdownOption>
                    ))}
                  </div>
                </DropdownShell>
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
        </section>
      </div>

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

      <section className="relative z-0">
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

      {priceModalOpen ? (
        <PriceModal
          minPrice={minPrice}
          maxPrice={maxPrice}
          setMinPrice={setMinPrice}
          setMaxPrice={setMaxPrice}
          onClose={() => setPriceModalOpen(false)}
        />
      ) : null}
    </div>
  );
}