// File: app/creator/profile/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorBadge,
  CreatorButton,
  CreatorField,
  CreatorInput,
  CreatorNotice,
  CreatorPage,
  CreatorSelect,
  CreatorSkeleton,
  CreatorStickyFooter,
} from "@/app/creator/_components/CreatorDesignSystem";

type Locale = "ja" | "en";

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  category: string | null;
  country: string | null;
  prefecture: string | null;
  city: string | null;
  can_receive_products: boolean | null;
  content_language: string | null;
  response_language: string | null;
  sub_categories: string[] | null;
  avatar_url: string | null;
  approval_status: "pending" | "approved" | "rejected" | string | null;
};

type PortfolioAssetRow = {
  id: string;
  creator_id: string;
  asset_url: string;
  asset_type: "image" | "video" | string;
  title: string | null;
  sort_order: number;
  is_public: boolean;
  created_at: string;
  updated_at?: string | null;
};

type SocialAccountRow = {
  platform: string;
  url: string;
  handle?: string | null;
  follower_range: string;
  audience_country: string;
};

type SocialAccountForm = {
  platform: string;
  username_or_url: string;
  follower_range: string;
  audience_country: string;
};

type LineLinkInfo = {
  id?: string;
  line_user_id?: string | null;
  line_display_name?: string | null;
  line_picture_url?: string | null;
  is_enabled?: boolean | null;
  linked_at?: string | null;
  blocked_at?: string | null;
};

type LocaleOption = {
  value: string;
  ja: string;
  en: string;
};

const CREATOR_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_CREATOR_IMAGE_BUCKET || "creator-assets";

const LINE_OFFICIAL_URL = process.env.NEXT_PUBLIC_LINE_OFFICIAL_URL || "";

const COUNTRY_DEFAULT = "日本";

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
    en: "Beauty",
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
    en: "Fitness",
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
    en: "Food",
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
    en: "Travel",
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
    en: "Lifestyle",
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
    en: "Creative",
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

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "X", "Website"];

const FOLLOWER_RANGE_OPTIONS = [
  "1,000未満",
  "1,000〜5,000",
  "5,000〜10,000",
  "10,000〜30,000",
  "30,000〜50,000",
  "50,000〜100,000",
  "100,000〜300,000",
  "300,000〜500,000",
  "500,000〜1,000,000",
  "1,000,000以上",
];

const FOLLOWER_RANGE_OPTIONS_EN: Record<string, string> = {
  "1,000未満": "Under 1,000",
  "1,000〜5,000": "1,000–5,000",
  "5,000〜10,000": "5,000–10,000",
  "10,000〜30,000": "10,000–30,000",
  "30,000〜50,000": "30,000–50,000",
  "50,000〜100,000": "50,000–100,000",
  "100,000〜300,000": "100,000–300,000",
  "300,000〜500,000": "300,000–500,000",
  "500,000〜1,000,000": "500,000–1,000,000",
  "1,000,000以上": "1,000,000+",
};

const AUDIENCE_COUNTRY_OPTIONS = [
  "日本",
  "韓国",
  "台湾",
  "香港",
  "中国",
  "タイ",
  "ベトナム",
  "インドネシア",
  "フィリピン",
  "マレーシア",
  "シンガポール",
  "インド",
  "アメリカ",
  "カナダ",
  "イギリス",
  "フランス",
  "ドイツ",
  "オーストラリア",
  "その他",
];

const AUDIENCE_COUNTRY_OPTIONS_EN: Record<string, string> = {
  日本: "Japan",
  韓国: "Korea",
  台湾: "Taiwan",
  香港: "Hong Kong",
  中国: "China",
  タイ: "Thailand",
  ベトナム: "Vietnam",
  インドネシア: "Indonesia",
  フィリピン: "Philippines",
  マレーシア: "Malaysia",
  シンガポール: "Singapore",
  インド: "India",
  アメリカ: "United States",
  カナダ: "Canada",
  イギリス: "United Kingdom",
  フランス: "France",
  ドイツ: "Germany",
  オーストラリア: "Australia",
  その他: "Other",
};

const LANGUAGE_OPTIONS: LocaleOption[] = [
  { value: "日本語", ja: "日本語", en: "Japanese" },
  { value: "英語", ja: "英語", en: "English" },
  { value: "韓国語", ja: "韓国語", en: "Korean" },
  { value: "中国語", ja: "中国語", en: "Chinese" },
  { value: "その他", ja: "その他", en: "Other" },
];

const MENU_PREVIEW_BADGES = [
  "Instagram投稿",
  "Instagramリール",
  "TikTok投稿",
  "UGC制作",
];

function createEmptySocial(): SocialAccountForm {
  return {
    platform: "",
    username_or_url: "",
    follower_range: "",
    audience_country: "日本",
  };
}

function optionLabel(option: LocaleOption, locale: Locale) {
  return locale === "ja" ? option.ja : option.en;
}

function formatOption(
  value: string,
  locale: Locale,
  enMap: Record<string, string>,
) {
  return locale === "ja" ? value : enMap[value] ?? value;
}

function fileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

function normalizeHandle(input: string) {
  return input.trim().replace(/^@/, "");
}

function getSocialConfig(platform: string, locale: Locale) {
  if (platform === "Instagram") {
    return {
      prefix: "instagram.com/",
      placeholder: "yourname",
      guide: locale === "ja" ? "@なしで入力" : "No @ needed.",
    };
  }

  if (platform === "TikTok") {
    return {
      prefix: "tiktok.com/@",
      placeholder: "yourname",
      guide: locale === "ja" ? "@なしで入力" : "No @ needed.",
    };
  }

  if (platform === "YouTube") {
    return {
      prefix: "youtube.com/@",
      placeholder: "yourchannel",
      guide: locale === "ja" ? "ハンドル名を入力" : "Enter handle.",
    };
  }

  if (platform === "X") {
    return {
      prefix: "x.com/",
      placeholder: "yourname",
      guide: locale === "ja" ? "ユーザー名を入力" : "Enter username.",
    };
  }

  if (platform === "Website") {
    return {
      prefix: "",
      placeholder: "https://example.com",
      guide: locale === "ja" ? "URLを入力" : "Enter URL.",
    };
  }

  return {
    prefix: "",
    placeholder: locale === "ja" ? "ユーザー名" : "Username",
    guide: locale === "ja" ? "媒体を選択してください" : "Select platform.",
  };
}

function buildSocialPreview(platform: string, handle: string) {
  const normalized = normalizeHandle(handle);

  if (!platform || !normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (platform === "Instagram") return `https://www.instagram.com/${normalized}`;
  if (platform === "TikTok") return `https://www.tiktok.com/@${normalized}`;
  if (platform === "YouTube") return `https://www.youtube.com/@${normalized}`;
  if (platform === "X") return `https://x.com/${normalized}`;

  return normalized;
}

function extractHandleFromUrl(platform: string, url: string, handle?: string | null) {
  if (handle?.trim()) return handle.trim();

  const value = url.trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    const path = parsed.pathname.replace(/^\/+|\/+$/g, "");

    if (platform === "Instagram") {
      return path.split("/")[0] ?? value;
    }

    if (platform === "TikTok") {
      return (path.split("/")[0] ?? "").replace(/^@/, "") || value;
    }

    if (platform === "YouTube") {
      return (path.split("/")[0] ?? "").replace(/^@/, "") || value;
    }

    if (platform === "X") {
      return path.split("/")[0] ?? value;
    }

    return value;
  } catch {
    return value.replace(/^@/, "");
  }
}

function getPublicStatusLabel(status: string | null, locale: Locale) {
  if (locale === "ja") {
    if (status === "approved") return "企業に表示中";
    if (status === "pending") return "確認中";
    if (status === "rejected") return "確認が必要";
    return "確認中";
  }

  if (status === "approved") return "Visible";
  if (status === "pending") return "Reviewing";
  if (status === "rejected") return "Needs check";
  return "Reviewing";
}

function getPublicStatusTone(status: string | null): "green" | "red" | "amber" {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "amber";
}

function fallbackInitial(name: string) {
  return (name || "T").slice(0, 1).toUpperCase();
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m8 15 2.5-3 2 2.3 1.5-1.8 3 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M6 7h12M6 12h12M6 17h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SnsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 8.5h.01M7.5 21h9A4.5 4.5 0 0 0 21 16.5v-9A4.5 4.5 0 0 0 16.5 3h-9A4.5 4.5 0 0 0 3 7.5v9A4.5 4.5 0 0 0 7.5 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function YenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m7 5 5 7 5-7M12 12v7M8 13h8M8 16h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 4C7.6 4 4 6.9 4 10.5c0 3.2 2.7 5.9 6.4 6.4.3.1.5.3.5.6v1.8c0 .4.5.6.8.3l2.4-2.2c.2-.2.4-.2.7-.3 3.1-.8 5.2-3.4 5.2-6.5C20 6.9 16.4 4 12 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 10.2h1.7M8 12.3h1.7M11.2 10.2v2.1M13.1 10.2v2.1l1.8-2.1v2.1M16.3 10.2h1.7M16.3 12.3h1.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreatorAvatar({
  name,
  src,
}: {
  name: string;
  src: string | null | undefined;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-16 w-16 shrink-0 rounded-[24px] object-cover shadow-sm ring-1 ring-slate-100"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-rose-50 text-xl font-black text-[#ff3860] ring-1 ring-rose-100">
      {fallbackInitial(name)}
    </div>
  );
}

function PlatformBadge({
  platform,
  selected,
  onClick,
}: {
  platform: string;
  selected: boolean;
  onClick: () => void;
}) {
  const platformClass =
    platform === "Instagram"
      ? selected
        ? "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 text-white ring-transparent"
        : "bg-white text-rose-600 ring-rose-100"
      : platform === "TikTok"
        ? selected
          ? "bg-slate-950 text-white ring-slate-950"
          : "bg-white text-slate-900 ring-slate-200"
        : platform === "YouTube"
          ? selected
            ? "bg-red-600 text-white ring-red-600"
            : "bg-white text-red-600 ring-red-100"
          : platform === "X"
            ? selected
              ? "bg-slate-950 text-white ring-slate-950"
              : "bg-white text-slate-800 ring-slate-200"
            : selected
              ? "bg-blue-600 text-white ring-blue-600"
              : "bg-white text-blue-700 ring-blue-100";

  const icon =
    platform === "Instagram"
      ? "◎"
      : platform === "TikTok"
        ? "♪"
        : platform === "YouTube"
          ? "▶"
          : platform === "X"
            ? "𝕏"
            : "↗";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ring-1 transition active:scale-[0.98] ${platformClass}`}
    >
      <span className="text-[13px] leading-none">{icon}</span>
      {platform}
    </button>
  );
}

function ProfilePhotoPicker({
  label,
  currentUrl,
  previewUrl,
  noImageLabel,
  buttonLabel,
  onChange,
}: {
  label: string;
  currentUrl: string | null;
  previewUrl: string | null;
  noImageLabel: string;
  buttonLabel: string;
  onChange: (file: File | null) => void;
}) {
  const src = previewUrl || currentUrl;

  return (
    <div className="rounded-[24px] bg-white p-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-4">
        {src ? (
          <img
            src={src}
            alt={label}
            className="h-20 w-20 shrink-0 rounded-[26px] object-cover ring-1 ring-slate-100"
          />
        ) : (
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[26px] bg-slate-50 text-sm font-semibold text-slate-300 ring-1 ring-slate-100">
            {noImageLabel}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-[-0.035em] text-slate-950">
            {label}
          </p>
          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            企業が最初に見る写真です。
          </p>

          <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-50 px-4 py-2 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-100 transition active:scale-[0.98]">
            {buttonLabel}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0] ?? null;
                onChange(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function PortfolioUploadBox({
  pendingCount,
  buttonLabel,
  selectedLabel,
  onChange,
}: {
  pendingCount: number;
  buttonLabel: string;
  selectedLabel: string;
  onChange: (files: File[]) => void;
}) {
  return (
    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white p-4 text-center transition active:scale-[0.98]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-xl font-semibold text-[#ff3860] ring-1 ring-rose-100">
        +
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-slate-700">
        {buttonLabel}
      </p>

      {pendingCount > 0 ? (
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          {selectedLabel}：{pendingCount}
        </p>
      ) : null}

      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(event.target.files ?? []);
          onChange(files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function PortfolioImage({
  src,
  label,
  onDelete,
  deleting,
  deleteLabel,
}: {
  src: string;
  label: string;
  onDelete?: () => void;
  deleting?: boolean;
  deleteLabel: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[22px] bg-slate-100">
      <img src={src} alt={label} className="aspect-square w-full object-cover" />

      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="absolute right-2 top-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition active:scale-95 disabled:opacity-60"
        >
          {deleting ? "..." : deleteLabel}
        </button>
      ) : null}
    </div>
  );
}

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-[24px] bg-white p-4 ring-1 ring-slate-100 sm:p-5">
      <div className="mb-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.04em] text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function formatLineDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function LineConnectionCard({
  locale,
  copy,
  loading,
  linked,
  linkInfo,
  code,
  expiresAt,
  generating,
  unlinking,
  onGenerate,
  onUnlink,
}: {
  locale: Locale;
  copy: {
    lineTitle: string;
    lineBody: string;
    lineLinked: string;
    lineNotLinked: string;
    lineConnectedAs: string;
    lineGenerate: string;
    lineGenerating: string;
    lineUnlink: string;
    lineUnlinking: string;
    lineCodeLabel: string;
    lineCodeHelp: string;
    lineExpires: string;
    lineOpenLine: string;
    lineOfficialMissing: string;
    lineLoading: string;
  };
  loading: boolean;
  linked: boolean;
  linkInfo: LineLinkInfo | null;
  code: string | null;
  expiresAt: string | null;
  generating: boolean;
  unlinking: boolean;
  onGenerate: () => void;
  onUnlink: () => void;
}) {
  return (
    <section className="rounded-[24px] bg-white p-4 ring-1 ring-slate-100 sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-[18px] ring-1 ${
            linked
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-slate-50 text-slate-700 ring-slate-100"
          }`}
        >
          <LineIcon />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-semibold tracking-[-0.04em] text-slate-950">
              {copy.lineTitle}
            </h2>

            <CreatorBadge tone={linked ? "green" : "amber"}>
              {loading ? copy.lineLoading : linked ? copy.lineLinked : copy.lineNotLinked}
            </CreatorBadge>
          </div>

          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            {copy.lineBody}
          </p>

          {linked ? (
            <div className="mt-4 rounded-[20px] bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
              <p className="text-[12px] font-semibold text-emerald-800">
                {copy.lineConnectedAs}
                {linkInfo?.line_display_name ? `：${linkInfo.line_display_name}` : ""}
              </p>
              {linkInfo?.linked_at ? (
                <p className="mt-1 text-[11px] font-medium text-emerald-700/80">
                  {formatLineDate(linkInfo.linked_at, locale)}
                </p>
              ) : null}
            </div>
          ) : code ? (
            <div className="mt-4 rounded-[22px] bg-slate-950 px-4 py-4 text-white">
              <p className="text-[11px] font-medium text-white/60">
                {copy.lineCodeLabel}
              </p>

              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="font-mono text-[28px] font-semibold tracking-[0.18em]">
                  {code}
                </p>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(code)}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/10 transition active:scale-[0.98]"
                >
                  COPY
                </button>
              </div>

              <p className="mt-3 text-[12px] font-medium leading-5 text-white/72">
                {copy.lineCodeHelp}
              </p>

              {expiresAt ? (
                <p className="mt-2 text-[11px] font-medium text-white/50">
                  {copy.lineExpires}：{formatLineDate(expiresAt, locale)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {linked ? (
              <button
                type="button"
                onClick={onUnlink}
                disabled={unlinking}
                className="rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {unlinking ? copy.lineUnlinking : copy.lineUnlink}
              </button>
            ) : (
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="rounded-full bg-slate-950 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.12)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? copy.lineGenerating : copy.lineGenerate}
              </button>
            )}

            {LINE_OFFICIAL_URL ? (
              <a
                href={LINE_OFFICIAL_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-emerald-50 px-4 py-2 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-100 transition active:scale-[0.98]"
              >
                {copy.lineOpenLine}
              </a>
            ) : (
              <span className="rounded-full bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-400 ring-1 ring-slate-100">
                {copy.lineOfficialMissing}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickLink({
  href,
  icon,
  title,
  body,
  badges,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
  badges?: string[];
}) {
  return (
    <Link
      href={href}
      className="block rounded-[22px] bg-white px-4 py-3.5 ring-1 ring-slate-100 transition active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[17px] bg-slate-50 text-slate-600 ring-1 ring-slate-100">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold tracking-[-0.03em] text-slate-950">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-[12px] font-medium text-slate-500">
            {body}
          </span>
        </span>
        <span className="text-slate-300">
          <ChevronIcon />
        </span>
      </div>

      {badges?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5 pl-[52px]">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-[#ff3860] ring-1 ring-rose-100"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

export default function CreatorProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale: Locale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "プロフィール",
            subtitle: "企業に表示・検索される情報を整えます。",
            username: "ユーザーネーム",
            usernamePlaceholder: "例：yuna_beauty",
            usernameHelp:
              "公開プロフィールURLや検索で使われます。英小文字・数字・_・- が使えます。",
            categoryTitle: "ジャンル",
            categoryBody: "得意なジャンルを5つまで選んでください。",
            categoryCount: "選択中",
            areaTitle: "対応エリア",
            areaBody: "体験対応エリアと商品配送PRの可否を設定します。",
            prefecture: "体験対応エリア",
            selectPrefecture: "都道府県を選択",
            productPr: "商品配送PR",
            productPrYes: "商品を受け取ってPRできる",
            productPrNo: "商品配送PRは受け付けない",
            contentLanguage: "発信言語",
            responseLanguage: "対応言語",
            photoSection: "プロフィール画像",
            photoBody: "企業が最初に見るメイン画像です。",
            avatar: "プロフィール画像",
            imageChoose: "写真を選択",
            noImage: "画像なし",
            portfolioTitle: "ポートフォリオ",
            portfolioBody: "企業に見せたい実績画像だけを追加します。",
            portfolioUpload: "画像を追加",
            portfolioEmpty: "投稿実績や雰囲気が伝わる画像を追加してください。",
            selectedImages: "選択中",
            socialTitle: "SNSアカウント",
            socialBody: "サインアップ時と同じ形式で、主要SNSだけを管理します。",
            socialItem: "SNS",
            socialHandle: "ユーザーネーム / URL",
            followerRange: "フォロワー数",
            audienceCountry: "主な視聴者",
            urlPreview: "URL",
            addSocial: "SNSを追加",
            remove: "削除",
            removeConfirm: "この画像を削除しますか？",
            saving: "保存中...",
            save: "保存する",
            selectPlease: "選択してください",
            creatorNotFound: "クリエイター情報が見つかりませんでした。",
            usernameRequired: "ユーザーネームを入力してください",
            usernameInvalid:
              "ユーザーネームは英小文字・数字・アンダースコア・ハイフンのみで3〜30文字です",
            usernameDuplicate: "このユーザーネームは既に使われています",
            categoryRequired: "ジャンルを1つ以上選択してください",
            categoryLimit: "ジャンルは5つまで選択できます",
            areaRequired: "体験対応できるエリアを選択してください",
            productPrRequired: "商品配送PRの可否を選択してください",
            languageRequired: "発信言語と対応言語を選択してください",
            socialRequired: "SNSを少なくとも1件、正しく入力してください",
            socialIncomplete: "SNSに未入力の項目があります",
            missingCreatorId: "creator_id を取得できませんでした。",
            missingUserId: "user_id を取得できませんでした。",
            saved: "保存しました。",
            saveError: "保存中にエラーが発生しました。",
            uploadFailed: "画像アップロードに失敗しました。",
            settings: "関連設定",
            menusTitle: "メニュー・価格",
            menusBody: "企業が購入できるメニューを管理",
            payoutsTitle: "報酬受け取り",
            payoutsBody: "受取設定と報酬履歴を確認",
            statusPrefix: "表示状態",
            japanesePrefectureOnly: "日本以外の場合は地域名を入力できます。",
            snsGuide: "媒体を選ぶと入力形式が変わります。",
            portfolioRecommended: "3枚以上がおすすめ",
            lineTitle: "LINE通知",
            lineBody:
              "新しい注文・メッセージ・修正依頼・完了通知をLINEで受け取れます。",
            lineLinked: "連携済み",
            lineNotLinked: "未連携",
            lineConnectedAs: "連携中",
            lineGenerate: "連携コードを発行",
            lineGenerating: "発行中...",
            lineUnlink: "連携を解除",
            lineUnlinking: "解除中...",
            lineCodeLabel: "LINE連携コード",
            lineCodeHelp:
              "LINE公式アカウントを友だち追加し、この6桁コードをそのまま送信してください。",
            lineExpires: "有効期限",
            lineOpenLine: "LINEを開く",
            lineOfficialMissing: "LINE公式URL未設定",
            lineLoading: "確認中",
            lineCodeCreated: "LINE連携コードを発行しました。",
            lineUnlinked: "LINE連携を解除しました。",
            lineLoadFailed: "LINE連携状況を取得できませんでした。",
            lineCreateFailed: "LINE連携コードを発行できませんでした。",
            lineUnlinkFailed: "LINE連携を解除できませんでした。",
          }
        : {
            title: "Profile",
            subtitle: "Update information shown to brands and search.",
            username: "Username",
            usernamePlaceholder: "Example: yuna_beauty",
            usernameHelp:
              "Used for your public profile URL and search. Lowercase letters, numbers, _ and - are allowed.",
            categoryTitle: "Categories",
            categoryBody: "Select up to 5 categories.",
            categoryCount: "Selected",
            areaTitle: "Area",
            areaBody: "Set your available area and product PR setting.",
            prefecture: "Available area",
            selectPrefecture: "Select prefecture",
            productPr: "Product shipping PR",
            productPrYes: "I can receive products",
            productPrNo: "I do not accept shipped product PR",
            contentLanguage: "Content language",
            responseLanguage: "Response language",
            photoSection: "Profile image",
            photoBody: "The main image brands will see first.",
            avatar: "Profile image",
            imageChoose: "Choose photo",
            noImage: "No image",
            portfolioTitle: "Portfolio",
            portfolioBody: "Add only images you want brands to review.",
            portfolioUpload: "Add image",
            portfolioEmpty: "Add images that show your past posts or style.",
            selectedImages: "Selected",
            socialTitle: "Social accounts",
            socialBody: "Manage main social accounts in the same format as sign-up.",
            socialItem: "SNS",
            socialHandle: "Username / URL",
            followerRange: "Follower range",
            audienceCountry: "Main audience country",
            urlPreview: "URL",
            addSocial: "Add social",
            remove: "Remove",
            removeConfirm: "Delete this image?",
            saving: "Saving...",
            save: "Save",
            selectPlease: "Please select",
            creatorNotFound: "Creator information was not found.",
            usernameRequired: "Please enter your username",
            usernameInvalid:
              "Username must be 3–30 characters using lowercase letters, numbers, underscores, or hyphens",
            usernameDuplicate: "This username is already in use",
            categoryRequired: "Please select at least one category",
            categoryLimit: "You can select up to 5 categories",
            areaRequired: "Please select your available area",
            productPrRequired: "Please select whether you can receive products",
            languageRequired: "Please select content and response languages",
            socialRequired: "Please add at least one valid social account",
            socialIncomplete: "One or more social account fields are incomplete",
            missingCreatorId: "Could not retrieve creator_id.",
            missingUserId: "Could not retrieve user_id.",
            saved: "Saved.",
            saveError: "An error occurred while saving.",
            uploadFailed: "Failed to upload image.",
            settings: "Related settings",
            menusTitle: "Menus & rates",
            menusBody: "Manage menus brands can order.",
            payoutsTitle: "Payouts",
            payoutsBody: "Check payout setup and history.",
            statusPrefix: "Status",
            japanesePrefectureOnly: "Enter the area name for countries outside Japan.",
            snsGuide: "Input format changes by platform.",
            portfolioRecommended: "3+ recommended",
            lineTitle: "LINE notifications",
            lineBody:
              "Receive new order, message, revision, and completion alerts on LINE.",
            lineLinked: "Linked",
            lineNotLinked: "Not linked",
            lineConnectedAs: "Connected as",
            lineGenerate: "Generate code",
            lineGenerating: "Generating...",
            lineUnlink: "Unlink",
            lineUnlinking: "Unlinking...",
            lineCodeLabel: "LINE link code",
            lineCodeHelp:
              "Add the official LINE account and send this 6-character code in the chat.",
            lineExpires: "Expires",
            lineOpenLine: "Open LINE",
            lineOfficialMissing: "LINE URL not set",
            lineLoading: "Checking",
            lineCodeCreated: "LINE link code generated.",
            lineUnlinked: "LINE connection removed.",
            lineLoadFailed: "Failed to load LINE connection status.",
            lineCreateFailed: "Failed to generate LINE link code.",
            lineUnlinkFailed: "Failed to unlink LINE.",
          },
    [safeLocale],
  );

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [country] = useState(COUNTRY_DEFAULT);
  const [prefecture, setPrefecture] = useState("");
  const [canReceiveProductsChoice, setCanReceiveProductsChoice] = useState("");
  const [contentLanguage, setContentLanguage] = useState("日本語");
  const [responseLanguage, setResponseLanguage] = useState("日本語");

  const [activeGenreGroup, setActiveGenreGroup] = useState(GENRE_GROUPS[0].key);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAssetRow[]>(
    [],
  );
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<string | null>(
    null,
  );

  const [socialAccounts, setSocialAccounts] = useState<SocialAccountForm[]>([
    createEmptySocial(),
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [lineLoading, setLineLoading] = useState(false);
  const [lineGenerating, setLineGenerating] = useState(false);
  const [lineUnlinking, setLineUnlinking] = useState(false);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineLinkInfo, setLineLinkInfo] = useState<LineLinkInfo | null>(null);
  const [lineCode, setLineCode] = useState<string | null>(null);
  const [lineCodeExpiresAt, setLineCodeExpiresAt] = useState<string | null>(null);

  const activeGenre = useMemo(
    () =>
      GENRE_GROUPS.find((group) => group.key === activeGenreGroup) ??
      GENRE_GROUPS[0],
    [activeGenreGroup],
  );

  const portfolioTotalCount = portfolioAssets.length + portfolioFiles.length;
  const profileName = displayName || "Trendre";

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  };

  const loadLineStatus = async () => {
    const token = await getAccessToken();

    if (!token) return;

    setLineLoading(true);

    try {
      const res = await fetch("/api/line/link-code", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json()) as {
        ok?: boolean;
        linked?: boolean;
        link?: LineLinkInfo | null;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || copy.lineLoadFailed);
      }

      setLineLinked(Boolean(json.linked));
      setLineLinkInfo(json.link ?? null);
    } catch (lineStatusError) {
      console.error("line status load error:", lineStatusError);
    } finally {
      setLineLoading(false);
    }
  };

  const generateLineLinkCode = async () => {
    const token = await getAccessToken();

    if (!token) {
      setError(copy.lineCreateFailed);
      return;
    }

    setLineGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/line/link-code", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json()) as {
        ok?: boolean;
        code?: string;
        expires_at?: string;
        error?: string;
      };

      if (!res.ok || !json.code) {
        throw new Error(json.error || copy.lineCreateFailed);
      }

      setLineCode(json.code);
      setLineCodeExpiresAt(json.expires_at ?? null);
      setLineLinked(false);
      setSuccess(copy.lineCodeCreated);
    } catch (lineCodeError) {
      console.error("line code create error:", lineCodeError);
      setError(copy.lineCreateFailed);
    } finally {
      setLineGenerating(false);
    }
  };

  const unlinkLine = async () => {
    const token = await getAccessToken();

    if (!token) {
      setError(copy.lineUnlinkFailed);
      return;
    }

    setLineUnlinking(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/line/link-code", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || copy.lineUnlinkFailed);
      }

      setLineLinked(false);
      setLineLinkInfo(null);
      setLineCode(null);
      setLineCodeExpiresAt(null);
      setSuccess(copy.lineUnlinked);
    } catch (lineUnlinkError) {
      console.error("line unlink error:", lineUnlinkError);
      setError(copy.lineUnlinkFailed);
    } finally {
      setLineUnlinking(false);
    }
  };

  const loadPortfolioAssets = async (creatorIdValue: string) => {
    const { data, error: portfolioError } = await supabase
      .from("creator_portfolio_assets")
      .select(
        "id, creator_id, asset_url, asset_type, title, sort_order, is_public, created_at, updated_at",
      )
      .eq("creator_id", creatorIdValue)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (portfolioError) {
      throw portfolioError;
    }

    setPortfolioAssets((data ?? []) as PortfolioAssetRow[]);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: creator, error: creatorError } = await supabase
        .from("creators")
        .select(
          "id, user_id, display_name, category, country, prefecture, city, can_receive_products, content_language, response_language, sub_categories, avatar_url, approval_status",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (creatorError) {
        setError(creatorError.message);
        setLoading(false);
        return;
      }

      if (!creator) {
        setError(copy.creatorNotFound);
        setLoading(false);
        return;
      }

      const creatorRow = creator as CreatorRow;
      const nextCategories =
        Array.isArray(creatorRow.sub_categories) && creatorRow.sub_categories.length > 0
          ? creatorRow.sub_categories
          : creatorRow.category
            ? [creatorRow.category]
            : [];

      const matchingGroup =
        GENRE_GROUPS.find((group) =>
          group.items.some((item) => nextCategories.includes(item)),
        ) ?? GENRE_GROUPS[0];

      setCreatorId(creatorRow.id);
      setCreatorUserId(creatorRow.user_id);
      setApprovalStatus(creatorRow.approval_status ?? null);
      setDisplayName(creatorRow.display_name ?? "");
      setPrefecture(creatorRow.prefecture ?? "");
      setCanReceiveProductsChoice(
        creatorRow.can_receive_products === true
          ? "yes"
          : creatorRow.can_receive_products === false
            ? "no"
            : "",
      );
      setContentLanguage(creatorRow.content_language ?? "日本語");
      setResponseLanguage(creatorRow.response_language ?? "日本語");
      setSelectedCategories(nextCategories.slice(0, 5));
      setActiveGenreGroup(matchingGroup.key);
      setAvatarUrl(creatorRow.avatar_url ?? null);

      const { data: socials, error: socialError } = await supabase
        .from("creator_social_accounts")
        .select("platform, url, handle, follower_range, audience_country")
        .eq("creator_id", creatorRow.id)
        .order("created_at", { ascending: true });

      if (socialError) {
        setError(socialError.message);
        setLoading(false);
        return;
      }

      const socialRows =
        (socials as SocialAccountRow[] | null)?.filter(Boolean) ?? [];

      setSocialAccounts(
        socialRows.length > 0
          ? socialRows.map((row) => ({
              platform: row.platform,
              username_or_url: extractHandleFromUrl(
                row.platform,
                row.url,
                row.handle,
              ),
              follower_range: row.follower_range,
              audience_country: row.audience_country || "日本",
            }))
          : [createEmptySocial()],
      );

      await loadPortfolioAssets(creatorRow.id);
      void loadLineStatus();

      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy.creatorNotFound, router, supabase]);

  const uploadImageAndGetUrl = async (
    file: File,
    creatorIdValue: string,
    kind: "avatar" | "portfolio",
    index?: number,
  ) => {
    const ext = fileExtension(file);
    const suffix =
      typeof index === "number" ? `${Date.now()}-${index}` : `${Date.now()}`;
    const filePath = `${creatorIdValue}/${kind}-${suffix}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .upload(filePath, file, {
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const isValidPublicName = (value: string) => {
    return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(value);
  };

  const validate = () => {
    const normalizedDisplayName = displayName.trim().toLowerCase();

    if (!normalizedDisplayName) return copy.usernameRequired;
    if (!isValidPublicName(normalizedDisplayName)) return copy.usernameInvalid;

    if (selectedCategories.length === 0) return copy.categoryRequired;
    if (selectedCategories.length > 5) return copy.categoryLimit;

    if (!prefecture.trim()) return copy.areaRequired;
    if (!canReceiveProductsChoice) return copy.productPrRequired;

    if (!contentLanguage.trim() || !responseLanguage.trim()) {
      return copy.languageRequired;
    }

    const cleaned = socialAccounts.filter(
      (item) =>
        item.platform.trim() ||
        item.username_or_url.trim() ||
        item.follower_range.trim() ||
        item.audience_country.trim(),
    );

    if (cleaned.length === 0) return copy.socialRequired;

    const hasIncomplete = cleaned.some(
      (item) =>
        !item.platform.trim() ||
        !item.username_or_url.trim() ||
        !item.follower_range.trim() ||
        !item.audience_country.trim(),
    );

    if (hasIncomplete) return copy.socialIncomplete;

    return null;
  };

  const handleImageSelect = (file: File | null) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };

  const handlePortfolioSelect = (files: File[]) => {
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) return;

    const previews = imageFiles.map((file) => URL.createObjectURL(file));

    setPortfolioFiles((prev) => [...prev, ...imageFiles]);
    setPortfolioPreviews((prev) => [...prev, ...previews]);
  };

  const removePendingPortfolio = (index: number) => {
    setPortfolioFiles((prev) => prev.filter((_, i) => i !== index));

    setPortfolioPreviews((prev) => {
      const target = prev[index];

      if (target) {
        URL.revokeObjectURL(target);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const deletePortfolioAsset = async (assetId: string) => {
    if (!window.confirm(copy.removeConfirm)) return;

    setDeletingPortfolioId(assetId);
    setError(null);
    setSuccess(null);

    const { error: deleteError } = await supabase
      .from("creator_portfolio_assets")
      .delete()
      .eq("id", assetId);

    if (deleteError) {
      console.error(deleteError);
      setError(copy.saveError);
      setDeletingPortfolioId(null);
      return;
    }

    setPortfolioAssets((prev) => prev.filter((asset) => asset.id !== assetId));
    setDeletingPortfolioId(null);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!creatorId) {
      setError(copy.missingCreatorId);
      return;
    }

    if (!creatorUserId) {
      setError(copy.missingUserId);
      return;
    }

    setSaving(true);

    try {
      const normalizedDisplayName = displayName.trim().toLowerCase();
      const normalizedPrefecture = prefecture.trim();
      const normalizedContentLanguage = contentLanguage.trim();
      const normalizedResponseLanguage = responseLanguage.trim();
      const normalizedCanReceiveProducts = canReceiveProductsChoice === "yes";
      const normalizedSubCategories = selectedCategories.slice(0, 5);
      const normalizedMainCategory = normalizedSubCategories[0];

      const { data: duplicateProfile, error: duplicateError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalizedDisplayName)
        .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicateProfile && duplicateProfile.id !== creatorUserId) {
        setError(copy.usernameDuplicate);
        setSaving(false);
        return;
      }

      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        finalAvatarUrl = await uploadImageAndGetUrl(
          avatarFile,
          creatorId,
          "avatar",
        );
      }

      if (portfolioFiles.length > 0) {
        const startOrder = portfolioAssets.length;

        const uploadedPortfolioRows = await Promise.all(
          portfolioFiles.map(async (file, index) => {
            const publicUrl = await uploadImageAndGetUrl(
              file,
              creatorId,
              "portfolio",
              index,
            );

            return {
              creator_id: creatorId,
              asset_url: publicUrl,
              asset_type: "image",
              title: file.name,
              sort_order: startOrder + index,
              is_public: true,
            };
          }),
        );

        const { error: insertPortfolioError } = await supabase
          .from("creator_portfolio_assets")
          .insert(uploadedPortfolioRows);

        if (insertPortfolioError) {
          throw insertPortfolioError;
        }
      }

      const now = new Date().toISOString();

      const { error: creatorUpdateError } = await supabase
        .from("creators")
        .update({
          display_name: normalizedDisplayName,
          category: normalizedMainCategory,
          country,
          prefecture: normalizedPrefecture || null,
          city: null,
          can_receive_products: normalizedCanReceiveProducts,
          content_language: normalizedContentLanguage,
          response_language: normalizedResponseLanguage,
          sub_categories: normalizedSubCategories,
          avatar_url: finalAvatarUrl,
          updated_at: now,
        })
        .eq("id", creatorId);

      if (creatorUpdateError) {
        throw creatorUpdateError;
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .upsert({
          id: creatorUserId,
          username: normalizedDisplayName,
          category: normalizedMainCategory,
          avatar_url: finalAvatarUrl,
          is_public: true,
          public_profile_completed: true,
          onboarding_completed: true,
          updated_at: now,
        });

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      const { data: existingState } = await supabase
        .from("user_states")
        .select("user_id")
        .eq("user_id", creatorUserId)
        .maybeSingle();

      if (existingState) {
        const { error: stateUpdateError } = await supabase
          .from("user_states")
          .update({
            creator_profile_completed: true,
            onboarding_completed: true,
            updated_at: now,
          })
          .eq("user_id", creatorUserId);

        if (stateUpdateError) throw stateUpdateError;
      } else {
        const { error: stateInsertError } = await supabase
          .from("user_states")
          .insert({
            user_id: creatorUserId,
            creator_profile_completed: true,
            onboarding_completed: true,
            updated_at: now,
          });

        if (stateInsertError) throw stateInsertError;
      }

      const cleanedSocials = socialAccounts
        .map((item) => ({
          platform: item.platform.trim(),
          username_or_url: normalizeHandle(item.username_or_url),
          follower_range: item.follower_range.trim(),
          audience_country: item.audience_country.trim(),
        }))
        .filter(
          (item) =>
            item.platform &&
            item.username_or_url &&
            item.follower_range &&
            item.audience_country,
        );

      const { error: deleteSocialError } = await supabase
        .from("creator_social_accounts")
        .delete()
        .eq("creator_id", creatorId);

      if (deleteSocialError) {
        throw deleteSocialError;
      }

      if (cleanedSocials.length > 0) {
        const payload = cleanedSocials.map((item) => ({
          creator_id: creatorId,
          platform: item.platform,
          url: buildSocialPreview(item.platform, item.username_or_url),
          handle: normalizeHandle(item.username_or_url),
          follower_range: item.follower_range,
          audience_country: item.audience_country,
        }));

        const { error: insertSocialError } = await supabase
          .from("creator_social_accounts")
          .insert(payload);

        if (insertSocialError) {
          throw insertSocialError;
        }
      }

      await supabase.auth.updateUser({
        data: {
          creator_username: normalizedDisplayName,
          creator_country: country,
          creator_prefecture: normalizedPrefecture || null,
          creator_city: null,
          creator_can_receive_products: normalizedCanReceiveProducts,
          creator_content_language: normalizedContentLanguage,
          creator_response_language: normalizedResponseLanguage,
          creator_sub_categories: normalizedSubCategories,
        },
      });

      setDisplayName(normalizedDisplayName);
      setPrefecture(normalizedPrefecture);
      setCanReceiveProductsChoice(normalizedCanReceiveProducts ? "yes" : "no");
      setContentLanguage(normalizedContentLanguage);
      setResponseLanguage(normalizedResponseLanguage);
      setSelectedCategories(normalizedSubCategories);
      setAvatarUrl(finalAvatarUrl ?? null);
      setAvatarFile(null);

      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      portfolioPreviews.forEach((url) => URL.revokeObjectURL(url));

      setAvatarPreview(null);
      setPortfolioFiles([]);
      setPortfolioPreviews([]);

      await loadPortfolioAssets(creatorId);

      setSuccess(copy.saved);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }

      if (prev.length >= 5) {
        return prev;
      }

      return [...prev, value];
    });
  };

  const updateSocial = (
    index: number,
    key: keyof SocialAccountForm,
    value: string,
  ) => {
    setSocialAccounts((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  };

  const addSocial = () => {
    setSocialAccounts((prev) => [...prev, createEmptySocial()]);
  };

  const removeSocial = (index: number) => {
    setSocialAccounts((prev) => {
      if (prev.length === 1) return [createEmptySocial()];
      return prev.filter((_, i) => i !== index);
    });
  };

  if (loading) {
    return (
      <CreatorPage>
        <CreatorSkeleton className="h-24" />
        <CreatorSkeleton className="h-48" />
        <CreatorSkeleton className="h-64" />
      </CreatorPage>
    );
  }

  return (
    <CreatorPage>
      <section className="rounded-[28px] bg-white p-4 ring-1 ring-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-[-0.045em] text-slate-950">
              {copy.title}
            </h1>
            <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
              {copy.subtitle}
            </p>

            <div className="mt-3">
              <CreatorBadge tone={getPublicStatusTone(approvalStatus)}>
                {copy.statusPrefix}：{getPublicStatusLabel(approvalStatus, safeLocale)}
              </CreatorBadge>
            </div>
          </div>

          <CreatorAvatar name={profileName} src={avatarPreview || avatarUrl} />
        </div>
      </section>

      {error ? (
        <CreatorNotice tone="red" title="Error" description={error} />
      ) : null}

      {success ? (
        <CreatorNotice tone="green" title={success} />
      ) : null}

      <SectionCard title={copy.photoSection} description={copy.photoBody}>
        <ProfilePhotoPicker
          label={copy.avatar}
          currentUrl={avatarUrl}
          previewUrl={avatarPreview}
          noImageLabel={copy.noImage}
          buttonLabel={copy.imageChoose}
          onChange={handleImageSelect}
        />
      </SectionCard>

      <SectionCard title={copy.categoryTitle} description={copy.categoryBody}>
        <div className="rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
          <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GENRE_GROUPS.map((group) => {
              const active = activeGenreGroup === group.key;

              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveGenreGroup(group.key)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-[#ff3860] text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {safeLocale === "ja" ? group.ja : group.en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
          <span className="text-xs font-semibold text-slate-500">
            {copy.categoryCount}
          </span>
          <span className="text-xs font-semibold text-slate-950">
            {selectedCategories.length}/5
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {activeGenre.items.map((item) => {
            const selected = selectedCategories.includes(item);
            const disabled = !selected && selectedCategories.length >= 5;

            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => toggleCategory(item)}
                className={`min-h-[38px] rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  selected
                    ? "bg-[#ff3860] text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {selectedCategories.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selectedCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleCategory(item)}
                className="rounded-full bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#ff3860] ring-1 ring-rose-100"
              >
                {item} ×
              </button>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title={copy.areaTitle} description={copy.areaBody}>
        <div className="grid gap-4">
          <CreatorField label={copy.username} help={copy.usernameHelp}>
            <CreatorInput
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={copy.usernamePlaceholder}
            />
          </CreatorField>

          <CreatorField label={copy.prefecture}>
            <CreatorSelect
              value={prefecture}
              onChange={(e) => setPrefecture(e.target.value)}
            >
              <option value="">{copy.selectPrefecture}</option>
              {PREFECTURE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </CreatorSelect>
          </CreatorField>

          <CreatorField label={copy.productPr}>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setCanReceiveProductsChoice("yes")}
                className={`rounded-2xl px-3 py-3 text-left text-sm font-semibold ring-1 transition ${
                  canReceiveProductsChoice === "yes"
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {copy.productPrYes}
              </button>

              <button
                type="button"
                onClick={() => setCanReceiveProductsChoice("no")}
                className={`rounded-2xl px-3 py-3 text-left text-sm font-semibold ring-1 transition ${
                  canReceiveProductsChoice === "no"
                    ? "bg-rose-50 text-[#ff3860] ring-rose-200"
                    : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {copy.productPrNo}
              </button>
            </div>
          </CreatorField>

          <div className="grid gap-4 sm:grid-cols-2">
            <CreatorField label={copy.contentLanguage}>
              <CreatorSelect
                value={contentLanguage}
                onChange={(e) => setContentLanguage(e.target.value)}
              >
                <option value="">{copy.selectPlease}</option>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option, safeLocale)}
                  </option>
                ))}
              </CreatorSelect>
            </CreatorField>

            <CreatorField label={copy.responseLanguage}>
              <CreatorSelect
                value={responseLanguage}
                onChange={(e) => setResponseLanguage(e.target.value)}
              >
                <option value="">{copy.selectPlease}</option>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option, safeLocale)}
                  </option>
                ))}
              </CreatorSelect>
            </CreatorField>
          </div>
        </div>
      </SectionCard>

      <SectionCard id="sns" title={copy.socialTitle} description={copy.socialBody}>
        <div className="space-y-3">
          {socialAccounts.map((social, index) => {
            const config = getSocialConfig(social.platform, safeLocale);
            const previewUrl = buildSocialPreview(
              social.platform,
              social.username_or_url,
            );

            return (
              <div key={index} className="rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-white text-slate-600 ring-1 ring-slate-100">
                      <SnsIcon />
                    </span>

                    <p className="text-sm font-semibold text-slate-950">
                      {copy.socialItem} {index + 1}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSocial(index)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 transition active:scale-95"
                  >
                    {copy.remove}
                  </button>
                </div>

                <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PLATFORM_OPTIONS.map((platform) => (
                    <PlatformBadge
                      key={platform}
                      platform={platform}
                      selected={social.platform === platform}
                      onClick={() => updateSocial(index, "platform", platform)}
                    />
                  ))}
                </div>

                <div className="grid gap-2.5">
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-slate-700">
                      {copy.socialHandle}
                    </p>

                    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-[#ff5f67] focus-within:ring-4 focus-within:ring-rose-100">
                      {config.prefix ? (
                        <div className="flex max-w-[42%] items-center bg-slate-50 px-2 text-[11px] font-semibold text-slate-400">
                          <span className="truncate">{config.prefix}</span>
                        </div>
                      ) : null}

                      <input
                        value={social.username_or_url}
                        onChange={(e) =>
                          updateSocial(
                            index,
                            "username_or_url",
                            e.target.value,
                          )
                        }
                        className="h-11 min-w-0 flex-1 px-3 text-[15px] font-semibold outline-none"
                        placeholder={config.placeholder}
                      />
                    </div>

                    {previewUrl ? (
                      <p className="mt-1.5 truncate rounded-xl bg-white px-3 py-2 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">
                        {copy.urlPreview}: {previewUrl}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                        {social.platform ? config.guide : copy.snsGuide}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <CreatorSelect
                      value={social.follower_range}
                      onChange={(e) =>
                        updateSocial(index, "follower_range", e.target.value)
                      }
                    >
                      <option value="">{copy.followerRange}</option>
                      {FOLLOWER_RANGE_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {formatOption(
                            item,
                            safeLocale,
                            FOLLOWER_RANGE_OPTIONS_EN,
                          )}
                        </option>
                      ))}
                    </CreatorSelect>

                    <CreatorSelect
                      value={social.audience_country}
                      onChange={(e) =>
                        updateSocial(index, "audience_country", e.target.value)
                      }
                    >
                      <option value="">{copy.audienceCountry}</option>
                      {AUDIENCE_COUNTRY_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {formatOption(
                            item,
                            safeLocale,
                            AUDIENCE_COUNTRY_OPTIONS_EN,
                          )}
                        </option>
                      ))}
                    </CreatorSelect>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <CreatorButton
          type="button"
          variant="secondary"
          onClick={addSocial}
          className="mt-4 w-full"
        >
          + {copy.addSocial}
        </CreatorButton>
      </SectionCard>

      <SectionCard
        id="portfolio"
        title={copy.portfolioTitle}
        description={copy.portfolioBody}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <CreatorBadge tone={portfolioTotalCount >= 3 ? "green" : "amber"}>
            {portfolioTotalCount}/3
          </CreatorBadge>
          <p className="text-[11px] font-medium text-slate-400">
            {copy.portfolioRecommended}
          </p>
        </div>

        {portfolioTotalCount === 0 ? (
          <div className="rounded-[20px] bg-slate-50 px-4 py-5 text-center ring-1 ring-slate-100">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-slate-300 ring-1 ring-slate-100">
              <ImageIcon />
            </div>
            <p className="mt-3 text-[13px] font-medium leading-6 text-slate-500">
              {copy.portfolioEmpty}
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {portfolioAssets.map((asset) => (
            <PortfolioImage
              key={asset.id}
              src={asset.asset_url}
              label={asset.title || copy.portfolioTitle}
              deleting={deletingPortfolioId === asset.id}
              deleteLabel={copy.remove}
              onDelete={() => void deletePortfolioAsset(asset.id)}
            />
          ))}

          {portfolioPreviews.map((preview, index) => (
            <PortfolioImage
              key={preview}
              src={preview}
              label={`${copy.selectedImages} ${index + 1}`}
              deleteLabel={copy.remove}
              onDelete={() => removePendingPortfolio(index)}
            />
          ))}

          <PortfolioUploadBox
            pendingCount={portfolioFiles.length}
            buttonLabel={copy.portfolioUpload}
            selectedLabel={copy.selectedImages}
            onChange={handlePortfolioSelect}
          />
        </div>
      </SectionCard>

      <LineConnectionCard
        locale={safeLocale}
        copy={copy}
        loading={lineLoading}
        linked={lineLinked}
        linkInfo={lineLinkInfo}
        code={lineCode}
        expiresAt={lineCodeExpiresAt}
        generating={lineGenerating}
        unlinking={lineUnlinking}
        onGenerate={() => void generateLineLinkCode()}
        onUnlink={() => void unlinkLine()}
      />

      <SectionCard title={copy.settings}>
        <section className="grid gap-2">
          <QuickLink
            href="/creator/menus"
            icon={<MenuIcon />}
            title={copy.menusTitle}
            body={copy.menusBody}
            badges={MENU_PREVIEW_BADGES}
          />
          <QuickLink
            href="/creator/payouts"
            icon={<YenIcon />}
            title={copy.payoutsTitle}
            body={copy.payoutsBody}
          />
        </section>
      </SectionCard>

      <CreatorStickyFooter>
        <CreatorButton
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? copy.saving : copy.save}
        </CreatorButton>
      </CreatorStickyFooter>
    </CreatorPage>
  );
}
