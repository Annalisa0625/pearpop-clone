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

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  category: string | null;
  country: string | null;
  prefecture: string | null;
  city: string | null;
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

type SocialAccountForm = {
  platform: string;
  url: string;
  follower_range: string;
  audience_country: string;
};

type LocaleOption = {
  value: string;
  ja: string;
  en: string;
};

const CREATOR_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_CREATOR_IMAGE_BUCKET || "creator-assets";

const CATEGORY_OPTIONS: LocaleOption[] = [
  { value: "美容", ja: "美容", en: "Beauty" },
  { value: "ファッション", ja: "ファッション", en: "Fashion" },
  { value: "グルメ", ja: "グルメ", en: "Food" },
  { value: "旅行", ja: "旅行", en: "Travel" },
  { value: "ライフスタイル", ja: "ライフスタイル", en: "Lifestyle" },
  { value: "フィットネス", ja: "フィットネス", en: "Fitness" },
  { value: "子育て", ja: "子育て", en: "Parenting" },
  { value: "ガジェット", ja: "ガジェット", en: "Gadgets" },
  { value: "エンタメ", ja: "エンタメ", en: "Entertainment" },
  { value: "ビジネス", ja: "ビジネス", en: "Business" },
  { value: "教育", ja: "教育", en: "Education" },
  { value: "その他", ja: "その他", en: "Other" },
];

const LANGUAGE_OPTIONS: LocaleOption[] = [
  { value: "日本語", ja: "日本語", en: "Japanese" },
  { value: "英語", ja: "英語", en: "English" },
  { value: "韓国語", ja: "韓国語", en: "Korean" },
  { value: "中国語", ja: "中国語", en: "Chinese" },
  { value: "その他", ja: "その他", en: "Other" },
];

const COUNTRY_OPTIONS: LocaleOption[] = [
  { value: "日本", ja: "日本", en: "Japan" },
  { value: "韓国", ja: "韓国", en: "Korea" },
  { value: "中国", ja: "中国", en: "China" },
  { value: "台湾", ja: "台湾", en: "Taiwan" },
  { value: "香港", ja: "香港", en: "Hong Kong" },
  { value: "タイ", ja: "タイ", en: "Thailand" },
  { value: "ベトナム", ja: "ベトナム", en: "Vietnam" },
  { value: "インドネシア", ja: "インドネシア", en: "Indonesia" },
  { value: "フィリピン", ja: "フィリピン", en: "Philippines" },
  { value: "シンガポール", ja: "シンガポール", en: "Singapore" },
  { value: "アメリカ", ja: "アメリカ", en: "United States" },
  { value: "その他", ja: "その他", en: "Other" },
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

const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "X",
  "Lemon8",
  "Threads",
  "Facebook",
  "Pinterest",
  "Twitch",
  "Snapchat",
  "LinkedIn",
  "小紅書",
  "抖音",
  "Bilibili",
  "微博",
  "その他",
];

const AUDIENCE_REGION_OPTIONS: LocaleOption[] = [
  { value: "日本", ja: "日本", en: "Japan" },
  { value: "韓国", ja: "韓国", en: "Korea" },
  { value: "台湾", ja: "台湾", en: "Taiwan" },
  { value: "香港", ja: "香港", en: "Hong Kong" },
  { value: "中国", ja: "中国", en: "China" },
  { value: "タイ", ja: "タイ", en: "Thailand" },
  { value: "ベトナム", ja: "ベトナム", en: "Vietnam" },
  { value: "インドネシア", ja: "インドネシア", en: "Indonesia" },
  { value: "フィリピン", ja: "フィリピン", en: "Philippines" },
  { value: "マレーシア", ja: "マレーシア", en: "Malaysia" },
  { value: "シンガポール", ja: "シンガポール", en: "Singapore" },
  { value: "インド", ja: "インド", en: "India" },
  { value: "アメリカ", ja: "アメリカ", en: "United States" },
  { value: "カナダ", ja: "カナダ", en: "Canada" },
  { value: "イギリス", ja: "イギリス", en: "United Kingdom" },
  { value: "フランス", ja: "フランス", en: "France" },
  { value: "ドイツ", ja: "ドイツ", en: "Germany" },
  { value: "オーストラリア", ja: "オーストラリア", en: "Australia" },
  { value: "その他", ja: "その他", en: "Other" },
];

const FOLLOWER_RANGE_OPTIONS: LocaleOption[] = [
  { value: "1,000未満", ja: "1,000未満", en: "Under 1,000" },
  { value: "1,000〜5,000", ja: "1,000〜5,000", en: "1,000–5,000" },
  { value: "5,000〜10,000", ja: "5,000〜10,000", en: "5,000–10,000" },
  { value: "10,000〜30,000", ja: "10,000〜30,000", en: "10,000–30,000" },
  { value: "30,000〜50,000", ja: "30,000〜50,000", en: "30,000–50,000" },
  { value: "50,000〜100,000", ja: "50,000〜100,000", en: "50,000–100,000" },
  { value: "100,000〜300,000", ja: "100,000〜300,000", en: "100,000–300,000" },
  { value: "300,000〜500,000", ja: "300,000〜500,000", en: "300,000–500,000" },
  { value: "500,000〜1,000,000", ja: "500,000〜1,000,000", en: "500,000–1,000,000" },
  { value: "1,000,000以上", ja: "1,000,000以上", en: "1,000,000+" },
];

function createEmptySocial(): SocialAccountForm {
  return {
    platform: "",
    url: "",
    follower_range: "",
    audience_country: "",
  };
}

function optionLabel(option: LocaleOption, locale: "ja" | "en") {
  return locale === "ja" ? option.ja : option.en;
}

function fileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

function getPublicStatusLabel(status: string | null, locale: "ja" | "en") {
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

function imageIcon() {
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
            企業に表示されるメイン写真です。
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

function QuickLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[22px] bg-white px-4 py-3.5 ring-1 ring-slate-100 transition active:scale-[0.99]"
    >
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
    </Link>
  );
}

export default function CreatorProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "プロフィール",
            subtitle: "企業に表示される情報を整えます。",
            username: "ユーザーネーム",
            usernamePlaceholder: "例：taiki_pr",
            usernameHelp:
              "SNSのアカウント名と揃えると見つけてもらいやすくなります。",
            category: "メインジャンル",
            country: "国",
            prefecture: "都道府県",
            area: "活動エリア",
            city: "市区町村",
            cityPlaceholder: "例：京都市",
            contentLanguage: "発信言語",
            responseLanguage: "対応言語",
            subCategories: "得意・興味のあるジャンル",
            subCategoriesHelp: "5つまで選択できます。",
            basicInfo: "公開プロフィール",
            basicInfoBody: "企業に表示・検索される基本情報です。",
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
            socialBody: "企業が確認するSNSアカウントを登録します。",
            socialItem: "SNS",
            remove: "削除",
            removeConfirm: "この画像を削除しますか？",
            platform: "SNS",
            followerRange: "フォロワー帯",
            url: "URL",
            audienceRegion: "主な視聴者",
            addSocial: "SNSを追加",
            saving: "保存中...",
            save: "保存する",
            selectPlease: "選択してください",
            creatorNotFound: "クリエイター情報が見つかりませんでした。",
            usernameRequired: "ユーザーネームを入力してください",
            usernameInvalid:
              "ユーザーネームは英小文字・数字・アンダースコア・ハイフンのみで3〜30文字です",
            usernameDuplicate: "このユーザーネームは既に使われています",
            categoryRequired: "メインジャンルを選択してください",
            countryRequired: "国を選択してください",
            languageRequired: "発信言語と対応言語を選択してください",
            socialRequired: "SNSを少なくとも1件入力してください",
            socialIncomplete: "SNSに未入力の項目があります",
            missingCreatorId: "creator_id を取得できませんでした。",
            missingUserId: "user_id を取得できませんでした。",
            saved: "保存しました。",
            saveError: "保存中にエラーが発生しました。",
            uploadFailed: "画像アップロードに失敗しました。",
            settings: "関連設定",
            menusTitle: "メニュー・価格",
            menusBody: "投稿形式、価格、納期を管理",
            payoutsTitle: "報酬受け取り",
            payoutsBody: "受取設定と報酬履歴を確認",
            statusPrefix: "表示状態",
            japanesePrefectureOnly: "日本以外の場合は地域名を入力できます。",
          }
        : {
            title: "Profile",
            subtitle: "Update the information shown to brands.",
            username: "Username",
            usernamePlaceholder: "Example: taiki_pr",
            usernameHelp:
              "Using the same name as your main social account makes you easier to find.",
            category: "Main genre",
            country: "Country",
            prefecture: "State / prefecture",
            area: "Area",
            city: "City",
            cityPlaceholder: "Example: Kyoto",
            contentLanguage: "Content language",
            responseLanguage: "Response language",
            subCategories: "Genres you are good at",
            subCategoriesHelp: "Choose up to 5.",
            basicInfo: "Public profile",
            basicInfoBody: "Basic information shown to brands and used for search.",
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
            socialBody: "Add social accounts for brands to check.",
            socialItem: "SNS",
            remove: "Remove",
            removeConfirm: "Delete this image?",
            platform: "SNS",
            followerRange: "Followers",
            url: "URL",
            audienceRegion: "Main audience",
            addSocial: "Add SNS",
            saving: "Saving...",
            save: "Save",
            selectPlease: "Please select",
            creatorNotFound: "Creator information was not found.",
            usernameRequired: "Please enter your username",
            usernameInvalid:
              "Username must be 3–30 characters using lowercase letters, numbers, underscores, or hyphens",
            usernameDuplicate: "This username is already in use",
            categoryRequired: "Please select a main genre",
            countryRequired: "Please select a country",
            languageRequired: "Please select content and response languages",
            socialRequired: "Please enter at least one social account",
            socialIncomplete: "One or more social account fields are incomplete",
            missingCreatorId: "Could not retrieve creator_id.",
            missingUserId: "Could not retrieve user_id.",
            saved: "Saved.",
            saveError: "An error occurred while saving.",
            uploadFailed: "Failed to upload image.",
            settings: "Related settings",
            menusTitle: "Menus & rates",
            menusBody: "Manage post types, pricing, and delivery days.",
            payoutsTitle: "Payouts",
            payoutsBody: "Check payout setup and history.",
            statusPrefix: "Status",
            japanesePrefectureOnly: "Enter the area name for countries outside Japan.",
          },
    [safeLocale],
  );

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [contentLanguage, setContentLanguage] = useState("");
  const [responseLanguage, setResponseLanguage] = useState("");
  const [subCategories, setSubCategories] = useState<string[]>([]);

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

  const portfolioTotalCount = portfolioAssets.length + portfolioFiles.length;
  const profileName = displayName || "Trendre";
  const isJapan = country === "日本";

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
          "id, user_id, display_name, category, country, prefecture, city, content_language, response_language, sub_categories, avatar_url, approval_status",
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

      setCreatorId(creatorRow.id);
      setCreatorUserId(creatorRow.user_id);
      setApprovalStatus(creatorRow.approval_status ?? null);
      setDisplayName(creatorRow.display_name ?? "");
      setCategory(creatorRow.category ?? "");
      setCountry(creatorRow.country ?? "");
      setPrefecture(creatorRow.prefecture ?? "");
      setCity(creatorRow.city ?? "");
      setContentLanguage(creatorRow.content_language ?? "");
      setResponseLanguage(creatorRow.response_language ?? "");
      setSubCategories(
        Array.isArray(creatorRow.sub_categories)
          ? creatorRow.sub_categories
          : [],
      );
      setAvatarUrl(creatorRow.avatar_url ?? null);

      const { data: socials, error: socialError } = await supabase
        .from("creator_social_accounts")
        .select("platform, url, follower_range, audience_country")
        .eq("creator_id", creatorRow.id)
        .order("created_at", { ascending: true });

      if (socialError) {
        setError(socialError.message);
        setLoading(false);
        return;
      }

      const socialRows =
        (socials as SocialAccountForm[] | null)?.filter(Boolean) ?? [];

      setSocialAccounts(
        socialRows.length > 0 ? socialRows : [createEmptySocial()],
      );

      await loadPortfolioAssets(creatorRow.id);

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
    if (!category.trim()) return copy.categoryRequired;
    if (!country.trim()) return copy.countryRequired;

    if (!contentLanguage.trim() || !responseLanguage.trim()) {
      return copy.languageRequired;
    }

    const cleaned = socialAccounts.filter(
      (item) =>
        item.platform.trim() ||
        item.url.trim() ||
        item.follower_range.trim() ||
        item.audience_country.trim(),
    );

    if (cleaned.length === 0) return copy.socialRequired;

    const hasIncomplete = cleaned.some(
      (item) =>
        !item.platform.trim() ||
        !item.url.trim() ||
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
      const normalizedCountry = country.trim();
      const normalizedPrefecture = prefecture.trim();
      const normalizedCity = city.trim();
      const normalizedCategory = category.trim();
      const normalizedContentLanguage = contentLanguage.trim();
      const normalizedResponseLanguage = responseLanguage.trim();

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
          category: normalizedCategory || null,
          country: normalizedCountry,
          prefecture: normalizedPrefecture || null,
          city: normalizedCity || null,
          content_language: normalizedContentLanguage || null,
          response_language: normalizedResponseLanguage || null,
          sub_categories: subCategories.length > 0 ? subCategories : [],
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
          category: normalizedCategory || null,
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
          url: item.url.trim(),
          follower_range: item.follower_range.trim(),
          audience_country: item.audience_country.trim(),
        }))
        .filter(
          (item) =>
            item.platform &&
            item.url &&
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
          url: item.url,
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
          creator_country: normalizedCountry,
          creator_prefecture: normalizedPrefecture || null,
          creator_city: normalizedCity || null,
          creator_content_language: normalizedContentLanguage,
          creator_response_language: normalizedResponseLanguage,
          creator_sub_categories: subCategories,
        },
      });

      setDisplayName(normalizedDisplayName);
      setCountry(normalizedCountry);
      setPrefecture(normalizedPrefecture);
      setCity(normalizedCity);
      setCategory(normalizedCategory);
      setContentLanguage(normalizedContentLanguage);
      setResponseLanguage(normalizedResponseLanguage);
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

  const handleSubCategoryToggle = (value: string) => {
    setSubCategories((prev) => {
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
        <CreatorSkeleton className="h-40" />
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

      <SectionCard title={copy.basicInfo} description={copy.basicInfoBody}>
        <div className="grid gap-4">
          <CreatorField label={copy.username} help={copy.usernameHelp}>
            <CreatorInput
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={copy.usernamePlaceholder}
            />
          </CreatorField>

          <CreatorField label={copy.category}>
            <CreatorSelect
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{copy.selectPlease}</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {optionLabel(option, safeLocale)}
                </option>
              ))}
            </CreatorSelect>
          </CreatorField>

          <CreatorField
            label={copy.subCategories}
            help={copy.subCategoriesHelp}
          >
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => {
                const active = subCategories.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSubCategoryToggle(option.value)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 transition active:scale-[0.98] ${
                      active
                        ? "bg-slate-950 text-white ring-slate-950"
                        : "bg-white text-slate-600 ring-slate-200"
                    }`}
                  >
                    {optionLabel(option, safeLocale)}
                  </button>
                );
              })}
            </div>
          </CreatorField>

          <div className="grid gap-4 sm:grid-cols-2">
            <CreatorField label={copy.country}>
              <CreatorSelect
                value={country}
                onChange={(e) => {
                  const nextCountry = e.target.value;
                  setCountry(nextCountry);

                  if (nextCountry !== "日本") {
                    setPrefecture("");
                  }
                }}
              >
                <option value="">{copy.selectPlease}</option>
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option, safeLocale)}
                  </option>
                ))}
              </CreatorSelect>
            </CreatorField>

            <CreatorField
              label={copy.prefecture}
              help={!isJapan ? copy.japanesePrefectureOnly : undefined}
            >
              {isJapan ? (
                <CreatorSelect
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                >
                  <option value="">{copy.selectPlease}</option>
                  {PREFECTURE_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </CreatorSelect>
              ) : (
                <CreatorInput
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  placeholder={copy.area}
                />
              )}
            </CreatorField>
          </div>

          <CreatorField label={copy.city}>
            <CreatorInput
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={copy.cityPlaceholder}
            />
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
          {socialAccounts.map((social, index) => (
            <div key={index} className="rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-white text-slate-600 ring-1 ring-slate-100">
                    <UserIcon />
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

              <div className="grid gap-4">
                <CreatorField label={copy.platform}>
                  <CreatorSelect
                    value={social.platform}
                    onChange={(e) =>
                      updateSocial(index, "platform", e.target.value)
                    }
                  >
                    <option value="">{copy.selectPlease}</option>
                    {PLATFORM_OPTIONS.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </CreatorSelect>
                </CreatorField>

                <CreatorField label={copy.url}>
                  <CreatorInput
                    value={social.url}
                    onChange={(e) => updateSocial(index, "url", e.target.value)}
                    placeholder="https://..."
                  />
                </CreatorField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <CreatorField label={copy.followerRange}>
                    <CreatorSelect
                      value={social.follower_range}
                      onChange={(e) =>
                        updateSocial(index, "follower_range", e.target.value)
                      }
                    >
                      <option value="">{copy.selectPlease}</option>
                      {FOLLOWER_RANGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {optionLabel(option, safeLocale)}
                        </option>
                      ))}
                    </CreatorSelect>
                  </CreatorField>

                  <CreatorField label={copy.audienceRegion}>
                    <CreatorSelect
                      value={social.audience_country}
                      onChange={(e) =>
                        updateSocial(index, "audience_country", e.target.value)
                      }
                    >
                      <option value="">{copy.selectPlease}</option>
                      {AUDIENCE_REGION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {optionLabel(option, safeLocale)}
                        </option>
                      ))}
                    </CreatorSelect>
                  </CreatorField>
                </div>
              </div>
            </div>
          ))}
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
            3枚以上がおすすめ
          </p>
        </div>

        {portfolioTotalCount === 0 ? (
          <div className="rounded-[20px] bg-slate-50 px-4 py-5 text-center ring-1 ring-slate-100">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-slate-300 ring-1 ring-slate-100">
              {imageIcon()}
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

      <SectionCard title={copy.settings}>
<section className="grid gap-2">
        <QuickLink
          href="/creator/menus"
          icon={<MenuIcon />}
          title={copy.menusTitle}
          body={copy.menusBody}
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
