// File: app/signup/creator/SignupCreatorClient.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
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
const COUNTRY_DEFAULT = "日本";

const GENDER_OPTIONS = [
  { value: "", ja: "選択", en: "Select" },
  { value: "女性", ja: "女性", en: "Female" },
  { value: "男性", ja: "男性", en: "Male" },
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

const PREFECTURE_DELIMITER = "、";

function parseSelectedPrefectures(value: string) {
  return value
    .split(PREFECTURE_DELIMITER)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinSelectedPrefectures(items: string[]) {
  return Array.from(new Set(items))
    .filter((item) => PREFECTURE_OPTIONS.includes(item))
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
    helpJa: "Instagramのフィード投稿として紹介します。",
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
    labelJa: "動画素材のみ納品",
    labelEn: "Video asset only",
    helpJa: "広告やSNSで使える動画素材だけを納品します。",
    helpEn: "Deliver video assets only. You do not post on your own account.",
  },
  {
    value: "投稿なし・写真素材のみ納品",
    labelJa: "写真素材のみ納品",
    labelEn: "Photo asset only",
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
    helpJa: "上記以外のメニューです。",
    helpEn: "Use this for custom services.",
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

function getSocialConfig(platform: string, locale: Locale) {
  if (platform === "Instagram") {
    return {
      prefix: "instagram.com/",
      placeholder: locale === "ja" ? "yourname" : "yourname",
      guide: locale === "ja" ? "@なしで入力" : "No @ needed.",
    };
  }

  if (platform === "TikTok") {
    return {
      prefix: "tiktok.com/@",
      placeholder: locale === "ja" ? "yourname" : "yourname",
      guide: locale === "ja" ? "@なしで入力" : "No @ needed.",
    };
  }

  if (platform === "YouTube") {
    return {
      prefix: "youtube.com/@",
      placeholder: locale === "ja" ? "yourchannel" : "yourchannel",
      guide: locale === "ja" ? "ハンドル名を入力" : "Enter handle.",
    };
  }

  if (platform === "X") {
    return {
      prefix: "x.com/",
      placeholder: locale === "ja" ? "yourname" : "yourname",
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
    guide: locale === "ja" ? "SNS種別を選択してください" : "Select SNS type.",
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

            displayTitle: "基本情報",
            displayBody: "あとから変更できます。",
            displayName: "ユーザーネーム",
            displayNamePlaceholder: "例：Yuna Beauty",
            gender: "性別",
            birthDate: "生年月日",

            accountTitle: "ログイン",
            accountBody: "Google、またはメールで登録します。",
            oauthConnected: "Google連携済み",
            email: "メールアドレス",
            password: "パスワード（8文字以上）",
            signUpWithGoogle: "Googleで続ける",
            orText: "または",

            lineSetupTitle: "LINE通知を設定",
            lineSetupBody:
              "新しい注文・チャット・修正依頼・納品承認をLINEで受け取れます。",
            lineSetupBadge: "推奨",
            lineSetupHeadline:
              "注文を見逃さないために、LINE通知を設定しましょう",
            lineSetupLead:
              "ボタンを押すとLINEに移動します。許可後は自動でTrend Martに戻り、通知連携が完了します。",
            lineBenefitOrder: "新しい注文が届いたらすぐ通知",
            lineBenefitChat: "チャットや修正依頼も見逃しにくい",
            lineBenefitPrivate: "LINEの友だちや企業には表示されません",
            lineStepAdd: "1. 公式LINEを開く",
            lineStepSend: "2. コードを送信",
            lineStepDone: "3. 連携完了",
            lineCodeLabel: "連携コード",
            lineCodeHelp: "このコードをTrend Mart公式LINEのトークに送信してください。",
            lineOpenButton: "LINEで通知を受け取る",
            lineCopyCode: "コードをコピー",
            lineCopied: "コードをコピーしました",
            lineRefreshCode: "コードを再発行",
            lineCheckStatus: "連携を確認",
            lineChecking: "確認中...",
            lineCreateCode: "連携コードを発行する",
            lineCreatingCode: "発行中...",
            lineSkip: "あとで設定する",
            lineContinue: "次へ進む",
            lineLinkedTitle: "LINE通知の設定が完了しました",
            lineLinkedBody:
              "新しい注文や重要な連絡をLINEで受け取れるようになりました。",
            lineUnlinkedMessage:
              "まだ連携を確認できません。公式LINEにコードを送信したあと、もう一度確認してください。",
            lineOfficialMissing:
              "LINE公式アカウントURLが未設定です。NEXT_PUBLIC_LINE_OFFICIAL_URLを確認してください。",
            lineCodeFailed:
              "LINE連携コードの発行に失敗しました。少し時間を置いて再度お試しください。",

            categoryTitle: "ジャンル",
            categoryBody: "得意なジャンルを5つまで選んでください。",
            categoryCount: "選択中",

            areaTitle: "対応エリア",
            areaBody: "訪問・体験案件で対応できるエリアをすべて選んでください。",
            prefecture: "対応可能エリア",
            selectPrefecture: "複数選択できます",
            productPr: "商品配送PR",
            productPrYes: "商品を受け取ってPRできる",
            productPrNo: "商品配送PRは受け付けない",

            socialTitle: "SNS",
            socialBody: "企業が確認するSNSを1つ以上登録してください。",
            platform: "SNS種別",
            socialHandle: "ユーザーネーム",
            followerRange: "フォロワー数",
            audienceCountry: "主なフォロワー層",
            urlPreview: "URL",
            addSocial: "SNSを追加",
            remove: "削除",

            imagesTitle: "写真",
            imagesBody: "プロフィール画像1枚とポートフォリオ画像3枚以上が必要です。",
            avatar: "プロフィール画像",
            avatarHelp: "アイコンとして表示されます。",
            avatarChoose: "画像を選択",
            portfolio: "ポートフォリオ画像",
            portfolioHelp: "最低3枚。雰囲気が伝わる写真を選んでください。",
            portfolioChoose: "画像を追加",

            menuTitle: "メニュー",
            menuBody: "企業が購入できるメニューを1つ以上作成してください。",
            menuType: "SNS種別",
            price: "例）11,000",
            addMenu: "メニューを追加",

            termsTitle: "確認",
            termsLabel: "利用規約に同意する",
            privacyLabel: "プライバシーポリシーに同意する",
            termsLink: "利用規約",
            privacyLink: "プライバシーポリシー",

            continue: "次へ",
            back: "戻る",
            finish: "登録する",
            loading: "処理中...",
            selectPlease: "選択してください",
            login: "ログイン",
            reset: "最初から",

            displayNameRequired: "ユーザーネームを入力してください",
            genderRequired: "性別を選択してください",
            birthDateRequired: "生年月日を選択してください",
            ageRequired: "18歳以上の方のみ登録できます",
            emailRequired: "メールアドレスを入力してください",
            emailInvalid: "メールアドレスの形式が正しくありません",
            passwordRequired: "パスワードは8文字以上必要です",
            categoryRequired: "ジャンルを1つ以上選択してください",
            categoryLimit: "ジャンルは5つまで選択できます",
            areaRequired: "対応可能エリアを1つ以上選択してください",
            productPrRequired: "商品配送PRの可否を選択してください",
            socialRequired: "SNSを少なくとも1件、正しく入力してください",
            avatarRequired: "プロフィール画像を追加してください",
            portfolioRequired: "ポートフォリオ画像を3枚以上追加してください",
            menuRequired: "メニューを少なくとも1つ正しく入力してください",
            termsRequired:
              "利用規約とプライバシーポリシーへの同意が必要です",
            signupFailed: "登録に失敗しました",
            imageUploadFailed: "画像のアップロードに失敗しました",
            sessionMissing:
              "アカウント作成後のログイン状態を確認できませんでした。Supabase Authでメール確認が必須になっている可能性があります。",
          }
        : {
            step: "STEP",

            displayTitle: "Basic info",
            displayBody: "You can edit this later.",
            displayName: "Username",
            displayNamePlaceholder: "Example: Yuna Beauty",
            gender: "Gender",
            birthDate: "Date of birth",

            accountTitle: "Login",
            accountBody: "Continue with Google or email.",
            oauthConnected: "Google connected",
            email: "Email",
            password: "Password",
            signUpWithGoogle: "Continue with Google",
            orText: "or",

            lineSetupTitle: "Set up LINE notifications",
            lineSetupBody:
              "Get new orders, chat messages, revision requests, and completion updates on LINE.",
            lineSetupBadge: "Recommended",
            lineSetupHeadline:
              "Set up LINE notifications so you do not miss new orders",
            lineSetupLead:
              "Tap the button to open LINE. After allowing access, you will automatically return to Trendre.",
            lineBenefitOrder: "Get notified as soon as a new order arrives",
            lineBenefitChat: "Do not miss chats or revision requests",
            lineBenefitPrivate: "Your LINE friends and brands will not see it",
            lineStepAdd: "1. Open official LINE",
            lineStepSend: "2. Send the code",
            lineStepDone: "3. Connected",
            lineCodeLabel: "Link code",
            lineCodeHelp: "Send this code to the Trendre official LINE chat.",
            lineOpenButton: "Receive notifications on LINE",
            lineCopyCode: "Copy code",
            lineCopied: "Code copied",
            lineRefreshCode: "Issue new code",
            lineCheckStatus: "Check connection",
            lineChecking: "Checking...",
            lineCreateCode: "Issue link code",
            lineCreatingCode: "Issuing...",
            lineSkip: "Set up later",
            lineContinue: "Continue",
            lineLinkedTitle: "LINE notifications are ready",
            lineLinkedBody:
              "You can now receive new orders and important updates on LINE.",
            lineUnlinkedMessage:
              "Connection has not been confirmed yet. Send the code to the official LINE chat, then check again.",
            lineOfficialMissing:
              "The official LINE URL is not configured. Please check NEXT_PUBLIC_LINE_OFFICIAL_URL.",
            lineCodeFailed:
              "Could not issue a LINE link code. Please try again later.",

            categoryTitle: "Categories",
            categoryBody: "Select up to 5 categories.",
            categoryCount: "Selected",

            areaTitle: "Area",
            areaBody: "Select all areas where you can accept visit or experience jobs.",
            prefecture: "Available areas",
            selectPrefecture: "Multiple selections allowed",
            productPr: "Product shipping PR",
            productPrYes: "I can receive products",
            productPrNo: "I do not accept shipped product PR",

            socialTitle: "Socials",
            socialBody: "Add at least one social account.",
            platform: "SNS type",
            socialHandle: "Username",
            followerRange: "Follower range",
            audienceCountry: "Main audience country",
            urlPreview: "URL",
            addSocial: "Add social",
            remove: "Remove",

            imagesTitle: "Images",
            imagesBody: "Add one profile image and at least three portfolio images.",
            avatar: "Profile image",
            avatarHelp: "Displayed as your icon.",
            avatarChoose: "Choose image",
            portfolio: "Portfolio images",
            portfolioHelp: "At least 3 images are required.",
            portfolioChoose: "Add images",

            menuTitle: "Menus",
            menuBody: "Create at least one menu brands can order.",
            menuType: "SNS type",
            price: "Example: 11,000",
            addMenu: "Add menu",

            termsTitle: "Confirm",
            termsLabel: "I agree to the Terms",
            privacyLabel: "I agree to the Privacy Policy",
            termsLink: "Terms",
            privacyLink: "Privacy Policy",

            continue: "Next",
            back: "Back",
            finish: "Sign up",
            loading: "Processing...",
            selectPlease: "Please select",
            login: "Login",
            reset: "Reset",

            displayNameRequired: "Please enter your username",
            genderRequired: "Please select your gender",
            birthDateRequired: "Please select your date of birth",
            ageRequired: "You must be 18 or older to register",
            emailRequired: "Please enter your email address",
            emailInvalid: "Please enter a valid email address",
            passwordRequired: "Password must be at least 8 characters",
            categoryRequired: "Please select at least one category",
            categoryLimit: "You can select up to 5 categories",
            areaRequired: "Please select at least one available area",
            productPrRequired: "Please select whether you can receive products",
            socialRequired: "Please add at least one valid social account",
            avatarRequired: "Please add a profile image",
            portfolioRequired: "Please add at least 3 portfolio images",
            menuRequired: "Please add at least one valid menu",
            termsRequired: "You must agree to the Terms and Privacy Policy",
            signupFailed: "Sign up failed",
            imageUploadFailed: "Failed to upload images",
            sessionMissing:
              "Could not confirm your signed-in session after account creation. Email confirmation may be required in Supabase Auth settings.",
          },
    [appLocale]
  );

  const stepTitles = useMemo(
    () =>
      appLocale === "ja"
        ? ["基本", "ログイン", "ジャンル", "エリア", "SNS", "写真", "メニュー"]
        : ["Basic", "Login", "Categories", "Area", "Socials", "Images", "Menus"],
    [appLocale]
  );

  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [country] = useState(COUNTRY_DEFAULT);
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

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const [oauthSessionEmail, setOauthSessionEmail] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lineSetupVisible, setLineSetupVisible] = useState(false);
  const [lineStatusLoading, setLineStatusLoading] = useState(false);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineDisplayName, setLineDisplayName] = useState<string | null>(null);
  const [lineLinkCode, setLineLinkCode] = useState<string | null>(null);
  const [lineLinkExpiresAt, setLineLinkExpiresAt] = useState<string | null>(
    null
  );
  const [lineLinkLoading, setLineLinkLoading] = useState(false);
  const [lineLinkMessage, setLineLinkMessage] = useState<string | null>(null);

  const lineOfficialUrl =
    process.env.NEXT_PUBLIC_LINE_OFFICIAL_URL?.trim() ?? "";

  const hasOAuthReturn = searchParams.get("oauth") === "1";
  const shouldResetDraft = searchParams.get("reset") === "1";

  const activeGenre = useMemo(
    () =>
      GENRE_GROUPS.find((group) => group.key === activeGenreGroup) ??
      GENRE_GROUPS[0],
    [activeGenreGroup]
  );

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
    setDisplayName("");
    setUsername("");
    setGender("");
    setBirthDate("");
    setEmail("");
    setPassword("");
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

      setStep(
        typeof draft.step === "number"
          ? Math.max(0, Math.min(draft.step, TOTAL_STEPS - 1))
          : 0
      );

      setDisplayName(safeString(draft.displayName));
      setUsername(safeString(draft.username));
      setGender(safeString(draft.gender));
      setBirthDate(safeString(draft.birthDate));
      setEmail(safeString(draft.email));
      setPrefecture(safeString(draft.prefecture));
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

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const draft: DraftState = {
      step,
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
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (existingCreator) {
        const { data: payoutProfile } = await supabase
          .from("creator_payout_profiles")
          .select("id, status")
          .eq("creator_id", existingCreator.id)
          .maybeSingle();

        if (
          payoutProfile?.status === "submitted" ||
          payoutProfile?.status === "verified"
        ) {
          router.replace("/creator/dashboard");
          return;
        }

        router.replace("/creator/payouts?from=signup&required=1");
        return;
      }

      if (hasOAuthReturn && step < 2) {
        goToStep(2);
      }
    };

    void hydrateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOAuthReturn, router, supabase]);

  const ensureAvailableUsername = async () => {
    const current = username.trim().toLowerCase();

    if (current) {
      const { data: duplicateProfile, error: duplicateError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", current)
        .maybeSingle();

      if (duplicateError) {
        throw new Error(copy.signupFailed);
      }

      if (!duplicateProfile) {
        return current;
      }
    }

    for (let i = 0; i < 8; i += 1) {
      const candidate = makeInternalUsername(displayName);

      const { data: duplicateProfile, error: duplicateError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", candidate)
        .maybeSingle();

      if (duplicateError) {
        throw new Error(copy.signupFailed);
      }

      if (!duplicateProfile) {
        setUsername(candidate);
        return candidate;
      }
    }

    throw new Error(copy.signupFailed);
  };

  const toggleCategory = (value: string) => {
    setError(null);

    setSelectedCategories((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }

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
    const nextValue = key === "price" ? formatPriceInput(value) : value;

    setMenus((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: nextValue } : item))
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
      if (!prefecture.trim()) {
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
        const priceNumber = parsePriceNumber(menu.price);
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

    if (step <= 0) return;

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
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });

    if (oauthError) {
      setError(oauthError.message);
    }
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
      if (oauthSessionEmail) {
        return currentSession;
      }

      await supabase.auth.signOut();
    }

    if (!email.trim()) throw new Error(copy.emailRequired);

    if (!password.trim() || password.trim().length < 8) {
      throw new Error(copy.passwordRequired);
    }

    const internalUsername = username.trim() || (await ensureAvailableUsername());

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: getOAuthRedirectUrl(),
        data: {
          full_name: displayName.trim(),
          display_name: displayName.trim(),
          creator_username: internalUsername,
          creator_gender: gender,
          creator_birth_date: birthDate,
          creator_prefecture: prefecture,
          creator_can_receive_products: canReceiveProductsChoice === "yes",
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


  const getCurrentAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  };

  const loadLineStatus = async (options: { silent?: boolean } = {}) => {
    const token = await getCurrentAccessToken();

    if (!token) {
      if (!options.silent) {
        setLineLinkMessage(copy.sessionMissing);
      }
      return false;
    }

    if (!options.silent) {
      setLineStatusLoading(true);
      setLineLinkMessage(null);
    }

    try {
      const res = await fetch("/api/line/link-code", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? copy.lineUnlinkedMessage);
      }

      const linked = Boolean(json?.linked);
      setLineLinked(linked);
      setLineDisplayName(
        typeof json?.link?.line_display_name === "string"
          ? json.link.line_display_name
          : null
      );

      if (!linked && !options.silent) {
        setLineLinkMessage(copy.lineUnlinkedMessage);
      }

      return linked;
    } catch (e) {
      if (!options.silent) {
        setLineLinkMessage(
          e instanceof Error ? e.message : copy.lineUnlinkedMessage
        );
      }

      return false;
    } finally {
      if (!options.silent) {
        setLineStatusLoading(false);
      }
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? copy.lineCodeFailed);
      }

      setLineLinkCode(typeof json?.code === "string" ? json.code : null);
      setLineLinkExpiresAt(
        typeof json?.expires_at === "string" ? json.expires_at : null
      );
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
          return_to: "/creator/payouts?from=signup&line=linked",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || typeof json?.url !== "string") {
        throw new Error(json?.error ?? copy.lineCodeFailed);
      }

      window.location.href = json.url;
    } catch (e) {
      setLineLinkLoading(false);
      setLineLinkMessage(e instanceof Error ? e.message : copy.lineCodeFailed);
    }
  };

  const finishSignupAfterLine = () => {
    router.replace(
      lineLinked
        ? "/creator/payouts?from=signup&line=linked"
        : "/creator/payouts?from=signup&line=skipped"
    );
  };

  useEffect(() => {
    if (!lineSetupVisible || lineLinked) return;

    const timer = window.setInterval(() => {
      void loadLineStatus({ silent: true });
    }, 3000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineSetupVisible, lineLinked]);


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
          price: parsePriceNumber(menu.price),
          description: null,
        }))
        .filter((menu) => menu.menu_type && menu.price > 0);

      if (validMenus.length === 0) throw new Error(copy.menuRequired);

      const internalUsername =
        username.trim().toLowerCase() || (await ensureAvailableUsername());

      const session = await ensureAuthenticatedSession();
      const ownerKey = session.user.id || internalUsername;

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

          username: internalUsername,
          display_name: displayName.trim(),
          full_name: displayName.trim(),
          email: email.trim(),

          avatar_url: avatarUrl,
          portfolio_assets: portfolioAssets,

          gender,
          birth_date: birthDate,

          country,
          prefecture: prefecture.trim(),
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
      setLineSetupVisible(true);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : copy.signupFailed);
    } finally {
      setLoading(false);
    }
  };



  const renderLineSetup = () => {
    const tips = [
      {
        title:
          appLocale === "ja"
            ? "注文通知をすぐ受け取る"
            : "Receive order alerts immediately",
        body:
          appLocale === "ja"
            ? "企業から注文や依頼が届いたときにLINEで確認できます。"
            : "Get notified on LINE when a brand sends an order or request.",
      },
      {
        title:
          appLocale === "ja"
            ? "チャットを見逃さない"
            : "Do not miss chats",
        body:
          appLocale === "ja"
            ? "案件中の確認や修正依頼にも気づきやすくなります。"
            : "Stay on top of confirmations and revision requests during jobs.",
      },
      {
        title:
          appLocale === "ja"
            ? "プロフィールは後から編集できます"
            : "You can edit your profile later",
        body:
          appLocale === "ja"
            ? "メニュー数を増やすと、企業に選ばれる機会も増えます。"
            : "Adding more menus can increase your chances of receiving orders.",
      },
    ];

    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7f8_0,#f6f8fb_36%,#f6f8fb_100%)] text-slate-950">
        <header className="mx-auto flex w-full max-w-[920px] items-center justify-between px-4 py-3">
          <Link href="/for-creators" className="inline-flex items-center">
            <img
              src="/brand/trend-mart-logo.png"
              alt="Trendre"
              className="h-7 w-auto object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={() => setLocale(appLocale === "ja" ? "en" : "ja")}
            className="rounded-full bg-white/90 px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm ring-1 ring-slate-100"
          >
            {appLocale === "ja" ? "EN" : "日本語"}
          </button>
        </header>

        <div className="mx-auto w-full max-w-[920px] px-3 pb-24 pt-2">
          <section className="overflow-hidden rounded-[32px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
            <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_360px]">
              <div className="relative overflow-hidden px-5 pb-6 pt-7 sm:px-8 sm:py-9">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#ff3860]/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#06c755]/10 blur-3xl" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06c755] text-[10px] font-black text-white">
                      ✓
                    </span>
                    {appLocale === "ja"
                      ? "登録内容を保存しました"
                      : "Your registration has been saved"}
                  </div>

                  <h1 className="mt-4 text-[28px] font-black leading-tight tracking-[-0.06em] text-slate-950 sm:text-[38px]">
                    {appLocale === "ja"
                      ? "あと一歩で、注文を受け取れる状態になります"
                      : "One more step to start receiving orders"}
                  </h1>

                  <p className="mt-3 max-w-[620px] text-sm font-bold leading-7 text-slate-500">
                    {appLocale === "ja"
                      ? "注文を受けるには、LINEで通知を受け取る設定が必要です。新規注文、チャット、修正依頼、納品承認などの大切な連絡を見逃さないように、先にLINE連携を完了してください。"
                      : "To receive orders, you need to enable LINE notifications. Connect LINE now so you do not miss new orders, chats, revision requests, or approvals."}
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
                          ? appLocale === "ja"
                            ? "LINEを開いています..."
                            : "Opening LINE..."
                          : copy.lineOpenButton}
                    </button>

                    <button
                      type="button"
                      onClick={finishSignupAfterLine}
                      disabled={lineLinkLoading}
                      className="h-12 rounded-full bg-white text-sm font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {lineLinked
                        ? copy.lineContinue
                        : appLocale === "ja"
                          ? "あとで設定する"
                          : "Set up later"}
                    </button>
                  </div>

                  <p className="mt-3 text-[11px] font-bold leading-5 text-slate-400 sm:max-w-[420px]">
                    {appLocale === "ja"
                      ? "LINEの友だちや企業に、通知設定が見えることはありません。"
                      : "Your LINE notification setting is not visible to your friends or brands."}
                  </p>

                  {lineLinked ? (
                    <div className="mt-4 max-w-[420px] rounded-[18px] bg-emerald-50 px-3 py-3 text-xs font-black leading-5 text-emerald-700 ring-1 ring-emerald-100">
                      {copy.lineLinkedTitle}
                      {lineDisplayName ? `：${lineDisplayName}` : ""}
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#06c755] text-sm font-black text-white shadow-[0_12px_26px_rgba(6,199,85,0.24)]">
                      LINE
                    </div>
                    <div>
                      <p className="text-base font-black tracking-[-0.04em] text-slate-950">
                        {appLocale === "ja"
                          ? "通知設定を完了しましょう"
                          : "Complete notification setup"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold leading-5 text-slate-500">
                        {appLocale === "ja"
                          ? "案件対応に必要な連絡を受け取れます"
                          : "Receive the updates needed for orders"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {tips.map((item, index) => (
                      <div
                        key={item.title}
                        className="flex gap-3 rounded-[20px] bg-slate-50 p-3 ring-1 ring-slate-100"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-black text-[#ff3860] shadow-sm ring-1 ring-slate-100">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-xs font-black leading-5 text-slate-950">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold leading-5 text-slate-500">
                            {item.body}
                          </p>
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
    if (step === 0) {
      return (
        <StepShell title={copy.displayTitle} body={copy.displayBody}>
          <div className="grid gap-3">
            <Field label={copy.displayName}>
              <TextInput
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={copy.displayNamePlaceholder}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.gender}>
                <SelectInput
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  {GENDER_OPTIONS.map((item) => (
                    <option key={item.value || "empty"} value={item.value}>
                      {appLocale === "ja" ? item.ja : item.en}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label={copy.birthDate}>
                <TextInput
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </Field>
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
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-black text-slate-950 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-sm font-black text-[#ff3860] ring-1 ring-slate-100">
              G
            </span>
            {copy.signUpWithGoogle}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-black text-slate-300">
              {copy.orText}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {oauthSessionEmail ? (
            <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
              {copy.oauthConnected}: {oauthSessionEmail}
            </div>
          ) : null}

          <div className="grid gap-3">
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
                    className={`shrink-0 rounded-full px-3 py-2 text-xs font-black transition ${
                      active
                        ? "bg-[#ff3860] text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    {appLocale === "ja" ? group.ja : group.en}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
            <span className="text-xs font-black text-slate-500">
              {copy.categoryCount}
            </span>
            <span className="text-xs font-black text-slate-950">
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
                  className={`min-h-[38px] rounded-xl px-2.5 py-2 text-left text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${
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
                  className="rounded-full bg-rose-50 px-2.5 py-1.5 text-[11px] font-black text-[#ff3860] ring-1 ring-rose-100"
                >
                  {item} ×
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
        <StepShell title={copy.areaTitle} body={copy.areaBody}>
          <div className="grid gap-3">
            <Field label={copy.prefecture} help={copy.selectPrefecture}>
              <div className="grid max-h-[280px] grid-cols-2 gap-1.5 overflow-y-auto rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100 sm:grid-cols-3">
                {PREFECTURE_OPTIONS.map((item) => {
                  const selected = selectedPrefectures.includes(item);

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => togglePrefecture(item)}
                      className={`min-h-[38px] rounded-xl px-2.5 py-2 text-left text-xs font-black transition ${
                        selected
                          ? "bg-[#ff3860] text-white shadow-[0_8px_18px_rgba(255,56,96,0.18)]"
                          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {selected ? "✓ " : ""}
                      {item}
                    </button>
                  );
                })}
              </div>

              {selectedPrefectures.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedPrefectures.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => togglePrefecture(item)}
                      className="rounded-full bg-rose-50 px-2.5 py-1.5 text-[11px] font-black text-[#ff3860] ring-1 ring-rose-100"
                    >
                      {item} ×
                    </button>
                  ))}
                </div>
              ) : null}
            </Field>

            <Field label={copy.productPr}>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setCanReceiveProductsChoice("yes")}
                  className={`rounded-2xl px-3 py-3 text-left text-sm font-black ring-1 transition ${
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
                  className={`rounded-2xl px-3 py-3 text-left text-sm font-black ring-1 transition ${
                    canReceiveProductsChoice === "no"
                      ? "bg-rose-50 text-[#ff3860] ring-rose-200"
                      : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
                  }`}
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
              const config = getSocialConfig(social.platform, appLocale);
              const previewUrl = buildSocialPreview(
                social.platform,
                social.username_or_url
              );

              return (
                <div
                  key={index}
                  className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-950">
                      SNS {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeSocial(index)}
                      className="text-xs font-black text-[#ff3860]"
                    >
                      {copy.remove}
                    </button>
                  </div>

                  <div className="grid gap-2.5">
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
                      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-[#ff5f67] focus-within:ring-4 focus-within:ring-rose-100">
                        {config.prefix ? (
                          <div className="flex max-w-[42%] items-center bg-slate-50 px-2 text-[11px] font-black text-slate-400">
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
                          className="h-11 min-w-0 flex-1 px-3 text-[15px] font-bold outline-none"
                          placeholder={config.placeholder}
                        />
                      </div>

                      {previewUrl ? (
                        <p className="mt-1.5 truncate rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-500 ring-1 ring-slate-100">
                          {copy.urlPreview}: {previewUrl}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] font-bold text-slate-400">
                          {config.guide}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
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
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addSocial}
            className="mt-3 h-10 w-full rounded-full bg-white text-xs font-black text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
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
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={copy.avatar}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] font-black text-slate-300">
                      Icon
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950">
                    {copy.avatar}
                  </p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400">
                    {copy.avatarHelp}
                  </p>
                  <div className="mt-2">
                    <FilePickerButton onChange={handleAvatarSelect}>
                      {copy.avatarChoose}
                    </FilePickerButton>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {copy.portfolio}
                  </p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400">
                    {copy.portfolioHelp}
                  </p>
                </div>
                <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                  {portfolioPreviews.length}/3
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {Array.from({
                  length: Math.max(3, portfolioPreviews.length),
                }).map((_, index) => {
                  const preview = portfolioPreviews[index];

                  if (preview) {
                    return (
                      <div
                        key={preview}
                        className="relative aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-slate-200"
                      >
                        <img
                          src={preview}
                          alt={`${copy.portfolio} ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePortfolioFile(index)}
                          className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-black text-white"
                        >
                          ×
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-${index}`}
                      className="flex aspect-square items-center justify-center rounded-xl bg-white text-[11px] font-black text-slate-300 ring-1 ring-dashed ring-slate-200"
                    >
                      {index + 1}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                <FilePickerButton multiple onChange={handlePortfolioSelect}>
                  {copy.portfolioChoose}
                </FilePickerButton>
              </div>
            </div>
          </div>
        </StepShell>
      );
    }

    return (
      <StepShell title={copy.menuTitle} body={copy.menuBody}>
        <div className="space-y-3">
          {menus.map((menu, index) => (
            <div
              key={index}
              className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-black text-slate-950">
                  Menu {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeMenu(index)}
                  className="text-xs font-black text-[#ff3860]"
                >
                  {copy.remove}
                </button>
              </div>

              <div className="grid gap-2.5">
                <Field label={copy.menuType}>
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
                </Field>

                {menu.menu_type ? (
                  <p className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold leading-5 text-slate-500 ring-1 ring-slate-100">
                    {getMenuHelp(menu.menu_type, appLocale)}
                  </p>
                ) : null}

                <Field label={appLocale === "ja" ? "金額（円）" : "Price (JPY)"}>
                  <TextInput
                    type="text"
                    inputMode="numeric"
                    value={menu.price}
                    onChange={(e) => updateMenu(index, "price", e.target.value)}
                    placeholder={copy.price}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addMenu}
          className="mt-3 h-10 w-full rounded-full bg-white text-xs font-black text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          + {copy.addMenu}
        </button>

        <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <p className="text-sm font-black text-slate-950">{copy.termsTitle}</p>

          <label className="flex items-center gap-2 text-xs font-bold leading-5 text-slate-700">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="h-4 w-4"
            />
            <span>
              {copy.termsLabel}{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-[#ff3860] underline underline-offset-4"
              >
                {copy.termsLink}
              </Link>
            </span>
          </label>

          <label className="flex items-center gap-2 text-xs font-bold leading-5 text-slate-700">
            <input
              type="checkbox"
              checked={agreedToPrivacy}
              onChange={(e) => setAgreedToPrivacy(e.target.checked)}
              className="h-4 w-4"
            />
            <span>
              {copy.privacyLabel}{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-[#ff3860] underline underline-offset-4"
              >
                {copy.privacyLink}
              </Link>
            </span>
          </label>
        </div>
      </StepShell>
    );
  };

  if (lineSetupVisible) {
    return renderLineSetup();
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      {loading && step === TOTAL_STEPS - 1 ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[380px] rounded-[30px] bg-white p-5 text-center shadow-[0_24px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-100">
            <img
              src="/brand/trend-mart-logo.png"
              alt="Trendre"
              className="mx-auto h-8 w-auto object-contain"
            />

            <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#ff3860] border-t-transparent" />
            </div>

            <p className="mt-4 text-lg font-black tracking-[-0.04em] text-slate-950">
              {appLocale === "ja"
                ? "プロフィールを準備しています"
                : "Preparing your profile"}
            </p>

            <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
              {appLocale === "ja"
                ? "もう少しで完了です。入力内容は後から変更できます。メニュー数を増やすと、企業に選ばれる機会も広がります。"
                : "Almost done. You can edit your details later. Adding more menus can increase your chances of receiving orders."}
            </p>
          </div>
        </div>
      ) : null}

      <header className="mx-auto flex w-full max-w-[760px] items-center justify-between px-4 py-3">
        <Link href="/for-creators" className="inline-flex items-center">
          <img
            src="/brand/trend-mart-logo.png"
            alt="Trendre"
            className="h-7 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocale(appLocale === "ja" ? "en" : "ja")}
            className="rounded-full bg-white px-3 py-2 text-[11px] font-black text-slate-700 ring-1 ring-slate-100"
          >
            {appLocale === "ja" ? "EN" : "日本語"}
          </button>

          <Link
            href="/login"
            className="rounded-full bg-white px-3 py-2 text-[11px] font-black text-slate-700 ring-1 ring-slate-100"
          >
            {copy.login}
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[760px] px-3 pb-24">
        <section className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black tracking-[0.18em] text-slate-400">
                {copy.step} {step + 1}/{TOTAL_STEPS}
              </p>

              <button
                type="button"
                onClick={resetForm}
                className="text-[11px] font-black text-slate-400 underline underline-offset-4"
              >
                {copy.reset}
              </button>
            </div>

            <ProgressBar current={step} />

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stepTitles.map((title, index) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => {
                    if (index <= step) goToStep(index);
                  }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                    index === step
                      ? "bg-[#ff3860] text-white"
                      : index < step
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                        : "bg-slate-50 text-slate-400 ring-1 ring-slate-100"
                  }`}
                >
                  {index < step ? "✓ " : ""}
                  {title}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {renderStep()}

            {error ? (
              <div className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-black leading-5 text-rose-700 ring-1 ring-rose-100">
                {error}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-[96px_minmax(0,1fr)] gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || loading}
                className="h-11 rounded-full bg-white text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.back}
              </button>

              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={() => void goNext()}
                  disabled={loading}
                  className="h-11 rounded-full bg-[#ff3860] text-sm font-black text-white shadow-[0_10px_24px_rgba(255,56,96,0.22)] transition disabled:cursor-not-allowed disabled:opacity-60"
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
                  {loading
                    ? appLocale === "ja"
                      ? "準備しています..."
                      : "Preparing..."
                    : copy.finish}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}