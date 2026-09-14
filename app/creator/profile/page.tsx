// File: app/creator/profile/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { FaInstagram, FaLine, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/types";
import {
  creatorProfileAudienceCountryLabels,
  creatorProfileCategoryLabels,
  creatorProfileDateLocales,
  creatorProfileDictionary,
  creatorProfileFollowerRangeLabels,
  creatorProfileGenreGroupLabels,
  creatorProfileLanguageLabels,
  creatorProfilePrefectureLabels,
  localizeCreatorProfileValue,
  type CreatorProfileCopy,
} from "@/lib/i18n/creatorProfile";
import LocaleSelector from "@/components/i18n/LocaleSelector";
import CountrySelector from "@/components/creator/CountrySelector";
import {
  canonicalizeCreatorLocation,
  DEFAULT_CREATOR_COUNTRY,
  getCreatorLocationAfterCountryChange,
  getCreatorProfileLocationState,
  JAPAN_PREFECTURES,
  type CreatorCountry,
} from "@/lib/creator/country";
import { isCreatorPaidMarketplaceEnabled } from "@/lib/creator/marketplaceAvailability";
import { useCreatorOnlyRelease } from "../CreatorReleaseMode";
import { AvatarCropPicker } from "@/app/signup/creator/CreatorSignupPolishControls";
import {
  CreatorBadge,
  CreatorButton,
  CreatorField,
  CreatorInput,
  CreatorNotice,
  CreatorPage,
  CreatorSelect,
  CreatorSkeleton,
} from "@/app/creator/_components/CreatorDesignSystem";

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
  is_public: boolean | null;
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

type CanonicalSocialAccount = {
  platform: string;
  url: string;
  handle: string;
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

const CREATOR_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_CREATOR_IMAGE_BUCKET || "creator-assets";

const LINE_OFFICIAL_URL = process.env.NEXT_PUBLIC_LINE_OFFICIAL_URL || "";

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

const LANGUAGE_OPTIONS = ["日本語", "英語", "韓国語", "中国語", "その他"];

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

function fileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

function normalizeHandle(input: string) {
  return input.trim().replace(/^@/, "");
}

function toggleString(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function getSocialConfig(platform: string, copy: CreatorProfileCopy) {
  if (platform === "Instagram") {
    return {
      prefix: "instagram.com/",
      placeholder: "yourname",
      guide: copy.socialNoAt,
    };
  }

  if (platform === "TikTok") {
    return {
      prefix: "tiktok.com/@",
      placeholder: "yourname",
      guide: copy.socialNoAt,
    };
  }

  if (platform === "YouTube") {
    return {
      prefix: "youtube.com/@",
      placeholder: "yourchannel",
      guide: copy.socialHandleGuide,
    };
  }

  if (platform === "X") {
    return {
      prefix: "x.com/",
      placeholder: "yourname",
      guide: copy.socialUsernameGuide,
    };
  }

  if (platform === "Website") {
    return {
      prefix: "",
      placeholder: "https://example.com",
      guide: copy.socialUrlGuide,
    };
  }

  return {
    prefix: "",
    placeholder: copy.socialUsernamePlaceholder,
    guide: copy.socialSelectGuide,
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

function canonicalizeSocialAccounts(
  accounts: SocialAccountForm[],
): CanonicalSocialAccount[] {
  return accounts
    .map((item) => {
      const platform = item.platform.trim();
      const handle = normalizeHandle(item.username_or_url);
      const follower_range = item.follower_range.trim();
      const audience_country = item.audience_country.trim();

      return {
        platform,
        url: buildSocialPreview(platform, handle),
        handle,
        follower_range,
        audience_country,
      };
    })
    .filter(
      (item) =>
        item.platform &&
        item.url &&
        item.handle &&
        item.follower_range &&
        item.audience_country,
    );
}

function socialSnapshotKey(account: CanonicalSocialAccount) {
  return JSON.stringify([
    account.platform,
    account.url,
    account.handle,
    account.follower_range,
    account.audience_country,
  ]);
}

function areCanonicalSocialAccountsEqual(
  left: CanonicalSocialAccount[],
  right: CanonicalSocialAccount[],
) {
  if (left.length !== right.length) return false;

  const leftKeys = left.map(socialSnapshotKey).sort();
  const rightKeys = right.map(socialSnapshotKey).sort();

  return leftKeys.every((value, index) => value === rightKeys[index]);
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

function getPublicStatusTone(
  status: string | null,
  isPublic: boolean,
): "green" | "red" | "amber" {
  if (!isPublic) return "amber";
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
  return <FaLine className="h-6 w-6" aria-hidden="true" />;
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
        className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-slate-200/80"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xl font-semibold text-[#ff3860] ring-1 ring-rose-100">
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
  const platformClass = selected
    ? "bg-rose-50 text-slate-950 ring-rose-300"
    : "bg-white text-slate-600 ring-slate-200";

  const icon = socialPlatformIcon(platform);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[12px] font-semibold ring-1 outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-[0.98] motion-reduce:transition-none ${platformClass}`}
    >
      <span className="text-[13px] leading-none">{icon}</span>
      {platform}
    </button>
  );
}

function socialPlatformIcon(platform: string) {
  return (
    platform === "Instagram"
      ? <FaInstagram className="h-[18px] w-[18px]" aria-hidden="true" />
      : platform === "TikTok"
        ? <FaTiktok className="h-[17px] w-[17px]" aria-hidden="true" />
        : platform === "YouTube"
          ? <FaYoutube className="h-[18px] w-[18px]" aria-hidden="true" />
          : platform === "X"
            ? <FaXTwitter className="h-[17px] w-[17px]" aria-hidden="true" />
            : <Link2 className="h-[17px] w-[17px]" aria-hidden="true" />
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
    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed border-slate-300 bg-slate-50/50 p-3 text-center transition duration-150 hover:bg-slate-50 active:scale-[0.98] motion-reduce:transition-none">
      <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-xl font-medium text-[#ff3860] ring-1 ring-slate-200">
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
    <div className="group relative overflow-hidden rounded-[16px] bg-slate-100 ring-1 ring-slate-200/60">
      <img src={src} alt={label} className="aspect-square w-full object-cover" />

      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="absolute right-2 top-2 min-h-9 rounded-[10px] bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm outline-none backdrop-blur transition focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-95 disabled:opacity-60"
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
  className = "",
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`border-t border-slate-200/80 py-7 sm:py-9 ${className}`}>
      <div className="mb-5 sm:grid sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:gap-8">
        <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-[14px] font-normal leading-6 text-slate-600 sm:mt-0">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function formatLineDate(value: string | null | undefined, locale: AppLocale) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(creatorProfileDateLocales[locale], {
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
  testing,
  isCreatorOnly,
  onGenerate,
  onUnlink,
  onTest,
}: {
  locale: AppLocale;
  copy: CreatorProfileCopy;
  loading: boolean;
  linked: boolean;
  linkInfo: LineLinkInfo | null;
  code: string | null;
  expiresAt: string | null;
  generating: boolean;
  unlinking: boolean;
  testing: boolean;
  isCreatorOnly: boolean;
  onGenerate: () => void;
  onUnlink: () => void;
  onTest: () => void;
}) {
  return (
    <section className={`order-4 my-3 rounded-[28px] px-5 py-6 sm:px-7 sm:py-7 ${linked ? "border border-slate-200/70 bg-white" : "creator-line-prompt relative overflow-hidden bg-[#ecfff3] shadow-[0_18px_55px_rgba(6,199,85,0.10)]"}`}>
      <div className="relative flex items-start gap-4">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-[16px] ${
            linked
              ? "bg-[#06c755]/10 text-[#06a947]"
              : "bg-[#06c755] text-white shadow-[0_10px_28px_rgba(6,199,85,0.22)]"
          }`}
        >
          <LineIcon />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
              {copy.lineTitle}
            </h2>
            {linked ? <span className="text-[12px] font-medium text-[#079447]">{loading ? copy.lineLoading : copy.lineLinked}</span> : null}
          </div>

          <p className="mt-1.5 max-w-xl text-[14px] font-normal leading-6 text-slate-600">
            {isCreatorOnly
              ? copy.lineCreatorOnlyBody
              : !linked
                ? copy.lineMarketplacePrompt
                : copy.lineBody}
          </p>

          {linked ? (
            <div className="mt-4 rounded-[14px] bg-emerald-50/70 px-4 py-3 ring-1 ring-emerald-100">
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
          ) : false && code ? (
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
                  onClick={() => void navigator.clipboard?.writeText(code ?? "")}
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
              <>
                <button
                  type="button"
                  onClick={onTest}
                  disabled={testing}
                  className="min-h-10 rounded-[12px] bg-slate-950 px-4 py-2 text-[12px] font-semibold text-white outline-none transition focus-visible:ring-4 focus-visible:ring-slate-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {testing ? copy.lineTestSending : copy.lineTestSend}
                </button>

                <button
                  type="button"
                  onClick={onUnlink}
                  disabled={unlinking}
                  className="min-h-10 rounded-[12px] bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {unlinking ? copy.lineUnlinking : copy.lineUnlink}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="min-h-12 rounded-[14px] bg-[#06c755] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_26px_rgba(6,199,85,0.18)] outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(6,199,85,0.24)] focus-visible:ring-4 focus-visible:ring-emerald-200 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
              >
                {generating ? copy.lineGenerating : isCreatorOnly ? copy.lineConnect : copy.lineGenerate}
              </button>
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
  void badges;
  return (
    <Link
      href={href}
      className="group block border-b border-slate-200/80 py-4 outline-none transition duration-200 hover:pl-1 focus-visible:ring-2 focus-visible:ring-rose-200 active:opacity-70 motion-reduce:transition-none"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center text-slate-600">
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
        <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 motion-reduce:transition-none">
          <ChevronIcon />
        </span>
      </div>
    </Link>
  );
}

function OfferingLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[88px] items-center gap-4 rounded-[20px] border border-[#e4e1db] bg-[#fffefa] px-5 py-4 text-slate-950 shadow-[0_8px_24px_rgba(40,35,30,0.045)] outline-none transition duration-200 hover:border-[#d8d4cd] hover:bg-white hover:shadow-[0_10px_28px_rgba(40,35,30,0.065)] focus-visible:ring-4 focus-visible:ring-slate-200 active:scale-[0.995] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold tracking-[-0.035em]">
          {title}
        </span>
        <span className="mt-1 block text-[12px] font-normal leading-5 text-slate-500">
          {body}
        </span>
      </span>
      <span
        className="shrink-0 text-[20px] text-slate-400 transition duration-200 group-hover:translate-x-0.5 group-hover:text-slate-600 motion-reduce:transition-none"
        aria-hidden="true"
      >
        ›
      </span>
    </Link>
  );
}

export default function CreatorProfilePage() {
  const isCreatorOnly = useCreatorOnlyRelease();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale({ allLocales: true });
  const copy = creatorProfileDictionary[locale];
  const copyRef = useRef(copy);

  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [creatorIsPublic, setCreatorIsPublic] = useState(false);
  const [marketplaceProfileCompleted, setMarketplaceProfileCompleted] =
    useState(false);
  const [isTrendMartStart, setIsTrendMartStart] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [country, setCountry] = useState<CreatorCountry>(DEFAULT_CREATOR_COUNTRY);
  const [prefectures, setPrefectures] = useState<string[]>([]);
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
  const portfolioPreviewsRef = useRef<string[]>([]);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<string | null>(
    null,
  );

  const [socialAccounts, setSocialAccounts] = useState<SocialAccountForm[]>([
    createEmptySocial(),
  ]);
  const [socialAccountsSnapshot, setSocialAccountsSnapshot] = useState<
    CanonicalSocialAccount[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [lineLoading, setLineLoading] = useState(false);
  const [lineGenerating, setLineGenerating] = useState(false);
  const [lineUnlinking, setLineUnlinking] = useState(false);
  const [lineTesting, setLineTesting] = useState(false);
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

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    portfolioPreviewsRef.current = portfolioPreviews;
  }, [portfolioPreviews]);

  useEffect(() => {
    return () => {
      portfolioPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    setIsTrendMartStart(
      new URLSearchParams(window.location.search).get("start") === "trend-mart",
    );
  }, []);

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
      const res = await fetch("/api/line/login/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_to: "/creator/profile?line=linked",
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!res.ok || typeof json.url !== "string") {
        throw new Error(json.error || copy.lineCreateFailed);
      }

      window.location.href = json.url;
    } catch (lineLoginError) {
      console.error("line login start error:", lineLoginError);
      setError(copy.lineCreateFailed);
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

  const sendLineTestNotification = async () => {
    const token = await getAccessToken();

    if (!token) {
      setError(copy.lineTestFailed);
      return;
    }

    setLineTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/line/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.error || copy.lineTestFailed);
      }

      setSuccess(copy.lineTestSent);
    } catch (lineTestError) {
      console.error("line test notification error:", lineTestError);
      setError(copy.lineTestFailed);
    } finally {
      setLineTesting(false);
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
          "id, user_id, display_name, category, country, prefecture, city, can_receive_products, content_language, response_language, sub_categories, avatar_url, is_public, approval_status",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (creatorError) {
        setError(creatorError.message);
        setLoading(false);
        return;
      }

      if (!creator) {
        setError(copyRef.current.creatorNotFound);
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
      setCreatorIsPublic(creatorRow.is_public === true);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setProfileUsername(profile?.username ?? null);

      const { data: userState, error: userStateError } = await supabase
        .from("user_states")
        .select("creator_profile_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (userStateError) {
        setError(userStateError.message);
        setLoading(false);
        return;
      }

      setMarketplaceProfileCompleted(
        userState?.creator_profile_completed === true,
      );
      const creatorLocation = getCreatorProfileLocationState(
        creatorRow.country,
        creatorRow.prefecture,
      );
      setDisplayName(creatorRow.display_name ?? "");
      setCountry(creatorLocation.country);
      setPrefectures(creatorLocation.prefectures);
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

      const nextSocialAccounts =
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
          : [createEmptySocial()];

      setSocialAccounts(nextSocialAccounts);
      setSocialAccountsSnapshot(canonicalizeSocialAccounts(nextSocialAccounts));

      await loadPortfolioAssets(creatorRow.id);
      void loadLineStatus();

      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  const uploadImageAndGetUrl = async (
    file: File,
    ownerUserId: string,
    kind: "avatar" | "portfolio",
    index?: number,
  ) => {
    const ext = fileExtension(file);
    const suffix =
      typeof index === "number" ? `${Date.now()}-${index}` : `${Date.now()}`;
    const filePath = `${ownerUserId}/${kind}-${suffix}.${ext}`;

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

  const validate = () => {
    const normalizedDisplayName = displayName.trim();

    if (!normalizedDisplayName) return copy.usernameRequired;
    if (normalizedDisplayName.length > 80) return copy.usernameInvalid;

    if (selectedCategories.length === 0) return copy.categoryRequired;
    if (selectedCategories.length > 5) return copy.categoryLimit;

    const location = canonicalizeCreatorLocation(country, prefectures);
    if (!location.ok) return copy.areaRequired;
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

    const location = canonicalizeCreatorLocation(country, prefectures);
    if (!location.ok) {
      setError(copy.areaRequired);
      return;
    }

    setSaving(true);

    try {
      const normalizedDisplayName = displayName.trim();
      const normalizedPrefecture = location.prefecture;
      const normalizedContentLanguage = contentLanguage.trim();
      const normalizedResponseLanguage = responseLanguage.trim();
      const normalizedCanReceiveProducts = canReceiveProductsChoice === "yes";
      const normalizedSubCategories = selectedCategories.slice(0, 5);
      const normalizedMainCategory = normalizedSubCategories[0];

      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        finalAvatarUrl = await uploadImageAndGetUrl(
          avatarFile,
          creatorUserId,
          "avatar",
        );
      }

      if (portfolioFiles.length > 0) {
        const startOrder = portfolioAssets.length;

        const uploadedPortfolioRows = await Promise.all(
          portfolioFiles.map(async (file, index) => {
            const publicUrl = await uploadImageAndGetUrl(
              file,
              creatorUserId,
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

      const shouldPublishCreator =
        isTrendMartStart &&
        !marketplaceProfileCompleted &&
        !creatorIsPublic;
      const canonicalSocialAccounts = canonicalizeSocialAccounts(socialAccounts);
      const socialAccountsChanged = !areCanonicalSocialAccountsEqual(
        socialAccountsSnapshot,
        canonicalSocialAccounts,
      );

      const profileSaveResponse = await fetch("/api/creator/profile", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: normalizedDisplayName,
          category: normalizedMainCategory,
          country: location.country,
          prefecture: normalizedPrefecture,
          canReceiveProducts: normalizedCanReceiveProducts,
          contentLanguage: normalizedContentLanguage,
          responseLanguage: normalizedResponseLanguage,
          subCategories: normalizedSubCategories,
          avatarUrl: finalAvatarUrl,
          shouldPublishCreator,
          socialAccountsChanged,
          ...(socialAccountsChanged
            ? { socialAccounts: canonicalSocialAccounts }
            : {}),
        }),
      });

      if (!profileSaveResponse.ok) {
        throw new Error("profile_save_failed");
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          ...(profileUsername ? { creator_username: profileUsername } : {}),
          display_name: normalizedDisplayName,
          full_name: normalizedDisplayName,
          creator_country: location.country,
          creator_prefecture: normalizedPrefecture,
          creator_can_receive_products: normalizedCanReceiveProducts,
          creator_content_language: normalizedContentLanguage,
          creator_response_language: normalizedResponseLanguage,
          creator_sub_categories: normalizedSubCategories,
        },
      });

      setMarketplaceProfileCompleted(true);
      if (shouldPublishCreator) setCreatorIsPublic(true);

      setDisplayName(normalizedDisplayName);
      setCountry(location.country);
      setPrefectures(location.prefectures);
      setCanReceiveProductsChoice(normalizedCanReceiveProducts ? "yes" : "no");
      setContentLanguage(normalizedContentLanguage);
      setResponseLanguage(normalizedResponseLanguage);
      setSelectedCategories(normalizedSubCategories);
      setAvatarUrl(finalAvatarUrl ?? null);
      setSocialAccountsSnapshot(canonicalSocialAccounts);
      setAvatarFile(null);

      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      portfolioPreviews.forEach((url) => URL.revokeObjectURL(url));

      setAvatarPreview(null);
      setPortfolioFiles([]);
      setPortfolioPreviews([]);

      await loadPortfolioAssets(creatorId);

      setSuccess(metadataError ? copy.savedMetadataSyncFailed : copy.saved);
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

  const handleCountryChange = (nextCountry: CreatorCountry) => {
    const location = getCreatorLocationAfterCountryChange(
      nextCountry,
      prefectures,
    );
    setCountry(location.country);
    setPrefectures(location.prefectures);
    setError(null);
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
    <CreatorPage className="!pb-0">
      <section className="px-1 pb-5 pt-2 sm:px-2 sm:pb-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.055em] text-slate-950 sm:text-[34px]">
              {copy.title}
            </h1>
            <p className="mt-2 max-w-xl text-[14px] font-normal leading-7 text-slate-600">
              {copy.subtitle}
            </p>
          </div>

        </div>
      </section>

      {error ? (
        <CreatorNotice tone="red" title={copy.errorTitle} description={error} />
      ) : null}

      {success ? (
        <CreatorNotice tone="green" title={success} />
      ) : null}

      <div className="flex flex-col">
      <SectionCard className="order-4" title={copy.uiLanguage} description={copy.uiLanguageBody}>
        <LocaleSelector
          value={locale}
          onChange={setLocale}
          ariaLabel={copy.uiLanguage}
        />
      </SectionCard>
      <SectionCard className="order-1" title={copy.photoSection} description={copy.photoBody}>
        <AvatarCropPicker
          label={copy.avatar}
          previewUrl={avatarPreview ?? avatarUrl}
          help={copy.photoBody}
          chooseLabel={copy.imageChoose}
          locale={locale}
          onConfirm={(file, previewUrl) => {
            setAvatarFile(file);
            setAvatarPreview(previewUrl);
          }}
        />
      </SectionCard>

      {isCreatorPaidMarketplaceEnabled(country) ? <section className="order-2 border-t border-slate-200/80 py-7 sm:py-9">
        <div className="mb-4">
          <h2 className="text-[22px] font-semibold tracking-[-0.045em] text-slate-950">{copy.servicesTitle}</h2>
        </div>
        <OfferingLink
          href="/creator/menus"
          title={copy.menusTitle}
          body={copy.menusBody}
        />
      </section> : null}

      <SectionCard className="order-5" title={copy.categoryTitle} description={copy.categoryBody}>
        {selectedCategories.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {selectedCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleCategory(item)}
                className="creator-profile-control border-b border-slate-300 px-0.5 py-1 text-[12px] font-medium text-slate-700 outline-none hover:border-rose-300 hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                {localizeCreatorProfileValue(locale, item, creatorProfileCategoryLabels)} ×
              </button>
            ))}
          </div>
        ) : null}

        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between border-y border-slate-200/80 py-3 text-[13px] font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-rose-200 [&::-webkit-details-marker]:hidden">
            <span>{copy.editGenres}</span>
            <span className="text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
          </summary>
          <div className="pt-4">
        <div className="border-b border-slate-200/80">
          <div className="flex gap-6 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GENRE_GROUPS.map((group) => {
              const active = activeGenreGroup === group.key;

              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveGenreGroup(group.key)}
                  aria-pressed={active}
                  className={`creator-profile-control relative min-h-11 shrink-0 px-0.5 py-3 text-[13px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-rose-200 ${
                    active
                      ? "text-slate-950 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#ed3155]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {localizeCreatorProfileValue(locale, group.key, creatorProfileGenreGroupLabels)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[13px]">
          <span className="text-xs font-semibold text-slate-500">
            {copy.categoryCount}
          </span>
          <span className="text-xs font-semibold text-slate-950">
            {selectedCategories.length}/5
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-3">
          {activeGenre.items.map((item) => {
            const selected = selectedCategories.includes(item);
            const disabled = !selected && selectedCategories.length >= 5;

            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => toggleCategory(item)}
                aria-pressed={selected}
                className={`creator-profile-control min-h-11 rounded-[10px] px-3 py-2 text-left text-[13px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-35 ${
                  selected
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:bg-white"
                }`}
              >
                {localizeCreatorProfileValue(locale, item, creatorProfileCategoryLabels)}
              </button>
            );
          })}
        </div>
          </div>
        </details>
      </SectionCard>

      <SectionCard
        className="order-6"
        title={copy.areaTitle}
        description={country === "日本" ? copy.areaBody : copy.nonJapanAreaBody}
      >
        <div className="grid gap-4">
          <CreatorField label={copy.country}>
            <CountrySelector
              value={country}
              onChange={handleCountryChange}
              ariaLabel={copy.country}
            />
          </CreatorField>

          <CreatorField label={copy.username} help={copy.usernameHelp}>
            <CreatorInput
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={copy.usernamePlaceholder}
            />
          </CreatorField>

          {country === "日本" ? (
            <CreatorField
              label={`${copy.prefecture}（${prefectures.length}）`}
              help={copy.selectPrefecture}
            >
              {prefectures.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {prefectures.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setPrefectures((prev) => toggleString(prev, item))
                      }
                      className="creator-profile-control border-b border-slate-300 px-0.5 py-1 text-[12px] font-medium text-slate-700 outline-none hover:border-rose-300 hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-200"
                    >
                      {localizeCreatorProfileValue(locale, item, creatorProfilePrefectureLabels)} ×
                    </button>
                  ))}
                </div>
              ) : null}

              <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between border-y border-slate-200/80 py-3 text-[13px] font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-rose-200 [&::-webkit-details-marker]:hidden">
                  <span>{copy.editAreas}</span>
                  <span className="text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
                </summary>
              <div className="creator-profile-options mt-2 grid max-h-[288px] grid-cols-2 gap-x-2 gap-y-1 overflow-y-auto py-2 pr-1 sm:grid-cols-3">
                {JAPAN_PREFECTURES.map((item) => {
                  const selected = prefectures.includes(item);

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setPrefectures((prev) => toggleString(prev, item))
                      }
                      aria-pressed={selected}
                      className={`creator-profile-control min-h-11 rounded-[10px] px-3 py-2 text-left text-[13px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-rose-200 ${
                        selected
                          ? "bg-slate-950 text-white"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      {selected ? "✓ " : ""}
                      {localizeCreatorProfileValue(locale, item, creatorProfilePrefectureLabels)}
                    </button>
                  );
                })}
              </div>
              </details>
            </CreatorField>
          ) : null}

          <CreatorField label={copy.productPr}>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCanReceiveProductsChoice("yes")}
                aria-pressed={canReceiveProductsChoice === "yes"}
                className={`creator-profile-control min-h-[72px] rounded-[14px] px-4 py-3 text-left text-[14px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-rose-200 ${
                  canReceiveProductsChoice === "yes"
                    ? "bg-slate-950 text-white"
                    : "bg-[#f3f2ef] text-slate-800 hover:bg-[#efede9]"
                }`}
              >
                {copy.productPrYes}
              </button>

              <button
                type="button"
                onClick={() => setCanReceiveProductsChoice("no")}
                aria-pressed={canReceiveProductsChoice === "no"}
                className={`creator-profile-control min-h-[72px] rounded-[14px] px-4 py-3 text-left text-[14px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-rose-200 ${
                  canReceiveProductsChoice === "no"
                    ? "bg-slate-950 text-white"
                    : "bg-[#f3f2ef] text-slate-800 hover:bg-[#efede9]"
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
                  <option key={option} value={option}>
                    {localizeCreatorProfileValue(locale, option, creatorProfileLanguageLabels)}
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
                  <option key={option} value={option}>
                    {localizeCreatorProfileValue(locale, option, creatorProfileLanguageLabels)}
                  </option>
                ))}
              </CreatorSelect>
            </CreatorField>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="order-3" id="sns" title={copy.socialTitle} description={copy.socialBody}>
        <div className="space-y-3">
          {socialAccounts.map((social, index) => {
            const config = getSocialConfig(social.platform, copy);
            const previewUrl = buildSocialPreview(
              social.platform,
              social.username_or_url,
            );

            return (
              <details
                key={index}
                className="group rounded-[20px] bg-white"
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-rose-200 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-700">
                      {socialPlatformIcon(social.platform)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-slate-950">
                        {social.platform || `${copy.socialItem} ${index + 1}`}
                      </p>
                      <p className="truncate text-[11px] font-medium text-slate-500">
                        {social.username_or_url || copy.setupAccount}
                        {social.follower_range ? ` · ${localizeCreatorProfileValue(locale, social.follower_range, creatorProfileFollowerRangeLabels)}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
                </summary>

                <div className="border-t border-slate-100 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-end border-b border-slate-100 pb-4">
                  <button
                    type="button"
                    onClick={() => removeSocial(index)}
                    className="min-h-9 rounded-[10px] bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 outline-none transition focus-visible:ring-2 focus-visible:ring-rose-200 active:scale-95"
                  >
                    {copy.remove}
                  </button>
                </div>

                <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PLATFORM_OPTIONS.map((platform) => (
                    <PlatformBadge
                      key={platform}
                      platform={platform}
                      selected={social.platform === platform}
                      onClick={() => updateSocial(index, "platform", platform)}
                    />
                  ))}
                </div>

                <div className="grid gap-4">
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-slate-700">
                      {copy.socialHandle}
                    </p>

                    <div className="flex min-h-[52px] overflow-hidden rounded-[14px] border border-transparent bg-[#f3f2ef] focus-within:border-[#ff5f67]/45 focus-within:bg-white focus-within:ring-4 focus-within:ring-rose-100">
                      {config.prefix ? (
                        <div className="flex max-w-[42%] items-center border-r border-slate-200/70 px-3 text-[11px] font-medium text-slate-500">
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
                      <p className="mt-1.5 truncate px-1 text-[11px] font-medium text-slate-500">
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
                          {localizeCreatorProfileValue(locale, item, creatorProfileFollowerRangeLabels)}
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
                          {localizeCreatorProfileValue(locale, item, creatorProfileAudienceCountryLabels)}
                        </option>
                      ))}
                    </CreatorSelect>
                  </div>
                </div>
                </div>
              </details>
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
        className="order-8"
        id="portfolio"
        title={copy.portfolioTitle}
        description={copy.portfolioBody}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium tabular-nums text-slate-700">{portfolioTotalCount} / 3</p>
          <p className="text-[12px] font-medium text-slate-400">
            {copy.portfolioRecommended}
          </p>
        </div>

        {portfolioTotalCount === 0 ? (
          <div className="rounded-[16px] bg-[#f3f2ef] px-4 py-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-slate-300 ring-1 ring-slate-100">
              <ImageIcon />
            </div>
            <p className="mt-3 text-[13px] font-medium leading-6 text-slate-500">
              {copy.portfolioEmpty}
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        locale={locale}
        copy={copy}
        loading={lineLoading}
        linked={lineLinked}
        linkInfo={lineLinkInfo}
        code={lineCode}
        expiresAt={lineCodeExpiresAt}
        generating={lineGenerating}
        unlinking={lineUnlinking}
        testing={lineTesting}
        isCreatorOnly={isCreatorOnly || !isCreatorPaidMarketplaceEnabled(country)}
        onGenerate={() => void generateLineLinkCode()}
        onUnlink={() => void unlinkLine()}
        onTest={() => void sendLineTestNotification()}
      />

      {!isCreatorOnly && isCreatorPaidMarketplaceEnabled(country) ? <SectionCard className="order-7" title={copy.payoutsSectionTitle}>
        <section className="grid gap-2">
          <QuickLink
            href="/creator/payouts"
            icon={<YenIcon />}
            title={copy.payoutsTitle}
            body={copy.payoutsBody}
          />
        </section>
      </SectionCard> : null}
      </div>

      <div aria-hidden="true" className="h-[76px] sm:hidden" />

      <div className="creator-profile-save-dock fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[864px] rounded-[18px] bg-white/96 p-2 shadow-[0_12px_36px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:static sm:inset-auto sm:max-w-none sm:shadow-[0_12px_36px_rgba(15,23,42,0.10)]">
        <CreatorButton
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? copy.saving : copy.save}
        </CreatorButton>
      </div>
      <style jsx global>{`
        @media (max-height: 560px) and (pointer: coarse) {
          .creator-profile-save-dock {
            position: static;
          }
        }
      `}</style>
    </CreatorPage>
  );
}
