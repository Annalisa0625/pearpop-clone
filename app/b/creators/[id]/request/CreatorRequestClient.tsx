// File: app/b/creators/[id]/request/CreatorRequestClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

const BILLING_PATH = "/b/billing";

type ProjectType = "visit_experience" | "product_delivery" | "provided_assets";
type ImplementationTiming =
  | "within_3_days"
  | "within_1_week"
  | "no_preference";

type OrderStep =
  | "project_type"
  | "product_name"
  | "product_url"
  | "deadline"
  | "note"
  | "confirm";

type Creator = {
  id: string;
  user_id: string;
  display_name: string;
};

type CreatorMenu = {
  id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  platform: string | null;
  sns: string | null;
  menu_type: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  deliverables: string | null;
  delivery_days: number | null;
  account_url: string | null;
  reference_price_text: string | null;
  allow_secondary_use: boolean | null;
  notes: string | null;
  is_active: boolean | null;
  sort_order: number;
};

type SocialAccount = {
  id: string;
  creator_id: string;
  platform: string | null;
  audience_country: string | null;
};

type FormState = {
  project_type: ProjectType | "";
  product_name: string;
  product_url: string;
  deadline: ImplementationTiming | "";
  note: string;
  pr_account: string;
  pr_hashtags: string[];
  creator_menu_id: string;
};

type ReferenceFileType = "image" | "pdf";

type ReferenceAssetDraft = {
  storage_path: string;
  file_name: string;
  file_type: ReferenceFileType;
  mime_type: string;
  size_bytes: number;
  sort_order: number;
  preview_url: string | null;
};

type GateState = {
  isLoggedIn: boolean;
  isCompany: boolean;
  isSuspended: boolean;
  companyProfileCompleted: boolean;
  companyAccessStatus: string | null;
  companySubscriptionStatus: string | null;
  companyPlanCode: "free" | "standard" | "global_pro" | null;
  monthlyRequestLimit: number | null;
  monthlyRequestUsed: number;
  canSendRequests: boolean;
  needsBilling: boolean;
};
type PayoutReadyCreatorRow = {
  creator_id: string;
};
const MAX_HASHTAGS = 8;
const MIN_VISIBLE_HASHTAG_INPUTS = 3;

const ORDER_REFERENCE_ASSETS_BUCKET = "order-reference-assets";
const MAX_REFERENCE_ASSETS = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

const SESSION_TIMEOUT_MS = 8000;
const CHECKOUT_TIMEOUT_MS = 45000;
const UPLOAD_TIMEOUT_MS = 45000;

const ALLOWED_REFERENCE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function normalizePlanCode(
  value: string | null | undefined
): "free" | "standard" | "global_pro" {
  if (value === "standard" || value === "global_pro") return value;
  return "free";
}

function isPaidPlan(value: string | null | undefined) {
  const plan = normalizePlanCode(value);
  return plan === "standard" || plan === "global_pro";
}

function getBuyerFeeRateBps(planCode: GateState["companyPlanCode"]) {
  return planCode === "global_pro" ? 500 : 1000;
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))
  );
}

function getCountryLabel(
  country: string | null | undefined,
  locale: "ja" | "en"
) {
  const raw = (country ?? "").trim();
  if (!raw) return locale === "ja" ? "未設定" : "Not set";

  const normalized = raw.toLowerCase();

  const jaMap: Record<string, string> = {
    japan: "日本",
    日本: "日本",
    korea: "韓国",
    韓国: "韓国",
    taiwan: "台湾",
    台湾: "台湾",
    united_states: "アメリカ",
    アメリカ: "アメリカ",
    other: "その他",
    その他: "その他",
  };

  const enMap: Record<string, string> = {
    japan: "Japan",
    日本: "Japan",
    korea: "Korea",
    韓国: "Korea",
    taiwan: "Taiwan",
    台湾: "Taiwan",
    united_states: "United States",
    アメリカ: "United States",
    other: "Other",
    その他: "Other",
  };

  return locale === "ja"
    ? jaMap[raw] ?? jaMap[normalized] ?? raw
    : enMap[raw] ?? enMap[normalized] ?? raw;
}

function formatPrice(
  value: number | null,
  currency: string | null | undefined,
  legacyReferenceText: string | null,
  locale: "ja" | "en"
) {
  const safeCurrency = currency || "JPY";

  if (value != null) {
    try {
      return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
        style: "currency",
        currency: safeCurrency,
        maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
      }).format(value);
    } catch {
      if (safeCurrency === "USD") return `$${value.toLocaleString()}`;
      return `¥${value.toLocaleString()}`;
    }
  }

  if (legacyReferenceText?.trim()) return legacyReferenceText.trim();

  return locale === "ja" ? "未設定" : "Not set";
}

function formatPlainPrice(
  value: number,
  currency: string | null | undefined,
  locale: "ja" | "en"
) {
  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    if (safeCurrency === "USD") return `$${value.toLocaleString()}`;
    return `¥${value.toLocaleString()}`;
  }
}

function getPlatformLabel(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  const normalized = raw.toLowerCase();

  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("tiktok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized === "x" || normalized.includes("twitter")) return "X";
  if (normalized.includes("ugc")) return "UGC";

  return raw || "SNS";
}

function menuTypeLabel(
  value: string | null,
  locale: "ja" | "en",
  fallback: string
) {
  const labels: Record<string, { ja: string; en: string }> = {
    post: { ja: "投稿", en: "Post" },
    short_video: { ja: "ショート動画", en: "Short video" },
    story: { ja: "ストーリー", en: "Story" },
    video: { ja: "動画", en: "Video" },
    ugc: { ja: "UGC", en: "UGC" },
    package: { ja: "セット", en: "Package" },
    other: { ja: "その他", en: "Other" },
  };

  return labels[value || ""]?.[locale] || fallback;
}

function isUgcMenu(menu: CreatorMenu | null) {
  if (!menu) return false;

  const text = [
    menu.menu_type,
    menu.category,
    menu.platform,
    menu.sns,
    menu.title,
    menu.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("ugc") ||
    text.includes("素材") ||
    text.includes("動画素材") ||
    text.includes("画像素材")
  );
}

function normalizePrAccountInput(value: string) {
  return value.replace(/^[@＠]+/g, "").replace(/\s+/g, "").trim();
}

function normalizeHashtagInput(value: string) {
  return value.replace(/^[#＃]+/g, "").replace(/\s+/g, "").trim();
}

function getCleanHashtags(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeHashtagInput(value);
    if (!normalized) continue;

    const key = normalized.toLowerCase();

    if (key === "pr" || key === "ad" || key === "sponsored") continue;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);

    if (result.length >= MAX_HASHTAGS) break;
  }

  return result;
}

function normalizeHashtagsForForm(values: string[]) {
  const cleaned = getCleanHashtags(values);
  const missing = Math.max(MIN_VISIBLE_HASHTAG_INPUTS - cleaned.length, 0);

  return [...cleaned, ...Array(missing).fill("")];
}

function buildPrCopyText(prAccount: string, hashtags: string[]) {
  const account = normalizePrAccountInput(prAccount);
  const cleanHashtags = getCleanHashtags(hashtags);

  const lines: string[] = [];

  if (account) {
    lines.push(`PR@${account}`);
  }

  if (cleanHashtags.length > 0) {
    lines.push(cleanHashtags.map((tag) => `#${tag}`).join(" "));
  }

  return lines.join("\n");
}

function getReferenceFileType(file: File): ReferenceFileType | null {
  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  ) {
    return "image";
  }

  if (file.type === "application/pdf") {
    return "pdf";
  }

  return null;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";

  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  return `${Math.ceil(bytes / 1024)}KB`;
}

function getFileExtension(file: File, fileType: ReferenceFileType) {
  const raw = file.name.split(".").pop()?.toLowerCase();

  if (raw && /^[a-z0-9]+$/.test(raw)) {
    return raw;
  }

  return fileType === "pdf" ? "pdf" : "jpg";
}

function buildReferenceStoragePath(userId: string, file: File) {
  const fileType = getReferenceFileType(file);
  const extension = fileType ? getFileExtension(file, fileType) : "bin";
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `order-drafts/${userId}/${Date.now()}-${random}.${extension}`;
}

function PlatformIcon({ platform }: { platform: string | null | undefined }) {
  const label = getPlatformLabel(platform);
  const normalized = label.toLowerCase();

  if (normalized === "instagram") {
    return (
      <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-slate-100">
        <img
          src="/brand/social/instagram.png"
          alt="Instagram"
          className="h-5 w-5 object-contain"
        />
      </span>
    );
  }

  if (normalized === "tiktok") {
    return (
      <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-slate-100">
        <img
          src="/brand/social/tiktok.png"
          alt="TikTok"
          className="h-5 w-5 object-contain"
        />
      </span>
    );
  }

  if (normalized === "youtube") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm">
        ▶
      </span>
    );
  }

  if (normalized === "x") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-[11px] font-black text-white shadow-sm">
        X
      </span>
    );
  }

  if (normalized === "ugc") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-black text-emerald-700 shadow-sm ring-1 ring-emerald-100">
        UGC
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500">
      SNS
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string | null | undefined }) {
  const label = getPlatformLabel(platform);

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-800 shadow-sm">
      <PlatformIcon platform={platform} />
      {label}
    </span>
  );
}

function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: "gray" | "blue" | "red" | "green";
}) {
  const styles = {
    gray: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-rose-50 text-[#ff5f67]",
    green: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span
        className={`text-right text-sm ${
          bold ? "font-black text-slate-950" : "font-black text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m4.5 10.4 3.4 3.4 7.6-8.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 10h10.5M10.5 5.5 15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ModalInput({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100"
      />
    </label>
  );
}

function AccountInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <div className="mt-3 flex items-center rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-[#ff5f67] focus-within:ring-4 focus-within:ring-rose-100">
        <span className="shrink-0 text-base font-black text-slate-400">@</span>
        <input
          value={value}
          onChange={(event) =>
            onChange(normalizePrAccountInput(event.target.value))
          }
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-1 py-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300"
        />
      </div>
    </label>
  );
}

export default function CreatorRequestClient() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const creatorId = String(params.id ?? "");
  const initialMenuId = searchParams.get("menuId") ?? "";
  const startParam = searchParams.get("start") ?? "";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const orderSteps: OrderStep[] = [
    "project_type",
    "product_name",
    "product_url",
    "deadline",
    "note",
    "confirm",
  ];

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            creatorNotFound:
              "インフルエンサーが見つかりません。現在注文受付できない状態の可能性があります。",
            companyOnlyTitle: "企業アカウントのみ利用できます",
            companyOnlyBody: "この注文フォームは企業アカウント専用です。",
            unavailableTitle: "現在この機能は利用できません",
            unavailableBody:
              "アカウント状態により、現在は注文をご利用いただけません。",
            profileRequiredTitle: "企業プロフィールの完了が必要です",
            profileRequiredBody:
              "注文の前に、企業プロフィールを完了してください。",
            profileRequiredCta: "企業プロフィールを入力する",
            billingTitle: "プランの確認が必要です",
            billingBody:
              "現在のプラン状態では注文を開始できません。料金プランを確認してください。",
            billingCta: "料金プランを見る",
            backToCreator: "詳細へ戻る",
            mainAudience: "主な視聴者",
            notSet: "未設定",
            skipped: "未入力",
            noPreference: "希望なし",
            pageTitle: "注文内容を入力",
            pageSubtitle:
              "必要な内容だけ入力してください。インフルエンサーが承認した場合のみ決済が確定します。",
            influencer: "インフルエンサー",
            selectedMenu: "選択中のメニュー",
            projectType: "案件タイプ",
            tapToContinue: "選択すると次へ進みます",
            visitExperience: "来店・体験",
            visitExperienceBody: "店舗やサービスを体験して投稿",
            productDelivery: "商品提供",
            productDeliveryBody: "商品を受け取って使用・撮影・投稿",
            providedAssets: "素材提供",
            providedAssetsBody: "写真・動画など提供素材を使って投稿",
            projectTypeRequired: "案件タイプを選択してください。",
            productDeliveryNotice:
              "商品配送が必要な場合は、注文後のチャットで配送先や発送方法を確認してください。",
            postUrlUsageNote:
              "このメニューの納品物は投稿URLです。広告素材としての再利用は含まれません。",
            ugcUsageNote:
              "このメニューはUGC素材制作です。納品された画像・動画素材は広告やLPなどで利用できます。",
            productName: "商品名・案件名",
            productNameStepTitle: "商品名・案件名を入力",
            productNameStepBody:
              "あとでチャットでも相談できます。未入力の場合はメニュー名で進みます。",
            productNamePlaceholder: "例：新作美容液PR / 新店舗オープン告知",
            referenceAssets: "参考資料",
            referenceAssetsStepBody:
              "商品画像、店舗写真、サービス資料、投稿イメージ資料などを添付できます。任意です。",
            referenceAssetsHelp: "JPG / PNG / WebP / PDF、最大3ファイル",
            referenceAssetsButton: "ファイルを追加",
            referenceAssetsLimit: "参考資料は最大3ファイルまでです。",
            referenceAssetsTypeError:
              "対応形式はJPG、PNG、WebP、PDFのみです。",
            referenceAssetsImageSizeError: "画像は1ファイル5MBまでです。",
            referenceAssetsPdfSizeError: "PDFは1ファイル10MBまでです。",
            referenceAssetsUploadError:
              "参考資料のアップロードに失敗しました。",
            referenceAssetsUploadTimeout:
              "参考資料のアップロードに時間がかかっています。通信環境を確認して再度お試しください。",
            referenceAssetsUploading: "アップロード中...",
            referenceAssetsEmpty: "添付なし",
            remove: "削除",
            productUrl: "商品URL・サービスURL",
            productUrlStepTitle: "URLがあれば入力",
            productUrlStepBody:
              "商品ページ、店舗ページ、参考URLなどがあれば入れてください。",
            productUrlPlaceholder: "https://...",
            deadline: "実施タイミング",
            deadlineStepTitle: "実施タイミングを選択",
            deadlineStepBody:
              "具体的な日付ではなく、体験・商品受取・素材受取からの目安を選びます。",
            visitTimingSubject: "来店・体験から",
            productTimingSubject: "商品受取から",
            assetsTimingSubject: "素材受取から",
            within3Days: "3日以内の実施を希望",
            within1Week: "1週間以内の実施を希望",
            requirements: "投稿に入れる内容",
            requirementsStepTitle: "投稿に入れる内容を入力",
            requirementsDescription:
              "インフルエンサーが投稿時に使うPR表記、ハッシュタグ、触れてほしい内容を入力します。",
            requirementsPlaceholder:
              "例：部屋から海が見えること、朝食、アクセスの良さに触れてください。老朽化や水道の出の悪さなどには触れないでください。",
            chatLater: "詳細は注文後のチャットで相談します。",
            postSettings: "投稿設定",
            postSettingsStepTitle: "投稿に入れる内容を入力",
            postSettingsDescription:
              "投稿の最後に貼るアカウント表記と、投稿で触れてほしいことを整理します。",
            tagAccount: "タグ付けするアカウント名",
            tagAccountPlaceholder: "trendre_official",
            hashtags: "付けたいハッシュタグ",
            hashtagsHelp: "最大8個まで。#は自動で整えます。",
            hashtagPlaceholder: "例：旅行",
            hashtagExamples: ["旅行", "オーシャンビュー", "客室露天風呂"],
            addHashtag: "ハッシュタグを追加",
            postNotes: "触れてほしいポイント・注意事項など",
            postNotesPlaceholder:
              "例：部屋から海が見えること、朝食、アクセスの良さに触れてください。老朽化や水道の出の悪さなどには触れないでください。",
            prCopyPreview: "投稿の最後に貼り付ける内容",
            latestTemplateButton: "前回の内容をコピー",
            latestTemplateEmpty: "前回の注文内容はまだありません。",
            latestTemplateApplied: "前回の注文内容を反映しました。",
            latestTemplateError: "前回の注文内容を取得できませんでした。",
            latestTemplateTimeout:
              "前回の注文内容の取得に時間がかかっています。",
            menuRequired: "注文するメニューを選択してください。",
            freeLimitReached:
              "Basicでは月5件まで注文できます。上限に達したため、プラン変更をご検討ください。",
            submitError: "Checkoutの作成に失敗しました。",
            networkError: "通信エラーが発生しました。",
            authError: "ログイン情報を取得できませんでした。",
            authTimeout:
              "ログイン情報の取得に時間がかかっています。ページを再読み込みしてから再度お試しください。",
            checkoutTimeout:
              "支払い画面の作成に時間がかかっています。少し時間をおいて再度お試しください。",
            checkoutUrlMissing: "Checkout URLを取得できませんでした。",
            submitting: "作成中...",
            limitReachedButton: "上限に達しています",
            startOrderButton: "注文",
            submitButton: "支払いへ進む",
            orderSummary: "注文サマリー",
            menuPrice: "メニュー価格",
            marketplaceFee: "Trendre手数料",
            total: "お支払い合計",
            paymentProtection:
              "支払いはStripeで保護されます。インフルエンサーが辞退した場合、請求は確定しません。",
            paymentCapture:
              "インフルエンサーが72時間以内に承認した場合のみ決済が確定します。",
            step: "STEP",
            next: "次へ",
            skip: "スキップ",
            back: "戻る",
            close: "閉じる",
            confirmTitle: "内容を確認",
            confirmBody: "問題なければ支払い確認へ進んでください。",
            edit: "修正",
            orderFlowTitle: "注文内容",
          }
        : {
            loading: "Loading...",
            creatorNotFound:
              "Influencer not found. This influencer may not currently be ready to receive orders.",
            companyOnlyTitle: "Company accounts only",
            companyOnlyBody:
              "This order form is only available to company accounts.",
            unavailableTitle: "This feature is currently unavailable",
            unavailableBody:
              "Based on your account status, ordering is currently unavailable.",
            profileRequiredTitle: "Complete your company profile first",
            profileRequiredBody:
              "Please complete your company profile before placing orders.",
            profileRequiredCta: "Complete company profile",
            billingTitle: "Plan confirmation is required",
            billingBody:
              "Your current plan status does not allow ordering. Please check your billing plan.",
            billingCta: "View billing plans",
            backToCreator: "Back to detail",
            mainAudience: "Main audience",
            notSet: "Not set",
            skipped: "Skipped",
            noPreference: "No preference",
            pageTitle: "Enter order details",
            pageSubtitle:
              "Enter only the required details. Payment is captured only if the influencer accepts.",
            influencer: "Influencer",
            selectedMenu: "Selected menu",
            projectType: "Project type",
            tapToContinue: "Select one to continue",
            visitExperience: "Visit / experience",
            visitExperienceBody: "Visit a store or service and post",
            productDelivery: "Product delivery",
            productDeliveryBody: "Receive, use, shoot, and post a product",
            providedAssets: "Provided assets",
            providedAssetsBody: "Post using photos, videos, or brand assets",
            projectTypeRequired: "Please select a project type.",
            productDeliveryNotice:
              "If product delivery is required, confirm the shipping address and method in chat after the order is created.",
            postUrlUsageNote:
              "This menu delivers a post URL. Reuse as advertising material is not included.",
            ugcUsageNote:
              "This is a UGC content creation menu. Delivered assets can be used for ads, landing pages, and other brand materials.",
            productName: "Product or campaign name",
            productNameStepTitle: "Enter a product or campaign name",
            productNameStepBody:
              "You can also discuss details later in chat. If skipped, the menu title will be used.",
            productNamePlaceholder: "Example: New skincare serum PR",
            referenceAssets: "Reference materials",
            referenceAssetsStepBody:
              "Attach product images, store photos, service documents, or post examples. Optional.",
            referenceAssetsHelp: "JPG / PNG / WebP / PDF, up to 3 files",
            referenceAssetsButton: "Add files",
            referenceAssetsLimit: "You can attach up to 3 files.",
            referenceAssetsTypeError:
              "Only JPG, PNG, WebP, and PDF files are supported.",
            referenceAssetsImageSizeError: "Images must be 5MB or smaller.",
            referenceAssetsPdfSizeError: "PDF files must be 10MB or smaller.",
            referenceAssetsUploadError: "Failed to upload reference materials.",
            referenceAssetsUploadTimeout:
              "Reference material upload is taking too long. Please check your connection and try again.",
            referenceAssetsUploading: "Uploading...",
            referenceAssetsEmpty: "No files attached",
            remove: "Remove",
            productUrl: "Product or service URL",
            productUrlStepTitle: "Add a URL if available",
            productUrlStepBody:
              "Add a product page, store page, or reference URL if available.",
            productUrlPlaceholder: "https://...",
            deadline: "Timing",
            deadlineStepTitle: "Select timing",
            deadlineStepBody:
              "Instead of a fixed date, choose the preferred timing after the visit, product receipt, or asset receipt.",
            visitTimingSubject: "Within",
            productTimingSubject: "Within",
            assetsTimingSubject: "Within",
            within3Days: "3 days",
            within1Week: "1 week",
            requirements: "Post instructions",
            requirementsStepTitle: "Add post instructions",
            requirementsDescription:
              "Add the PR line, hashtags, and points the influencer should mention.",
            requirementsPlaceholder:
              "Example: Please mention the ocean view, breakfast, and access. Please avoid mentioning old facilities or weak water pressure.",
            chatLater: "Details will be discussed in chat after the order.",
            postSettings: "Post settings",
            postSettingsStepTitle: "Add post instructions",
            postSettingsDescription:
              "Prepare the account mention and notes the influencer can use when posting.",
            tagAccount: "Account to tag",
            tagAccountPlaceholder: "trendre_official",
            hashtags: "Hashtags",
            hashtagsHelp: "Up to 8. # will be formatted automatically.",
            hashtagPlaceholder: "Example: travel",
            hashtagExamples: ["travel", "oceanview", "privatebath"],
            addHashtag: "Add hashtag",
            postNotes: "Points and notes",
            postNotesPlaceholder:
              "Example: Please mention the ocean view, breakfast, and access. Please avoid mentioning old facilities or weak water pressure.",
            prCopyPreview: "Text to paste at the end of the post",
            latestTemplateButton: "Copy previous settings",
            latestTemplateEmpty: "No previous order settings yet.",
            latestTemplateApplied: "Previous order settings applied.",
            latestTemplateError: "Could not load previous order settings.",
            latestTemplateTimeout:
              "Loading previous settings is taking too long.",
            menuRequired: "Please select a menu to order.",
            freeLimitReached:
              "Basic allows up to 5 orders per month. You have reached the limit, so please consider upgrading.",
            submitError: "Failed to create Checkout for this order.",
            networkError: "A network error occurred.",
            authError: "Could not retrieve your login session.",
            authTimeout:
              "Loading your login session is taking too long. Please reload the page and try again.",
            checkoutTimeout:
              "Creating the payment page is taking too long. Please try again later.",
            checkoutUrlMissing: "Checkout URL was not returned.",
            submitting: "Creating...",
            limitReachedButton: "Limit reached",
            startOrderButton: "Order",
            submitButton: "Continue to payment",
            orderSummary: "Order summary",
            menuPrice: "Menu price",
            marketplaceFee: "Trendre fee",
            total: "Total",
            paymentProtection:
              "Payment is protected by Stripe. If the influencer declines, the charge will not be finalized.",
            paymentCapture:
              "Payment is only captured if the influencer accepts within 72 hours.",
            step: "STEP",
            next: "Next",
            skip: "Skip",
            back: "Back",
            close: "Close",
            confirmTitle: "Review details",
            confirmBody: "Continue to payment if everything looks good.",
            edit: "Edit",
            orderFlowTitle: "Order details",
          },
    [safeLocale]
  );

  const projectTypes = useMemo(
    () => [
      {
        value: "visit_experience" as const,
        title: copy.visitExperience,
        body: copy.visitExperienceBody,
      },
      {
        value: "product_delivery" as const,
        title: copy.productDelivery,
        body: copy.productDeliveryBody,
      },
      {
        value: "provided_assets" as const,
        title: copy.providedAssets,
        body: copy.providedAssetsBody,
      },
    ],
    [
      copy.visitExperience,
      copy.visitExperienceBody,
      copy.productDelivery,
      copy.productDeliveryBody,
      copy.providedAssets,
      copy.providedAssetsBody,
    ]
  );

  const [creator, setCreator] = useState<Creator | null>(null);
  const [menus, setMenus] = useState<CreatorMenu[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [referenceAssets, setReferenceAssets] = useState<ReferenceAssetDraft[]>(
    []
  );
  const [referenceAssetUploading, setReferenceAssetUploading] = useState(false);
  const [referenceAssetError, setReferenceAssetError] = useState<string | null>(
    null
  );

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [autoOpened, setAutoOpened] = useState(false);

  const [gate, setGate] = useState<GateState>({
    isLoggedIn: false,
    isCompany: false,
    isSuspended: false,
    companyProfileCompleted: false,
    companyAccessStatus: null,
    companySubscriptionStatus: null,
    companyPlanCode: null,
    monthlyRequestLimit: null,
    monthlyRequestUsed: 0,
    canSendRequests: false,
    needsBilling: false,
  });

  const [form, setForm] = useState<FormState>({
    project_type: "",
    product_name: "",
    product_url: "",
    deadline: "",
    note: "",
    pr_account: "",
    pr_hashtags: ["", "", ""],
    creator_menu_id: "",
  });

  const selectedMenu =
    menus.find((menu) => menu.id === form.creator_menu_id) ?? null;

  const selectedMenuIsUgc = isUgcMenu(selectedMenu);
  const currentStep = orderSteps[stepIndex];

  const menuPriceAmount =
    typeof selectedMenu?.price === "number" ? selectedMenu.price : 0;

  const buyerFeeRateBps = getBuyerFeeRateBps(gate.companyPlanCode);
  const buyerFeeAmount = Math.round((menuPriceAmount * buyerFeeRateBps) / 10000);
  const buyerTotalAmount = menuPriceAmount + buyerFeeAmount;

  const remainingRequests =
    gate.monthlyRequestLimit === null
      ? null
      : Math.max(gate.monthlyRequestLimit - gate.monthlyRequestUsed, 0);

  const reachedLimit =
    gate.monthlyRequestLimit !== null && remainingRequests === 0;

  useEffect(() => {
    if (!orderModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [orderModalOpen]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      setLoading(true);
      setErrorMsg(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        const nextPath = `/b/creators/${creatorId}/request${
          initialMenuId ? `?menuId=${encodeURIComponent(initialMenuId)}` : ""
        }`;

        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const [{ data: roles }, { data: userState }, { data: activeSuspensions }] =
        await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase
            .from("user_states")
            .select(
              `
              company_profile_completed,
              company_access_status,
              company_subscription_status,
              company_plan_code,
              monthly_request_limit,
              monthly_request_used
            `
            )
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_suspensions")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", true),
        ]);

      const isCompany = (roles ?? []).some((role) => role.role === "company");
      const isSuspended = (activeSuspensions ?? []).length > 0;
      const companyProfileCompleted = !!userState?.company_profile_completed;
      const companyAccessStatus = userState?.company_access_status ?? null;
      const companySubscriptionStatus =
        userState?.company_subscription_status ?? null;
      const companyPlanCode = normalizePlanCode(userState?.company_plan_code);

      const monthlyRequestLimit =
        typeof userState?.monthly_request_limit === "number"
          ? userState.monthly_request_limit
          : null;

      const monthlyRequestUsed =
        typeof userState?.monthly_request_used === "number"
          ? userState.monthly_request_used
          : 0;

      const accountReady =
        isCompany &&
        !isSuspended &&
        companyProfileCompleted &&
        companyAccessStatus === "approved";

      const paidPlan = isPaidPlan(companyPlanCode);

      const canSendRequests =
        accountReady && (!paidPlan || companySubscriptionStatus === "active");

      const needsBilling =
        accountReady && paidPlan && companySubscriptionStatus !== "active";

      const { data: payoutReadyRows, error: payoutReadyError } =
        await supabase.rpc("get_payout_ready_creator_ids");

      if (!isMounted) return;

      if (payoutReadyError) {
        console.error("payout ready creator rpc error:", payoutReadyError);
        setCreator(null);
        setLoading(false);
        return;
      }

      const isPayoutReady = ((payoutReadyRows ?? []) as PayoutReadyCreatorRow[]).some(
        (row) => row.creator_id === creatorId
      );

      if (!isPayoutReady) {
        setCreator(null);
        setLoading(false);
        return;
      }

      const { data: creatorData, error: creatorError } = await supabase
        .from("creators")
        .select("id, user_id, display_name")
        .eq("id", creatorId)
        .eq("approval_status", "approved")
        .eq("is_public", true)
        .maybeSingle();

      if (!isMounted) return;

      if (creatorError || !creatorData) {
        console.error("creator load error:", creatorError);
        setCreator(null);
        setLoading(false);
        return;
      }

      setCreator(creatorData as Creator);

      const [
        { data: menuData, error: menuError },
        { data: socialData, error: socialError },
      ] = await Promise.all([
        supabase
          .from("creator_menus")
          .select(
            `
            id,
            creator_id,
            title,
            description,
            platform,
            sns,
            menu_type,
            category,
            price,
            currency,
            deliverables,
            delivery_days,
            account_url,
            reference_price_text,
            allow_secondary_use,
            notes,
            is_active,
            sort_order
          `
          )
          .eq("creator_id", creatorData.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("creator_social_accounts")
          .select("id, creator_id, platform, audience_country")
          .eq("creator_id", creatorData.id),
      ]);

      if (!isMounted) return;

      if (menuError) {
        console.error(menuError);
        setMenus([]);
      } else {
        const nextMenus = (menuData as CreatorMenu[]) ?? [];
        setMenus(nextMenus);

        const defaultSelectedId =
          initialMenuId && nextMenus.some((menu) => menu.id === initialMenuId)
            ? initialMenuId
            : nextMenus[0]?.id ?? "";

        setForm((prev) => ({
          ...prev,
          creator_menu_id: defaultSelectedId,
        }));
      }

      if (socialError) {
        console.error(socialError);
        setSocialAccounts([]);
      } else {
        setSocialAccounts((socialData as SocialAccount[]) ?? []);
      }

      setGate({
        isLoggedIn: true,
        isCompany,
        isSuspended,
        companyProfileCompleted,
        companyAccessStatus,
        companySubscriptionStatus,
        companyPlanCode,
        monthlyRequestLimit,
        monthlyRequestUsed,
        canSendRequests,
        needsBilling,
      });

      setLoading(false);
    };

    void boot();

    return () => {
      isMounted = false;
    };
  }, [creatorId, initialMenuId, router, supabase]);

  useEffect(() => {
    if (selectedMenuIsUgc && !form.project_type) {
      setForm((prev) => ({
        ...prev,
        project_type: "provided_assets",
      }));
    }
  }, [selectedMenuIsUgc, form.project_type]);

  useEffect(() => {
    if (loading || autoOpened || orderModalOpen) return;
    if (!creator || !selectedMenu) return;
    if (!gate.canSendRequests || gate.needsBilling || reachedLimit) return;

    const shouldAutoOpen = startParam === "1" || !!initialMenuId;

    if (!shouldAutoOpen) return;

    setStepIndex(0);
    setErrorMsg(null);
    setOrderModalOpen(true);
    setAutoOpened(true);
  }, [
    loading,
    autoOpened,
    orderModalOpen,
    creator,
    selectedMenu,
    gate.canSendRequests,
    gate.needsBilling,
    reachedLimit,
    startParam,
    initialMenuId,
  ]);

  const audienceCountries = uniqueNonEmpty(
    socialAccounts.map((account) => account.audience_country)
  );

  const audienceCountryLabels = audienceCountries.map((country) =>
    getCountryLabel(country, safeLocale)
  );

  const platforms = uniqueNonEmpty(
    socialAccounts.map((account) => account.platform)
  );

  const menuPlatform = selectedMenu?.platform || selectedMenu?.sns || null;
  const visiblePlatforms =
    platforms.length > 0 ? platforms : menuPlatform ? [menuPlatform] : [];

  const selectedProjectTypeLabel =
    projectTypes.find((item) => item.value === form.project_type)?.title ?? "";

  const timingSubject =
    form.project_type === "visit_experience"
      ? copy.visitTimingSubject
      : form.project_type === "product_delivery"
        ? copy.productTimingSubject
        : copy.assetsTimingSubject;

  const timingOptions: Array<{
    value: ImplementationTiming;
    title: string;
    body: string;
  }> = [
    {
      value: "within_3_days",
      title:
        safeLocale === "ja"
          ? `${timingSubject}${copy.within3Days}`
          : `${copy.within3Days} after receiving/experience`,
      body:
        safeLocale === "ja"
          ? "スピード感を重視したい場合に選びます。"
          : "Choose this when you want a faster turnaround.",
    },
    {
      value: "within_1_week",
      title:
        safeLocale === "ja"
          ? `${timingSubject}${copy.within1Week}`
          : `${copy.within1Week} after receiving/experience`,
      body:
        safeLocale === "ja"
          ? "通常のPR依頼で使いやすい目安です。"
          : "A standard timing for most PR orders.",
    },
    {
      value: "no_preference",
      title: copy.noPreference,
      body:
        safeLocale === "ja"
          ? "日程は注文後のチャットで相談します。"
          : "Discuss timing in chat after the order.",
    },
  ];

  const displayProductName =
    form.product_name.trim() || selectedMenu?.title || copy.skipped;

  const displayProductUrl = form.product_url.trim() || copy.skipped;
  const displayTiming =
    timingOptions.find((option) => option.value === form.deadline)?.title ||
    copy.skipped;
  const displayPostNotes = form.note.trim() || copy.skipped;
  const cleanHashtags = getCleanHashtags(form.pr_hashtags);
  const prCopyText = buildPrCopyText(form.pr_account, form.pr_hashtags);

  const buildFinalRequirements = () => {
    const usageNote = selectedMenuIsUgc
      ? copy.ugcUsageNote
      : copy.postUrlUsageNote;

    const timingBlock = form.deadline
      ? `\n\n【実施タイミング】\n${displayTiming}`
      : "";

    const deliveryNote =
      form.project_type === "product_delivery"
        ? `\n\n【商品配送について】\n${copy.productDeliveryNotice}`
        : "";

    const postNotesBlock = form.note.trim()
      ? `\n\n【投稿で触れてほしいこと・注意事項】\n${form.note.trim()}`
      : "";

    return `【案件タイプ】
${selectedProjectTypeLabel}${timingBlock}

【利用範囲】
${usageNote}${deliveryNote}${postNotesBlock}`;
  };

  const updateHashtag = (index: number, value: string) => {
    setTemplateMessage(null);
    setForm((prev) => {
      const next = [...prev.pr_hashtags];
      next[index] = value;

      return {
        ...prev,
        pr_hashtags: next,
      };
    });
  };

  const addHashtagInput = () => {
    setTemplateMessage(null);
    setForm((prev) => {
      if (prev.pr_hashtags.length >= MAX_HASHTAGS) return prev;

      return {
        ...prev,
        pr_hashtags: [...prev.pr_hashtags, ""],
      };
    });
  };

  const handleReferenceAssetUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (referenceAssetUploading) return;

    setReferenceAssetError(null);
    setErrorMsg(null);

    const incomingFiles = Array.from(files);

    if (referenceAssets.length + incomingFiles.length > MAX_REFERENCE_ASSETS) {
      setReferenceAssetError(copy.referenceAssetsLimit);
      return;
    }

    const nextAssets: ReferenceAssetDraft[] = [];

    setReferenceAssetUploading(true);

    try {
      const {
        data: { user },
      } = await withTimeout(
        supabase.auth.getUser(),
        SESSION_TIMEOUT_MS,
        copy.authTimeout
      );

      if (!user) {
        setReferenceAssetError(copy.authError);
        return;
      }

      for (const file of incomingFiles) {
        const fileType = getReferenceFileType(file);

        if (!fileType || !ALLOWED_REFERENCE_MIME_TYPES.has(file.type)) {
          setReferenceAssetError(copy.referenceAssetsTypeError);
          return;
        }

        if (fileType === "image" && file.size > MAX_IMAGE_BYTES) {
          setReferenceAssetError(copy.referenceAssetsImageSizeError);
          return;
        }

        if (fileType === "pdf" && file.size > MAX_PDF_BYTES) {
          setReferenceAssetError(copy.referenceAssetsPdfSizeError);
          return;
        }

        const storagePath = buildReferenceStoragePath(user.id, file);

        await withTimeout(
          supabase.storage
            .from(ORDER_REFERENCE_ASSETS_BUCKET)
            .upload(storagePath, file, {
              cacheControl: "3600",
              contentType: file.type,
              upsert: false,
            })
            .then((result) => {
              if (result.error) throw result.error;
              return result;
            }),
          UPLOAD_TIMEOUT_MS,
          copy.referenceAssetsUploadTimeout
        );

        const previewUrl =
          fileType === "image" ? URL.createObjectURL(file) : null;

        if (previewUrl) {
          previewUrlsRef.current.add(previewUrl);
        }

        nextAssets.push({
          storage_path: storagePath,
          file_name: file.name,
          file_type: fileType,
          mime_type: file.type,
          size_bytes: file.size,
          sort_order: referenceAssets.length + nextAssets.length,
          preview_url: previewUrl,
        });
      }

      setReferenceAssets((prev) => [...prev, ...nextAssets]);
    } catch (error: any) {
      console.error("reference asset upload error:", error);
      setReferenceAssetError(
        error?.message || copy.referenceAssetsUploadError
      );
    } finally {
      setReferenceAssetUploading(false);
    }
  };

  const removeReferenceAsset = (storagePath: string) => {
    setReferenceAssetError(null);

    setReferenceAssets((prev) => {
      const target = prev.find((asset) => asset.storage_path === storagePath);

      if (target?.preview_url) {
        URL.revokeObjectURL(target.preview_url);
        previewUrlsRef.current.delete(target.preview_url);
      }

      return prev
        .filter((asset) => asset.storage_path !== storagePath)
        .map((asset, index) => ({
          ...asset,
          sort_order: index,
        }));
    });
  };

  const applyLatestTemplate = async () => {
    if (templateLoading) return;

    setTemplateLoading(true);
    setTemplateMessage(null);
    setErrorMsg(null);

    try {
      const {
        data: { session },
      } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_TIMEOUT_MS,
        copy.authTimeout
      );

      const accessToken = session?.access_token ?? null;

      if (!accessToken) {
        setTemplateMessage(copy.authError);
        setTemplateLoading(false);
        return;
      }

      const res = await withTimeout(
        fetch("/api/company/order-pr-template/latest", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        CHECKOUT_TIMEOUT_MS,
        copy.latestTemplateTimeout
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setTemplateMessage(json?.error ?? copy.latestTemplateError);
        setTemplateLoading(false);
        return;
      }

      const template = json?.template ?? null;

      if (!template) {
        setTemplateMessage(copy.latestTemplateEmpty);
        setTemplateLoading(false);
        return;
      }

      setForm((prev) => ({
        ...prev,
        project_type:
          template.project_type === "visit_experience" ||
          template.project_type === "product_delivery" ||
          template.project_type === "provided_assets"
            ? template.project_type
            : prev.project_type,
        product_name: template.product_name ?? prev.product_name,
        product_url: template.product_url ?? prev.product_url,
        deadline:
          template.deadline === "within_3_days" ||
          template.deadline === "within_1_week" ||
          template.deadline === "no_preference"
            ? template.deadline
            : prev.deadline,
        pr_account: normalizePrAccountInput(template.pr_account ?? ""),
        pr_hashtags: normalizeHashtagsForForm(
          Array.isArray(template.pr_hashtags) ? template.pr_hashtags : []
        ),
        note: template.post_notes ?? prev.note,
      }));

      setTemplateMessage(copy.latestTemplateApplied);
    } catch (error: any) {
      setTemplateMessage(error?.message ?? copy.latestTemplateError);
    } finally {
      setTemplateLoading(false);
    }
  };

  const closeOrderModal = () => {
    if (submitting) return;
    setOrderModalOpen(false);
    setErrorMsg(null);
  };

  const openOrderModal = () => {
    if (!selectedMenu) {
      setErrorMsg(copy.menuRequired);
      return;
    }

    if (!gate.canSendRequests) {
      setErrorMsg(copy.unavailableBody);
      return;
    }

    if (reachedLimit) {
      setErrorMsg(copy.freeLimitReached);
      return;
    }

    setErrorMsg(null);
    setStepIndex(0);
    setOrderModalOpen(true);
  };

  const selectProjectTypeAndContinue = (value: ProjectType) => {
    setForm((prev) => ({
      ...prev,
      project_type: value,
      deadline: prev.project_type === value ? prev.deadline : "",
    }));
    setErrorMsg(null);
    setStepIndex(1);
  };

  const selectTimingAndContinue = (value: ImplementationTiming) => {
    setForm((prev) => ({
      ...prev,
      deadline: value,
    }));
    setErrorMsg(null);
    setStepIndex(4);
  };

  const goNext = () => {
    setErrorMsg(null);

    if (currentStep === "project_type" && !form.project_type) {
      setErrorMsg(copy.projectTypeRequired);
      return;
    }

    setStepIndex((prev) => Math.min(prev + 1, orderSteps.length - 1));
  };

  const goBack = () => {
    setErrorMsg(null);
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const skipStep = () => {
    setErrorMsg(null);
    setStepIndex((prev) => Math.min(prev + 1, orderSteps.length - 1));
  };

  const goToStep = (step: OrderStep) => {
    const nextIndex = orderSteps.indexOf(step);
    if (nextIndex >= 0) {
      setErrorMsg(null);
      setStepIndex(nextIndex);
    }
  };

  const handleCheckout = async () => {
    if (submitting) return;

    if (!creator || !gate.canSendRequests || reachedLimit) {
      return;
    }

    if (!selectedMenu) {
      setErrorMsg(copy.menuRequired);
      return;
    }

    if (!form.project_type) {
      setErrorMsg(copy.projectTypeRequired);
      setStepIndex(0);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const {
        data: { session },
      } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_TIMEOUT_MS,
        copy.authTimeout
      );

      const accessToken = session?.access_token ?? null;

      if (!accessToken) {
        setErrorMsg(copy.authError);
        setSubmitting(false);
        router.replace("/login");
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, CHECKOUT_TIMEOUT_MS);

      let res: Response;

      try {
        res = await fetch("/api/orders/checkout", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            creator_id: creator.id,
            creator_menu_id: selectedMenu.id,
            project_type: form.project_type,
            product_name: form.product_name.trim() || selectedMenu.title,
            product_url: form.product_url.trim() || null,
            deadline: null,
            requirements: buildFinalRequirements(),
            pr_account: form.pr_account,
            pr_hashtags: cleanHashtags,
            post_notes: form.note.trim() || null,
            reference_assets: referenceAssets.map((asset, index) => ({
              storage_path: asset.storage_path,
              file_name: asset.file_name,
              file_type: asset.file_type,
              mime_type: asset.mime_type,
              size_bytes: asset.size_bytes,
              sort_order: index,
            })),
            has_free_offer:
              form.project_type === "visit_experience" ||
              form.project_type === "product_delivery",
            wants_secondary_use: selectedMenuIsUgc,
          }),
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(json?.error ?? copy.submitError);
        setSubmitting(false);
        return;
      }

      if (!json?.url || typeof json.url !== "string") {
        setErrorMsg(copy.checkoutUrlMissing);
        setSubmitting(false);
        return;
      }

      window.location.href = json.url;
    } catch (error: any) {
      const isAbort =
        error?.name === "AbortError" ||
        String(error?.message ?? "").toLowerCase().includes("abort");

      setErrorMsg(isAbort ? copy.checkoutTimeout : error?.message ?? copy.networkError);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-[30px] border border-white/80 bg-white/90 p-8 shadow-sm">
          <p className="text-sm font-bold text-slate-500">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-[60vh] bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-rose-100 bg-white p-7 shadow-sm">
          <p className="text-sm font-bold text-slate-600">
            {copy.creatorNotFound}
          </p>
        </div>
      </div>
    );
  }

  if (!gate.isCompany) {
    return (
      <div className="min-h-[60vh] bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-rose-100 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            {copy.companyOnlyTitle}
          </h1>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
            {copy.companyOnlyBody}
          </p>
        </div>
      </div>
    );
  }

  if (gate.isSuspended || gate.companyAccessStatus !== "approved") {
    return (
      <div className="min-h-[60vh] bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-rose-100 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            {copy.unavailableTitle}
          </h1>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
            {copy.unavailableBody}
          </p>
        </div>
      </div>
    );
  }

  if (!gate.companyProfileCompleted) {
    return (
      <div className="min-h-[60vh] bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-amber-100 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            {copy.profileRequiredTitle}
          </h1>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
            {copy.profileRequiredBody}
          </p>
          <button
            type="button"
            onClick={() => router.push("/b/onboarding")}
            className="mt-5 rounded-full bg-[#ff5f67] px-6 py-3 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
          >
            {copy.profileRequiredCta}
          </button>
        </div>
      </div>
    );
  }

  if (gate.needsBilling) {
    return (
      <div className="min-h-[60vh] bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-blue-100 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            {copy.billingTitle}
          </h1>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
            {copy.billingBody}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push(BILLING_PATH)}
              className="rounded-full bg-[#ff5f67] px-6 py-3 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
            >
              {copy.billingCta}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/b/creators/${creator.id}`)}
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300"
            >
              {copy.backToCreator}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderReferenceAssetList = (compact = false) => {
    if (referenceAssets.length === 0) {
      return (
        <div className="rounded-2xl bg-white px-4 py-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
          {copy.referenceAssetsEmpty}
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {referenceAssets.map((asset) => (
          <div
            key={asset.storage_path}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100"
          >
            {asset.file_type === "image" && asset.preview_url ? (
              <img
                src={asset.preview_url}
                alt={asset.file_name}
                className={`shrink-0 object-cover ring-1 ring-slate-100 ${
                  compact ? "h-12 w-12 rounded-xl" : "h-14 w-14 rounded-2xl"
                }`}
              />
            ) : (
              <div
                className={`flex shrink-0 items-center justify-center bg-rose-50 text-xs font-black text-[#ff5f67] ring-1 ring-rose-100 ${
                  compact ? "h-12 w-12 rounded-xl" : "h-14 w-14 rounded-2xl"
                }`}
              >
                PDF
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950">
                {asset.file_name}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {asset.file_type.toUpperCase()} / {formatFileSize(asset.size_bytes)}
              </p>
            </div>

            {!compact ? (
              <button
                type="button"
                onClick={() => removeReferenceAsset(asset.storage_path)}
                className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              >
                {copy.remove}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderStepContent = () => {
    if (currentStep === "project_type") {
      return (
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                {copy.projectType}
              </h3>
              <p className="mt-2 text-sm font-bold text-slate-500">
                {copy.tapToContinue}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {projectTypes.map((item) => {
              const selected = form.project_type === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => selectProjectTypeAndContinue(item.value)}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    selected
                      ? "border-[#ff5f67]/70 bg-rose-50/70 shadow-[0_16px_38px_rgba(255,95,103,0.13)] ring-4 ring-rose-100/70"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-black text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                        {item.body}
                      </p>
                    </div>

                    {selected ? (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff5f67] text-white">
                        <CheckIcon />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {form.project_type === "product_delivery" ? (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-800">
              {copy.productDeliveryNotice}
            </div>
          ) : null}
        </div>
      );
    }

    if (currentStep === "product_name") {
      return (
        <div>
          <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
            {copy.productNameStepTitle}
          </h3>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
            {copy.productNameStepBody}
          </p>

          <div className="mt-6">
            <ModalInput
              label={copy.productName}
              value={form.product_name}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, product_name: value }))
              }
              placeholder={copy.productNamePlaceholder}
            />
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">
                  {copy.referenceAssets}
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                  {copy.referenceAssetsStepBody}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {copy.referenceAssetsHelp}
                </p>
              </div>

              <label
                className={`inline-flex w-fit cursor-pointer items-center justify-center rounded-full px-4 py-2.5 text-xs font-black transition ${
                  referenceAssetUploading ||
                  referenceAssets.length >= MAX_REFERENCE_ASSETS
                    ? "cursor-not-allowed bg-slate-200 text-slate-400"
                    : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {referenceAssetUploading
                  ? copy.referenceAssetsUploading
                  : copy.referenceAssetsButton}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  disabled={
                    referenceAssetUploading ||
                    referenceAssets.length >= MAX_REFERENCE_ASSETS
                  }
                  onChange={(event) => {
                    void handleReferenceAssetUpload(event.target.files);
                    event.currentTarget.value = "";
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {referenceAssetError ? (
              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold leading-6 text-rose-700">
                {referenceAssetError}
              </div>
            ) : null}

            <div className="mt-4">{renderReferenceAssetList(false)}</div>
          </div>
        </div>
      );
    }

    if (currentStep === "product_url") {
      return (
        <div>
          <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
            {copy.productUrlStepTitle}
          </h3>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
            {copy.productUrlStepBody}
          </p>

          <div className="mt-6">
            <ModalInput
              label={copy.productUrl}
              value={form.product_url}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, product_url: value }))
              }
              placeholder={copy.productUrlPlaceholder}
            />
          </div>
        </div>
      );
    }

    if (currentStep === "deadline") {
      return (
        <div>
          <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
            {copy.deadlineStepTitle}
          </h3>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
            {copy.deadlineStepBody}
          </p>

          <div className="mt-6 grid gap-3">
            {timingOptions.map((item) => {
              const selected = form.deadline === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => selectTimingAndContinue(item.value)}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    selected
                      ? "border-[#ff5f67]/70 bg-rose-50/70 shadow-[0_16px_38px_rgba(255,95,103,0.13)] ring-4 ring-rose-100/70"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-black text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                        {item.body}
                      </p>
                    </div>

                    {selected ? (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff5f67] text-white">
                        <CheckIcon />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (currentStep === "note") {
      return (
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                {copy.postSettingsStepTitle}
              </h3>
              <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
                {copy.postSettingsDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={applyLatestTemplate}
              disabled={templateLoading}
              className="w-fit shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {templateLoading ? copy.loading : copy.latestTemplateButton}
            </button>
          </div>

          {templateMessage ? (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-500">
              {templateMessage}
            </div>
          ) : null}

          <div className="mt-6">
            <AccountInput
              label={copy.tagAccount}
              value={form.pr_account}
              onChange={(value) => {
                setTemplateMessage(null);
                setForm((prev) => ({ ...prev, pr_account: value }));
              }}
              placeholder={copy.tagAccountPlaceholder}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-800">
                  {copy.hashtags}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {copy.hashtagsHelp}
                </p>
              </div>

              <span className="text-xs font-black text-slate-400">
                {cleanHashtags.length}/{MAX_HASHTAGS}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {form.pr_hashtags.map((value, index) => {
                const placeholder =
                  copy.hashtagExamples[index] ?? copy.hashtagPlaceholder;

                return (
                  <label key={index} className="relative block">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300">
                      #
                    </span>
                    <input
                      value={value}
                      onChange={(event) =>
                        updateHashtag(index, event.target.value)
                      }
                      placeholder={placeholder}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-8 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100"
                    />
                  </label>
                );
              })}
            </div>

            {form.pr_hashtags.length < MAX_HASHTAGS ? (
              <button
                type="button"
                onClick={addHashtagInput}
                className="mt-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                ＋ {copy.addHashtag}
              </button>
            ) : null}
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-black text-slate-800">
              {copy.postNotes}
            </span>
            <textarea
              value={form.note}
              onChange={(event) => {
                setTemplateMessage(null);
                setForm((prev) => ({
                  ...prev,
                  note: event.target.value,
                }));
              }}
              placeholder={copy.postNotesPlaceholder}
              rows={6}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100"
            />
          </label>

          <div className="mt-5 rounded-[24px] border border-rose-100 bg-rose-50/60 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5f67]">
              {copy.prCopyPreview}
            </p>
            <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm font-black leading-7 text-slate-950">
              {prCopyText || copy.skipped}
            </pre>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
          {copy.confirmTitle}
        </h3>
        <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
          {copy.confirmBody}
        </p>

        <div className="mt-6 space-y-3">
          <div className="rounded-[24px] bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {copy.projectType}
              </p>
              <button
                type="button"
                onClick={() => goToStep("project_type")}
                className="text-xs font-black text-[#ff5f67]"
              >
                {copy.edit}
              </button>
            </div>
            <p className="mt-2 text-base font-black text-slate-950">
              {selectedProjectTypeLabel || copy.notSet}
            </p>
          </div>

          <div className="rounded-[24px] bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {copy.productName}
              </p>
              <button
                type="button"
                onClick={() => goToStep("product_name")}
                className="text-xs font-black text-[#ff5f67]"
              >
                {copy.edit}
              </button>
            </div>
            <p className="mt-2 text-base font-black text-slate-950">
              {displayProductName}
            </p>
          </div>

          <div className="rounded-[24px] bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {copy.referenceAssets}
              </p>
              <button
                type="button"
                onClick={() => goToStep("product_name")}
                className="text-xs font-black text-[#ff5f67]"
              >
                {copy.edit}
              </button>
            </div>
            <div className="mt-3">{renderReferenceAssetList(true)}</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {copy.productUrl}
                </p>
                <button
                  type="button"
                  onClick={() => goToStep("product_url")}
                  className="text-xs font-black text-[#ff5f67]"
                >
                  {copy.edit}
                </button>
              </div>
              <p className="mt-2 break-all text-sm font-black text-slate-950">
                {displayProductUrl}
              </p>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {copy.deadline}
                </p>
                <button
                  type="button"
                  onClick={() => goToStep("deadline")}
                  className="text-xs font-black text-[#ff5f67]"
                >
                  {copy.edit}
                </button>
              </div>
              <p className="mt-2 text-sm font-black text-slate-950">
                {displayTiming}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {copy.prCopyPreview}
              </p>
              <button
                type="button"
                onClick={() => goToStep("note")}
                className="text-xs font-black text-[#ff5f67]"
              >
                {copy.edit}
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm font-black leading-7 text-slate-950">
              {prCopyText || copy.skipped}
            </pre>
          </div>

          <div className="rounded-[24px] bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {copy.postNotes}
              </p>
              <button
                type="button"
                onClick={() => goToStep("note")}
                className="text-xs font-black text-[#ff5f67]"
              >
                {copy.edit}
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-7 text-slate-700">
              {displayPostNotes}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden bg-[#f8fafc]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-180px] top-[-160px] h-[420px] w-[420px] rounded-full bg-rose-100/45 blur-3xl" />
        <div className="absolute right-[-180px] top-[8%] h-[520px] w-[520px] rounded-full bg-emerald-100/45 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[30px] font-black leading-tight tracking-[-0.04em] text-slate-950 md:text-[40px]">
              {copy.pageTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
              {copy.pageSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/b/creators/${creator.id}`)}
            className="w-fit rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
          >
            {copy.backToCreator}
          </button>
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0">
            <section className="rounded-[34px] border border-white/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-7">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    {copy.influencer}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">
                    {creator.display_name}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {visiblePlatforms.length > 0 ? (
                      visiblePlatforms.map((platform) => (
                        <PlatformBadge key={platform} platform={platform} />
                      ))
                    ) : (
                      <Badge tone="gray">{copy.notSet}</Badge>
                    )}

                    {audienceCountryLabels.length > 0 ? (
                      <Badge tone="blue">
                        {copy.mainAudience}: {audienceCountryLabels.join(" / ")}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[26px] bg-slate-50 px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {copy.selectedMenu}
                  </p>
                  <p className="mt-2 text-base font-black text-slate-950">
                    {selectedMenu?.title || copy.notSet}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedMenu ? (
                      <>
                        <Badge tone={selectedMenuIsUgc ? "green" : "gray"}>
                          {menuTypeLabel(
                            selectedMenu.menu_type,
                            safeLocale,
                            selectedMenu.category || "Menu"
                          )}
                        </Badge>
                        <Badge tone="red">
                          {formatPrice(
                            selectedMenu.price,
                            selectedMenu.currency,
                            selectedMenu.reference_price_text,
                            safeLocale
                          )}
                        </Badge>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-7 rounded-[28px] border border-slate-100 bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                      {copy.orderFlowTitle}
                    </p>
                    <p className="mt-2 text-lg font-black text-slate-950">
                      {selectedMenu?.title || copy.selectedMenu}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      {copy.paymentCapture}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openOrderModal}
                    disabled={
                      !selectedMenu || !gate.canSendRequests || reachedLimit
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-7 py-4 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reachedLimit
                      ? copy.limitReachedButton
                      : copy.startOrderButton}
                    <ArrowIcon />
                  </button>
                </div>

                {errorMsg && !orderModalOpen ? (
                  <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
                    {errorMsg}
                  </div>
                ) : null}
              </div>
            </section>
          </main>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[30px] border border-white/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.09)]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                {copy.orderSummary}
              </p>

              <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.03em] text-slate-950">
                {selectedMenu?.title || copy.selectedMenu}
              </h2>

              <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                <Row
                  label={copy.menuPrice}
                  value={formatPlainPrice(
                    menuPriceAmount,
                    selectedMenu?.currency ?? "JPY",
                    safeLocale
                  )}
                />

                <div className="my-4 border-t border-slate-200" />

                <Row
                  label={copy.marketplaceFee}
                  value={formatPlainPrice(
                    buyerFeeAmount,
                    selectedMenu?.currency ?? "JPY",
                    safeLocale
                  )}
                />

                <div className="my-4 border-t border-slate-200" />

                <Row
                  label={copy.total}
                  value={formatPlainPrice(
                    buyerTotalAmount,
                    selectedMenu?.currency ?? "JPY",
                    safeLocale
                  )}
                  bold
                />
              </div>

              <div className="mt-5 space-y-3 text-sm font-semibold leading-6 text-slate-600">
                <div className="flex gap-2">
                  <span className="mt-0.5 text-[#7bae6c]">
                    <CheckIcon />
                  </span>
                  <span>{copy.paymentProtection}</span>
                </div>

                <div className="flex gap-2">
                  <span className="mt-0.5 text-[#7bae6c]">
                    <CheckIcon />
                  </span>
                  <span>{copy.paymentCapture}</span>
                </div>
              </div>

              {reachedLimit ? (
                <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
                  {copy.freeLimitReached}
                </div>
              ) : null}

              <button
                type="button"
                onClick={openOrderModal}
                disabled={!selectedMenu || !gate.canSendRequests || reachedLimit}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-5 py-4 text-base font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reachedLimit ? copy.limitReachedButton : copy.startOrderButton}
                {!reachedLimit ? <ArrowIcon /> : null}
              </button>

              <button
                type="button"
                onClick={() => router.push(`/b/creators/${creator.id}`)}
                className="mt-3 w-full rounded-full border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {copy.backToCreator}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {orderModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden px-4 py-5">
          <div
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-md"
            onClick={closeOrderModal}
          />

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-140px] top-[-120px] h-[440px] w-[440px] rounded-full bg-rose-100/80 blur-3xl" />
            <div className="absolute right-[-140px] top-[10%] h-[520px] w-[520px] rounded-full bg-emerald-100/85 blur-3xl" />
            <div className="absolute bottom-[-180px] left-1/2 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-white/80 blur-3xl" />
          </div>

          <section className="relative max-h-[calc(100vh-40px)] w-full max-w-[660px] overflow-y-auto rounded-[34px] border border-white/80 bg-white/92 p-5 shadow-[0_34px_120px_rgba(15,23,42,0.24)] backdrop-blur-xl md:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff5f67]">
                  {copy.step} {stepIndex + 1} / {orderSteps.length}
                </p>
                <p className="mt-1 text-sm font-black text-slate-500">
                  {selectedMenu?.title || copy.selectedMenu}
                </p>
              </div>

              <button
                type="button"
                onClick={closeOrderModal}
                disabled={submitting}
                aria-label={copy.close}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:opacity-50"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#ff5f67] transition-all duration-300"
                style={{
                  width: `${((stepIndex + 1) / orderSteps.length) * 100}%`,
                }}
              />
            </div>

            <div className="min-h-[330px]">{renderStepContent()}</div>

            {errorMsg ? (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
                {errorMsg}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={submitting}
                    className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {copy.back}
                  </button>
                ) : null}

                {currentStep !== "project_type" && currentStep !== "confirm" ? (
                  <button
                    type="button"
                    onClick={skipStep}
                    disabled={submitting}
                    className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-400 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
                  >
                    {copy.skip}
                  </button>
                ) : null}
              </div>

              {currentStep === "confirm" ? (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-7 py-3.5 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? copy.submitting : copy.submitButton}
                  {!submitting ? <ArrowIcon /> : null}
                </button>
              ) : currentStep === "project_type" ? null : (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-7 py-3.5 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copy.next}
                  <ArrowIcon />
                </button>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}