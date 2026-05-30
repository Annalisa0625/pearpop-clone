// File: app/signup/creator/SignupCreatorClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type Locale = "ja" | "en";

type SocialAccountForm = {
  platform: string;
  username_or_url: string;
  follower_range: string;
  audience_country: string;
};

type MenuForm = {
  menu_type: string;
  price: string;
  description: string;
};

type DraftState = {
  step: number;
  displayName: string;
  username: string;
  email: string;
  country: string;
  prefecture: string;
  mainCategory: string;
  subCategories: string[];
  shortBio: string;
  isAdultConfirmed: boolean;
  socialAccounts: SocialAccountForm[];
  menus: MenuForm[];
  phoneNumber: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
};

const STORAGE_KEY = "trendre_creator_signup_draft_v4";

const CREATOR_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_CREATOR_IMAGE_BUCKET || "creator-assets";

const TOTAL_STEPS = 7;

const CATEGORY_OPTIONS = [
  "美容",
  "ファッション",
  "フィットネス",
  "旅行",
  "グルメ",
  "ライフスタイル",
  "子育て",
  "ビジネス",
  "教育",
  "テック",
  "エンタメ",
  "その他",
];

const CATEGORY_OPTIONS_EN: Record<string, string> = {
  美容: "Beauty",
  ファッション: "Fashion",
  フィットネス: "Fitness",
  旅行: "Travel",
  グルメ: "Food",
  ライフスタイル: "Lifestyle",
  子育て: "Parenting",
  ビジネス: "Business",
  教育: "Education",
  テック: "Tech",
  エンタメ: "Entertainment",
  その他: "Other",
};

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

const MENU_OPTIONS = [
  {
    value: "Instagram投稿",
    labelJa: "Instagram投稿",
    labelEn: "Instagram Feed Post",
    helpJa: "Instagramのフィード投稿として商品やサービスを紹介します。",
    helpEn: "A feed post published on Instagram.",
  },
  {
    value: "Instagramリール",
    labelJa: "Instagramリール",
    labelEn: "Instagram Reel",
    helpJa: "Instagramリール動画として投稿します。",
    helpEn: "A short-form video published as an Instagram Reel.",
  },
  {
    value: "Instagramストーリーズ",
    labelJa: "Instagramストーリーズ",
    labelEn: "Instagram Stories",
    helpJa: "Instagramストーリーズで紹介します。",
    helpEn: "A story placement published on Instagram.",
  },
  {
    value: "TikTok投稿",
    labelJa: "TikTok投稿",
    labelEn: "TikTok Video",
    helpJa: "TikTok動画として投稿します。",
    helpEn: "A video published on TikTok.",
  },
  {
    value: "YouTubeショート",
    labelJa: "YouTubeショート",
    labelEn: "YouTube Short",
    helpJa: "YouTube Shortsとして投稿します。",
    helpEn: "A short-form video published on YouTube Shorts.",
  },
  {
    value: "YouTube動画",
    labelJa: "YouTube動画",
    labelEn: "YouTube Video",
    helpJa: "YouTube動画として投稿します。",
    helpEn: "A video published on YouTube.",
  },
  {
    value: "投稿なし・動画素材のみ納品",
    labelJa: "投稿なし・動画素材のみ納品",
    labelEn: "Video asset only, no posting",
    helpJa: "広告やSNSで使える動画素材だけを納品します。",
    helpEn: "Deliver video assets only. You do not post on your own account.",
  },
  {
    value: "投稿なし・写真素材のみ納品",
    labelJa: "投稿なし・写真素材のみ納品",
    labelEn: "Photo asset only, no posting",
    helpJa: "広告やSNSで使える写真素材だけを納品します。",
    helpEn: "Deliver photo assets only. You do not post on your own account.",
  },
  {
    value: "イベント訪問",
    labelJa: "イベント訪問",
    labelEn: "Event visit",
    helpJa: "店舗・イベント・展示会などに訪問して投稿または素材制作を行います。",
    helpEn: "Visit an event, store, or location for content creation.",
  },
  {
    value: "その他",
    labelJa: "その他",
    labelEn: "Other",
    helpJa: "上記以外のメニューです。説明欄に内容を書いてください。",
    helpEn: "Use this for custom services. Add details in the description.",
  },
];

function createEmptySocial(): SocialAccountForm {
  return {
    platform: "",
    username_or_url: "",
    follower_range: "",
    audience_country: "日本",
  };
}

function createEmptyMenu(): MenuForm {
  return {
    menu_type: "",
    price: "",
    description: "",
  };
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function safeBoolean(value: unknown): boolean {
  return value === true;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function safeSocialAccounts(value: unknown): SocialAccountForm[] {
  if (!Array.isArray(value) || value.length === 0) return [createEmptySocial()];

  const sanitized = value.map((item) => {
    const row = item as Record<string, unknown>;

    return {
      platform: safeString(row.platform),
      username_or_url: safeString(row.username_or_url),
      follower_range: safeString(row.follower_range),
      audience_country: safeString(row.audience_country, "日本"),
    };
  });

  return sanitized.length > 0 ? sanitized : [createEmptySocial()];
}

function safeMenus(value: unknown): MenuForm[] {
  if (!Array.isArray(value) || value.length === 0) return [createEmptyMenu()];

  const sanitized = value.map((item) => {
    const row = item as Record<string, unknown>;

    return {
      menu_type: safeString(row.menu_type),
      price: safeString(row.price),
      description: safeString(row.description),
    };
  });

  return sanitized.length > 0 ? sanitized : [createEmptyMenu()];
}

function getOAuthRedirectUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/signup/creator?oauth=1`;
}

function buildUsernamePreview(username: string) {
  return `trendre.jp/@${username || "your-id"}`;
}

function normalizeHandle(input: string) {
  return input.trim().replace(/^@/, "");
}

function getSocialConfig(platform: string, locale: Locale) {
  if (platform === "Instagram") {
    return {
      prefix: "https://www.instagram.com/",
      placeholder: locale === "ja" ? "例：yourname" : "e.g. yourname",
      guide:
        locale === "ja"
          ? "@は不要です。ユーザーネームだけ入力してください。"
          : "You do not need @. Enter your username only.",
    };
  }

  if (platform === "TikTok") {
    return {
      prefix: "https://www.tiktok.com/@",
      placeholder: locale === "ja" ? "例：yourname" : "e.g. yourname",
      guide:
        locale === "ja"
          ? "@は不要です。ユーザーネームだけ入力してください。"
          : "You do not need @. Enter your username only.",
    };
  }

  if (platform === "YouTube") {
    return {
      prefix: "https://www.youtube.com/@",
      placeholder: locale === "ja" ? "例：yourchannel" : "e.g. yourchannel",
      guide:
        locale === "ja"
          ? "YouTubeのハンドル名を入力してください。"
          : "Enter your YouTube handle.",
    };
  }

  if (platform === "X") {
    return {
      prefix: "https://x.com/",
      placeholder: locale === "ja" ? "例：yourname" : "e.g. yourname",
      guide:
        locale === "ja"
          ? "Xのユーザー名を入力してください。"
          : "Enter your X username.",
    };
  }

  if (platform === "Website") {
    return {
      prefix: "",
      placeholder: "https://example.com",
      guide:
        locale === "ja"
          ? "WebサイトやポートフォリオURLを入力してください。"
          : "Enter your website or portfolio URL.",
    };
  }

  return {
    prefix: "",
    placeholder: locale === "ja" ? "ユーザーネームを入力" : "Enter username",
    guide:
      locale === "ja"
        ? "媒体を選ぶと入力方法が表示されます。"
        : "Select a platform to see input guidance.",
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

function formatOption(
  value: string,
  locale: Locale,
  enMap: Record<string, string>
) {
  return locale === "ja" ? value : enMap[value] ?? value;
}

function getMenuLabel(value: string, locale: Locale) {
  const item = MENU_OPTIONS.find((option) => option.value === value);
  if (!item) return value || (locale === "ja" ? "未選択" : "Not selected");
  return locale === "ja" ? item.labelJa : item.labelEn;
}

function getMenuHelp(value: string, locale: Locale) {
  const item = MENU_OPTIONS.find((option) => option.value === value);
  if (!item) return "";
  return locale === "ja" ? item.helpJa : item.helpEn;
}

function fileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

function BackdropHero() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="absolute right-[-260px] top-[120px] h-[560px] w-[560px] rounded-full bg-emerald-100/25 blur-[150px]" />
      <div className="absolute left-[-260px] bottom-[-160px] h-[520px] w-[520px] rounded-full bg-rose-100/25 blur-[150px]" />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-24 opacity-70 md:grid-cols-[minmax(0,1fr)_520px] md:px-6">
        <div className="pt-12">
          <p className="max-w-xl text-[34px] font-black leading-tight tracking-[-0.06em] text-slate-950 md:text-[54px]">
            PRやUGC制作の注文を、オンラインで受けられる。
          </p>
          <p className="mt-5 max-w-lg text-sm font-semibold leading-8 text-slate-500">
            プロフィール、SNS、ポートフォリオ、メニューを登録すると、
            企業があなたを見つけて注文できます。
          </p>
        </div>

        {imageFailed ? (
          <div className="hidden h-[460px] rounded-[36px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:block" />
        ) : (
          <img
            src="/brand/trendre-home-hero.png"
            alt=""
            onError={() => setImageFailed(true)}
            className="hidden w-full object-contain md:block"
          />
        )}
      </div>
    </div>
  );
}

function LocaleButton({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
      className="rounded-full bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-200"
    >
      {locale === "ja" ? "EN" : "日本語"}
    </button>
  );
}

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-[#ff5f67] transition-all duration-300"
        style={{ width: `${((current + 1) / TOTAL_STEPS) * 100}%` }}
      />
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-sm font-black text-slate-900">{children}</label>
  );
}

function TextInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-slate-950 ${className}`}
    />
  );
}

function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold leading-7 text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-slate-950 ${className}`}
    />
  );
}

function SelectInput({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 outline-none transition focus:border-slate-950 ${className}`}
    >
      {children}
    </select>
  );
}

function ChoiceButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-black transition ${
        selected
          ? "bg-slate-950 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function FilePickerButton({
  children,
  multiple,
  onChange,
  className = "",
}: {
  children: ReactNode;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  className?: string;
}) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-black ${className}`}
    >
      {children}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          onChange(files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function StepShell({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h1 className="text-[26px] font-black leading-tight tracking-[-0.045em] text-slate-950 md:text-[32px]">
        {title}
      </h1>

      {body ? (
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
          {body}
        </p>
      ) : null}

      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function SignupCreatorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale();
  const appLocale = (locale === "en" ? "en" : "ja") as Locale;

  const copy = useMemo(
    () =>
      appLocale === "ja"
        ? {
            step: "STEP",
            displayTitle: "プロフィールの基本情報",
            displayBody:
              "企業に表示される名前と、プロフィールURLに使うIDを設定します。",
            displayName: "表示名",
            displayNamePlaceholder: "例：Yuna Beauty",
            username: "プロフィールURL用ID",
            usernamePlaceholder: "例：yuna_beauty",
            usernamePreview: "URLプレビュー",

            accountTitle: "ログイン方法",
            accountBody: "Google、またはメールアドレスで登録できます。",
            oauthConnected: "Google連携済み",
            email: "メールアドレス",
            password: "パスワード（8文字以上）",
            signUpWithGoogle: "Googleで続ける",
            orText: "または",

            profileTitle: "発信ジャンル",
            profileBody:
              "メインカテゴリを選んでください。地域や自己紹介はあとから編集できます。",
            country: "国（任意）",
            prefecture: "都道府県（任意）",
            mainCategory: "メインカテゴリ",
            subCategories: "サブカテゴリ（任意）",
            shortBio: "短い自己紹介（任意）",
            adultConfirm: "18歳以上です",

            socialTitle: "SNSアカウント",
            socialBody:
              "1つ以上のSNSを登録してください。企業が確認するために使います。",
            platform: "媒体",
            socialHandle: "ユーザーネーム",
            followerRange: "フォロワー数",
            audienceCountry: "主なフォロワー層",
            urlPreview: "URL",
            addSocial: "SNSを追加",
            remove: "削除",

            imagesTitle: "写真",
            imagesBody:
              "プロフィール画像1枚と、ポートフォリオ画像3枚以上を追加してください。",
            avatar: "プロフィール画像",
            avatarHelp: "丸いアイコンとして表示されます。",
            avatarChoose: "プロフィール画像を選択",
            portfolio: "ポートフォリオ画像",
            portfolioHelp:
              "3枚以上必須です。あなたの雰囲気が伝わる写真を選んでください。",
            portfolioChoose: "画像を追加",

            menuTitle: "メニュー",
            menuBody:
              "企業が注文できるメニューを1つ以上作成してください。あとから変更できます。",
            menuType: "メニュー内容",
            price: "金額（円）",
            menuDescription: "説明（任意）",
            addMenu: "メニューを追加",

            phoneTitle: "確認",
            phoneBody:
              "電話番号を確認し、利用規約とプライバシーポリシーに同意してください。",
            phoneNumber: "電話番号（例：09012345678）",
            sendCode: "認証コードを送信",
            verificationCode: "6桁認証コード",
            verifyCode: "確認する",
            verified: "確認済み",
            termsLabel: "利用規約に同意する",
            privacyLabel: "プライバシーポリシーに同意する",
            termsLink: "利用規約",
            privacyLink: "プライバシーポリシー",

            continue: "続ける",
            back: "戻る",
            finish: "登録を完了する",
            loading: "処理中...",
            selectPlease: "選択してください",
            login: "ログイン",
            reset: "最初からやり直す",

            displayNameRequired: "表示名を入力してください",
            usernameRequired: "プロフィールURL用IDを入力してください",
            usernameInvalid:
              "プロフィールURL用IDは英小文字・数字・アンダースコア・ハイフンのみで3〜30文字です",
            emailRequired: "メールアドレスを入力してください",
            emailInvalid: "メールアドレスの形式が正しくありません",
            passwordRequired: "パスワードは8文字以上必要です",
            categoryRequired: "メインカテゴリと18歳以上確認が必要です",
            socialRequired: "SNSを少なくとも1件、正しく入力してください",
            avatarRequired: "プロフィール画像を追加してください",
            portfolioRequired: "ポートフォリオ画像を3枚以上追加してください",
            menuRequired: "メニューを少なくとも1つ正しく入力してください",
            phoneRequired: "電話番号を入力してください",
            phoneVerifyRequired: "電話番号の確認を完了してください",
            termsRequired:
              "利用規約とプライバシーポリシーへの同意が必要です",
            devCodeAlert: "開発用認証コード: ",
            codeInvalid: "認証コードが正しくありません",
            signupFailed: "登録に失敗しました",
            imageUploadFailed: "画像のアップロードに失敗しました",
            duplicateUsername: "このプロフィールURL用IDは既に使われています",
            sessionMissing:
              "アカウント作成後のログイン状態を確認できませんでした。Supabase Authでメール確認が必須になっている可能性があります。",
          }
        : {
            step: "STEP",
            displayTitle: "Basic profile",
            displayBody:
              "Set the name shown to brands and the ID used in your profile URL.",
            displayName: "Display name",
            displayNamePlaceholder: "Example: Yuna Beauty",
            username: "Profile URL ID",
            usernamePlaceholder: "Example: yuna_beauty",
            usernamePreview: "URL preview",

            accountTitle: "Login method",
            accountBody: "Continue with Google or sign up with email.",
            oauthConnected: "Google connected",
            email: "Email",
            password: "Password",
            signUpWithGoogle: "Continue with Google",
            orText: "or",

            profileTitle: "Content category",
            profileBody:
              "Choose your main category. Location and bio can be edited later.",
            country: "Country (optional)",
            prefecture: "State / Prefecture (optional)",
            mainCategory: "Main category",
            subCategories: "Sub-categories (optional)",
            shortBio: "Short bio (optional)",
            adultConfirm: "I am 18 years old or older",

            socialTitle: "Social accounts",
            socialBody:
              "Add at least one social account so brands can review it.",
            platform: "Platform",
            socialHandle: "Username",
            followerRange: "Follower range",
            audienceCountry: "Main audience country",
            urlPreview: "URL",
            addSocial: "Add social account",
            remove: "Remove",

            imagesTitle: "Images",
            imagesBody:
              "Add one profile image and at least three portfolio images.",
            avatar: "Profile image",
            avatarHelp: "Displayed as your round icon.",
            avatarChoose: "Choose profile image",
            portfolio: "Portfolio images",
            portfolioHelp:
              "At least 3 are required. Choose images that show your style.",
            portfolioChoose: "Add images",

            menuTitle: "Menus",
            menuBody:
              "Create at least one menu that brands can order. You can edit it later.",
            menuType: "Menu content",
            price: "Price (JPY)",
            menuDescription: "Description (optional)",
            addMenu: "Add menu",

            phoneTitle: "Confirmation",
            phoneBody:
              "Verify your phone number and agree to the Terms and Privacy Policy.",
            phoneNumber: "Phone number",
            sendCode: "Send code",
            verificationCode: "6-digit code",
            verifyCode: "Verify",
            verified: "Verified",
            termsLabel: "I agree to the Terms of Service",
            privacyLabel: "I agree to the Privacy Policy",
            termsLink: "Terms",
            privacyLink: "Privacy Policy",

            continue: "Continue",
            back: "Back",
            finish: "Complete registration",
            loading: "Processing...",
            selectPlease: "Please select",
            login: "Login",
            reset: "Start over",

            displayNameRequired: "Please enter your display name",
            usernameRequired: "Please enter your profile URL ID",
            usernameInvalid:
              "Profile URL ID must be 3–30 characters using lowercase letters, numbers, underscores, or hyphens",
            emailRequired: "Please enter your email address",
            emailInvalid: "Please enter a valid email address",
            passwordRequired: "Password must be at least 8 characters",
            categoryRequired:
              "Main category and age confirmation are required",
            socialRequired: "Please add at least one valid social account",
            avatarRequired: "Please add a profile image",
            portfolioRequired: "Please add at least 3 portfolio images",
            menuRequired: "Please add at least one valid menu",
            phoneRequired: "Please enter your phone number",
            phoneVerifyRequired: "Please complete phone verification",
            termsRequired: "You must agree to the Terms and Privacy Policy",
            devCodeAlert: "Development verification code: ",
            codeInvalid: "The verification code is incorrect",
            signupFailed: "Sign up failed",
            imageUploadFailed: "Failed to upload images",
            duplicateUsername: "This profile URL ID is already taken",
            sessionMissing:
              "Could not confirm your signed-in session after account creation. Email confirmation may be required in Supabase Auth settings.",
          },
    [appLocale]
  );

  const stepTitles = useMemo(
    () =>
      appLocale === "ja"
        ? ["基本情報", "ログイン", "ジャンル", "SNS", "写真", "メニュー", "確認"]
        : ["Profile", "Login", "Category", "Socials", "Images", "Menus", "Confirm"],
    [appLocale]
  );

  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [country, setCountry] = useState("");
  const [prefecture, setPrefecture] = useState("");

  const [mainCategory, setMainCategory] = useState("");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [shortBio, setShortBio] = useState("");
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);

  const [socialAccounts, setSocialAccounts] = useState<SocialAccountForm[]>([
    createEmptySocial(),
  ]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);

  const [menus, setMenus] = useState<MenuForm[]>([createEmptyMenu()]);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const [oauthSessionEmail, setOauthSessionEmail] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOAuthReturn = searchParams.get("oauth") === "1";
  const shouldResetDraft = searchParams.get("reset") === "1";

  useEffect(() => {
    if (shouldResetDraft) {
      localStorage.removeItem(STORAGE_KEY);
      setStep(0);
      return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as Partial<DraftState>;

      setStep(
        typeof draft.step === "number"
          ? Math.max(0, Math.min(draft.step, TOTAL_STEPS - 1))
          : 0
      );

      setDisplayName(safeString(draft.displayName));
      setUsername(safeString(draft.username));
      setEmail(safeString(draft.email));
      setCountry(safeString(draft.country));
      setPrefecture(safeString(draft.prefecture));
      setMainCategory(safeString(draft.mainCategory));
      setSubCategories(safeStringArray(draft.subCategories));
      setShortBio(safeString(draft.shortBio));
      setIsAdultConfirmed(safeBoolean(draft.isAdultConfirmed));
      setSocialAccounts(safeSocialAccounts(draft.socialAccounts));
      setMenus(safeMenus(draft.menus));
      setPhoneNumber(safeString(draft.phoneNumber));
      setAgreedToTerms(safeBoolean(draft.agreedToTerms));
      setAgreedToPrivacy(safeBoolean(draft.agreedToPrivacy));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [shouldResetDraft]);

  useEffect(() => {
    const draft: DraftState = {
      step,
      displayName,
      username,
      email,
      country,
      prefecture,
      mainCategory,
      subCategories,
      shortBio,
      isAdultConfirmed,
      socialAccounts,
      menus,
      phoneNumber,
      agreedToTerms,
      agreedToPrivacy,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [
    step,
    displayName,
    username,
    email,
    country,
    prefecture,
    mainCategory,
    subCategories,
    shortBio,
    isAdultConfirmed,
    socialAccounts,
    menus,
    phoneNumber,
    agreedToTerms,
    agreedToPrivacy,
  ]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      portfolioPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [avatarPreview, portfolioPreviews]);

  useEffect(() => {
    const hydrateSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const meta = session.user.user_metadata ?? {};

      const oauthName =
        typeof meta.display_name === "string" && meta.display_name.trim()
          ? meta.display_name.trim()
          : typeof meta.full_name === "string" && meta.full_name.trim()
            ? meta.full_name.trim()
            : typeof meta.name === "string" && meta.name.trim()
              ? meta.name.trim()
              : "";

      const oauthEmail =
        typeof session.user.email === "string" ? session.user.email : "";

      setOauthSessionEmail(oauthEmail || null);
      setDisplayName((prev) => (prev.trim() ? prev : oauthName));
      setEmail((prev) => (prev.trim() ? prev : oauthEmail));

      const { data: existingCreator } = await supabase
        .from("creators")
        .select("id, stripe_onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (existingCreator) {
        const { count } = await supabase
          .from("creator_portfolio_assets")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", existingCreator.id)
          .eq("asset_type", "image")
          .eq("is_public", true);

        if ((count ?? 0) < 3) {
          router.replace("/creator/profile?from=signup&required=portfolio");
          return;
        }

        router.replace(
          existingCreator.stripe_onboarding_completed
            ? "/creator/dashboard"
            : "/creator/payouts?from=signup"
        );
        return;
      }

      if (hasOAuthReturn && step < 2) {
        setStep(2);
      }
    };

    void hydrateSession();
  }, [hasOAuthReturn, router, step, supabase]);

  const toggleSubCategory = (value: string) => {
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
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
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

  const updateMenu = (index: number, key: keyof MenuForm, value: string) => {
    setMenus((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  const addMenu = () => {
    setMenus((prev) => [...prev, createEmptyMenu()]);
  };

  const removeMenu = (index: number) => {
    setMenus((prev) => {
      if (prev.length === 1) return [createEmptyMenu()];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAvatarSelect = (files: File[]) => {
    const file = files[0] ?? null;

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);

    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };

  const handlePortfolioSelect = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    setPortfolioFiles((prev) => [...prev, ...imageFiles]);
    setPortfolioPreviews((prev) => [
      ...prev,
      ...imageFiles.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const removePortfolioFile = (index: number) => {
    setPortfolioFiles((prev) => prev.filter((_, i) => i !== index));
    setPortfolioPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target);
      return prev.filter((_, i) => i !== index);
    });
  };

  const validateStep = async () => {
    setError(null);

    if (step === 0) {
      const normalized = username.trim().toLowerCase();
      const valid = /^[a-z0-9][a-z0-9_-]{2,29}$/.test(normalized);

      if (!displayName.trim()) {
        setError(copy.displayNameRequired);
        return false;
      }

      if (!normalized) {
        setError(copy.usernameRequired);
        return false;
      }

      if (!valid) {
        setError(copy.usernameInvalid);
        return false;
      }

      const { data: duplicateProfile, error: duplicateError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalized)
        .maybeSingle();

      if (duplicateError) {
        setError(copy.signupFailed);
        return false;
      }

      if (duplicateProfile) {
        setError(copy.duplicateUsername);
        return false;
      }

      setUsername(normalized);
    }

    if (step === 1) {
      const hasOAuth = !!oauthSessionEmail;

      if (!hasOAuth) {
        if (!email.trim()) {
          setError(copy.emailRequired);
          return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setError(copy.emailInvalid);
          return false;
        }

        if (password.trim().length < 8) {
          setError(copy.passwordRequired);
          return false;
        }
      }
    }

    if (step === 2) {
      if (!mainCategory.trim() || !isAdultConfirmed) {
        setError(copy.categoryRequired);
        return false;
      }
    }

    if (step === 3) {
      const cleaned = socialAccounts.filter(
        (item) =>
          item.platform.trim() ||
          item.username_or_url.trim() ||
          item.follower_range.trim() ||
          item.audience_country.trim()
      );

      if (cleaned.length === 0) {
        setError(copy.socialRequired);
        return false;
      }

      const hasIncomplete = cleaned.some(
        (item) =>
          !item.platform.trim() ||
          !item.username_or_url.trim() ||
          !item.follower_range.trim() ||
          !item.audience_country.trim()
      );

      if (hasIncomplete) {
        setError(copy.socialRequired);
        return false;
      }
    }

    if (step === 4) {
      if (!avatarFile) {
        setError(copy.avatarRequired);
        return false;
      }

      if (portfolioFiles.length < 3) {
        setError(copy.portfolioRequired);
        return false;
      }
    }

    if (step === 5) {
      const filledMenus = menus.filter(
        (menu) => menu.menu_type.trim() || menu.price.trim()
      );

      if (filledMenus.length === 0) {
        setError(copy.menuRequired);
        return false;
      }

      const hasInvalidMenu = filledMenus.some((menu) => {
        const priceNumber = Number(menu.price);
        return (
          !menu.menu_type.trim() ||
          !menu.price.trim() ||
          !Number.isFinite(priceNumber) ||
          priceNumber <= 0
        );
      });

      if (hasInvalidMenu) {
        setError(copy.menuRequired);
        return false;
      }
    }

    if (step === 6) {
      if (!phoneNumber.trim()) {
        setError(copy.phoneRequired);
        return false;
      }

      if (!phoneVerified) {
        setError(copy.phoneVerifyRequired);
        return false;
      }

      if (!agreedToTerms || !agreedToPrivacy) {
        setError(copy.termsRequired);
        return false;
      }
    }

    return true;
  };

  const goNext = async () => {
    const valid = await validateStep();
    if (!valid) return;
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleGoogleSignup = async () => {
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });

    if (oauthError) {
      setError(oauthError.message);
    }
  };

  const sendDevCode = () => {
    if (!phoneNumber.trim()) {
      setError(copy.phoneRequired);
      return;
    }

    const code = "123456";
    setSentCode(code);
    window.alert(`${copy.devCodeAlert}${code}`);
  };

  const verifyDevCode = () => {
    if (!sentCode || verificationCode.trim() !== sentCode) {
      setError(copy.codeInvalid);
      return;
    }

    setError(null);
    setPhoneVerified(true);
  };

  const uploadImageAndGetUrl = async (
    file: File,
    ownerKey: string,
    kind: "avatar" | "portfolio",
    index?: number
  ) => {
    const ext = fileExtension(file);
    const suffix =
      typeof index === "number" ? `${Date.now()}-${index}` : `${Date.now()}`;
    const safeOwnerKey = ownerKey.replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = `${safeOwnerKey}/${kind}-${suffix}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .upload(filePath, file, {
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(uploadError.message || copy.imageUploadFailed);
    }

    const { data } = supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const ensureAuthenticatedSession = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (currentSession?.user && currentSession.access_token) {
      return currentSession;
    }

    if (!email.trim()) throw new Error(copy.emailRequired);

    if (!password.trim() || password.trim().length < 8) {
      throw new Error(copy.passwordRequired);
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: getOAuthRedirectUrl(),
        data: {
          full_name: displayName.trim(),
          display_name: displayName.trim(),
          creator_username: username.trim().toLowerCase(),
        },
      },
    });

    if (signUpError) {
      throw new Error(signUpError.message || copy.signupFailed);
    }

    if (data.session?.user && data.session.access_token) {
      return data.session;
    }

    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.getSession();

    if (refreshError) {
      throw new Error(refreshError.message || copy.signupFailed);
    }

    if (!refreshedSession?.user || !refreshedSession.access_token) {
      throw new Error(copy.sessionMissing);
    }

    return refreshedSession;
  };

  const handleFinish = async () => {
    const valid = await validateStep();
    if (!valid) return;

    setLoading(true);
    setError(null);

    try {
      if (!avatarFile) throw new Error(copy.avatarRequired);
      if (portfolioFiles.length < 3) throw new Error(copy.portfolioRequired);

      const validMenus = menus
        .map((menu) => ({
          menu_type: menu.menu_type.trim(),
          price: Number(menu.price),
          description: menu.description.trim() || null,
        }))
        .filter((menu) => menu.menu_type && menu.price > 0);

      if (validMenus.length === 0) throw new Error(copy.menuRequired);

      const session = await ensureAuthenticatedSession();
      const ownerKey = session.user.id || username.trim().toLowerCase();

      const avatarUrl = await uploadImageAndGetUrl(
        avatarFile,
        ownerKey,
        "avatar"
      );

      const portfolioAssets = await Promise.all(
        portfolioFiles.map(async (file, index) => {
          const assetUrl = await uploadImageAndGetUrl(
            file,
            ownerKey,
            "portfolio",
            index
          );

          return {
            asset_url: assetUrl,
            title: file.name,
            sort_order: index,
          };
        })
      );

      const res = await fetch("/api/signup/complete-creator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          auth_mode: "oauth",
          access_token: session.access_token,

          username: username.trim().toLowerCase(),
          display_name: displayName.trim(),
          full_name: displayName.trim(),
          email: email.trim(),

          avatar_url: avatarUrl,
          portfolio_assets: portfolioAssets,

          country: country.trim() || null,
          prefecture: prefecture.trim() || null,
          city: null,

          main_category: mainCategory,
          sub_categories: subCategories,
          content_language: "日本語",
          response_language: "日本語",
          short_bio: shortBio.trim() || null,
          is_adult_confirmed: isAdultConfirmed,

          phone_country_code: "+81",
          phone_number: phoneNumber.trim(),
          phone_verified: phoneVerified,

          social_accounts: socialAccounts
            .map((account) => ({
              platform: account.platform.trim(),
              username_or_url: normalizeHandle(account.username_or_url),
              follower_range: account.follower_range.trim(),
              audience_country: account.audience_country.trim(),
            }))
            .filter(
              (account) =>
                account.platform &&
                account.username_or_url &&
                account.follower_range &&
                account.audience_country
            ),

          first_menus: validMenus,

          agreed_to_terms: agreedToTerms,
          agreed_to_privacy: agreedToPrivacy,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || copy.signupFailed);
      }

      localStorage.removeItem(STORAGE_KEY);
      router.replace("/creator/payouts?from=signup");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : copy.signupFailed);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <StepShell title={copy.displayTitle} body={copy.displayBody}>
          <div className="grid gap-5">
            <div>
              <FieldLabel>{copy.displayName}</FieldLabel>
              <TextInput
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={copy.displayNamePlaceholder}
                className="mt-2"
              />
            </div>

            <div>
              <FieldLabel>{copy.username}</FieldLabel>
              <TextInput
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder={copy.usernamePlaceholder}
                className="mt-2"
              />
              <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
                <span className="text-slate-400">{copy.usernamePreview}: </span>
                {buildUsernamePreview(username)}
              </div>
            </div>
          </div>
        </StepShell>
      );
    }

    if (step === 1) {
      return (
        <StepShell title={copy.accountTitle} body={copy.accountBody}>
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 transition hover:bg-slate-50"
          >
            {copy.signUpWithGoogle}
          </button>

          <div className="my-6 flex items-center gap-4 text-xs font-black text-slate-300">
            <div className="h-px flex-1 bg-slate-200" />
            {copy.orText}
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {oauthSessionEmail ? (
            <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
              {copy.oauthConnected}: {oauthSessionEmail}
            </div>
          ) : null}

          <div className="grid gap-4">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.email}
              disabled={!!oauthSessionEmail}
            />

            {!oauthSessionEmail ? (
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={copy.password}
              />
            ) : null}
          </div>
        </StepShell>
      );
    }

    if (step === 2) {
      return (
        <StepShell title={copy.profileTitle} body={copy.profileBody}>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={copy.country}
              />
              <TextInput
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                placeholder={copy.prefecture}
              />
            </div>

            <div>
              <p className="text-sm font-black text-slate-950">
                {copy.mainCategory}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((item) => (
                  <ChoiceButton
                    key={item}
                    selected={mainCategory === item}
                    onClick={() => setMainCategory(item)}
                  >
                    {formatOption(item, appLocale, CATEGORY_OPTIONS_EN)}
                  </ChoiceButton>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-black text-slate-950">
                {copy.subCategories}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((item) => (
                  <ChoiceButton
                    key={item}
                    selected={subCategories.includes(item)}
                    onClick={() => toggleSubCategory(item)}
                  >
                    {formatOption(item, appLocale, CATEGORY_OPTIONS_EN)}
                  </ChoiceButton>
                ))}
              </div>
            </div>

            <TextArea
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value)}
              rows={3}
              placeholder={copy.shortBio}
            />

            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-black text-slate-900">
              <input
                type="checkbox"
                checked={isAdultConfirmed}
                onChange={(e) => setIsAdultConfirmed(e.target.checked)}
                className="h-4 w-4"
              />
              {copy.adultConfirm}
            </label>
          </div>
        </StepShell>
      );
    }

    if (step === 3) {
      return (
        <StepShell title={copy.socialTitle} body={copy.socialBody}>
          <div className="space-y-4">
            {socialAccounts.map((social, index) => {
              const config = getSocialConfig(social.platform, appLocale);
              const previewUrl = buildSocialPreview(
                social.platform,
                social.username_or_url
              );

              return (
                <div
                  key={index}
                  className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-black text-slate-950">SNS {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeSocial(index)}
                      className="text-sm font-black text-[#ff5f67]"
                    >
                      {copy.remove}
                    </button>
                  </div>

                  <div className="grid gap-3">
                    <SelectInput
                      value={social.platform}
                      onChange={(e) =>
                        updateSocial(index, "platform", e.target.value)
                      }
                    >
                      <option value="">{copy.platform}</option>
                      {PLATFORM_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </SelectInput>

                    <div>
                      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-slate-950">
                        {config.prefix ? (
                          <div className="flex max-w-[45%] items-center bg-slate-50 px-3 text-xs font-black text-slate-400">
                            <span className="truncate">{config.prefix}</span>
                          </div>
                        ) : null}

                        <input
                          value={social.username_or_url}
                          onChange={(e) =>
                            updateSocial(
                              index,
                              "username_or_url",
                              e.target.value
                            )
                          }
                          className="min-w-0 flex-1 px-4 py-3.5 text-base font-semibold outline-none"
                          placeholder={config.placeholder}
                        />
                      </div>

                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                        {config.guide}
                      </p>

                      {previewUrl ? (
                        <p className="mt-2 break-all rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-500 ring-1 ring-slate-100">
                          {copy.urlPreview}: {previewUrl}
                        </p>
                      ) : null}
                    </div>

                    <SelectInput
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
                            appLocale,
                            FOLLOWER_RANGE_OPTIONS_EN
                          )}
                        </option>
                      ))}
                    </SelectInput>

                    <SelectInput
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
                            appLocale,
                            AUDIENCE_COUNTRY_OPTIONS_EN
                          )}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addSocial}
            className="mt-5 w-full rounded-full bg-white px-4 py-4 text-sm font-black text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            + {copy.addSocial}
          </button>
        </StepShell>
      );
    }

    if (step === 4) {
      return (
        <StepShell title={copy.imagesTitle} body={copy.imagesBody}>
          <div className="space-y-5">
            <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
              <div className="flex items-center gap-5">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={copy.avatar}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-300">
                      Icon
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-950">{copy.avatar}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                    {copy.avatarHelp}
                  </p>
                  <div className="mt-3">
                    <FilePickerButton onChange={handleAvatarSelect}>
                      {copy.avatarChoose}
                    </FilePickerButton>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-950">{copy.portfolio}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                    {copy.portfolioHelp}
                  </p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                  {portfolioPreviews.length}/3
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {Array.from({
                  length: Math.max(3, portfolioPreviews.length),
                }).map((_, index) => {
                  const preview = portfolioPreviews[index];

                  if (preview) {
                    return (
                      <div
                        key={preview}
                        className="group relative aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200"
                      >
                        <img
                          src={preview}
                          alt={`${copy.portfolio} ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePortfolioFile(index)}
                          className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-black text-white"
                        >
                          ×
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-${index}`}
                      className="flex aspect-square items-center justify-center rounded-2xl bg-white text-xs font-black text-slate-300 ring-1 ring-dashed ring-slate-200"
                    >
                      {index + 1}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5">
                <FilePickerButton multiple onChange={handlePortfolioSelect}>
                  {copy.portfolioChoose}
                </FilePickerButton>
              </div>
            </div>
          </div>
        </StepShell>
      );
    }

    if (step === 5) {
      return (
        <StepShell title={copy.menuTitle} body={copy.menuBody}>
          <div className="space-y-4">
            {menus.map((menu, index) => (
              <div
                key={index}
                className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-black text-slate-950">Menu {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeMenu(index)}
                    className="text-sm font-black text-[#ff5f67]"
                  >
                    {copy.remove}
                  </button>
                </div>

                <div className="grid gap-3">
                  <SelectInput
                    value={menu.menu_type}
                    onChange={(e) =>
                      updateMenu(index, "menu_type", e.target.value)
                    }
                  >
                    <option value="">{copy.selectPlease}</option>
                    {MENU_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {appLocale === "ja" ? item.labelJa : item.labelEn}
                      </option>
                    ))}
                  </SelectInput>

                  {menu.menu_type ? (
                    <p className="rounded-2xl bg-white px-4 py-3 text-xs font-bold leading-6 text-slate-500 ring-1 ring-slate-100">
                      {getMenuLabel(menu.menu_type, appLocale)}：{" "}
                      {getMenuHelp(menu.menu_type, appLocale)}
                    </p>
                  ) : null}

                  <TextInput
                    type="number"
                    min={1}
                    value={menu.price}
                    onChange={(e) =>
                      updateMenu(index, "price", e.target.value)
                    }
                    placeholder={copy.price}
                  />

                  <TextArea
                    value={menu.description}
                    onChange={(e) =>
                      updateMenu(index, "description", e.target.value)
                    }
                    rows={3}
                    placeholder={copy.menuDescription}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addMenu}
            className="mt-5 w-full rounded-full bg-white px-4 py-4 text-sm font-black text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            + {copy.addMenu}
          </button>
        </StepShell>
      );
    }

    return (
      <StepShell title={copy.phoneTitle} body={copy.phoneBody}>
        <div className="grid gap-4">
          <TextInput
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              setPhoneVerified(false);
              setSentCode("");
              setVerificationCode("");
            }}
            placeholder={copy.phoneNumber}
            inputMode="tel"
          />

          <button
            type="button"
            onClick={sendDevCode}
            className="w-fit rounded-full bg-white px-5 py-3 text-sm font-black text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            {copy.sendCode}
          </button>

          <div className="flex gap-3">
            <TextInput
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder={copy.verificationCode}
              inputMode="numeric"
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={verifyDevCode}
              className="shrink-0 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              {phoneVerified ? copy.verified : copy.verifyCode}
            </button>
          </div>

          <div className="mt-2 space-y-3 rounded-[24px] bg-slate-50 p-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4"
              />
              <span>
                {copy.termsLabel}{" "}
                <Link href="/terms" className="font-black underline">
                  {copy.termsLink}
                </Link>
              </span>
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="h-4 w-4"
              />
              <span>
                {copy.privacyLabel}{" "}
                <Link href="/privacy" className="font-black underline">
                  {copy.privacyLink}
                </Link>
              </span>
            </label>
          </div>
        </div>
      </StepShell>
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <BackdropHero />

      <header className="relative z-20 flex items-center justify-between px-4 py-4 md:px-8">
        <Link href="/home" className="flex items-center" aria-label="Trendre">
          <img
            src="/brand/trendre-logo-full.png"
            alt="Trendre"
            className="h-8 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-50 sm:inline-flex"
          >
            {copy.login}
          </Link>
          <LocaleButton locale={appLocale} setLocale={setLocale} />
        </div>
      </header>

      <div className="fixed inset-0 z-10 bg-slate-950/10 backdrop-blur-[6px]" />

      <div className="fixed inset-0 z-30 flex items-center justify-center overflow-hidden px-4 py-5">
        <section className="relative flex max-h-[calc(100vh-40px)] w-full max-w-[680px] flex-col overflow-hidden rounded-[34px] border border-white/80 bg-white/95 shadow-[0_34px_120px_rgba(15,23,42,0.24)] backdrop-blur-xl">
          <div className="border-b border-slate-100 px-5 py-5 md:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff5f67]">
                  {copy.step} {step + 1} / {TOTAL_STEPS}
                </p>
                <p className="mt-1 text-sm font-black text-slate-500">
                  {stepTitles[step]}
                </p>
              </div>

              <Link
                href="/signup/creator?reset=1"
                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              >
                {copy.reset}
              </Link>
            </div>

            <div className="mt-5">
              <ProgressBar current={step} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-7">
            {renderStep()}

            {error ? (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700 ring-1 ring-rose-100">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 bg-white px-5 py-4 md:px-7">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || loading}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.back}
              </button>

              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={() => void goNext()}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-7 py-3.5 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copy.continue}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-7 py-3.5 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? copy.loading : copy.finish}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}