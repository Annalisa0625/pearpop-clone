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

type DraftState = {
  step: number;
  username: string;
  fullName: string;
  email: string;
  password: string;
  country: string;
  prefecture: string;
  city: string;
  mainCategory: string;
  subCategories: string[];
  contentLanguage: string;
  responseLanguage: string;
  shortBio: string;
  isAdultConfirmed: boolean;
  socialAccounts: SocialAccountForm[];
  menuType: string;
  menuPrice: string;
  menuDeliveryDays: string;
  menuDescription: string;
  allowSecondaryUse: boolean;
  phoneCountryCode: string;
  phoneNumber: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
};

type SignupCopy = {
  welcomeBadge: string;
  welcomeTitle: string;
  welcomeBody: string;
  welcomeTime: string;
  usernameTitle: string;
  usernameBody: string;
  accountTitle: string;
  accountBody: string;
  oauthConnected: string;
  fullName: string;
  email: string;
  password: string;
  signUpWithGoogle: string;
  orText: string;
  locationTitle: string;
  locationBody: string;
  country: string;
  prefecture: string;
  city: string;
  categoryTitle: string;
  categoryBody: string;
  mainCategory: string;
  subCategories: string;
  contentLanguage: string;
  responseLanguage: string;
  shortBio: string;
  adultConfirm: string;
  socialTitle: string;
  socialBody: string;
  platform: string;
  usernameOrUrl: string;
  followerRange: string;
  audienceCountry: string;
  addSocial: string;
  remove: string;
  imagesTitle: string;
  imagesBody: string;
  avatar: string;
  avatarHelp: string;
  portfolio: string;
  portfolioHelp: string;
  imageChoose: string;
  portfolioChoose: string;
  menuTitle: string;
  menuBody: string;
  menuFeeNote: string;
  menuType: string;
  price: string;
  deliveryDays: string;
  menuDescription: string;
  secondaryUse: string;
  phoneTitle: string;
  phoneBody: string;
  phoneCountryCode: string;
  phoneNumber: string;
  sendCode: string;
  verificationCode: string;
  verifyCode: string;
  verified: string;
  continue: string;
  back: string;
  finish: string;
  loading: string;
  selectPlease: string;
  usernameRequired: string;
  usernameInvalid: string;
  fullNameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  locationRequired: string;
  categoryRequired: string;
  socialRequired: string;
  avatarRequired: string;
  portfolioRequired: string;
  menuRequired: string;
  phoneRequired: string;
  phoneVerifyRequired: string;
  termsRequired: string;
  devCodeAlert: string;
  codeInvalid: string;
  signupFailed: string;
  imageUploadFailed: string;
  termsLabel: string;
  privacyLabel: string;
  termsLink: string;
  privacyLink: string;
  alreadyRegistered: string;
  duplicateUsername: string;
  sessionMissing: string;
};

const STORAGE_KEY = "trendre_creator_signup_draft_v2";
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

const LANGUAGE_OPTIONS = ["日本語", "英語", "韓国語", "中国語", "その他"];

const LANGUAGE_OPTIONS_EN: Record<string, string> = {
  日本語: "Japanese",
  英語: "English",
  韓国語: "Korean",
  中国語: "Chinese",
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
  { value: "Instagram Reel", platform: "Instagram" },
  { value: "Instagram Story", platform: "Instagram" },
  { value: "Instagram Feed Post", platform: "Instagram" },
  { value: "TikTok Video", platform: "TikTok" },
  { value: "YouTube Short", platform: "YouTube" },
  { value: "YouTube Video", platform: "YouTube" },
  { value: "UGC Video", platform: "UGC" },
  { value: "UGC Photo", platform: "UGC" },
  { value: "UGC Ad Creative", platform: "UGC" },
  { value: "イベント訪問", platform: "Event" },
];

function createEmptySocial(): SocialAccountForm {
  return {
    platform: "",
    username_or_url: "",
    follower_range: "",
    audience_country: "",
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
      audience_country: safeString(row.audience_country),
    };
  });

  return sanitized.length > 0 ? sanitized : [createEmptySocial()];
}

function getOAuthRedirectUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/signup/creator?oauth=1`;
}

function buildUsernamePreview(username: string) {
  return `trendre.jp/@${username || "username"}`;
}

function formatOption(
  value: string,
  locale: Locale,
  enMap: Record<string, string>
) {
  return locale === "ja" ? value : enMap[value] ?? value;
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
            ? "border-gray-900 bg-gray-900 text-white"
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
            ? "border-gray-900 bg-gray-900 text-white"
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
    <div className="mt-2 flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`h-2 flex-1 rounded-full ${
            index <= current ? "bg-gray-900" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function ImagePreview({
  src,
  label,
  onRemove,
}: {
  src: string;
  label: string;
  onRemove?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-100">
      <img src={src} alt={label} className="aspect-square w-full object-cover" />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

function FilePickerButton({
  children,
  multiple,
  onChange,
}: {
  children: ReactNode;
  multiple?: boolean;
  onChange: (files: File[]) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black">
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

  const copy: SignupCopy = useMemo(
    () =>
      locale === "ja"
        ? {
            welcomeBadge: "Creator Sign Up",
            welcomeTitle: "Trendreでクリエイター登録を始めましょう",
            welcomeBody:
              "プロフィール、SNS、ポートフォリオ画像、最初のメニューを登録すると、企業に見つけてもらいやすくなります。",
            welcomeTime: "約5〜8分",
            usernameTitle: "ユーザーネームを決めてください",
            usernameBody:
              "Trendreの公開プロフィールURLに使われます。普段使っているSNS名に揃えるのがおすすめです。",
            accountTitle: "アカウントを作成してください",
            accountBody: "Google、またはメールアドレスで登録できます。",
            oauthConnected: "連携済みアカウント",
            fullName: "氏名",
            email: "メールアドレス",
            password: "パスワード",
            signUpWithGoogle: "Googleで登録",
            orText: "または",
            locationTitle: "活動地域を教えてください",
            locationBody:
              "ブランドがあなたの活動地域を理解しやすくなります。",
            country: "国",
            prefecture: "都道府県 / 州",
            city: "市区町村（任意）",
            categoryTitle: "発信内容を教えてください",
            categoryBody:
              "ブランドがあなたを見つけやすくするための基本情報です。",
            mainCategory: "メインカテゴリ",
            subCategories: "サブカテゴリ（任意）",
            contentLanguage: "発信言語",
            responseLanguage: "対応言語",
            shortBio: "短い自己紹介（任意）",
            adultConfirm: "18歳以上です",
            socialTitle: "SNSアカウントを追加してください",
            socialBody:
              "少なくとも1つ追加すると、ブランドがあなたの活動を理解しやすくなります。",
            platform: "媒体",
            usernameOrUrl: "ユーザーネーム / URL",
            followerRange: "フォロワー数の範囲",
            audienceCountry: "主な視聴者の国",
            addSocial: "SNSを追加",
            remove: "削除",
            imagesTitle: "写真を追加してください",
            imagesBody:
              "プロフィール画像は丸アイコンに、ポートフォリオ画像はB側一覧・詳細ページのギャラリーに使われます。",
            avatar: "プロフィール画像（アイコン用）",
            avatarHelp:
              "B側一覧・詳細ページの小さい丸アイコンとして表示されます。",
            portfolio: "ポートフォリオ画像（3枚以上必須）",
            portfolioHelp:
              "B側のクリエイター一覧カード、詳細ページ上部ギャラリー、Portfolio欄に表示されます。",
            imageChoose: "画像を選択",
            portfolioChoose: "ポートフォリオ画像を選択",
            menuTitle: "最初のメニューを作成してください",
            menuBody:
              "ブランドがすぐ依頼できるように、最初のメニューを1つ登録しましょう。",
            menuFeeNote: "Trendreの手数料は売上から差し引かれます。",
            menuType: "メニュー種別",
            price: "金額（円）",
            deliveryDays: "納期（日）",
            menuDescription: "説明文（任意）",
            secondaryUse: "二次利用を許可する",
            phoneTitle: "電話番号を確認してください",
            phoneBody:
              "Trendreを安全で信頼できる場にするため、電話番号の本人確認を行います。",
            phoneCountryCode: "国番号",
            phoneNumber: "電話番号",
            sendCode: "認証コードを送信",
            verificationCode: "6桁認証コード",
            verifyCode: "確認する",
            verified: "確認済み",
            continue: "続ける",
            back: "戻る",
            finish: "登録を完了する",
            loading: "処理中...",
            selectPlease: "選択してください",
            usernameRequired: "ユーザーネームを入力してください",
            usernameInvalid:
              "ユーザーネームは英小文字・数字・アンダースコア・ハイフンのみで3〜30文字です",
            fullNameRequired: "氏名を入力してください",
            emailRequired: "メールアドレスを入力してください",
            emailInvalid: "メールアドレスの形式が正しくありません",
            passwordRequired: "パスワードは8文字以上必要です",
            locationRequired: "国と都道府県 / 州を入力してください",
            categoryRequired:
              "メインカテゴリ、発信言語、対応言語、18歳以上確認が必要です",
            socialRequired: "SNSを少なくとも1件、正しく入力してください",
            avatarRequired: "プロフィール画像を追加してください",
            portfolioRequired: "ポートフォリオ画像を3枚以上追加してください",
            menuRequired: "最初のメニュー情報を入力してください",
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
            alreadyRegistered: "このアカウントは既にクリエイター登録済みです",
            duplicateUsername: "このユーザーネームは既に使われています",
            sessionMissing:
              "アカウント作成後のログイン状態を確認できませんでした。Supabase Authでメール確認が必須になっている可能性があります。",
          }
        : {
            welcomeBadge: "Creator Sign Up",
            welcomeTitle: "Start your creator profile on Trendre",
            welcomeBody:
              "Create your profile, add social accounts, portfolio images, and your first menu so brands can discover you.",
            welcomeTime: "About 5–8 minutes",
            usernameTitle: "Choose your username",
            usernameBody:
              "This will be used in your public Trendre profile URL. Matching your main social handle is recommended.",
            accountTitle: "Create your account",
            accountBody: "You can sign up with Google or email and password.",
            oauthConnected: "Connected account",
            fullName: "Full name",
            email: "Email",
            password: "Password",
            signUpWithGoogle: "Sign up with Google",
            orText: "or",
            locationTitle: "Where are you based?",
            locationBody:
              "This helps brands understand your market and location.",
            country: "Country",
            prefecture: "State / Prefecture",
            city: "City (optional)",
            categoryTitle: "Tell brands what you create",
            categoryBody:
              "These details help brands discover you more easily.",
            mainCategory: "Main category",
            subCategories: "Sub-categories (optional)",
            contentLanguage: "Content language",
            responseLanguage: "Response language",
            shortBio: "Short bio (optional)",
            adultConfirm: "I am 18 years old or older",
            socialTitle: "Add your social accounts",
            socialBody:
              "Add at least one account so brands can understand your platform and audience.",
            platform: "Platform",
            usernameOrUrl: "Username / URL",
            followerRange: "Follower range",
            audienceCountry: "Main audience country",
            addSocial: "Add social account",
            remove: "Remove",
            imagesTitle: "Add your images",
            imagesBody:
              "Profile image is used as your round icon. Portfolio images are used on brand-facing cards and galleries.",
            avatar: "Profile image",
            avatarHelp:
              "Displayed as your small round icon on brand-facing pages.",
            portfolio: "Portfolio images (3+ required)",
            portfolioHelp:
              "Displayed on creator cards, detail gallery, and Portfolio section.",
            imageChoose: "Choose image",
            portfolioChoose: "Choose portfolio images",
            menuTitle: "Create your first menu",
            menuBody: "Add one menu so brands can request you right away.",
            menuFeeNote: "Trendre fee will be deducted from your payout.",
            menuType: "Menu type",
            price: "Price (JPY)",
            deliveryDays: "Delivery days",
            menuDescription: "Description (optional)",
            secondaryUse: "Allow secondary use",
            phoneTitle: "Verify your phone number",
            phoneBody:
              "Phone verification helps keep Trendre safe and trustworthy.",
            phoneCountryCode: "Country code",
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
            usernameRequired: "Please enter a username",
            usernameInvalid:
              "Username must be 3–30 characters using lowercase letters, numbers, underscores, or hyphens",
            fullNameRequired: "Please enter your full name",
            emailRequired: "Please enter your email address",
            emailInvalid: "Please enter a valid email address",
            passwordRequired: "Password must be at least 8 characters",
            locationRequired: "Please enter your country and state / prefecture",
            categoryRequired:
              "Main category, content language, response language, and age confirmation are required",
            socialRequired: "Please add at least one valid social account",
            avatarRequired: "Please add a profile image",
            portfolioRequired: "Please add at least 3 portfolio images",
            menuRequired: "Please fill in your first menu",
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
            alreadyRegistered: "This account is already registered as a creator",
            duplicateUsername: "This username is already taken",
            sessionMissing:
              "Could not confirm your signed-in session after account creation. Email confirmation may be required in Supabase Auth settings.",
          },
    [locale]
  );

  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [country, setCountry] = useState("Japan");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");

  const [mainCategory, setMainCategory] = useState("");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [contentLanguage, setContentLanguage] = useState("日本語");
  const [responseLanguage, setResponseLanguage] = useState("日本語");
  const [shortBio, setShortBio] = useState("");
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);

  const [socialAccounts, setSocialAccounts] = useState<SocialAccountForm[]>([
    createEmptySocial(),
  ]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);

  const [menuType, setMenuType] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuDeliveryDays, setMenuDeliveryDays] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [allowSecondaryUse, setAllowSecondaryUse] = useState(false);

  const [phoneCountryCode, setPhoneCountryCode] = useState("+81");
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
      setUsername(safeString(draft.username));
      setFullName(safeString(draft.fullName));
      setEmail(safeString(draft.email));
      setPassword(safeString(draft.password));
      setCountry(safeString(draft.country, "Japan"));
      setPrefecture(safeString(draft.prefecture));
      setCity(safeString(draft.city));
      setMainCategory(safeString(draft.mainCategory));
      setSubCategories(safeStringArray(draft.subCategories));
      setContentLanguage(safeString(draft.contentLanguage, "日本語"));
      setResponseLanguage(safeString(draft.responseLanguage, "日本語"));
      setShortBio(safeString(draft.shortBio));
      setIsAdultConfirmed(safeBoolean(draft.isAdultConfirmed));
      setSocialAccounts(safeSocialAccounts(draft.socialAccounts));
      setMenuType(safeString(draft.menuType));
      setMenuPrice(safeString(draft.menuPrice));
      setMenuDeliveryDays(safeString(draft.menuDeliveryDays));
      setMenuDescription(safeString(draft.menuDescription));
      setAllowSecondaryUse(safeBoolean(draft.allowSecondaryUse));
      setPhoneCountryCode(safeString(draft.phoneCountryCode, "+81"));
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
      username,
      fullName,
      email,
      password,
      country,
      prefecture,
      city,
      mainCategory,
      subCategories,
      contentLanguage,
      responseLanguage,
      shortBio,
      isAdultConfirmed,
      socialAccounts,
      menuType,
      menuPrice,
      menuDeliveryDays,
      menuDescription,
      allowSecondaryUse,
      phoneCountryCode,
      phoneNumber,
      agreedToTerms,
      agreedToPrivacy,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [
    step,
    username,
    fullName,
    email,
    password,
    country,
    prefecture,
    city,
    mainCategory,
    subCategories,
    contentLanguage,
    responseLanguage,
    shortBio,
    isAdultConfirmed,
    socialAccounts,
    menuType,
    menuPrice,
    menuDeliveryDays,
    menuDescription,
    allowSecondaryUse,
    phoneCountryCode,
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
        typeof meta.full_name === "string" && meta.full_name.trim()
          ? meta.full_name.trim()
          : typeof meta.name === "string" && meta.name.trim()
            ? meta.name.trim()
            : "";
      const oauthEmail =
        typeof session.user.email === "string" ? session.user.email : "";

      setOauthSessionEmail(oauthEmail || null);
      setFullName((prev) => (prev.trim() ? prev : oauthName));
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

      if (!fullName.trim()) {
        setError(copy.fullNameRequired);
        return false;
      }

      if (!email.trim()) {
        setError(copy.emailRequired);
        return false;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError(copy.emailInvalid);
        return false;
      }

      if (!hasOAuth && password.trim().length < 8) {
        setError(copy.passwordRequired);
        return false;
      }
    }

    if (step === 3) {
      if (!country.trim() || !prefecture.trim()) {
        setError(copy.locationRequired);
        return false;
      }

      if (
        !mainCategory.trim() ||
        !contentLanguage.trim() ||
        !responseLanguage.trim() ||
        !isAdultConfirmed
      ) {
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
      const priceNumber = Number(menuPrice);
      const deliveryNumber = Number(menuDeliveryDays);

      if (!menuType || !menuPrice.trim() || !menuDeliveryDays.trim()) {
        setError(copy.menuRequired);
        return false;
      }

      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        setError(copy.menuRequired);
        return false;
      }

      if (
        !Number.isFinite(deliveryNumber) ||
        !Number.isInteger(deliveryNumber) ||
        deliveryNumber < 1
      ) {
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
          full_name: fullName.trim(),
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

      const priceNumber = Number(menuPrice);
      const deliveryNumber = Number(menuDeliveryDays);

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
          full_name: fullName.trim(),
          email: email.trim(),

          avatar_url: avatarUrl,
          portfolio_assets: portfolioAssets,

          country: country.trim(),
          prefecture: prefecture.trim(),
          city: city.trim() || null,

          main_category: mainCategory,
          sub_categories: subCategories,
          content_language: contentLanguage,
          response_language: responseLanguage,
          short_bio: shortBio.trim() || null,
          is_adult_confirmed: isAdultConfirmed,

          phone_country_code: phoneCountryCode.trim(),
          phone_number: phoneNumber.trim(),
          phone_verified: phoneVerified,

          social_accounts: socialAccounts
            .map((account) => ({
              platform: account.platform.trim(),
              username_or_url: account.username_or_url.trim(),
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

          first_menu: {
            menu_type: menuType,
            price: priceNumber,
            delivery_days: deliveryNumber,
            description: menuDescription.trim() || null,
            allow_secondary_use: allowSecondaryUse,
          },

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
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">
            {copy.welcomeBadge}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {copy.welcomeTitle}
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {copy.welcomeBody}
          </p>
          <p className="mt-5 inline-flex rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
            {copy.welcomeTime}
          </p>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{copy.usernameTitle}</h1>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            {copy.usernameBody}
          </p>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="mt-6 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
            placeholder="username"
          />
          <p className="mt-3 text-sm font-semibold text-gray-500">
            {buildUsernamePreview(username)}
          </p>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{copy.accountTitle}</h1>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            {copy.accountBody}
          </p>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="mt-6 w-full rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            {copy.signUpWithGoogle}
          </button>

          <div className="my-6 text-center text-sm text-gray-400">
            {copy.orText}
          </div>

          {oauthSessionEmail ? (
            <div className="rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">
              {copy.oauthConnected}: {oauthSessionEmail}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
              placeholder={copy.fullName}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
              placeholder={copy.email}
              disabled={!!oauthSessionEmail}
            />
            {!oauthSessionEmail ? (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
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
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">{copy.locationTitle}</h1>
            <p className="mt-2 text-sm leading-7 text-gray-600">
              {copy.locationBody}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                placeholder={copy.country}
              />
              <input
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                placeholder={copy.prefecture}
              />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900 md:col-span-2"
                placeholder={copy.city}
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">{copy.categoryTitle}</h1>
            <p className="mt-2 text-sm leading-7 text-gray-600">
              {copy.categoryBody}
            </p>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">{copy.mainCategory}</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMainCategory(item)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      mainCategory === item
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    {formatOption(item, locale, CATEGORY_OPTIONS_EN)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">
                {copy.subCategories}
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleSubCategory(item)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      subCategories.includes(item)
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    {formatOption(item, locale, CATEGORY_OPTIONS_EN)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <select
                value={contentLanguage}
                onChange={(e) => setContentLanguage(e.target.value)}
                className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-gray-900"
              >
                {LANGUAGE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {formatOption(item, locale, LANGUAGE_OPTIONS_EN)}
                  </option>
                ))}
              </select>

              <select
                value={responseLanguage}
                onChange={(e) => setResponseLanguage(e.target.value)}
                className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-gray-900"
              >
                {LANGUAGE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {formatOption(item, locale, LANGUAGE_OPTIONS_EN)}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
              placeholder={copy.shortBio}
            />

            <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={isAdultConfirmed}
                onChange={(e) => setIsAdultConfirmed(e.target.checked)}
              />
              {copy.adultConfirm}
            </label>
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{copy.socialTitle}</h1>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            {copy.socialBody}
          </p>

          <div className="mt-6 space-y-4">
            {socialAccounts.map((social, index) => (
              <div key={index} className="rounded-2xl border bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold">SNS {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeSocial(index)}
                    className="text-sm font-semibold text-red-600"
                  >
                    {copy.remove}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={social.platform}
                    onChange={(e) =>
                      updateSocial(index, "platform", e.target.value)
                    }
                    className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-gray-900"
                  >
                    <option value="">{copy.platform}</option>
                    {PLATFORM_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <input
                    value={social.username_or_url}
                    onChange={(e) =>
                      updateSocial(index, "username_or_url", e.target.value)
                    }
                    className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-gray-900"
                    placeholder={copy.usernameOrUrl}
                  />

                  <select
                    value={social.follower_range}
                    onChange={(e) =>
                      updateSocial(index, "follower_range", e.target.value)
                    }
                    className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-gray-900"
                  >
                    <option value="">{copy.followerRange}</option>
                    {FOLLOWER_RANGE_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {formatOption(
                          item,
                          locale,
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
                    className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-gray-900"
                  >
                    <option value="">{copy.audienceCountry}</option>
                    {AUDIENCE_COUNTRY_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {formatOption(
                          item,
                          locale,
                          AUDIENCE_COUNTRY_OPTIONS_EN
                        )}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSocial}
            className="mt-5 w-full rounded-2xl border px-4 py-3 text-sm font-semibold"
          >
            + {copy.addSocial}
          </button>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{copy.imagesTitle}</h1>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            {copy.imagesBody}
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="font-semibold">{copy.avatar}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {copy.avatarHelp}
              </p>

              <div className="mt-4">
                {avatarPreview ? (
                  <ImagePreview
                    src={avatarPreview}
                    label={copy.avatar}
                    onRemove={() => handleAvatarSelect([])}
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-2xl bg-white text-sm text-gray-400">
                    {copy.avatar}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <FilePickerButton onChange={handleAvatarSelect}>
                  {copy.imageChoose}
                </FilePickerButton>
              </div>
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="font-semibold">{copy.portfolio}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {copy.portfolioHelp}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {portfolioPreviews.map((preview, index) => (
                  <ImagePreview
                    key={preview}
                    src={preview}
                    label={`${copy.portfolio} ${index + 1}`}
                    onRemove={() => removePortfolioFile(index)}
                  />
                ))}

                {portfolioPreviews.length < 3 ? (
                  <div className="flex aspect-square items-center justify-center rounded-2xl bg-white text-sm font-semibold text-gray-400">
                    {portfolioPreviews.length}/3
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <FilePickerButton multiple onChange={handlePortfolioSelect}>
                  {copy.portfolioChoose}
                </FilePickerButton>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{copy.menuTitle}</h1>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            {copy.menuBody}
          </p>
          <p className="mt-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
            {copy.menuFeeNote}
          </p>

          <div className="mt-6 grid gap-4">
            <select
              value={menuType}
              onChange={(e) => setMenuType(e.target.value)}
              className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-gray-900"
            >
              <option value="">{copy.selectPlease}</option>
              {MENU_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              value={menuPrice}
              onChange={(e) => setMenuPrice(e.target.value)}
              className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
              placeholder={copy.price}
            />

            <input
              type="number"
              min={1}
              value={menuDeliveryDays}
              onChange={(e) => setMenuDeliveryDays(e.target.value)}
              className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
              placeholder={copy.deliveryDays}
            />

            <textarea
              value={menuDescription}
              onChange={(e) => setMenuDescription(e.target.value)}
              rows={4}
              className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
              placeholder={copy.menuDescription}
            />

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={allowSecondaryUse}
                onChange={(e) => setAllowSecondaryUse(e.target.checked)}
              />
              {copy.secondaryUse}
            </label>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{copy.phoneTitle}</h1>
        <p className="mt-2 text-sm leading-7 text-gray-600">{copy.phoneBody}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-[120px_1fr]">
          <input
            value={phoneCountryCode}
            onChange={(e) => setPhoneCountryCode(e.target.value)}
            className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
            placeholder={copy.phoneCountryCode}
          />

          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
            placeholder={copy.phoneNumber}
          />
        </div>

        <button
          type="button"
          onClick={sendDevCode}
          className="mt-4 rounded-2xl border px-5 py-3 text-sm font-semibold"
        >
          {copy.sendCode}
        </button>

        <div className="mt-4 flex gap-3">
          <input
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="flex-1 rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
            placeholder={copy.verificationCode}
          />
          <button
            type="button"
            onClick={verifyDevCode}
            className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white"
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
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/home" className="text-xl font-black">
            Trendre
          </Link>
          <LocaleTabs locale={locale as Locale} setLocale={setLocale} />
        </div>

        <StepDots total={TOTAL_STEPS} current={currentProgress} />

        <div className="mt-6">{renderStep()}</div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || loading}
            className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 disabled:opacity-40"
          >
            {copy.back}
          </button>

          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={loading}
              className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {copy.continue}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleFinish()}
              disabled={loading}
              className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? copy.loading : copy.finish}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}