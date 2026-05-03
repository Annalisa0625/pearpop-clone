// app/signup/creator/SignupCreatorClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const STORAGE_KEY = "trendre_creator_signup_draft_v1";
const CREATOR_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_CREATOR_IMAGE_BUCKET || "creator-assets";

const TOTAL_STEPS = 9;

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

  const sanitized = value.map((item) => ({
    platform:
      item && typeof item === "object"
        ? safeString((item as Record<string, unknown>).platform)
        : "",
    username_or_url:
      item && typeof item === "object"
        ? safeString((item as Record<string, unknown>).username_or_url)
        : "",
    follower_range:
      item && typeof item === "object"
        ? safeString((item as Record<string, unknown>).follower_range)
        : "",
    audience_country:
      item && typeof item === "object"
        ? safeString((item as Record<string, unknown>).audience_country)
        : "",
  }));

  return sanitized.length > 0 ? sanitized : [createEmptySocial()];
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

function StepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
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

function buildSocialUrl(platform: string, usernameOrUrl: string) {
  const value = usernameOrUrl.trim();

  if (/^https?:\/\//i.test(value)) return value;

  switch (platform) {
    case "Instagram":
      return `https://www.instagram.com/${value.replace(/^@/, "")}`;
    case "TikTok":
      return `https://www.tiktok.com/@${value.replace(/^@/, "")}`;
    case "X":
      return `https://x.com/${value.replace(/^@/, "")}`;
    case "YouTube":
      return value.startsWith("@")
        ? `https://www.youtube.com/${value}`
        : `https://www.youtube.com/@${value.replace(/^@/, "")}`;
    case "Website":
      return value;
    default:
      return value;
  }
}

function fileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

export default function SignupCreatorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            welcomeBadge: "Creator Sign Up",
            welcomeTitle: "Trendreでクリエイター登録を始めましょう",
            welcomeBody:
              "プロフィールを作成して、SNS情報と最初のメニューを登録すると、ブランドに見つけてもらいやすくなります。",
            welcomeTime: "約3〜5分",
            usernameTitle: "ユーザーネームを決めてください",
            usernameBody:
              "Trendreの公開プロフィールURLに使われます。普段使っているSNS名に揃えるのがおすすめです。",
            accountTitle: "アカウントを作成してください",
            accountBody:
              "Google / Apple、またはメールアドレスで登録できます。",
            oauthConnected: "連携済みアカウント",
            fullName: "氏名",
            email: "メールアドレス",
            password: "パスワード",
            signUpWithGoogle: "Googleで登録",
            signUpWithApple: "Appleで登録",
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
            profileTitle: "プロフィール画像を追加してください",
            profileBody:
              "プロフィール画像があると、ブランドがあなたを認識しやすくなります。",
            avatar: "プロフィール画像",
            cover: "カバー画像（任意）",
            imageChoose: "画像を選択",
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
            createAndContinue: "登録して続ける",
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
            menuRequired: "最初のメニュー情報を入力してください",
            phoneRequired: "電話番号を入力してください",
            phoneVerifyRequired: "電話番号の確認を完了してください",
            termsRequired:
              "利用規約とプライバシーポリシーへの同意が必要です",
            devCodeAlert: "開発用認証コード: ",
            codeInvalid: "認証コードが正しくありません",
            signupFailed: "登録に失敗しました",
            profileImageUploadFailed:
              "プロフィール画像のアップロードに失敗しました",
            termsLabel: "利用規約に同意する",
            privacyLabel: "プライバシーポリシーに同意する",
            termsLink: "利用規約",
            privacyLink: "プライバシーポリシー",
          }
        : {
            welcomeBadge: "Creator Sign Up",
            welcomeTitle: "Start your creator profile on Trendre",
            welcomeBody:
              "Create your profile, add your social accounts, and set up your first menu so brands can discover you.",
            welcomeTime: "About 3–5 minutes",
            usernameTitle: "Choose your username",
            usernameBody:
              "This will be used in your public Trendre profile URL. Matching your main social handle is recommended.",
            accountTitle: "Create your account",
            accountBody:
              "You can sign up with Google / Apple or use email and password.",
            oauthConnected: "Connected account",
            fullName: "Full name",
            email: "Email",
            password: "Password",
            signUpWithGoogle: "Sign up with Google",
            signUpWithApple: "Sign up with Apple",
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
            profileTitle: "Add your profile image",
            profileBody:
              "A clear profile image helps brands recognize your profile.",
            avatar: "Profile image",
            cover: "Cover image (optional)",
            imageChoose: "Choose image",
            menuTitle: "Create your first menu",
            menuBody:
              "Add one menu so brands can request you right away.",
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
            createAndContinue: "Create account and continue",
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
            socialRequired:
              "Please add at least one valid social account",
            avatarRequired: "Please add a profile image",
            menuRequired: "Please fill in your first menu",
            phoneRequired: "Please enter your phone number",
            phoneVerifyRequired: "Please complete phone verification",
            termsRequired:
              "You must agree to the Terms and Privacy Policy",
            devCodeAlert: "Development verification code: ",
            codeInvalid: "The verification code is incorrect",
            signupFailed: "Sign up failed",
            profileImageUploadFailed:
              "Failed to upload profile image",
            termsLabel: "I agree to the Terms of Service",
            privacyLabel: "I agree to the Privacy Policy",
            termsLink: "Terms of Service",
            privacyLink: "Privacy Policy",
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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

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

  const [oauthSessionEmail, setOauthSessionEmail] = useState<string | null>(null);
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
    const hydrateSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: existingCreator } = await supabase
        .from("creators")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (existingCreator) {
        router.replace("/creator/dashboard");
        return;
      }

      const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;

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

      if (hasOAuthReturn && step < 2) {
        setStep(2);
      }
    };

    hydrateSession();
  }, [hasOAuthReturn, router, step, supabase]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  const toggleSubCategory = (value: string) => {
    setSubCategories((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
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

      return true;
    }

    if (step === 2) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;

        const oauthName =
          typeof meta.full_name === "string" && meta.full_name.trim()
            ? meta.full_name.trim()
            : typeof meta.name === "string" && meta.name.trim()
            ? meta.name.trim()
            : "";

        const resolvedFullName = fullName.trim() || oauthName;

        if (!resolvedFullName) {
          setError(copy.fullNameRequired);
          return false;
        }

        return true;
      }

      if (!fullName.trim()) {
        setError(copy.fullNameRequired);
        return false;
      }

      if (!email.trim()) {
        setError(copy.emailRequired);
        return false;
      }

      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      if (!emailValid) {
        setError(copy.emailInvalid);
        return false;
      }

      if (!password || password.length < 8) {
        setError(copy.passwordRequired);
        return false;
      }

      return true;
    }

    if (step === 3) {
      if (!country.trim() || !prefecture.trim()) {
        setError(copy.locationRequired);
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (
        !mainCategory ||
        !contentLanguage ||
        !responseLanguage ||
        !isAdultConfirmed
      ) {
        setError(copy.categoryRequired);
        return false;
      }
      return true;
    }

    if (step === 5) {
      const hasCompleteSocial = socialAccounts.some(
        (item) =>
          item.platform &&
          item.username_or_url.trim() &&
          item.follower_range &&
          item.audience_country
      );

      const hasInvalidSocial = socialAccounts.some((item) => {
        const hasAny =
          !!item.platform ||
          !!item.username_or_url.trim() ||
          !!item.follower_range ||
          !!item.audience_country;

        const isComplete =
          !!item.platform &&
          !!item.username_or_url.trim() &&
          !!item.follower_range &&
          !!item.audience_country;

        return hasAny && !isComplete;
      });

      if (!hasCompleteSocial || hasInvalidSocial) {
        setError(copy.socialRequired);
        return false;
      }

      return true;
    }

    if (step === 6) {
      if (!avatarFile && !avatarPreview) {
        setError(copy.avatarRequired);
        return false;
      }

      return true;
    }

    if (step === 7) {
      if (!menuType || !menuPrice || !menuDeliveryDays) {
        setError(copy.menuRequired);
        return false;
      }
      return true;
    }

    if (step === 8) {
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

      return true;
    }

    return true;
  };

  const handleNext = async () => {
    const ok = await validateStep();
    if (!ok) return;

    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError(null);

    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getOAuthRedirectUrl(),
        },
      });
    } catch (e) {
      console.error(e);
      setError(copy.signupFailed);
    }
  };

  const handleSendCode = () => {
    setError(null);

    if (!phoneNumber.trim()) {
      setError(copy.phoneRequired);
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(code);
    setPhoneVerified(false);
    window.alert(`${copy.devCodeAlert}${code}`);
  };

  const handleVerifyCode = () => {
    setError(null);

    if (!verificationCode.trim()) {
      setError(copy.codeInvalid);
      return;
    }

    if (verificationCode.trim() !== sentCode) {
      setError(copy.codeInvalid);
      return;
    }

    setPhoneVerified(true);
  };

  const uploadImageAndGetUrl = async (
    file: File,
    creatorId: string,
    kind: "avatar" | "cover"
  ) => {
    const ext = fileExtension(file);
    const path = `${creatorId}/${kind}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .upload(path, file, {
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    const ok = await validateStep();
    if (!ok) return;

    setError(null);
    setLoading(true);

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      const mode = currentSession?.user ? "oauth" : "email";

      const meta = ((currentSession?.user?.user_metadata ?? {}) as Record<string, unknown>);

      const oauthName =
        typeof meta.full_name === "string" && meta.full_name.trim()
          ? meta.full_name.trim()
          : typeof meta.name === "string" && meta.name.trim()
          ? meta.name.trim()
          : "";

      const resolvedFullName =
        mode === "oauth" ? (fullName.trim() || oauthName) : fullName.trim();

      const resolvedEmail =
        mode === "oauth"
          ? (currentSession?.user?.email ?? email).trim()
          : email.trim();

      if (!resolvedFullName) {
        setError(copy.fullNameRequired);
        setLoading(false);
        return;
      }

      if (!resolvedEmail) {
        setError(copy.emailRequired);
        setLoading(false);
        return;
      }

      const payload = {
        auth_mode: mode,
        access_token: currentSession?.access_token,
        username,
        full_name: resolvedFullName,
        email: resolvedEmail,
        password,
        country,
        prefecture,
        city,
        main_category: mainCategory,
        sub_categories: subCategories,
        content_language: contentLanguage,
        response_language: responseLanguage,
        short_bio: shortBio,
        is_adult_confirmed: isAdultConfirmed,
        phone_country_code: phoneCountryCode,
        phone_number: phoneNumber,
        phone_verified: phoneVerified,
        social_accounts: socialAccounts.map((item) => ({
          platform: item.platform,
          username_or_url: item.username_or_url,
          follower_range: item.follower_range,
          audience_country: item.audience_country,
        })),
        first_menu: {
          menu_type: menuType,
          price: Number(menuPrice),
          delivery_days: Number(menuDeliveryDays),
          description: menuDescription,
          allow_secondary_use: allowSecondaryUse,
        },
        agreed_to_terms: agreedToTerms,
        agreed_to_privacy: agreedToPrivacy,
      };

      const res = await fetch("/api/signup/complete-creator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? copy.signupFailed);
        setLoading(false);
        return;
      }

      let activeSession = currentSession;

      if (!activeSession?.user && mode === "email") {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password,
          });

        if (signInError || !signInData.session) {
          setError(signInError?.message ?? copy.signupFailed);
          setLoading(false);
          return;
        }

        activeSession = signInData.session;
      }

      if (!activeSession?.user) {
        setError(copy.signupFailed);
        setLoading(false);
        return;
      }

      const { data: creatorRow, error: creatorRowError } = await supabase
        .from("creators")
        .select("id")
        .eq("user_id", activeSession.user.id)
        .single();

      if (creatorRowError || !creatorRow) {
        setError(copy.signupFailed);
        setLoading(false);
        return;
      }

      let avatarUrl: string | null = null;
      let coverUrl: string | null = null;

      if (avatarFile) {
        try {
          avatarUrl = await uploadImageAndGetUrl(avatarFile, creatorRow.id, "avatar");
        } catch (e) {
          console.error(e);
          setError(copy.profileImageUploadFailed);
          setLoading(false);
          return;
        }
      }

      if (coverFile) {
        try {
          coverUrl = await uploadImageAndGetUrl(coverFile, creatorRow.id, "cover");
        } catch (e) {
          console.error(e);
        }
      }

      if (avatarUrl) {
        const { error: avatarUpdateError } = await supabase
          .from("creators")
          .update({ avatar_url: avatarUrl })
          .eq("id", creatorRow.id);

        if (avatarUpdateError) {
          setError(copy.profileImageUploadFailed);
          setLoading(false);
          return;
        }

        await supabase.from("profiles").upsert({
          id: activeSession.user.id,
          username: username.trim().toLowerCase(),
          avatar_url: avatarUrl,
          category: mainCategory,
          bio: shortBio.trim() || null,
          is_public: true,
          onboarding_completed: true,
          public_profile_completed: true,
        });
      }

      if (coverUrl) {
        await supabase.auth.updateUser({
          data: {
            creator_cover_image_url: coverUrl,
          },
        });
      }

      localStorage.removeItem(STORAGE_KEY);
      router.replace("/creator/dashboard");
    } catch (e) {
      console.error(e);
      setError(copy.signupFailed);
      setLoading(false);
    }
  };

  const renderWelcome = () => (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-blue-600">{copy.welcomeBadge}</p>
      <h1 className="text-3xl font-bold leading-snug">{copy.welcomeTitle}</h1>
      <p className="text-base leading-8 text-gray-600">{copy.welcomeBody}</p>
      <p className="text-sm text-gray-500">{copy.welcomeTime}</p>
    </div>
  );

  const renderUsername = () => (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{copy.usernameTitle}</h1>
      <p className="text-base leading-8 text-gray-600">{copy.usernameBody}</p>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Username</label>
        <input
          value={username}
          onChange={(e) =>
            setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())
          }
          className="w-full rounded-2xl border px-4 py-4 text-lg outline-none transition focus:border-gray-900"
          placeholder="yourname"
          autoCapitalize="none"
          autoComplete="off"
        />
        <p className="text-sm text-gray-500">{buildUsernamePreview(username)}</p>
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{copy.accountTitle}</h1>
      <p className="text-base leading-8 text-gray-600">{copy.accountBody}</p>

      {oauthSessionEmail ? (
        <>
          <div className="rounded-2xl border bg-gray-50 p-4">
            <p className="text-sm font-semibold">{copy.oauthConnected}</p>
            <p className="mt-1 text-sm text-gray-600">{oauthSessionEmail}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">{copy.fullName}</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border px-4 py-4 text-lg outline-none transition focus:border-gray-900"
              placeholder={locale === "ja" ? "山田 太郎" : "Jane Doe"}
              autoComplete="name"
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="rounded-2xl border px-4 py-4 text-base font-semibold"
            >
              {copy.signUpWithGoogle}
            </button>

            <button
              type="button"
              disabled
              className="rounded-2xl border px-4 py-4 text-base font-semibold opacity-50 cursor-not-allowed"
            >
              {copy.signUpWithApple}
            </button>
          </div>

          <div className="mt-2 text-center text-sm text-gray-400">
            {locale === "ja" ? "または" : "or"}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold">{copy.fullName}</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border px-4 py-4 text-lg outline-none transition focus:border-gray-900"
                placeholder={locale === "ja" ? "山田 太郎" : "Jane Doe"}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{copy.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border px-4 py-4 text-lg outline-none transition focus:border-gray-900"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{copy.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border px-4 py-4 text-lg outline-none transition focus:border-gray-900"
                placeholder="********"
                autoComplete="new-password"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{copy.locationTitle}</h1>
      <p className="text-base leading-8 text-gray-600">{copy.locationBody}</p>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold">{copy.country}</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-2xl border px-4 py-4 text-lg"
            placeholder="Japan"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">{copy.prefecture}</label>
          <input
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            className="w-full rounded-2xl border px-4 py-4 text-lg"
            placeholder={locale === "ja" ? "京都府" : "Kyoto"}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">{copy.city}</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border px-4 py-4 text-lg"
            placeholder={locale === "ja" ? "京都市" : "Kyoto City"}
          />
        </div>
      </div>
    </div>
  );

  const renderCategory = () => (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{copy.categoryTitle}</h1>
      <p className="text-base leading-8 text-gray-600">{copy.categoryBody}</p>

      <div className="space-y-2">
        <label className="text-sm font-semibold">{copy.mainCategory}</label>
        <select
          value={mainCategory}
          onChange={(e) => setMainCategory(e.target.value)}
          className="w-full rounded-2xl border px-4 py-4 text-lg"
        >
          <option value="">{copy.selectPlease}</option>
          {CATEGORY_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {formatOption(item, locale, CATEGORY_OPTIONS_EN)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">{copy.subCategories}</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.filter((item) => item !== mainCategory).map(
            (item) => {
              const selected = subCategories.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleSubCategory(item)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    selected
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  {formatOption(item, locale, CATEGORY_OPTIONS_EN)}
                </button>
              );
            }
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">{copy.contentLanguage}</label>
        <select
          value={contentLanguage}
          onChange={(e) => setContentLanguage(e.target.value)}
          className="w-full rounded-2xl border px-4 py-4 text-lg"
        >
          <option value="">{copy.selectPlease}</option>
          {LANGUAGE_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {formatOption(item, locale, LANGUAGE_OPTIONS_EN)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">{copy.responseLanguage}</label>
        <select
          value={responseLanguage}
          onChange={(e) => setResponseLanguage(e.target.value)}
          className="w-full rounded-2xl border px-4 py-4 text-lg"
        >
          <option value="">{copy.selectPlease}</option>
          {LANGUAGE_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {formatOption(item, locale, LANGUAGE_OPTIONS_EN)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">{copy.shortBio}</label>
        <textarea
          value={shortBio}
          onChange={(e) => setShortBio(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border px-4 py-4 text-lg"
          placeholder={
            locale === "ja"
              ? "どんな発信をしているかを短く書いてください"
              : "Write a short introduction"
          }
        />
      </div>

      <label className="flex items-start gap-3 rounded-2xl border bg-gray-50 p-4">
        <input
          type="checkbox"
          checked={isAdultConfirmed}
          onChange={(e) => setIsAdultConfirmed(e.target.checked)}
          className="mt-1 h-5 w-5"
        />
        <span className="text-base font-medium">{copy.adultConfirm}</span>
      </label>
    </div>
  );

  const renderSocials = () => (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{copy.socialTitle}</h1>
      <p className="text-base leading-8 text-gray-600">{copy.socialBody}</p>

      <div className="space-y-4">
        {socialAccounts.map((account, index) => (
          <div
            key={index}
            className="space-y-3 rounded-2xl border bg-gray-50 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">
                {copy.platform} {index + 1}
              </p>
              <button
                type="button"
                onClick={() => removeSocial(index)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                {copy.remove}
              </button>
            </div>

            <select
              value={account.platform}
              onChange={(e) => updateSocial(index, "platform", e.target.value)}
              className="w-full rounded-xl border px-4 py-4 text-lg"
            >
              <option value="">{copy.selectPlease}</option>
              {PLATFORM_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              value={account.username_or_url}
              onChange={(e) =>
                updateSocial(index, "username_or_url", e.target.value)
              }
              className="w-full rounded-xl border px-4 py-4 text-lg"
              placeholder={copy.usernameOrUrl}
            />

            <select
              value={account.follower_range}
              onChange={(e) =>
                updateSocial(index, "follower_range", e.target.value)
              }
              className="w-full rounded-xl border px-4 py-4 text-lg"
            >
              <option value="">{copy.selectPlease}</option>
              {FOLLOWER_RANGE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {formatOption(item, locale, FOLLOWER_RANGE_OPTIONS_EN)}
                </option>
              ))}
            </select>

            <select
              value={account.audience_country}
              onChange={(e) =>
                updateSocial(index, "audience_country", e.target.value)
              }
              className="w-full rounded-xl border px-4 py-4 text-lg"
            >
              <option value="">{copy.selectPlease}</option>
              {AUDIENCE_COUNTRY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {formatOption(item, locale, AUDIENCE_COUNTRY_OPTIONS_EN)}
                </option>
              ))}
            </select>

            {account.platform && account.username_or_url.trim() && (
              <p className="break-all text-sm text-gray-500">
                {buildSocialUrl(account.platform, account.username_or_url)}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSocial}
        className="w-full rounded-2xl border px-4 py-4 text-base font-semibold"
      >
        {copy.addSocial}
      </button>
    </div>
  );

  const renderImages = () => (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{copy.profileTitle}</h1>
      <p className="text-base leading-8 text-gray-600">{copy.profileBody}</p>

      <div className="space-y-4 rounded-2xl border bg-gray-50 p-4">
        <label className="block text-sm font-semibold">{copy.avatar}</label>
        <input
          key="avatar-file-input"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            setAvatarFile(file);
            setAvatarPreview(file ? URL.createObjectURL(file) : null);
          }}
          className="block w-full text-sm"
        />
        {avatarPreview && (
          <img
            src={avatarPreview}
            alt="avatar preview"
            className="h-28 w-28 rounded-full object-cover"
          />
        )}
      </div>

      <div className="space-y-4 rounded-2xl border bg-gray-50 p-4">
        <label className="block text-sm font-semibold">{copy.cover}</label>
        <input
          key="cover-file-input"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setCoverFile(file);
            setCoverPreview(file ? URL.createObjectURL(file) : null);
          }}
          className="block w-full text-sm"
        />
        {coverPreview && (
          <img
            src={coverPreview}
            alt="cover preview"
            className="h-36 w-full rounded-2xl object-cover"
          />
        )}
      </div>
    </div>
  );

  const renderMenu = () => (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{copy.menuTitle}</h1>
      <p className="text-base leading-8 text-gray-600">{copy.menuBody}</p>
      <p className="text-sm text-gray-500">{copy.menuFeeNote}</p>

      <div className="space-y-3">
        <select
          value={menuType}
          onChange={(e) => setMenuType(e.target.value)}
          className="w-full rounded-2xl border px-4 py-4 text-lg"
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
          min="1"
          inputMode="numeric"
          value={menuPrice}
          onChange={(e) => setMenuPrice(e.target.value)}
          className="w-full rounded-2xl border px-4 py-4 text-lg"
          placeholder={copy.price}
        />

        <input
          type="number"
          min="1"
          inputMode="numeric"
          value={menuDeliveryDays}
          onChange={(e) => setMenuDeliveryDays(e.target.value)}
          className="w-full rounded-2xl border px-4 py-4 text-lg"
          placeholder={copy.deliveryDays}
        />

        <textarea
          value={menuDescription}
          onChange={(e) => setMenuDescription(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border px-4 py-4 text-lg"
          placeholder={copy.menuDescription}
        />

        <label className="flex items-center gap-3 rounded-2xl border bg-gray-50 p-4">
          <input
            type="checkbox"
            checked={allowSecondaryUse}
            onChange={(e) => setAllowSecondaryUse(e.target.checked)}
            className="h-5 w-5"
          />
          <span className="text-base font-medium">{copy.secondaryUse}</span>
        </label>
      </div>
    </div>
  );

  const renderPhone = () => (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{copy.phoneTitle}</h1>
      <p className="text-base leading-8 text-gray-600">{copy.phoneBody}</p>

      <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
        <input
          value={phoneCountryCode}
          onChange={(e) => setPhoneCountryCode(e.target.value)}
          className="rounded-2xl border px-4 py-4 text-lg"
          placeholder="+81"
        />
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="rounded-2xl border px-4 py-4 text-lg"
          placeholder={copy.phoneNumber}
          inputMode="tel"
        />
      </div>

      <button
        type="button"
        onClick={handleSendCode}
        className="w-full rounded-2xl border px-4 py-4 text-base font-semibold"
      >
        {copy.sendCode}
      </button>

      <div className="space-y-3">
        <input
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          className="w-full rounded-2xl border px-4 py-4 text-center text-lg tracking-[0.25em]"
          placeholder={copy.verificationCode}
          inputMode="numeric"
          maxLength={6}
        />

        <button
          type="button"
          onClick={handleVerifyCode}
          className="w-full rounded-2xl bg-slate-950 px-4 py-4 text-base font-semibold text-white"
        >
          {copy.verifyCode}
        </button>

        {phoneVerified && (
          <p className="text-base font-semibold text-green-600">
            {copy.verified}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border bg-gray-50 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span className="text-base">
            {copy.termsLabel}{" "}
            <Link href="/terms" className="font-semibold underline">
              {copy.termsLink}
            </Link>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreedToPrivacy}
            onChange={(e) => setAgreedToPrivacy(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span className="text-base">
            {copy.privacyLabel}{" "}
            <Link href="/privacy" className="font-semibold underline">
              {copy.privacyLink}
            </Link>
          </span>
        </label>
      </div>
    </div>
  );

  const renderStep = () => {
    if (step === 0) return renderWelcome();
    if (step === 1) return renderUsername();
    if (step === 2) return renderAccount();
    if (step === 3) return renderLocation();
    if (step === 4) return renderCategory();
    if (step === 5) return renderSocials();
    if (step === 6) return renderImages();
    if (step === 7) return renderMenu();
    return renderPhone();
  };

  const isFinalActionStep = step === TOTAL_STEPS - 1;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              step === 0 || loading ? "invisible" : ""
            }`}
          >
            {copy.back}
          </button>

          <LocaleTabs locale={locale} setLocale={setLocale} />
        </div>

        <div className="rounded-[32px] border bg-white p-6 shadow-sm md:p-8">
          <StepDots total={TOTAL_STEPS} current={currentProgress} />
          <div className="mt-8">{renderStep()}</div>

          {error && <p className="mt-6 text-base text-red-600">{error}</p>}
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 px-4 pb-4 md:px-0">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={isFinalActionStep ? handleSubmit : handleNext}
            disabled={loading}
            className="w-full rounded-2xl bg-black px-4 py-5 text-base font-semibold text-white shadow-lg transition hover:bg-gray-800 disabled:opacity-60"
          >
            {loading
              ? copy.loading
              : isFinalActionStep
              ? copy.finish
              : step === 2
              ? copy.createAndContinue
              : copy.continue}
          </button>
        </div>
      </div>
    </div>
  );
}