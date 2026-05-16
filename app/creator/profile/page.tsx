// app/creator/profile/page.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  bio: string | null;
  category: string | null;
  country: string | null;
  prefecture: string | null;
  city: string | null;
  content_language: string | null;
  response_language: string | null;
  sub_categories: string[] | null;
  avatar_url: string | null;
  cover_image_url: string | null;
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
  { value: "子育て", ja: "子育て", en: "Parenting" },
  { value: "ライフスタイル", ja: "ライフスタイル", en: "Lifestyle" },
  { value: "ガジェット", ja: "ガジェット", en: "Gadgets" },
  { value: "エンタメ", ja: "エンタメ", en: "Entertainment" },
  { value: "ビジネス", ja: "ビジネス", en: "Business" },
  { value: "教育", ja: "教育", en: "Education" },
  { value: "フィットネス", ja: "フィットネス", en: "Fitness" },
  { value: "その他", ja: "その他", en: "Other" },
];

const LANGUAGE_OPTIONS: LocaleOption[] = [
  { value: "日本語", ja: "日本語", en: "Japanese" },
  { value: "英語", ja: "英語", en: "English" },
  { value: "韓国語", ja: "韓国語", en: "Korean" },
  { value: "中国語", ja: "中国語", en: "Chinese" },
  { value: "その他", ja: "その他", en: "Other" },
];

const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "X",
  "Facebook",
  "Lemon8",
  "Pinterest",
  "Twitch",
  "Snapchat",
  "LinkedIn",
  "Threads",
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
  { value: "UAE", ja: "UAE", en: "UAE" },
  { value: "サウジアラビア", ja: "サウジアラビア", en: "Saudi Arabia" },
  { value: "アメリカ", ja: "アメリカ", en: "United States" },
  { value: "カナダ", ja: "カナダ", en: "Canada" },
  { value: "イギリス", ja: "イギリス", en: "United Kingdom" },
  { value: "フランス", ja: "フランス", en: "France" },
  { value: "ドイツ", ja: "ドイツ", en: "Germany" },
  { value: "イタリア", ja: "イタリア", en: "Italy" },
  { value: "スペイン", ja: "スペイン", en: "Spain" },
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

function getApprovalStatusLabel(
  status: string | null,
  locale: "ja" | "en"
): string {
  if (locale === "ja") {
    if (status === "approved") return "承認済";
    if (status === "pending") return "審査中";
    if (status === "rejected") return "却下";
    return status ?? "未承認";
  }

  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  return status ?? "Not approved";
}

function getApprovalTone(status: string | null) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function fileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-sm font-black text-slate-800">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-slate-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function SelectBox(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function SectionCard({
  icon,
  title,
  body,
  children,
}: {
  icon: string;
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-950">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          {body ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function SettingLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-950">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {body}
        </span>
      </span>
      <span className="text-slate-300">›</span>
    </Link>
  );
}

function ImagePicker({
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
    <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-black text-slate-800">{label}</p>

      <div className="mt-4 overflow-hidden rounded-[22px] bg-white">
        {src ? (
          <img src={src} alt={label} className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 items-center justify-center text-sm font-bold text-slate-400">
            {noImageLabel}
          </div>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition active:scale-[0.98]">
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
  );
}

function PortfolioUploadBox({
  pendingCount,
  buttonLabel,
  onChange,
}: {
  pendingCount: number;
  buttonLabel: string;
  onChange: (files: File[]) => void;
}) {
  return (
    <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-slate-950 active:scale-[0.98]">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm">
        +
      </div>
      <p className="mt-4 text-sm font-black text-slate-950">{buttonLabel}</p>
      {pendingCount > 0 ? (
        <p className="mt-2 text-xs font-semibold text-slate-500">
          {pendingCount} files selected
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
}: {
  src: string;
  label: string;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[22px] bg-slate-100">
      <img src={src} alt={label} className="aspect-square w-full object-cover" />

      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white backdrop-blur transition disabled:opacity-60"
        >
          {deleting ? "..." : "削除"}
        </button>
      ) : null}
    </div>
  );
}

export default function CreatorProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            badge: "Creator Profile",
            title: "プロフィール",
            subtitle:
              "企業に見られる基本情報、写真、SNS、メニュー導線を管理します。",
            approvalStatus: "承認状態",
            publicName: "公開名（@表示名）",
            publicNamePlaceholder: "例：yourname / main_account_name",
            publicNameHelp:
              "企業や一覧画面で見える名前です。主要SNSアカウント名と揃えるのがおすすめです。",
            fullName: "氏名（任意）",
            category: "メインカテゴリ",
            country: "国",
            countryPlaceholder: "例：Japan / 日本",
            prefecture: "都道府県 / 州",
            prefecturePlaceholder: "例：京都府 / California",
            city: "市区町村（任意）",
            cityPlaceholder: "例：京都市",
            contentLanguage: "発信言語",
            responseLanguage: "対応言語",
            subCategories: "サブカテゴリ",
            bio: "短い自己紹介",
            bioPlaceholder:
              "企業に伝わるように、発信内容や得意ジャンルを簡潔に書いてください。",
            accountSection: "アカウント",
            accountBody: "表示名、カテゴリ、地域、言語を設定します。",
            imageSection: "写真・ポートフォリオ",
            imageBody:
              "プロフィール画像、カバー画像、B側詳細ページに表示するポートフォリオ画像を管理します。",
            avatar: "プロフィール画像",
            cover: "カバー画像",
            imageChoose: "スマホの写真・アルバムから選択",
            noImage: "まだ画像はありません",
            portfolioTitle: "ポートフォリオ画像",
            portfolioBody:
              "B側クリエイター詳細ページのギャラリーに使用する画像です。3枚以上あると見栄えが良くなります。",
            portfolioUpload: "ポートフォリオ画像を追加",
            portfolioWarning:
              "ポートフォリオ画像は3枚以上あると、B側詳細ページで自然なギャラリー表示にできます。",
            portfolioEmpty:
              "まだポートフォリオ画像がありません。商品PR・投稿実績・雰囲気が伝わる画像を追加してください。",
            pendingImages: "保存前の追加予定画像",
            socialTitle: "SNS連携",
            socialSubtitle:
              "SNS媒体は複数登録できます。フォロワー数などは将来的に外部APIで自動取得する想定です。",
            socialHelp:
              "今は暫定的にフォロワー帯と主な視聴者地域を入力できます。将来は自動取得に置き換えます。",
            socialItem: "SNS",
            remove: "削除",
            platform: "SNS媒体",
            followerRange: "フォロワー帯",
            url: "SNS URL",
            audienceRegion: "主な視聴者の国・地域",
            addSocial: "SNSを追加",
            saving: "保存中...",
            save: "保存する",
            backToDashboard: "ホームへ戻る",
            selectPlease: "選択してください",
            creatorNotFound: "クリエイター情報が見つかりませんでした。",
            publicNameRequired: "公開名を入力してください",
            publicNameInvalid:
              "公開名は英小文字・数字・アンダースコア・ハイフンのみで3〜30文字です",
            publicNameDuplicate: "この公開名は既に使われています",
            categoryRequired: "カテゴリーを選択してください",
            locationRequired: "国と都道府県 / 州を入力してください",
            languageRequired: "発信言語と対応言語を選択してください",
            socialRequired: "活動SNSを少なくとも1件入力してください",
            socialIncomplete: "活動SNSに未入力の行があります",
            missingCreatorId: "creator_id を取得できませんでした。",
            missingUserId: "user_id を取得できませんでした。",
            saved: "プロフィールを保存しました。",
            saveError: "保存中にエラーが発生しました。",
            loading: "読み込み中...",
            uploadFailed: "画像アップロードに失敗しました。",
            myPage: "マイページ設定",
            menusTitle: "メニュー・投稿価格",
            menusBody: "公開中メニュー、投稿価格、納期を管理します。",
            payoutsTitle: "銀行口座・報酬",
            payoutsBody: "Stripe本人確認、銀行口座、送金履歴を確認します。",
            analyticsTitle: "SNS分析",
            analyticsBody: "フォロワー数・平均再生数などは今後自動取得予定です。",
            portfolioComing: "ポートフォリオ画像",
            portfolioLinkBody:
              "B側詳細ページの3枚ギャラリーに使う画像をここで管理します。",
          }
        : {
            badge: "Creator Profile",
            title: "Profile",
            subtitle:
              "Manage your public info, photos, social accounts, and creator settings.",
            approvalStatus: "Approval Status",
            publicName: "Public Name (@display name)",
            publicNamePlaceholder: "Example: yourname / main_account_name",
            publicNameHelp:
              "This is the public-facing name shown to brands and listing pages.",
            fullName: "Full Name (optional)",
            category: "Main Category",
            country: "Country",
            countryPlaceholder: "Example: Japan",
            prefecture: "State / Prefecture",
            prefecturePlaceholder: "Example: Kyoto / California",
            city: "City (optional)",
            cityPlaceholder: "Example: Kyoto City",
            contentLanguage: "Content Language",
            responseLanguage: "Response Language",
            subCategories: "Sub-categories",
            bio: "Short Bio",
            bioPlaceholder:
              "Briefly describe what you create and what kind of collaborations fit you.",
            accountSection: "Account",
            accountBody: "Set your display name, category, location, and languages.",
            imageSection: "Photos & Portfolio",
            imageBody:
              "Manage your profile image, cover image, and portfolio images shown to brands.",
            avatar: "Profile Image",
            cover: "Cover Image",
            imageChoose: "Choose from photos / album",
            noImage: "No image yet",
            portfolioTitle: "Portfolio images",
            portfolioBody:
              "Images used for the brand-facing creator detail gallery. Three or more images are recommended.",
            portfolioUpload: "Add portfolio images",
            portfolioWarning:
              "Three or more portfolio images will make the brand-facing gallery look more natural.",
            portfolioEmpty:
              "No portfolio images yet. Add images that show your PR work, content style, or visual mood.",
            pendingImages: "Pending images",
            socialTitle: "Social Links",
            socialSubtitle:
              "Add social platforms. Follower metrics can be automated later through external APIs.",
            socialHelp:
              "Follower range and main audience region are temporary manual fields and can be replaced by API data later.",
            socialItem: "SNS",
            remove: "Remove",
            platform: "Platform",
            followerRange: "Follower Range",
            url: "SNS URL",
            audienceRegion: "Main Audience Region",
            addSocial: "Add SNS",
            saving: "Saving...",
            save: "Save",
            backToDashboard: "Back to Home",
            selectPlease: "Please select",
            creatorNotFound: "Creator information was not found.",
            publicNameRequired: "Please enter your public name",
            publicNameInvalid:
              "Public name must be 3–30 characters using lowercase letters, numbers, underscores, or hyphens",
            publicNameDuplicate: "This public name is already in use",
            categoryRequired: "Please select a category",
            locationRequired: "Please enter your country and state / prefecture",
            languageRequired: "Please select content and response languages",
            socialRequired: "Please enter at least one social account",
            socialIncomplete: "One or more social account rows are incomplete",
            missingCreatorId: "Could not retrieve creator_id.",
            missingUserId: "Could not retrieve user_id.",
            saved: "Profile saved successfully.",
            saveError: "An error occurred while saving.",
            loading: "Loading...",
            uploadFailed: "Failed to upload image.",
            myPage: "My Page Settings",
            menusTitle: "Menus & rates",
            menusBody: "Manage public menus, pricing, and delivery days.",
            payoutsTitle: "Bank account & payouts",
            payoutsBody: "Check Stripe identity, bank account, and transfer history.",
            analyticsTitle: "SNS Analytics",
            analyticsBody: "Follower and view metrics can be automated later.",
            portfolioComing: "Portfolio images",
            portfolioLinkBody:
              "Manage images used for the 3-photo gallery on brand-facing detail pages.",
          },
    [safeLocale]
  );

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [contentLanguage, setContentLanguage] = useState("");
  const [responseLanguage, setResponseLanguage] = useState("");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAssetRow[]>([]);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<string | null>(null);

  const [socialAccounts, setSocialAccounts] = useState<SocialAccountForm[]>([
    createEmptySocial(),
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const portfolioTotalCount = portfolioAssets.length + portfolioFiles.length;

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      portfolioPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [avatarPreview, coverPreview, portfolioPreviews]);

  const loadPortfolioAssets = async (creatorIdValue: string) => {
    const { data, error: portfolioError } = await supabase
      .from("creator_portfolio_assets")
      .select(
        "id, creator_id, asset_url, asset_type, title, sort_order, is_public, created_at, updated_at"
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

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metadataCover =
        typeof metadata.creator_cover_image_url === "string"
          ? metadata.creator_cover_image_url
          : null;

      const { data: creator, error: creatorError } = await supabase
        .from("creators")
        .select(
          "id, user_id, display_name, full_name, bio, category, country, prefecture, city, content_language, response_language, sub_categories, avatar_url, cover_image_url, approval_status"
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
      setFullName(creatorRow.full_name ?? "");
      setCategory(creatorRow.category ?? "");
      setCountry(creatorRow.country ?? "");
      setPrefecture(creatorRow.prefecture ?? "");
      setCity(creatorRow.city ?? "");
      setContentLanguage(creatorRow.content_language ?? "");
      setResponseLanguage(creatorRow.response_language ?? "");
      setSubCategories(
        Array.isArray(creatorRow.sub_categories) ? creatorRow.sub_categories : []
      );
      setBio(creatorRow.bio ?? "");
      setAvatarUrl(creatorRow.avatar_url ?? null);
      setCoverUrl(creatorRow.cover_image_url ?? metadataCover ?? null);

      const [
        { data: socials, error: socialError },
      ] = await Promise.all([
        supabase
          .from("creator_social_accounts")
          .select("platform, url, follower_range, audience_country")
          .eq("creator_id", creatorRow.id)
          .order("created_at", { ascending: true }),
      ]);

      if (socialError) {
        setError(socialError.message);
        setLoading(false);
        return;
      }

      const socialRows =
        (socials as SocialAccountForm[] | null)?.filter(Boolean) ?? [];

      setSocialAccounts(
        socialRows.length > 0 ? socialRows : [createEmptySocial()]
      );

      await loadPortfolioAssets(creatorRow.id);

      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy.creatorNotFound, router, supabase]);

  const approvalLabel = getApprovalStatusLabel(approvalStatus, safeLocale);

  const uploadImageAndGetUrl = async (
    file: File,
    creatorIdValue: string,
    kind: "avatar" | "cover" | "portfolio",
    index?: number
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

    if (!normalizedDisplayName) return copy.publicNameRequired;
    if (!isValidPublicName(normalizedDisplayName)) return copy.publicNameInvalid;
    if (!category.trim()) return copy.categoryRequired;
    if (!country.trim() || !prefecture.trim()) return copy.locationRequired;
    if (!contentLanguage.trim() || !responseLanguage.trim()) {
      return copy.languageRequired;
    }

    const cleaned = socialAccounts.filter(
      (item) =>
        item.platform.trim() ||
        item.url.trim() ||
        item.follower_range.trim() ||
        item.audience_country.trim()
    );

    if (cleaned.length === 0) return copy.socialRequired;

    const hasIncomplete = cleaned.some(
      (item) =>
        !item.platform.trim() ||
        !item.url.trim() ||
        !item.follower_range.trim() ||
        !item.audience_country.trim()
    );

    if (hasIncomplete) return copy.socialIncomplete;

    return null;
  };

  const handleImageSelect = (file: File | null, kind: "avatar" | "cover") => {
    if (kind === "avatar") {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(file);
      setAvatarPreview(file ? URL.createObjectURL(file) : null);
      return;
    }

    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
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
    if (!window.confirm(copy.remove)) return;

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
      const normalizedFullName = fullName.trim();
      const normalizedCountry = country.trim();
      const normalizedPrefecture = prefecture.trim();
      const normalizedCity = city.trim();
      const normalizedBio = bio.trim();
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
        setError(copy.publicNameDuplicate);
        setSaving(false);
        return;
      }

      let finalAvatarUrl = avatarUrl;
      let finalCoverUrl = coverUrl;

      if (avatarFile) {
        finalAvatarUrl = await uploadImageAndGetUrl(
          avatarFile,
          creatorId,
          "avatar"
        );
      }

      if (coverFile) {
        finalCoverUrl = await uploadImageAndGetUrl(
          coverFile,
          creatorId,
          "cover"
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
              index
            );

            return {
              creator_id: creatorId,
              asset_url: publicUrl,
              asset_type: "image",
              title: file.name,
              sort_order: startOrder + index,
              is_public: true,
            };
          })
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
          full_name: normalizedFullName || null,
          bio: normalizedBio || null,
          category: normalizedCategory || null,
          country: normalizedCountry,
          prefecture: normalizedPrefecture,
          city: normalizedCity || null,
          content_language: normalizedContentLanguage || null,
          response_language: normalizedResponseLanguage || null,
          sub_categories: subCategories.length > 0 ? subCategories : [],
          avatar_url: finalAvatarUrl,
          cover_image_url: finalCoverUrl,
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
          bio: normalizedBio || null,
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
            item.audience_country
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
          creator_prefecture: normalizedPrefecture,
          creator_city: normalizedCity || null,
          creator_content_language: normalizedContentLanguage,
          creator_response_language: normalizedResponseLanguage,
          creator_sub_categories: subCategories,
          creator_cover_image_url: finalCoverUrl ?? null,
        },
      });

      setDisplayName(normalizedDisplayName);
      setFullName(normalizedFullName);
      setCountry(normalizedCountry);
      setPrefecture(normalizedPrefecture);
      setCity(normalizedCity);
      setBio(normalizedBio);
      setCategory(normalizedCategory);
      setContentLanguage(normalizedContentLanguage);
      setResponseLanguage(normalizedResponseLanguage);
      setAvatarUrl(finalAvatarUrl ?? null);
      setCoverUrl(finalCoverUrl ?? null);
      setAvatarFile(null);
      setCoverFile(null);

      portfolioPreviews.forEach((url) => URL.revokeObjectURL(url));
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
    setSubCategories((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const updateSocial = (
    index: number,
    key: keyof SocialAccountForm,
    value: string
  ) => {
    setSocialAccounts((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]: value,
            }
          : item
      )
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
      <div className="space-y-5">
        <div className="h-40 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="h-72 animate-pulse rounded-[28px] bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-4">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
              {copy.badge}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">
              {copy.subtitle}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-4 py-2 text-sm font-black ${getApprovalTone(
              approvalStatus
            )}`}
          >
            {copy.approvalStatus}: {approvalLabel}
          </span>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      ) : null}

      <section>
        <h2 className="mb-4 text-2xl font-black text-slate-950">
          {copy.myPage}
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          <SettingLink
            href="/creator/menus"
            icon="+"
            title={copy.menusTitle}
            body={copy.menusBody}
          />
          <SettingLink
            href="/creator/payouts"
            icon="¥"
            title={copy.payoutsTitle}
            body={copy.payoutsBody}
          />
          <SettingLink
            href="/creator/profile"
            icon="▥"
            title={copy.analyticsTitle}
            body={copy.analyticsBody}
          />
          <SettingLink
            href="/creator/profile"
            icon="◎"
            title={copy.portfolioComing}
            body={copy.portfolioLinkBody}
          />
        </div>
      </section>

      <SectionCard icon="◯" title={copy.imageSection} body={copy.imageBody}>
        <div className="grid gap-4 md:grid-cols-2">
          <ImagePicker
            label={copy.avatar}
            currentUrl={avatarUrl}
            previewUrl={avatarPreview}
            noImageLabel={copy.noImage}
            buttonLabel={copy.imageChoose}
            onChange={(file) => handleImageSelect(file, "avatar")}
          />
          <ImagePicker
            label={copy.cover}
            currentUrl={coverUrl}
            previewUrl={coverPreview}
            noImageLabel={copy.noImage}
            buttonLabel={copy.imageChoose}
            onChange={(file) => handleImageSelect(file, "cover")}
          />
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                {copy.portfolioTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {copy.portfolioBody}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                portfolioTotalCount >= 3
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {portfolioTotalCount}/3
            </span>
          </div>

          {portfolioTotalCount < 3 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              {copy.portfolioWarning}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {portfolioAssets.map((asset) => (
              <PortfolioImage
                key={asset.id}
                src={asset.asset_url}
                label={asset.title || copy.portfolioTitle}
                deleting={deletingPortfolioId === asset.id}
                onDelete={() => void deletePortfolioAsset(asset.id)}
              />
            ))}

            {portfolioPreviews.map((preview, index) => (
              <PortfolioImage
                key={preview}
                src={preview}
                label={`${copy.pendingImages} ${index + 1}`}
                onDelete={() => removePendingPortfolio(index)}
              />
            ))}

            <PortfolioUploadBox
              pendingCount={portfolioFiles.length}
              buttonLabel={copy.portfolioUpload}
              onChange={handlePortfolioSelect}
            />
          </div>

          {portfolioAssets.length === 0 && portfolioFiles.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-500">
              {copy.portfolioEmpty}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard icon="□" title={copy.accountSection} body={copy.accountBody}>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{copy.publicName}</FieldLabel>
            <TextInput
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={copy.publicNamePlaceholder}
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {copy.publicNameHelp}
            </p>
          </div>

          <div>
            <FieldLabel>{copy.fullName}</FieldLabel>
            <TextInput
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>{copy.category}</FieldLabel>
            <SelectBox
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{copy.selectPlease}</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {optionLabel(option, safeLocale)}
                </option>
              ))}
            </SelectBox>
          </div>

          <div>
            <FieldLabel>{copy.country}</FieldLabel>
            <TextInput
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={copy.countryPlaceholder}
            />
          </div>

          <div>
            <FieldLabel>{copy.prefecture}</FieldLabel>
            <TextInput
              value={prefecture}
              onChange={(e) => setPrefecture(e.target.value)}
              placeholder={copy.prefecturePlaceholder}
            />
          </div>

          <div>
            <FieldLabel>{copy.city}</FieldLabel>
            <TextInput
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={copy.cityPlaceholder}
            />
          </div>

          <div>
            <FieldLabel>{copy.contentLanguage}</FieldLabel>
            <SelectBox
              value={contentLanguage}
              onChange={(e) => setContentLanguage(e.target.value)}
            >
              <option value="">{copy.selectPlease}</option>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {optionLabel(option, safeLocale)}
                </option>
              ))}
            </SelectBox>
          </div>

          <div>
            <FieldLabel>{copy.responseLanguage}</FieldLabel>
            <SelectBox
              value={responseLanguage}
              onChange={(e) => setResponseLanguage(e.target.value)}
            >
              <option value="">{copy.selectPlease}</option>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {optionLabel(option, safeLocale)}
                </option>
              ))}
            </SelectBox>
          </div>

          <div className="md:col-span-2">
            <FieldLabel>{copy.subCategories}</FieldLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => {
                const active = subCategories.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSubCategoryToggle(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {optionLabel(option, safeLocale)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <FieldLabel>{copy.bio}</FieldLabel>
            <TextArea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={copy.bioPlaceholder}
              rows={5}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon="◎" title={copy.socialTitle} body={copy.socialSubtitle}>
        <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          {copy.socialHelp}
        </p>

        <div className="space-y-4">
          {socialAccounts.map((social, index) => (
            <div
              key={index}
              className="rounded-[24px] border border-slate-100 bg-slate-50 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm font-black text-slate-950">
                  {copy.socialItem} {index + 1}
                </p>

                <button
                  type="button"
                  onClick={() => removeSocial(index)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
                >
                  {copy.remove}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>{copy.platform}</FieldLabel>
                  <SelectBox
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
                  </SelectBox>
                </div>

                <div>
                  <FieldLabel>{copy.url}</FieldLabel>
                  <TextInput
                    value={social.url}
                    onChange={(e) => updateSocial(index, "url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <FieldLabel>{copy.followerRange}</FieldLabel>
                  <SelectBox
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
                  </SelectBox>
                </div>

                <div>
                  <FieldLabel>{copy.audienceRegion}</FieldLabel>
                  <SelectBox
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
                  </SelectBox>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addSocial}
          className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition active:scale-[0.98]"
        >
          + {copy.addSocial}
        </button>
      </SectionCard>

      <div className="sticky bottom-24 z-20 rounded-[28px] border border-slate-100 bg-white/95 p-3 shadow-2xl backdrop-blur lg:static lg:shadow-none">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Link
            href="/creator/dashboard"
            className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition active:scale-[0.98]"
          >
            {copy.backToDashboard}
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center rounded-2xl bg-slate-950 px-7 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? copy.saving : copy.save}
          </button>
        </div>
      </div>
    </div>
  );
}