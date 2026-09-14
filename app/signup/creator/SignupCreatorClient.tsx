// File: app/signup/creator/SignupCreatorClient.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/types";
import { getLocaleAfterInitialCreatorCountrySelection } from "@/lib/i18n/options";
import {
  creatorSignupAudienceCountryLabels,
  creatorSignupCategoryLabels,
  creatorSignupDictionary,
  creatorSignupFollowerRangeLabels,
  creatorSignupGenderLabels,
  creatorSignupGenreLabels,
  creatorSignupMenuCopy,
  creatorSignupPrefectureLabels,
  creatorSignupStepTitles,
  localizeCreatorSignupValue,
} from "@/lib/i18n/creatorSignup";
import LocaleSelector from "@/components/i18n/LocaleSelector";
import CountrySelector from "@/components/creator/CountrySelector";
import {
  canonicalizeCreatorLocation,
  DEFAULT_CREATOR_COUNTRY,
  getCreatorLocationAfterCountryChange,
  JAPAN_PREFECTURES,
  parseCreatorPrefectures,
  restoreCreatorSignupDraftLocation,
  type CreatorCountry,
} from "@/lib/creator/country";
import { isCreatorPaidMarketplaceEnabled } from "@/lib/creator/marketplaceAvailability";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import {
  AvatarCropPicker,
  MenuTypePicker,
  SocialPlatformPicker,
} from "./CreatorSignupPolishControls";

type SocialAccountForm = {
  platform: string;
  username_or_url: string;
  follower_range: string;
  audience_country: string;
};

type MenuForm = {
  menu_type: string;
  custom_menu_name: string;
  price: string;
  description: string;
};

type DraftState = {
  step: number;
  countrySelectionCompleted?: boolean;
  displayName: string;
  username: string;
  gender: string;
  birthDate: string;
  email: string;
  country: string;
  prefecture: string;
  canReceiveProductsChoice: string;
  activeGenreGroup: string;
  selectedCategories: string[];
  socialAccounts: SocialAccountForm[];
  menus: MenuForm[];
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
};

const STORAGE_KEY = "trendre_creator_signup_draft_v8_compact";

const CREATOR_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_CREATOR_IMAGE_BUCKET || "creator-assets";

const TOTAL_STEPS = 7;
const MIN_CREATOR_MENU_PRICE = 3000;

const GENDER_OPTIONS = ["", "女性", "男性", "その他"] as const;

const PREFECTURE_DELIMITER = "、";

function parseSelectedPrefectures(value: string) {
  return parseCreatorPrefectures(value);
}

function joinSelectedPrefectures(items: string[]) {
  return Array.from(new Set(items))
    .filter((item) => (JAPAN_PREFECTURES as readonly string[]).includes(item))
    .join(PREFECTURE_DELIMITER);
}

function formatPriceInput(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parsePriceNumber(value: string) {
  return Number(value.replace(/,/g, ""));
}

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


const MENU_OPTIONS = [
  "Instagram投稿",
  "Instagramリール",
  "Instagramストーリーズ",
  "TikTok投稿",
  "YouTubeショート",
  "YouTube動画",
  "投稿なし・動画素材のみ納品",
  "投稿なし・写真素材のみ納品",
  "イベント訪問",
  "その他",
] as const;

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
    custom_menu_name: "",
    price: "",
    description: "",
  };
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeBoolean(value: unknown) {
  return value === true;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
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
      custom_menu_name: safeString(row.custom_menu_name),
      price: safeString(row.price),
      description: "",
    };
  });

  return sanitized.length > 0 ? sanitized : [createEmptyMenu()];
}

function getOAuthRedirectUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/signup/creator?oauth=1`;
}

function normalizeHandle(input: string) {
  return input.trim().replace(/^@/, "");
}

function randomToken(length = 8) {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);

    return Array.from(bytes)
      .map((byte) => (byte % 36).toString(36))
      .join("");
  }

  return Math.random().toString(36).slice(2, 2 + length);
}

function makeInternalUsername(displayName: string) {
  const base = displayName
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 18);

  const safeBase = base && /^[a-z0-9]/.test(base) ? base : "influencer";

  return `${safeBase}-${randomToken(6)}`;
}

function getAgeFromBirthDate(value: string) {
  const birthDate = new Date(`${value}T00:00:00.000Z`);
  const today = new Date();

  if (Number.isNaN(birthDate.getTime())) return 0;

  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const currentMonth = today.getUTCMonth();
  const birthMonth = birthDate.getUTCMonth();

  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && today.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

function getSocialConfig(platform: string, locale: AppLocale) {
  const copy = creatorSignupDictionary[locale];
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

function getMenuLabel(value: string, locale: AppLocale) {
  if (!(MENU_OPTIONS as readonly string[]).includes(value)) {
    return value || creatorSignupDictionary[locale].notSelected;
  }
  return creatorSignupMenuCopy[locale][value]?.label ?? value;
}

function getMenuHelp(value: string, locale: AppLocale) {
  if (!(MENU_OPTIONS as readonly string[]).includes(value)) return "";
  return creatorSignupMenuCopy[locale][value]?.help ?? "";
}

function fileExtension(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-[15px] font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
    />
  );
}

function SelectInput({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-[15px] font-bold text-slate-950 outline-none transition focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100 ${className}`}
    >
      {children}
    </select>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-1.5 text-[13px] font-black text-slate-900">{label}</p>
      {children}
      {help ? (
        <p className="mt-1.5 text-[11px] font-bold leading-5 text-slate-400">
          {help}
        </p>
      ) : null}
    </label>
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
      className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-[#ff3860] px-4 text-xs font-black text-white shadow-[0_10px_24px_rgba(255,56,96,0.20)] transition hover:bg-[#ff4f58] ${className}`}
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
      <h1 className="text-[24px] font-black leading-tight tracking-[-0.055em] text-slate-950">
        {title}
      </h1>

      {body ? (
        <p className="mt-1.5 text-[13px] font-bold leading-6 text-slate-500">
          {body}
        </p>
      ) : null}

      <div className="mt-4">{children}</div>
    </div>
  );
}

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-[#ff3860] transition-all duration-300"
        style={{ width: `${((current + 1) / TOTAL_STEPS) * 100}%` }}
      />
    </div>
  );
}

export default function SignupCreatorClient({
  isCreatorOnly,
}: {
  isCreatorOnly: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale({ allLocales: true });
  const copy = creatorSignupDictionary[locale];
  const stepTitles = creatorSignupStepTitles[locale];

  const [step, setStep] = useState(0);
  const [countrySelectionCompleted, setCountrySelectionCompleted] = useState(false);
  const localeManuallySelectedRef = useRef(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [country, setCountry] = useState<CreatorCountry>(DEFAULT_CREATOR_COUNTRY);
  const [prefecture, setPrefecture] = useState("");
  const [canReceiveProductsChoice, setCanReceiveProductsChoice] = useState("");

  const [activeGenreGroup, setActiveGenreGroup] = useState(GENRE_GROUPS[0].key);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [socialAccounts, setSocialAccounts] = useState<SocialAccountForm[]>([
    createEmptySocial(),
  ]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);

  const [menus, setMenus] = useState<MenuForm[]>([createEmptyMenu()]);
  const paidMarketplaceEnabled = isCreatorPaidMarketplaceEnabled(country);
  const creatorOnlyExperience = isCreatorOnly || !paidMarketplaceEnabled;

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const [oauthSessionEmail, setOauthSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lineSetupVisible, setLineSetupVisible] = useState(false);
  const [lineStatusLoading, setLineStatusLoading] = useState(false);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineDisplayName, setLineDisplayName] = useState<string | null>(null);
  const [lineLinkCode, setLineLinkCode] = useState<string | null>(null);
  const [lineLinkExpiresAt, setLineLinkExpiresAt] = useState<string | null>(null);
  const [lineLinkLoading, setLineLinkLoading] = useState(false);
  const [lineLinkMessage, setLineLinkMessage] = useState<string | null>(null);

  const lineOfficialUrl = process.env.NEXT_PUBLIC_LINE_OFFICIAL_URL?.trim() ?? "";
  const hasOAuthReturn = searchParams.get("oauth") === "1";
  const shouldResetDraft = searchParams.get("reset") === "1";

  const activeGenre = useMemo(
    () => GENRE_GROUPS.find((group) => group.key === activeGenreGroup) ?? GENRE_GROUPS[0],
    [activeGenreGroup]
  );

  const normalizedEmail = email.trim();
  const normalizedPassword = password.trim();
  const normalizedPasswordConfirm = passwordConfirm.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const passwordLongEnough = normalizedPassword.length >= 8;
  const passwordsMatch =
    normalizedPasswordConfirm.length > 0 && normalizedPassword === normalizedPasswordConfirm;
  const accountStepInvalid =
    step === 1 &&
    !oauthSessionEmail &&
    (!emailLooksValid || !passwordLongEnough || !passwordsMatch);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step, lineSetupVisible]);

  const goToStep = (nextStep: number, pushHistory = true) => {
    const safeStep = Math.max(0, Math.min(nextStep, TOTAL_STEPS - 1));
    setStep(safeStep);
    if (typeof window !== "undefined" && pushHistory) {
      window.history.pushState(
        { ...(window.history.state ?? {}), trendreCreatorSignupStep: safeStep },
        "",
        window.location.href
      );
    }
  };

  const resetForm = () => {
    localStorage.removeItem(STORAGE_KEY);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    portfolioPreviews.forEach((url) => URL.revokeObjectURL(url));

    setStep(0);
    setCountrySelectionCompleted(false);
    localeManuallySelectedRef.current = false;
    setDisplayName("");
    setUsername("");
    setGender("");
    setBirthDate("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setCountry(DEFAULT_CREATOR_COUNTRY);
    setPrefecture("");
    setCanReceiveProductsChoice("");
    setActiveGenreGroup(GENRE_GROUPS[0].key);
    setSelectedCategories([]);
    setSocialAccounts([createEmptySocial()]);
    setAvatarFile(null);
    setAvatarPreview(null);
    setPortfolioFiles([]);
    setPortfolioPreviews([]);
    setMenus([createEmptyMenu()]);
    setAgreedToTerms(false);
    setAgreedToPrivacy(false);
    setError(null);

    if (typeof window !== "undefined") {
      window.history.replaceState(
        { ...(window.history.state ?? {}), trendreCreatorSignupStep: 0 },
        "",
        "/signup/creator"
      );
    }
  };

  useEffect(() => {
    if (shouldResetDraft) {
      resetForm();
      return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as Partial<DraftState>;
      const restoredStep = typeof draft.step === "number" ? Math.max(0, Math.min(draft.step, TOTAL_STEPS - 1)) : 0;
      setStep(restoredStep);
      setDisplayName(safeString(draft.displayName));
      setUsername(safeString(draft.username));
      setGender(safeString(draft.gender));
      setBirthDate(safeString(draft.birthDate));
      setEmail(safeString(draft.email));
      const draftLocation = restoreCreatorSignupDraftLocation(draft);
      setCountry(draftLocation.country);
      setCountrySelectionCompleted(
        draft.countrySelectionCompleted === true ||
          restoredStep > 0 ||
          draftLocation.country !== DEFAULT_CREATOR_COUNTRY ||
          Boolean(safeString(draft.displayName) || safeString(draft.email)),
      );
      setPrefecture(draftLocation.prefecture);
      setCanReceiveProductsChoice(safeString(draft.canReceiveProductsChoice));
      setActiveGenreGroup(safeString(draft.activeGenreGroup, GENRE_GROUPS[0].key));
      setSelectedCategories(safeStringArray(draft.selectedCategories));
      setSocialAccounts(safeSocialAccounts(draft.socialAccounts));
      setMenus(safeMenus(draft.menus));
      setAgreedToTerms(safeBoolean(draft.agreedToTerms));
      setAgreedToPrivacy(safeBoolean(draft.agreedToPrivacy));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldResetDraft]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentStep =
      typeof window.history.state?.trendreCreatorSignupStep === "number"
        ? window.history.state.trendreCreatorSignupStep
        : null;
    if (currentStep === null) {
      window.history.replaceState(
        { ...(window.history.state ?? {}), trendreCreatorSignupStep: step },
        "",
        window.location.href
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      const nextStep = event.state?.trendreCreatorSignupStep;
      if (typeof nextStep === "number") {
        setError(null);
        setStep(Math.max(0, Math.min(nextStep, TOTAL_STEPS - 1)));
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const draft: DraftState = {
      step,
      countrySelectionCompleted,
      displayName,
      username,
      gender,
      birthDate,
      email,
      country,
      prefecture,
      canReceiveProductsChoice,
      activeGenreGroup,
      selectedCategories,
      socialAccounts,
      menus,
      agreedToTerms,
      agreedToPrivacy,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [
    step,
    countrySelectionCompleted,
    displayName,
    username,
    gender,
    birthDate,
    email,
    country,
    prefecture,
    canReceiveProductsChoice,
    activeGenreGroup,
    selectedCategories,
    socialAccounts,
    menus,
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
      const { data: { session } } = await supabase.auth.getSession();
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
      const oauthEmail = typeof session.user.email === "string" ? session.user.email : "";

      setOauthSessionEmail(oauthEmail || null);
      setDisplayName((prev) => (prev.trim() ? prev : oauthName));
      setEmail((prev) => (prev.trim() ? prev : oauthEmail));

      const statusResponse = await fetch("/api/signup/creator-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (statusResponse.ok) {
        const status = await statusResponse.json() as { completed?: boolean };
        if (status.completed) {
          router.replace("/creator/dashboard");
          return;
        }
      }

      if (hasOAuthReturn && step < 2) goToStep(2);
    };

    void hydrateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOAuthReturn, isCreatorOnly, router, supabase]);

  const checkUsernameAvailability = async (candidate: string) => {
    const response = await fetch(`/api/signup/username-availability?username=${encodeURIComponent(candidate)}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(copy.signupFailed);
    const result = await response.json() as { available?: boolean };
    return result.available === true;
  };

  const ensureAvailableUsername = async () => {
    const current = username.trim().toLowerCase();
    if (current) {
      if (await checkUsernameAvailability(current)) return current;
    }

    for (let i = 0; i < 8; i += 1) {
      const candidate = makeInternalUsername(displayName);
      if (await checkUsernameAvailability(candidate)) {
        setUsername(candidate);
        return candidate;
      }
    }
    throw new Error(copy.signupFailed);
  };

  const toggleCategory = (value: string) => {
    setError(null);
    setSelectedCategories((prev) => {
      if (prev.includes(value)) return prev.filter((item) => item !== value);
      if (prev.length >= 5) {
        setError(copy.categoryLimit);
        return prev;
      }
      return [...prev, value];
    });
  };

  const togglePrefecture = (item: string) => {
    setPrefecture((prev) => {
      const current = parseSelectedPrefectures(prev);
      const next = current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item];
      return joinSelectedPrefectures(next);
    });
  };

  const handleCountryChange = (nextCountry: CreatorCountry) => {
    const location = getCreatorLocationAfterCountryChange(
      nextCountry,
      prefecture,
    );
    setCountry(location.country);
    setPrefecture(location.prefecture ?? "");
    setError(null);
  };

  const handleInitialCountrySelection = (nextCountry: CreatorCountry) => {
    handleCountryChange(nextCountry);
    setLocale(
      getLocaleAfterInitialCreatorCountrySelection(
        nextCountry,
        locale,
        localeManuallySelectedRef.current,
      ),
    );
    setCountrySelectionCompleted(true);
  };

  const handleLocaleChange = (nextLocale: AppLocale) => {
    localeManuallySelectedRef.current = true;
    setLocale(nextLocale);
  };

  const updateSocial = (index: number, key: keyof SocialAccountForm, value: string) => {
    setSocialAccounts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  const addSocial = () => setSocialAccounts((prev) => [...prev, createEmptySocial()]);
  const removeSocial = (index: number) => {
    setSocialAccounts((prev) => {
      if (prev.length === 1) return [createEmptySocial()];
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateMenu = (index: number, key: keyof MenuForm, value: string) => {
    const nextValue = key === "price" ? formatPriceInput(value) : value;
    setMenus((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [key]: nextValue };
        return key === "menu_type" && value !== "その他"
          ? { ...next, custom_menu_name: "" }
          : next;
      })
    );
  };

  const addMenu = () => setMenus((prev) => [...prev, createEmptyMenu()]);
  const removeMenu = (index: number) => {
    setMenus((prev) => {
      if (prev.length === 1) return [createEmptyMenu()];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAvatarCropConfirm = (file: File, previewUrl: string) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
    setError(null);
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
      if (!displayName.trim()) {
        setError(copy.displayNameRequired);
        return false;
      }
      if (!gender.trim()) {
        setError(copy.genderRequired);
        return false;
      }
      if (!birthDate.trim()) {
        setError(copy.birthDateRequired);
        return false;
      }
      if (getAgeFromBirthDate(birthDate) < 18) {
        setError(copy.ageRequired);
        return false;
      }
      try {
        await ensureAvailableUsername();
      } catch (e) {
        setError(e instanceof Error ? e.message : copy.signupFailed);
        return false;
      }
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
        if (!passwordConfirm.trim()) {
          setError(copy.passwordConfirmRequired);
          return false;
        }
        if (password.trim() !== passwordConfirm.trim()) {
          setError(copy.passwordMismatchError);
          return false;
        }
      }
    }

    if (step === 2) {
      if (selectedCategories.length === 0) {
        setError(copy.categoryRequired);
        return false;
      }
      if (selectedCategories.length > 5) {
        setError(copy.categoryLimit);
        return false;
      }
    }

    if (step === 3) {
      const location = canonicalizeCreatorLocation(country, prefecture);
      if (!location.ok) {
        setError(copy.areaRequired);
        return false;
      }
      if (!canReceiveProductsChoice) {
        setError(copy.productPrRequired);
        return false;
      }
    }

    if (step === 4) {
      const cleaned = socialAccounts.filter(
        (item) => item.platform.trim() || item.username_or_url.trim() || item.follower_range.trim() || item.audience_country.trim()
      );
      if (cleaned.length === 0) {
        setError(copy.socialRequired);
        return false;
      }
      const hasIncomplete = cleaned.some(
        (item) => !item.platform.trim() || !item.username_or_url.trim() || !item.follower_range.trim() || !item.audience_country.trim()
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
      if (paidMarketplaceEnabled) {
        const filledMenus = menus.filter((menu) => menu.menu_type.trim() || menu.price.trim());
        if (filledMenus.length === 0) {
          setError(copy.menuRequired);
          return false;
        }
        const hasInvalidMenu = filledMenus.some((menu) => {
          const priceNumber = parsePriceNumber(menu.price);
          return !menu.menu_type.trim() || !menu.price.trim() || !Number.isFinite(priceNumber) || priceNumber <= 0;
        });
        if (hasInvalidMenu) {
          setError(copy.menuRequired);
          return false;
        }
        if (filledMenus.some((menu) => parsePriceNumber(menu.price) < MIN_CREATOR_MENU_PRICE)) {
          setError(copy.minimumPrice);
          return false;
        }
        if (filledMenus.some((menu) => menu.menu_type === "その他" && !menu.custom_menu_name.trim())) {
          setError(copy.customMenuNameRequired);
          return false;
        }
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
    goToStep(step + 1);
  };

  const goBack = () => {
    setError(null);
    if (step <= 0) {
      setCountrySelectionCompleted(false);
      return;
    }
    if (typeof window !== "undefined") {
      const currentState = window.history.state;
      if (currentState?.trendreCreatorSignupStep === step) {
        window.history.back();
        return;
      }
    }
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleGoogleSignup = async () => {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getOAuthRedirectUrl() },
    });
    if (oauthError) setError(oauthError.message);
  };

  const uploadImageAndGetUrl = async (
    file: File,
    ownerKey: string,
    kind: "avatar" | "portfolio",
    index?: number
  ) => {
    const ext = fileExtension(file);
    const suffix = typeof index === "number" ? `${Date.now()}-${index}` : `${Date.now()}`;
    const safeOwnerKey = ownerKey.replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = `${safeOwnerKey}/${kind}-${suffix}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(CREATOR_IMAGE_BUCKET)
      .upload(filePath, file, { upsert: true, cacheControl: "3600" });
    if (uploadError) throw new Error(uploadError.message || copy.imageUploadFailed);

    const { data } = supabase.storage.from(CREATOR_IMAGE_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const ensureAuthenticatedSession = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const normalizedEmailValue = email.trim().toLowerCase();

    if (currentSession?.user && currentSession.access_token) {
      if (oauthSessionEmail) return currentSession;
      if (currentSession.user.email?.trim().toLowerCase() === normalizedEmailValue) return currentSession;
      await supabase.auth.signOut();
    }

    if (!normalizedEmailValue) throw new Error(copy.emailRequired);
    if (!password.trim() || password.trim().length < 8) throw new Error(copy.passwordRequired);
    if (password.trim() !== passwordConfirm.trim()) throw new Error(copy.passwordMismatchError);

    const internalUsername = username.trim() || (await ensureAvailableUsername());
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmailValue,
      password: password.trim(),
      options: {
        emailRedirectTo: getOAuthRedirectUrl(),
        data: {
          full_name: displayName.trim(),
          display_name: displayName.trim(),
          creator_username: internalUsername,
          creator_gender: gender,
          creator_birth_date: birthDate,
          creator_prefecture: country === "日本" ? prefecture : null,
          creator_can_receive_products: canReceiveProductsChoice === "yes",
        },
      },
    });

    if (signUpError) {
      const errorCode = signUpError.code?.toLowerCase() ?? "";
      const errorMessage = signUpError.message?.toLowerCase() ?? "";
      const isExistingEmailError =
        errorCode === "user_already_exists" ||
        errorMessage.includes("user already registered") ||
        errorMessage.includes("already registered");

      if (isExistingEmailError) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmailValue,
          password: password.trim(),
        });
        if (signInError || !signInData.session?.user || !signInData.session.access_token) {
          throw new Error(copy.existingEmailSignInFailed);
        }
        return signInData.session;
      }
      throw new Error(signUpError.message || copy.signupFailed);
    }

    if (data.session?.user && data.session.access_token) return data.session;

    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.getSession();
    if (refreshError) throw new Error(refreshError.message || copy.signupFailed);
    if (!refreshedSession?.user || !refreshedSession.access_token) throw new Error(copy.sessionMissing);
    return refreshedSession;
  };

  const getCurrentAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const confirmSignupSession = async (signupSession: {
    user: { id: string };
    access_token: string;
    refresh_token: string;
  }) => {
    const { data, error: setSessionError } = await supabase.auth.setSession({
      access_token: signupSession.access_token,
      refresh_token: signupSession.refresh_token,
    });
    if (setSessionError || data.session?.user.id !== signupSession.user.id) throw new Error(copy.sessionMissing);

    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
    if (getSessionError || !currentSession?.access_token || currentSession.user.id !== signupSession.user.id) {
      throw new Error(copy.sessionMissing);
    }
  };

  const loadLineStatus = async (options: { silent?: boolean } = {}) => {
    const token = await getCurrentAccessToken();
    if (!token) {
      if (!options.silent) setLineLinkMessage(copy.sessionMissing);
      return false;
    }
    if (!options.silent) {
      setLineStatusLoading(true);
      setLineLinkMessage(null);
    }

    try {
      const res = await fetch("/api/line/link-code", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? copy.lineUnlinkedMessage);

      const linked = Boolean(json?.linked);
      setLineLinked(linked);
      setLineDisplayName(typeof json?.link?.line_display_name === "string" ? json.link.line_display_name : null);
      if (!linked && !options.silent) setLineLinkMessage(copy.lineUnlinkedMessage);
      return linked;
    } catch (e) {
      if (!options.silent) setLineLinkMessage(e instanceof Error ? e.message : copy.lineUnlinkedMessage);
      return false;
    } finally {
      if (!options.silent) setLineStatusLoading(false);
    }
  };

  const createLineLinkCode = async () => {
    const token = await getCurrentAccessToken();
    if (!token) {
      setLineLinkMessage(copy.sessionMissing);
      return;
    }
    setLineLinkLoading(true);
    setLineLinkMessage(null);

    try {
      const res = await fetch("/api/line/link-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? copy.lineCodeFailed);
      setLineLinkCode(typeof json?.code === "string" ? json.code : null);
      setLineLinkExpiresAt(typeof json?.expires_at === "string" ? json.expires_at : null);
      setLineLinked(false);
    } catch (e) {
      setLineLinkMessage(e instanceof Error ? e.message : copy.lineCodeFailed);
    } finally {
      setLineLinkLoading(false);
    }
  };

  const copyLineCode = async () => {
    if (!lineLinkCode) return;
    try {
      await navigator.clipboard.writeText(lineLinkCode);
      setLineLinkMessage(copy.lineCopied);
    } catch {
      setLineLinkMessage(lineLinkCode);
    }
  };

  const startLineLogin = async () => {
    const token = await getCurrentAccessToken();
    if (!token) {
      setLineLinkMessage(copy.sessionMissing);
      return;
    }
    setLineLinkLoading(true);
    setLineLinkMessage(null);

    try {
      const res = await fetch("/api/line/login/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_to: creatorOnlyExperience
            ? "/creator/dashboard"
            : "/creator/payouts?from=signup&line=linked",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || typeof json?.url !== "string") throw new Error(json?.error ?? copy.lineCodeFailed);
      window.location.href = json.url;
    } catch (e) {
      setLineLinkLoading(false);
      setLineLinkMessage(e instanceof Error ? e.message : copy.lineCodeFailed);
    }
  };

  const finishSignupAfterLine = () => {
    if (creatorOnlyExperience) {
      router.replace("/creator/dashboard");
      return;
    }
    router.replace(
      lineLinked
        ? "/creator/payouts?from=signup&line=linked"
        : "/creator/payouts?from=signup&line=skipped"
    );
  };

  useEffect(() => {
    if (!lineSetupVisible || lineLinked) return;
    const timer = window.setInterval(() => void loadLineStatus({ silent: true }), 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineSetupVisible, lineLinked]);

  const handleFinish = async () => {
    const valid = await validateStep();
    if (!valid) return;

    const location = canonicalizeCreatorLocation(country, prefecture);
    if (!location.ok) {
      setError(copy.areaRequired);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!avatarFile) throw new Error(copy.avatarRequired);
      if (portfolioFiles.length < 3) throw new Error(copy.portfolioRequired);

      const validMenus = paidMarketplaceEnabled
        ? menus
            .map((menu) => ({
              menu_type: (menu.menu_type === "その他" ? menu.custom_menu_name : menu.menu_type).trim(),
              price: parsePriceNumber(menu.price),
              description: null,
            }))
            .filter((menu) => menu.menu_type && menu.price >= MIN_CREATOR_MENU_PRICE)
        : [];
      if (paidMarketplaceEnabled && validMenus.length === 0) throw new Error(copy.menuRequired);

      const internalUsername = username.trim().toLowerCase() || (await ensureAvailableUsername());
      const session = await ensureAuthenticatedSession();
      const ownerKey = session.user.id || internalUsername;

      const avatarUrl = await uploadImageAndGetUrl(avatarFile, ownerKey, "avatar");
      const portfolioAssets = await Promise.all(
        portfolioFiles.map(async (file, index) => {
          const assetUrl = await uploadImageAndGetUrl(file, ownerKey, "portfolio", index);
          return { asset_url: assetUrl, title: file.name, sort_order: index };
        })
      );

      const res = await fetch("/api/signup/complete-creator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          username: internalUsername,
          display_name: displayName.trim(),
          full_name: displayName.trim(),
          avatar_url: avatarUrl,
          portfolio_assets: portfolioAssets,
          gender,
          birth_date: birthDate,
          country: location.country,
          prefecture: location.prefecture,
          city: null,
          can_receive_products: canReceiveProductsChoice === "yes",
          main_category: selectedCategories[0],
          sub_categories: selectedCategories,
          content_language: "日本語",
          response_language: "日本語",
          short_bio: null,
          is_adult_confirmed: true,
          phone_country_code: null,
          phone_number: null,
          phone_verified: false,
          social_accounts: socialAccounts
            .map((account) => ({
              platform: account.platform.trim(),
              username_or_url: normalizeHandle(account.username_or_url),
              follower_range: account.follower_range.trim(),
              audience_country: account.audience_country.trim(),
            }))
            .filter(
              (account) => account.platform && account.username_or_url && account.follower_range && account.audience_country
            ),
          first_menus: validMenus,
          agreed_to_terms: agreedToTerms,
          agreed_to_privacy: agreedToPrivacy,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (json?.code === "COMPANY_ACCOUNT_CONFLICT") throw new Error(copy.companyAccountConflict);
        throw new Error(json?.error || copy.signupFailed);
      }

      if (json?.status === "already_completed") {
        localStorage.removeItem(STORAGE_KEY);
        router.replace("/creator/dashboard");
        return;
      }

      await confirmSignupSession(session);
      localStorage.removeItem(STORAGE_KEY);
      setLineSetupVisible(true);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : copy.signupFailed);
    } finally {
      setLoading(false);
    }
  };

  const renderLineSetup = () => {
    const tips = creatorOnlyExperience
      ? copy.completionTipsCreatorOnly
      : copy.completionTipsMarketplace;

    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7f8_0,#f6f8fb_36%,#f6f8fb_100%)] text-slate-950">
        <header className="mx-auto flex w-full max-w-[920px] items-center justify-between px-4 py-3">
          <Link href="/for-creators" className="inline-flex items-center">
            <img src="/brand/trend-mart-logo.png" alt="Trendre" className="h-7 w-auto object-contain" />
          </Link>
          <LocaleSelector
            value={locale}
            onChange={handleLocaleChange}
            variant="select"
            ariaLabel={copy.uiLanguage}
          />
        </header>

        <div className="mx-auto w-full max-w-[920px] px-3 pb-24 pt-2">
          <section className="overflow-hidden rounded-[32px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
            <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_360px]">
              <div className="relative overflow-hidden px-5 pb-6 pt-7 sm:px-8 sm:py-9">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#ff3860]/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#06c755]/10 blur-3xl" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06c755] text-[10px] font-black text-white">✓</span>
                    {creatorOnlyExperience ? copy.registrationSavedCreatorOnly : copy.registrationSavedMarketplace}
                  </div>

                  <h1 className="mt-4 text-[28px] font-black leading-tight tracking-[-0.06em] text-slate-950 sm:text-[38px]">
                    {creatorOnlyExperience ? copy.completionHeadlineCreatorOnly : copy.completionHeadlineMarketplace}
                  </h1>

                  <p className="mt-3 max-w-[620px] text-sm font-bold leading-7 text-slate-500">
                    {creatorOnlyExperience ? copy.completionLeadCreatorOnly : copy.completionLeadMarketplace}
                  </p>

                  <div className="mt-5 grid gap-2 sm:max-w-[420px]">
                    <button
                      type="button"
                      onClick={() => void startLineLogin()}
                      disabled={lineLinkLoading || lineLinked}
                      className="h-13 min-h-13 rounded-full bg-[#06c755] px-5 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(6,199,85,0.28)] transition hover:bg-[#05bd51] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {lineLinked
                        ? copy.lineLinkedTitle
                        : lineLinkLoading
                          ? copy.lineOpening
                          : creatorOnlyExperience
                            ? copy.lineConnect
                            : copy.lineOpenButton}
                    </button>

                    <button
                      type="button"
                      onClick={finishSignupAfterLine}
                      disabled={lineLinkLoading}
                      className="h-12 rounded-full bg-white text-sm font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {lineLinked ? copy.lineContinue : copy.lineSetLater}
                    </button>
                  </div>

                  <p className="mt-3 text-[11px] font-bold leading-5 text-slate-400 sm:max-w-[420px]">
                    {creatorOnlyExperience ? copy.completionPrivacyCreatorOnly : copy.completionPrivacyMarketplace}
                  </p>

                  {lineLinked ? (
                    <div className="mt-4 max-w-[420px] rounded-[18px] bg-emerald-50 px-3 py-3 text-xs font-black leading-5 text-emerald-700 ring-1 ring-emerald-100">
                      {lineDisplayName ? copy.lineLinkedAccount(lineDisplayName) : copy.lineLinkedTitle}
                    </div>
                  ) : null}

                  {lineLinkMessage ? (
                    <div className="mt-4 max-w-[420px] rounded-[18px] bg-rose-50 px-3 py-3 text-xs font-black leading-5 text-rose-700 ring-1 ring-rose-100">
                      {lineLinkMessage}
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="border-t border-slate-100 bg-slate-50/70 p-4 md:border-l md:border-t-0 sm:p-5">
                <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#06c755] text-sm font-black text-white shadow-[0_12px_26px_rgba(6,199,85,0.24)]">LINE</div>
                    <div>
                      <p className="text-base font-black tracking-[-0.04em] text-slate-950">
                        {creatorOnlyExperience ? copy.completionAsideTitleCreatorOnly : copy.completionAsideTitleMarketplace}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold leading-5 text-slate-500">
                        {creatorOnlyExperience ? copy.completionAsideBodyCreatorOnly : copy.completionAsideBodyMarketplace}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {tips.map((item, index) => (
                      <div key={item.title} className="flex gap-3 rounded-[20px] bg-slate-50 p-3 ring-1 ring-slate-100">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-black text-[#ff3860] shadow-sm ring-1 ring-slate-100">{index + 1}</div>
                        <div>
                          <p className="text-xs font-black leading-5 text-slate-950">{item.title}</p>
                          <p className="mt-0.5 text-[11px] font-bold leading-5 text-slate-500">{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
    );
  };

  const renderStep = () => {
    if (!countrySelectionCompleted) {
      return (
        <StepShell
          title={copy.countrySelectionTitle}
          body={copy.countrySelectionBody}
        >
          <CountrySelector
            value={null}
            onChange={handleInitialCountrySelection}
            ariaLabel={copy.countrySelectionTitle}
          />
        </StepShell>
      );
    }

    if (step === 0) {
      return (
        <StepShell title={copy.displayTitle} body={copy.displayBody}>
          <div className="grid gap-3">
            <Field label={copy.displayName}>
              <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={copy.displayNamePlaceholder} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.gender}>
                <SelectInput value={gender} onChange={(e) => setGender(e.target.value)}>
                  {GENDER_OPTIONS.map((item) => (
                    <option key={item || "empty"} value={item}>{creatorSignupGenderLabels[locale][item]}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label={copy.birthDate}>
                <TextInput type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </Field>
            </div>
          </div>
        </StepShell>
      );
    }

    if (step === 1) {
      return (
        <StepShell title={copy.accountTitle} body={copy.accountBody}>
          <GoogleAuthButton onClick={handleGoogleSignup}>{copy.signUpWithGoogle}</GoogleAuthButton>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-black text-slate-300">{copy.orText}</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {oauthSessionEmail ? (
            <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
              {copy.oauthConnectedAccount(oauthSessionEmail)}
            </div>
          ) : null}

          <div className="grid gap-3">
            <TextInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder={copy.email}
              disabled={!!oauthSessionEmail}
            />

            {!oauthSessionEmail ? (
              <>
                <TextInput
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder={copy.password}
                />
                <TextInput
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => { setPasswordConfirm(e.target.value); setError(null); }}
                  placeholder={copy.passwordConfirm}
                />

                <div className="grid gap-1 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                  <p className={`text-[11px] font-black ${passwordLongEnough ? "text-emerald-600" : "text-slate-400"}`}>
                    {passwordLongEnough ? "✓ " : "○ "}{copy.passwordLengthOk}
                  </p>
                  <p className={`text-[11px] font-black ${
                    !normalizedPasswordConfirm
                      ? "text-slate-400"
                      : passwordsMatch
                        ? "text-emerald-600"
                        : "text-rose-600"
                  }`}>
                    {!normalizedPasswordConfirm ? "○ " : passwordsMatch ? "✓ " : "× "}
                    {!normalizedPasswordConfirm || passwordsMatch ? copy.passwordMatch : copy.passwordMismatch}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </StepShell>
      );
    }

    if (step === 2) {
      return (
        <StepShell title={copy.categoryTitle} body={copy.categoryBody}>
          <div className="rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
            <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {GENRE_GROUPS.map((group) => {
                const active = activeGenreGroup === group.key;
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setActiveGenreGroup(group.key)}
                    className={`shrink-0 rounded-full px-3 py-2 text-xs font-black transition ${active ? "bg-[#ff3860] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
                  >
                    {creatorSignupGenreLabels[locale][group.key]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
            <span className="text-xs font-black text-slate-500">{copy.categoryCount}</span>
            <span className="text-xs font-black text-slate-950">{selectedCategories.length}/5</span>
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
                  className={`min-h-[38px] rounded-xl px-2.5 py-2 text-left text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${selected ? "bg-[#ff3860] text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
                >
                  {localizeCreatorSignupValue(locale, item, creatorSignupCategoryLabels)}
                </button>
              );
            })}
          </div>

          {selectedCategories.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedCategories.map((item) => (
                <button key={item} type="button" onClick={() => toggleCategory(item)} className="rounded-full bg-rose-50 px-2.5 py-1.5 text-[11px] font-black text-[#ff3860] ring-1 ring-rose-100">
                  {localizeCreatorSignupValue(locale, item, creatorSignupCategoryLabels)} ×
                </button>
              ))}
            </div>
          ) : null}
        </StepShell>
      );
    }

    if (step === 3) {
      const selectedPrefectures = parseSelectedPrefectures(prefecture);
      return (
        <StepShell
          title={country === "日本" ? copy.areaTitle : copy.nonJapanAreaTitle}
          body={country === "日本" ? copy.areaBody : copy.nonJapanAreaBody}
        >
          <div className="grid gap-3">
            {country === "日本" ? (
              <Field label={copy.prefecture} help={copy.selectPrefecture}>
                <div className="grid max-h-[280px] grid-cols-2 gap-1.5 overflow-y-auto rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100 sm:grid-cols-3">
                  {JAPAN_PREFECTURES.map((item) => {
                    const selected = selectedPrefectures.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => togglePrefecture(item)}
                        aria-pressed={selected}
                        className={`min-h-[38px] rounded-xl px-2.5 py-2 text-left text-xs font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 ${selected ? "bg-[#ff3860] text-white shadow-[0_8px_18px_rgba(255,56,96,0.18)]" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
                      >
                        {selected ? "✓ " : ""}{localizeCreatorSignupValue(locale, item, creatorSignupPrefectureLabels)}
                      </button>
                    );
                  })}
                </div>

                {selectedPrefectures.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedPrefectures.map((item) => (
                      <button key={item} type="button" onClick={() => togglePrefecture(item)} className="rounded-full bg-rose-50 px-2.5 py-1.5 text-[11px] font-black text-[#ff3860] ring-1 ring-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100">
                        {localizeCreatorSignupValue(locale, item, creatorSignupPrefectureLabels)} ×
                      </button>
                    ))}
                  </div>
                ) : null}
              </Field>
            ) : null}

            <Field label={copy.productPr}>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setCanReceiveProductsChoice("yes")}
                  className={`rounded-2xl px-3 py-3 text-left text-sm font-black ring-1 transition ${canReceiveProductsChoice === "yes" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"}`}
                >
                  {copy.productPrYes}
                </button>
                <button
                  type="button"
                  onClick={() => setCanReceiveProductsChoice("no")}
                  className={`rounded-2xl px-3 py-3 text-left text-sm font-black ring-1 transition ${canReceiveProductsChoice === "no" ? "bg-rose-50 text-[#ff3860] ring-rose-200" : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"}`}
                >
                  {copy.productPrNo}
                </button>
              </div>
            </Field>
          </div>
        </StepShell>
      );
    }

    if (step === 4) {
      return (
        <StepShell title={copy.socialTitle} body={copy.socialBody}>
          <div className="space-y-3">
            {socialAccounts.map((social, index) => {
              const config = getSocialConfig(social.platform, locale);
              const previewUrl = buildSocialPreview(social.platform, social.username_or_url);

              return (
                <div key={index} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-950">{copy.socialItem(index + 1)}</p>
                    <button type="button" onClick={() => removeSocial(index)} className="text-xs font-black text-[#ff3860]">{copy.remove}</button>
                  </div>

                  <div className="grid gap-2.5">
                    <SocialPlatformPicker
                      value={social.platform}
                      onChange={(value) => updateSocial(index, "platform", value)}
                    />

                    <div>
                      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-[#ff5f67] focus-within:ring-4 focus-within:ring-rose-100">
                        {config.prefix ? (
                          <div className="flex max-w-[42%] items-center bg-slate-50 px-2 text-[11px] font-black text-slate-400">
                            <span className="truncate">{config.prefix}</span>
                          </div>
                        ) : null}
                        <input
                          value={social.username_or_url}
                          onChange={(e) => updateSocial(index, "username_or_url", e.target.value)}
                          className="h-11 min-w-0 flex-1 px-3 text-[15px] font-bold outline-none"
                          placeholder={config.placeholder}
                        />
                      </div>
                      {previewUrl ? (
                        <p className="mt-1.5 truncate rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-500 ring-1 ring-slate-100">
                          {copy.urlPreview}: {previewUrl}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] font-bold text-slate-400">{config.guide}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <SelectInput value={social.follower_range} onChange={(e) => updateSocial(index, "follower_range", e.target.value)}>
                        <option value="">{copy.followerRange}</option>
                        {FOLLOWER_RANGE_OPTIONS.map((item) => (
                          <option key={item} value={item}>{localizeCreatorSignupValue(locale, item, creatorSignupFollowerRangeLabels)}</option>
                        ))}
                      </SelectInput>
                      <SelectInput value={social.audience_country} onChange={(e) => updateSocial(index, "audience_country", e.target.value)}>
                        <option value="">{copy.audienceCountry}</option>
                        {AUDIENCE_COUNTRY_OPTIONS.map((item) => (
                          <option key={item} value={item}>{localizeCreatorSignupValue(locale, item, creatorSignupAudienceCountryLabels)}</option>
                        ))}
                      </SelectInput>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={addSocial} className="mt-3 h-10 w-full rounded-full bg-white text-xs font-black text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50">
            + {copy.addSocial}
          </button>
        </StepShell>
      );
    }

    if (step === 5) {
      return (
        <StepShell title={copy.imagesTitle} body={copy.imagesBody}>
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <AvatarCropPicker
                previewUrl={avatarPreview}
                label={copy.avatar}
                help={copy.avatarHelp}
                chooseLabel={copy.avatarChoose}
                locale={locale}
                onConfirm={handleAvatarCropConfirm}
              />
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{copy.portfolio}</p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400">{copy.portfolioHelp}</p>
                </div>
                <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">{portfolioPreviews.length}/3</div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {Array.from({ length: Math.max(3, portfolioPreviews.length) }).map((_, index) => {
                  const preview = portfolioPreviews[index];
                  if (preview) {
                    return (
                      <div key={preview} className="relative aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                        <img src={preview} alt={copy.portfolioImageAlt(index + 1)} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => removePortfolioFile(index)} className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-black text-white">×</button>
                      </div>
                    );
                  }
                  return (
                    <div key={`empty-${index}`} className="flex aspect-square items-center justify-center rounded-xl bg-white text-[11px] font-black text-slate-300 ring-1 ring-dashed ring-slate-200">
                      {index + 1}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                <FilePickerButton multiple onChange={handlePortfolioSelect}>{copy.portfolioChoose}</FilePickerButton>
              </div>
            </div>
          </div>
        </StepShell>
      );
    }

    return (
      <StepShell
        title={paidMarketplaceEnabled ? copy.menuTitle : copy.nonPaidMarketplaceTitle}
        body={paidMarketplaceEnabled ? copy.menuBody : copy.nonPaidMarketplaceBody}
      >
        {paidMarketplaceEnabled ? <>
        <div className="space-y-3">
          {menus.map((menu, index) => (
            <div key={index} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-black text-slate-950">{copy.menuItem(index + 1)}</p>
                <button type="button" onClick={() => removeMenu(index)} className="text-xs font-black text-[#ff3860]">{copy.remove}</button>
              </div>

              <div className="grid gap-2.5">
                <Field label={copy.menuType}>
                  <MenuTypePicker
                    value={menu.menu_type}
                    options={MENU_OPTIONS.map((item) => ({
                      value: item,
                      label: getMenuLabel(item, locale),
                    }))}
                    onChange={(value) => updateMenu(index, "menu_type", value)}
                  />
                </Field>

                {menu.menu_type === "その他" ? (
                  <Field label={copy.customMenuName}>
                    <TextInput
                      type="text"
                      value={menu.custom_menu_name}
                      onChange={(e) => updateMenu(index, "custom_menu_name", e.target.value)}
                      placeholder={copy.customMenuPlaceholder}
                    />
                  </Field>
                ) : null}

                {menu.menu_type ? (
                  <p className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold leading-5 text-slate-500 ring-1 ring-slate-100">
                    {getMenuHelp(menu.menu_type, locale)}
                  </p>
                ) : null}

                <Field
                  label={copy.priceLabel}
                  help={copy.minimumPrice}
                >
                  <TextInput
                    type="text"
                    inputMode="numeric"
                    value={menu.price}
                    onChange={(e) => {
                      updateMenu(index, "price", e.target.value);
                      setError(null);
                    }}
                    onBlur={() => {
                      const priceNumber = parsePriceNumber(menu.price);
                      if (
                        menu.price.trim() &&
                        Number.isFinite(priceNumber) &&
                        priceNumber < MIN_CREATOR_MENU_PRICE
                      ) {
                        setError(copy.minimumPrice);
                      }
                    }}
                    placeholder={copy.price}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addMenu} className="mt-3 h-10 w-full rounded-full bg-white text-xs font-black text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50">
          + {copy.addMenu}
        </button>
        </> : null}

        <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <p className="text-sm font-black text-slate-950">{copy.termsTitle}</p>
          <label className="flex items-center gap-2 text-xs font-bold leading-5 text-slate-700">
            <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="h-4 w-4" />
            <span>
              {copy.termsLabel}{" "}
              <Link href="/terms" target="_blank" className="text-[#ff3860] underline underline-offset-4">{copy.termsLink}</Link>
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs font-bold leading-5 text-slate-700">
            <input type="checkbox" checked={agreedToPrivacy} onChange={(e) => setAgreedToPrivacy(e.target.checked)} className="h-4 w-4" />
            <span>
              {copy.privacyLabel}{" "}
              <Link href="/privacy" target="_blank" className="text-[#ff3860] underline underline-offset-4">{copy.privacyLink}</Link>
            </span>
          </label>
        </div>
      </StepShell>
    );
  };

  if (lineSetupVisible) return renderLineSetup();

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      {loading && step === TOTAL_STEPS - 1 ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[380px] rounded-[30px] bg-white p-5 text-center shadow-[0_24px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-100">
            <img src="/brand/trend-mart-logo.png" alt="Trendre" className="mx-auto h-8 w-auto object-contain" />
            <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#ff3860] border-t-transparent" />
            </div>
            <p className="mt-4 text-lg font-black tracking-[-0.04em] text-slate-950">
              {copy.preparingTitle}
            </p>
            <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
              {paidMarketplaceEnabled ? copy.preparingBody : copy.nonPaidPreparingBody}
            </p>
          </div>
        </div>
      ) : null}

      <header className="mx-auto flex w-full max-w-[760px] items-center justify-between px-4 py-3">
        <Link href="/for-creators" className="inline-flex items-center">
          <img src="/brand/trend-mart-logo.png" alt="Trendre" className="h-7 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSelector
            value={locale}
            onChange={handleLocaleChange}
            variant="select"
            ariaLabel={copy.uiLanguage}
          />
          <Link href="/login" className="rounded-full bg-white px-3 py-2 text-[11px] font-black text-slate-700 ring-1 ring-slate-100">
            {copy.login}
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[760px] px-3 pb-24">
        <section className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-100">
          {countrySelectionCompleted ? <div className="border-b border-slate-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black tracking-[0.18em] text-slate-400">{copy.progress(step + 1, TOTAL_STEPS)}</p>
              <button type="button" onClick={resetForm} className="text-[11px] font-black text-slate-400 underline underline-offset-4">{copy.reset}</button>
            </div>

            <ProgressBar current={step} />

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stepTitles.map((title, index) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => { if (index <= step) goToStep(index); }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                    index === step
                      ? "bg-[#ff3860] text-white"
                      : index < step
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                        : "bg-slate-50 text-slate-400 ring-1 ring-slate-100"
                  }`}
                >
                  {index < step ? "✓ " : ""}
                  {index === TOTAL_STEPS - 1 && !paidMarketplaceEnabled ? copy.termsTitle : title}
                </button>
              ))}
            </div>
          </div> : null}

          <div className="p-4">
            {renderStep()}

            {error ? (
              <div className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-black leading-5 text-rose-700 ring-1 ring-rose-100">{error}</div>
            ) : null}

            {countrySelectionCompleted ? <div className="mt-5 grid grid-cols-[96px_minmax(0,1fr)] gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={loading}
                className="h-11 rounded-full bg-white text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.back}
              </button>

              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={() => void goNext()}
                  disabled={loading || accountStepInvalid}
                  className="h-11 rounded-full bg-[#ff3860] text-sm font-black text-white shadow-[0_10px_24px_rgba(255,56,96,0.22)] transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  {copy.continue}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={loading}
                  className="h-11 rounded-full bg-[#ff3860] text-sm font-black text-white shadow-[0_10px_24px_rgba(255,56,96,0.22)] transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? copy.preparing : copy.finish}
                </button>
              )}
            </div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
