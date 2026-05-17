// app/signup/creator/SignupCreatorClient.tsx
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

const STORAGE_KEY = "trendre_creator_signup_draft_v3";

const CREATOR_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_CREATOR_IMAGE_BUCKET || "creator-assets";

const TOTAL_STEPS = 8;

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
    helpJa: "Instagramのフィード投稿として企業の商品・サービスを紹介します。",
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
    helpJa:
      "企業が広告やSNSで使う動画素材だけを納品します。あなたのSNSには投稿しません。",
    helpEn: "Deliver video assets only. You do not post on your own account.",
  },
  {
    value: "投稿なし・写真素材のみ納品",
    labelJa: "投稿なし・写真素材のみ納品",
    labelEn: "Photo asset only, no posting",
    helpJa:
      "企業が広告やSNSで使う写真素材だけを納品します。あなたのSNSには投稿しません。",
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
    helpJa: "上記以外の依頼メニューです。説明欄に内容を書いてください。",
    helpEn: "Use this for custom requests. Add details in the description.",
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
  if (!Array.isArray(value) || value.length === 0) {
    return [createEmptySocial()];
  }

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
  if (!Array.isArray(value) || value.length === 0) {
    return [createEmptyMenu()];
  }

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
          ? "Instagramアプリ → プロフィールを編集 → ユーザーネームをコピーして貼り付けてください。@は不要です。"
          : "Open Instagram → Edit profile → Copy your username. You do not need @.",
    };
  }

  if (platform === "TikTok") {
    return {
      prefix: "https://www.tiktok.com/@",
      placeholder: locale === "ja" ? "例：yourname" : "e.g. yourname",
      guide:
        locale === "ja"
          ? "TikTokアプリ → プロフィール → @から始まるユーザー名をコピーして貼り付けてください。@は不要です。"
          : "Open TikTok → Profile → Copy the username after @. You do not need @.",
    };
  }

  if (platform === "YouTube") {
    return {
      prefix: "https://www.youtube.com/@",
      placeholder: locale === "ja" ? "例：yourchannel" : "e.g. yourchannel",
      guide:
        locale === "ja"
          ? "YouTubeのハンドル名を入力してください。@は不要です。"
          : "Enter your YouTube handle. You do not need @.",
    };
  }

  if (platform === "X") {
    return {
      prefix: "https://x.com/",
      placeholder: locale === "ja" ? "例：yourname" : "e.g. yourname",
      guide:
        locale === "ja"
          ? "Xのユーザー名を入力してください。@は不要です。"
          : "Enter your X username. You do not need @.",
    };
  }

  if (platform === "Website") {
    return {
      prefix: "",
      placeholder:
        locale === "ja" ? "https://example.com" : "https://example.com",
      guide:
        locale === "ja"
          ? "WebサイトやポートフォリオURLを入力してください。"
          : "Enter your website or portfolio URL.",
    };
  }

  return {
    prefix: "",
    placeholder:
      locale === "ja" ? "ユーザーネームを入力" : "Enter username",
    guide:
      locale === "ja"
        ? "媒体を選ぶと入力方法のガイドが表示されます。"
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
  if (platform === "Website") return normalized;

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

function LocaleTabs({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLocale("ja")}
        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
          locale === "ja"
            ? "border-gray-950 bg-gray-950 text-white"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        JA
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
          locale === "en"
            ? "border-gray-950 bg-gray-950 text-white"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        EN
      </button>
    </div>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="mt-5 flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`h-2 flex-1 rounded-full transition ${
            index <= current ? "bg-gray-950" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
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
      className={`inline-flex cursor-pointer items-center justify-center rounded-2xl bg-gray-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-black ${className}`}
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

export default function SignupCreatorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale();
  const appLocale = locale as Locale;

  const copy = useMemo(
    () =>
      appLocale === "ja"
        ? {
            welcomeTitle: "Trendreで登録をはじめましょう",
            welcomeBody:
              "プロフィール、SNS、ポートフォリオ画像、メニューを登録しブランドがあなたに依頼しやすくなります。",
            identityTitle: "表示名と公開URLを設定してください",
            identityBody:
              "表示名は企業に見える名前です。公開URL用IDはプロフィールURLに使われます。",
            displayName: "表示名（SNSでの表示名と揃えてください）",
            displayNameHelp:
              "例：関西グルメ /りょうFitness  / Yuna Beauty",
            username: "公開URL用ID",
            usernameHelp:
              "URLに使うため、英小文字・数字・_・- のみ使えます。SNSの英数字IDに近いものがおすすめです。",
            accountTitle: "ログイン方法を設定してください",
            accountBody: "Google、またはメールアドレスで登録できます。",
            oauthConnected: "連携済みアカウント",
            email: "メールアドレス",
            password: "パスワード（8文字以上）",
            signUpWithGoogle: "Googleで登録",
            orText: "または",
            profileTitle: "発信内容を教えてください",
            profileBody:
              "カテゴリは企業があなたを見つけるために使われます。地域は任意です。",
            country: "国",
            prefecture: "都道府県",
            mainCategory: "メインカテゴリ",
            subCategories: "サブカテゴリ",
            shortBio: "短い自己紹介（発信内容など）",
            adultConfirm: "18歳以上です",
            socialTitle: "SNSアカウントを追加してください",
            socialBody:
              "媒体を選び、ユーザーネームをコピペしてください",
            platform: "媒体",
            socialHandle: "ユーザーネーム",
            followerRange: "フォロワー数",
            audienceCountry: "主なフォロワー層",
            urlPreview: "プロフィールURLプレビュー",
            addSocial: "SNSを追加",
            remove: "削除",
            imagesTitle: "写真を追加してください",
            imagesBody:
              "プロフィール画像は丸アイコン、ポートフォリオ画像は一覧・詳細ページに表示されます。",
            avatar: "プロフィール画像",
            avatarHelp: "B側に小さな丸アイコンとして表示されます。",
            avatarChoose: "プロフィール画像を選択",
            portfolio: "ポートフォリオ画像",
            portfolioHelp:
              "3枚以上必須です。1枚目は一覧カード、2枚目以降は詳細ページのギャラリーに使われます。",
            portfolioChoose: "ポートフォリオ画像を追加",
            imageSafetyNote:
              "画像は登録完了時にアップロードされます。ページを閉じると画像は再選択が必要です。",
            menuTitle: "メニューを作成してください",
            menuBody:
              "企業が依頼しやすいように、料金メニューを1つ以上登録してください。後から追加・編集できます。",
            menuFeeNote: "Trendreの手数料は売上から差し引かれます。",
            menuType: "メニュー内容",
            price: "金額（円）",
            menuDescription: "メニューについての説明（任意）",
            addMenu: "メニューを追加",
            phoneTitle: "電話番号を確認してください",
            phoneBody:
              "安全な取引のため、電話番号確認を行います。現在は開発用コードで確認します。",
            phoneNumber: "電話番号（例：09012345678）",
            sendCode: "認証コードを送信",
            verificationCode: "6桁認証コード",
            verifyCode: "確認する",
            verified: "確認済み",
            continue: "続ける",
            back: "戻る",
            finish: "登録を完了する",
            loading: "処理中...",
            selectPlease: "選択してください",
            displayNameRequired: "表示名を入力してください",
            usernameRequired: "公開URL用IDを入力してください",
            usernameInvalid:
              "公開URL用IDは英小文字・数字・アンダースコア・ハイフンのみで3〜30文字です",
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
            termsLabel: "利用規約に同意する",
            privacyLabel: "プライバシーポリシーに同意する",
            termsLink: "利用規約",
            privacyLink: "プライバシーポリシー",
            duplicateUsername: "この公開URL用IDは既に使われています",
            sessionMissing:
              "アカウント作成後のログイン状態を確認できませんでした。Supabase Authでメール確認が必須になっている可能性があります。",
          }
        : {
            welcomeTitle: "Start your Trendre registration",
            welcomeBody:
              "Add your profile, social accounts, portfolio images, and menus so brands can request you.",
            identityTitle: "Set your display name and public URL",
            identityBody:
              "Your display name is shown to brands. Your public URL ID is used in your profile URL.",
            displayName: "Display name",
            displayNameHelp: "Example: Yuna Beauty / Kyoto Creator",
            username: "Public URL ID",
            usernameHelp:
              "Used in your profile URL. Lowercase letters, numbers, _, and - only.",
            accountTitle: "Set up your login",
            accountBody: "You can sign up with Google or email and password.",
            oauthConnected: "Connected account",
            email: "Email",
            password: "Password",
            signUpWithGoogle: "Sign up with Google",
            orText: "or",
            profileTitle: "Tell brands what you create",
            profileBody:
              "Categories help brands discover you. Location is optional.",
            country: "Country (optional)",
            prefecture: "State / Prefecture (optional)",
            mainCategory: "Main category",
            subCategories: "Sub-categories (optional)",
            shortBio: "Short bio (optional)",
            adultConfirm: "I am 18 years old or older",
            socialTitle: "Add your social accounts",
            socialBody:
              "Select a platform and paste your username. We will build your profile URL automatically.",
            platform: "Platform",
            socialHandle: "Username",
            followerRange: "Follower range",
            audienceCountry: "Main audience country",
            urlPreview: "Profile URL preview",
            addSocial: "Add social account",
            remove: "Remove",
            imagesTitle: "Add your images",
            imagesBody:
              "Profile image is used as your round icon. Portfolio images are shown to brands.",
            avatar: "Profile image",
            avatarHelp: "Displayed as your small round icon.",
            avatarChoose: "Choose profile image",
            portfolio: "Portfolio images",
            portfolioHelp:
              "At least 3 are required. The first image is used on creator cards.",
            portfolioChoose: "Add portfolio images",
            imageSafetyNote:
              "Images are uploaded when you complete registration. If you close the page, you will need to select them again.",
            menuTitle: "Create your menus",
            menuBody:
              "Add at least one menu so brands can request you. You can edit them later.",
            menuFeeNote: "Trendre fee will be deducted from your payout.",
            menuType: "Menu content",
            price: "Price (JPY)",
            menuDescription: "Notes (optional)",
            addMenu: "Add menu",
            phoneTitle: "Verify your phone number",
            phoneBody:
              "Phone verification helps keep transactions safe. Development code is currently used.",
            phoneNumber: "Phone number",
            sendCode: "Send verification code",
            verificationCode: "6-digit code",
            verifyCode: "Verify",
            verified: "Verified",
            continue: "Continue",
            back: "Back",
            finish: "Complete registration",
            loading: "Processing...",
            selectPlease: "Please select",
            displayNameRequired: "Please enter your display name",
            usernameRequired: "Please enter your public URL ID",
            usernameInvalid:
              "Public URL ID must be 3–30 characters using lowercase letters, numbers, underscores, or hyphens",
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
            termsLabel: "I agree to the Terms of Service",
            privacyLabel: "I agree to the Privacy Policy",
            termsLink: "Terms of Service",
            privacyLink: "Privacy Policy",
            duplicateUsername: "This public URL ID is already taken",
            sessionMissing:
              "Could not confirm your signed-in session after account creation. Email confirmation may be required in Supabase Auth settings.",
          },
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

  const currentProgress = Math.min(step, TOTAL_STEPS - 1);
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
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }

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

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

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

      if (target) {
        URL.revokeObjectURL(target);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const validateStep = async () => {
    setError(null);

    if (step === 1) {
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

    if (step === 2) {
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

    if (step === 3) {
      if (!mainCategory.trim() || !isAdultConfirmed) {
        setError(copy.categoryRequired);
        return false;
      }
    }

    if (step === 4) {
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

    if (step === 5) {
      if (!avatarFile) {
        setError(copy.avatarRequired);
        return false;
      }

      if (portfolioFiles.length < 3) {
        setError(copy.portfolioRequired);
        return false;
      }
    }

    if (step === 6) {
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

    if (step === 7) {
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

    if (!email.trim()) {
      throw new Error(copy.emailRequired);
    }

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
      if (!avatarFile) {
        throw new Error(copy.avatarRequired);
      }

      if (portfolioFiles.length < 3) {
        throw new Error(copy.portfolioRequired);
      }

      const validMenus = menus
        .map((menu) => ({
          menu_type: menu.menu_type.trim(),
          price: Number(menu.price),
          description: menu.description.trim() || null,
        }))
        .filter((menu) => menu.menu_type && menu.price > 0);

      if (validMenus.length === 0) {
        throw new Error(copy.menuRequired);
      }

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
        <div className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-3xl font-black tracking-tight text-gray-950">
            {copy.welcomeTitle}
          </h1>
          <p className="mt-4 text-[15px] leading-8 text-gray-600">
            {copy.welcomeBody}
          </p>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-black text-gray-950">
            {copy.identityTitle}
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {copy.identityBody}
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label className="text-sm font-bold text-gray-900">
                {copy.displayName}
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-gray-950"
                placeholder="例：京都美容ママ"
              />
              <p className="mt-2 text-xs leading-5 text-gray-500">
                {copy.displayNameHelp}
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-900">
                {copy.username}
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-gray-950"
                placeholder="例：kyoto_beauty"
              />
              <p className="mt-2 text-xs leading-5 text-gray-500">
                {copy.usernameHelp}
              </p>
              <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-600">
                {buildUsernamePreview(username)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-black text-gray-950">
            {copy.accountTitle}
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {copy.accountBody}
          </p>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="mt-6 flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-black text-gray-900 transition hover:bg-gray-50"
          >
            {copy.signUpWithGoogle}
          </button>

          <div className="my-6 flex items-center gap-4 text-xs font-bold text-gray-400">
            <div className="h-px flex-1 bg-gray-200" />
            {copy.orText}
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {oauthSessionEmail ? (
            <div className="rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
              {copy.oauthConnected}: {oauthSessionEmail}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none transition focus:border-gray-950"
              placeholder={copy.email}
              disabled={!!oauthSessionEmail}
            />
            {!oauthSessionEmail ? (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none transition focus:border-gray-950"
                placeholder={copy.password}
              />
            ) : null}
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-5">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h1 className="text-2xl font-black text-gray-950">
              {copy.profileTitle}
            </h1>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              {copy.profileBody}
            </p>

            <div className="mt-6 grid gap-4">
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none transition focus:border-gray-950"
                placeholder={copy.country}
              />
              <input
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none transition focus:border-gray-950"
                placeholder={copy.prefecture}
              />
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-black text-gray-950">
              {copy.mainCategory}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMainCategory(item)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    mainCategory === item
                      ? "border-gray-950 bg-gray-950 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {formatOption(item, appLocale, CATEGORY_OPTIONS_EN)}
                </button>
              ))}
            </div>

            <p className="mt-7 text-sm font-black text-gray-950">
              {copy.subCategories}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleSubCategory(item)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    subCategories.includes(item)
                      ? "border-gray-950 bg-gray-950 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {formatOption(item, appLocale, CATEGORY_OPTIONS_EN)}
                </button>
              ))}
            </div>

            <textarea
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value)}
              rows={4}
              className="mt-6 w-full rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none transition focus:border-gray-950"
              placeholder={copy.shortBio}
            />

            <label className="mt-5 flex items-center gap-3 text-sm font-bold text-gray-900">
              <input
                type="checkbox"
                checked={isAdultConfirmed}
                onChange={(e) => setIsAdultConfirmed(e.target.checked)}
                className="h-4 w-4"
              />
              {copy.adultConfirm}
            </label>
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-black text-gray-950">
            {copy.socialTitle}
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {copy.socialBody}
          </p>

          <div className="mt-6 space-y-4">
            {socialAccounts.map((social, index) => {
              const config = getSocialConfig(social.platform, appLocale);
              const previewUrl = buildSocialPreview(
                social.platform,
                social.username_or_url
              );

              return (
                <div
                  key={index}
                  className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-black text-gray-950">SNS {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeSocial(index)}
                      className="text-sm font-bold text-red-600"
                    >
                      {copy.remove}
                    </button>
                  </div>

                  <div className="grid gap-3">
                    <select
                      value={social.platform}
                      onChange={(e) =>
                        updateSocial(index, "platform", e.target.value)
                      }
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-gray-950"
                    >
                      <option value="">{copy.platform}</option>
                      {PLATFORM_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <div>
                      <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white focus-within:border-gray-950">
                        {config.prefix ? (
                          <div className="flex max-w-[48%] items-center bg-gray-50 px-3 text-xs font-bold text-gray-500">
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
                          className="min-w-0 flex-1 px-4 py-3 text-base outline-none"
                          placeholder={config.placeholder}
                        />
                      </div>

                      <p className="mt-2 text-xs leading-5 text-gray-500">
                        {config.guide}
                      </p>

                      {previewUrl ? (
                        <p className="mt-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-gray-600 ring-1 ring-gray-100">
                          {copy.urlPreview}: {previewUrl}
                        </p>
                      ) : null}
                    </div>

                    <select
                      value={social.follower_range}
                      onChange={(e) =>
                        updateSocial(index, "follower_range", e.target.value)
                      }
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-gray-950"
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
                    </select>

                    <select
                      value={social.audience_country}
                      onChange={(e) =>
                        updateSocial(index, "audience_country", e.target.value)
                      }
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-gray-950"
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
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addSocial}
            className="mt-5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-black text-gray-900 transition hover:bg-gray-50"
          >
            + {copy.addSocial}
          </button>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-black text-gray-950">
            {copy.imagesTitle}
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {copy.imagesBody}
          </p>

          <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-6 text-blue-800">
            {copy.imageSafetyNote}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={copy.avatar}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-400">
                    Icon
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-black text-gray-950">{copy.avatar}</p>
                <p className="mt-2 text-xs leading-5 text-gray-500">
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

          <div className="mt-5 rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-black text-gray-950">{copy.portfolio}</p>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  {copy.portfolioHelp}
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                {portfolioPreviews.length}/3
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {Array.from({ length: Math.max(3, portfolioPreviews.length) }).map(
                (_, index) => {
                  const preview = portfolioPreviews[index];

                  if (preview) {
                    return (
                      <div
                        key={preview}
                        className="group relative aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200"
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
                        {index === 0 ? (
                          <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-gray-800">
                            Main
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-${index}`}
                      className="flex aspect-square items-center justify-center rounded-2xl bg-white text-xs font-black text-gray-300 ring-1 ring-dashed ring-gray-200"
                    >
                      {index + 1}
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-5">
              <FilePickerButton multiple onChange={handlePortfolioSelect}>
                {copy.portfolioChoose}
              </FilePickerButton>
            </div>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-black text-gray-950">
            {copy.menuTitle}
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {copy.menuBody}
          </p>
          <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-6 text-blue-800">
            {copy.menuFeeNote}
          </p>

          <div className="mt-6 space-y-4">
            {menus.map((menu, index) => (
              <div
                key={index}
                className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-black text-gray-950">
                    Menu {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeMenu(index)}
                    className="text-sm font-bold text-red-600"
                  >
                    {copy.remove}
                  </button>
                </div>

                <div className="grid gap-3">
                  <select
                    value={menu.menu_type}
                    onChange={(e) =>
                      updateMenu(index, "menu_type", e.target.value)
                    }
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-gray-950"
                  >
                    <option value="">{copy.selectPlease}</option>
                    {MENU_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {appLocale === "ja" ? item.labelJa : item.labelEn}
                      </option>
                    ))}
                  </select>

                  {menu.menu_type ? (
                    <p className="rounded-2xl bg-white px-4 py-3 text-xs font-bold leading-6 text-gray-600 ring-1 ring-gray-100">
                      {getMenuLabel(menu.menu_type, appLocale)}：{" "}
                      {getMenuHelp(menu.menu_type, appLocale)}
                    </p>
                  ) : null}

                  <input
                    type="number"
                    min={1}
                    value={menu.price}
                    onChange={(e) => updateMenu(index, "price", e.target.value)}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-gray-950"
                    placeholder={copy.price}
                  />

                  <textarea
                    value={menu.description}
                    onChange={(e) =>
                      updateMenu(index, "description", e.target.value)
                    }
                    rows={3}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-gray-950"
                    placeholder={copy.menuDescription}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addMenu}
            className="mt-5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-black text-gray-900 transition hover:bg-gray-50"
          >
            + {copy.addMenu}
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-black text-gray-950">
          {copy.phoneTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-gray-600">{copy.phoneBody}</p>

        <div className="mt-6">
          <input
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              setPhoneVerified(false);
              setSentCode("");
              setVerificationCode("");
            }}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none transition focus:border-gray-950"
            placeholder={copy.phoneNumber}
            inputMode="tel"
          />
        </div>

        <button
          type="button"
          onClick={sendDevCode}
          className="mt-4 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-900 transition hover:bg-gray-50"
        >
          {copy.sendCode}
        </button>

        <div className="mt-4 flex gap-3">
          <input
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none transition focus:border-gray-950"
            placeholder={copy.verificationCode}
            inputMode="numeric"
          />
          <button
            type="button"
            onClick={verifyDevCode}
            className="rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white"
          >
            {phoneVerified ? copy.verified : copy.verifyCode}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="h-4 w-4"
            />
            <span>
              {copy.termsLabel}{" "}
              <Link href="/terms" className="underline">
                {copy.termsLink}
              </Link>
            </span>
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={agreedToPrivacy}
              onChange={(e) => setAgreedToPrivacy(e.target.checked)}
              className="h-4 w-4"
            />
            <span>
              {copy.privacyLabel}{" "}
              <Link href="/privacy" className="underline">
                {copy.privacyLink}
              </Link>
            </span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/home" className="text-xl font-black text-gray-950">
            Trendre
          </Link>
          <LocaleTabs locale={appLocale} setLocale={setLocale} />
        </div>

        <StepDots total={TOTAL_STEPS} current={currentProgress} />

        <div className="mt-6">{renderStep()}</div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || loading}
            className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.back}
          </button>

          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={loading}
              className="w-full rounded-2xl bg-gray-950 px-6 py-4 text-sm font-black text-white transition hover:bg-black disabled:opacity-50"
            >
              {copy.continue}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleFinish()}
              disabled={loading}
              className="w-full rounded-2xl bg-gray-950 px-6 py-4 text-sm font-black text-white transition hover:bg-black disabled:opacity-50"
            >
              {loading ? copy.loading : copy.finish}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}