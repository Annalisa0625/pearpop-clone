// File: app/b/creators/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

const BILLING_PATH = "/b/billing";

type Creator = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  category: string | null;
  user_id: string;
  stripe_onboarding_completed: boolean | null;
};

type MenuCard = {
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
  follower_range: string | null;
  url: string | null;
};

type PortfolioAsset = {
  id: string;
  creator_id: string;
  asset_url: string;
  asset_type: string;
  title: string | null;
  sort_order: number | null;
  is_public: boolean | null;
  created_at: string | null;
};

type CompanyGateState = {
  isLoggedIn: boolean;
  canSendRequests: boolean;
  needsBilling: boolean;
  companyPlanCode: "free" | "standard" | "global_pro" | null;
};

type SavedCreatorRow = {
  creator_id: string;
};

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))
  );
}

function normalizePlatform(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getPlatformLabel(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (!normalized) return "SNS";
  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("tiktok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized === "x" || normalized.includes("twitter")) return "X";
  if (normalized.includes("ugc")) return "UGC";

  return value?.trim() || "SNS";
}

function getPlatformIcon(value: string | null | undefined) {
  const normalized = normalizePlatform(value);

  if (normalized.includes("instagram")) {
    return (
      <img
        src="/brand/social/instagram.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("tiktok")) {
    return (
      <img
        src="/brand/social/tiktok.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("youtube")) {
    return (
      <img
        src="/brand/social/youtube.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized === "x" || normalized.includes("twitter")) {
    return (
      <img
        src="/brand/social/x.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("ugc")) return "▣";

  return "●";
}

function getCreatorInitial(name: string) {
  return (name || "C").trim().slice(0, 1).toUpperCase();
}

function getCountryLabel(country: string | null | undefined, locale: "ja" | "en") {
  const raw = (country ?? "").trim();
  if (!raw) return locale === "ja" ? "不明" : "Unknown";

  const normalized = raw.toLowerCase();

  const jaMap: Record<string, string> = {
    japan: "日本",
    日本: "日本",
    korea: "韓国",
    韓国: "韓国",
    taiwan: "台湾",
    台湾: "台湾",
    hong_kong: "香港",
    香港: "香港",
    china: "中国",
    中国: "中国",
    thailand: "タイ",
    タイ: "タイ",
    vietnam: "ベトナム",
    ベトナム: "ベトナム",
    indonesia: "インドネシア",
    インドネシア: "インドネシア",
    philippines: "フィリピン",
    フィリピン: "フィリピン",
    malaysia: "マレーシア",
    マレーシア: "マレーシア",
    singapore: "シンガポール",
    シンガポール: "シンガポール",
    india: "インド",
    インド: "インド",
    united_states: "アメリカ",
    usa: "アメリカ",
    アメリカ: "アメリカ",
    canada: "カナダ",
    カナダ: "カナダ",
    united_kingdom: "イギリス",
    uk: "イギリス",
    イギリス: "イギリス",
    france: "フランス",
    フランス: "フランス",
    germany: "ドイツ",
    ドイツ: "ドイツ",
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
    hong_kong: "Hong Kong",
    香港: "Hong Kong",
    china: "China",
    中国: "China",
    thailand: "Thailand",
    タイ: "Thailand",
    vietnam: "Vietnam",
    ベトナム: "Vietnam",
    indonesia: "Indonesia",
    インドネシア: "Indonesia",
    philippines: "Philippines",
    フィリピン: "Philippines",
    malaysia: "Malaysia",
    マレーシア: "Malaysia",
    singapore: "Singapore",
    シンガポール: "Singapore",
    india: "India",
    インド: "India",
    united_states: "United States",
    usa: "United States",
    アメリカ: "United States",
    canada: "Canada",
    カナダ: "Canada",
    united_kingdom: "United Kingdom",
    uk: "United Kingdom",
    イギリス: "United Kingdom",
    france: "France",
    フランス: "France",
    germany: "Germany",
    ドイツ: "Germany",
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

function formatDeliveryDays(
  value: number | null,
  locale: "ja" | "en",
  fallback: string
) {
  if (value == null) return fallback;
  return locale === "ja" ? `${value}日` : `${value} days`;
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
    ugc: { ja: "UGC制作", en: "UGC creation" },
    package: { ja: "セットメニュー", en: "Package" },
    other: { ja: "その他", en: "Other" },
  };

  return labels[value || ""]?.[locale] || fallback;
}

function getPlanLabel(
  plan: CompanyGateState["companyPlanCode"],
  locale: "ja" | "en"
) {
  switch (plan) {
    case "free":
      return "Basic";
    case "standard":
      return "Pro";
    case "global_pro":
      return "Premium";
    default:
      return locale === "ja" ? "未設定" : "Not set";
  }
}

function getBuyerFeeRateBps(plan: CompanyGateState["companyPlanCode"]) {
  return plan === "global_pro" ? 500 : 1000;
}

function formatFollowerRange(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "-";

  return raw
    .replace("未満", "-")
    .replace("以上", "+")
    .replace("〜", "〜")
    .replace("1,000", "1k")
    .replace("5,000", "5k")
    .replace("10,000", "10k")
    .replace("30,000", "30k")
    .replace("50,000", "50k")
    .replace("100,000", "100k")
    .replace("300,000", "300k")
    .replace("500,000", "500k")
    .replace("1,000,000", "1M");
}

function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: "gray" | "blue" | "green" | "yellow" | "purple" | "red" | "black";
}) {
  const styles = {
    gray: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    yellow: "bg-amber-50 text-amber-800",
    purple: "bg-purple-50 text-purple-700",
    red: "bg-rose-50 text-rose-700",
    black: "bg-slate-950 text-white",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function PlatformMetricBadge({
  platform,
  value,
}: {
  platform: string | null | undefined;
  value: string | null | undefined;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-black text-slate-900 shadow-sm">
      <span>{getPlatformIcon(platform)}</span>
      <span>{value?.trim() || getPlatformLabel(platform)}</span>
    </span>
  );
}

function GalleryImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition duration-500 hover:scale-105"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}

function FallbackGallery({ creator }: { creator: Creator }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-700 to-slate-400">
      <div className="text-center">
        <div className="text-7xl font-black tracking-tight text-white drop-shadow-sm md:text-8xl">
          {getCreatorInitial(creator.display_name)}
        </div>
        <div className="mt-3 text-xs font-bold uppercase tracking-[0.35em] text-white/70">
          Trendre Creator
        </div>
      </div>
    </div>
  );
}

function HeroGallery({
  creator,
  images,
  showAllLabel,
}: {
  creator: Creator;
  images: string[];
  showAllLabel: string;
}) {
  if (images.length === 0) {
    return (
      <section className="overflow-hidden rounded-[12px] bg-slate-100">
        <div className="h-[390px]">
          <FallbackGallery creator={creator} />
        </div>
      </section>
    );
  }

  if (images.length === 1) {
    return (
      <section className="overflow-hidden rounded-[12px] bg-slate-100">
        <div className="h-[390px]">
          <GalleryImage
            src={images[0]}
            alt={`${creator.display_name} portfolio 1`}
            priority
          />
        </div>
      </section>
    );
  }

  if (images.length === 2) {
    return (
      <section className="overflow-hidden rounded-[12px] bg-slate-100">
        <div className="grid h-[390px] gap-1 md:grid-cols-2">
          <GalleryImage
            src={images[0]}
            alt={`${creator.display_name} portfolio 1`}
            priority
          />
          <GalleryImage
            src={images[1]}
            alt={`${creator.display_name} portfolio 2`}
          />
        </div>
      </section>
    );
  }

  if (images.length === 3) {
    return (
      <section className="overflow-hidden rounded-[12px] bg-slate-100">
        <div className="grid h-[390px] gap-1 md:grid-cols-3">
          <GalleryImage
            src={images[0]}
            alt={`${creator.display_name} portfolio 1`}
            priority
          />
          <GalleryImage
            src={images[1]}
            alt={`${creator.display_name} portfolio 2`}
          />
          <GalleryImage
            src={images[2]}
            alt={`${creator.display_name} portfolio 3`}
          />
        </div>
      </section>
    );
  }

  const leftImages = images.slice(0, 4);
  const rightImage = images[4] ?? images[0];

  return (
    <section className="overflow-hidden rounded-[12px] bg-slate-100">
      <div className="grid h-[390px] gap-1 md:grid-cols-[1fr_1fr]">
        <div className="grid grid-cols-2 grid-rows-2 gap-1">
          {leftImages.map((src, index) => (
            <GalleryImage
              key={`${src}-${index}`}
              src={src}
              alt={`${creator.display_name} portfolio ${index + 1}`}
              priority={index === 0}
            />
          ))}
        </div>

        <div className="relative">
          <GalleryImage
            src={rightImage}
            alt={`${creator.display_name} main portfolio`}
          />

          <button
            type="button"
            className="absolute bottom-4 right-4 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg"
          >
            {showAllLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  const initial = getCreatorInitial(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg"
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-orange-500 text-2xl font-black text-white shadow-lg">
      {initial}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path
        d="M20.8 5.7c-1.9-2.2-5.1-2-6.9.1L12 8l-1.9-2.2c-1.8-2.1-5-2.3-6.9-.1-2.1 2.4-1.7 6 .7 8.1l6.8 6a2 2 0 0 0 2.6 0l6.8-6c2.4-2.1 2.8-5.7.7-8.1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.8 12.7 15.4 16M15.4 8 8.8 11.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="6.5" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="17" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
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

function PackageCard({
  menu,
  selected,
  locale,
  copy,
  onSelect,
  onOrder,
}: {
  menu: MenuCard;
  selected: boolean;
  locale: "ja" | "en";
  copy: {
    priceNotSet: string;
    delivery: string;
    deliverables: string;
    secondaryUse: string;
    allowed: string;
    notAllowed: string;
    none: string;
    select: string;
    selected: string;
    orderButton: string;
  };
  onSelect: () => void;
  onOrder: () => void;
}) {
  const platform = menu.platform || menu.sns;
  const price = formatPrice(
    menu.price,
    menu.currency,
    menu.reference_price_text,
    locale
  );

  return (
    <article
      className={`rounded-[28px] border bg-white p-5 shadow-sm transition duration-200 ${
        selected
          ? "border-slate-950 ring-2 ring-slate-950/5"
          : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {platform ? (
              <Badge tone="black">
                <span className="mr-1">{getPlatformIcon(platform)}</span>
                {getPlatformLabel(platform)}
              </Badge>
            ) : null}
            <Badge tone="gray">
              {menuTypeLabel(menu.menu_type, locale, menu.category || "Menu")}
            </Badge>
          </div>

          <h3 className="text-lg font-black leading-snug text-slate-950">
            {menu.title}
          </h3>

          {menu.description ? (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
              {menu.description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onSelect}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
            selected
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-300 bg-white text-transparent hover:border-slate-950"
          }`}
          aria-label={selected ? copy.selected : copy.select}
        >
          <CheckIcon />
        </button>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Price
          </p>
          <p className="mt-1 font-black text-slate-950">{price}</p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {copy.delivery}
          </p>
          <p className="mt-1 font-black text-slate-950">
            {formatDeliveryDays(menu.delivery_days, locale, "-")}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {copy.secondaryUse}
          </p>
          <p className="mt-1 font-black text-slate-950">
            {menu.allow_secondary_use ? copy.allowed : copy.notAllowed}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {copy.deliverables}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {menu.deliverables?.trim() || copy.none}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSelect}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
            selected
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-950 hover:text-slate-950"
          }`}
        >
          {selected ? copy.selected : copy.select}
        </button>

        <button
          type="button"
          onClick={onOrder}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          {copy.orderButton}
        </button>
      </div>
    </article>
  );
}

export default function CreatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params.id as string;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            notFound:
              "クリエイターが見つかりません。現在注文受付できない状態の可能性があります。",
            backToCreators: "クリエイター一覧へ戻る",
            share: "Share",
            save: "Save",
            saved: "Saved",
            copied: "URL copied",
            followers: "Followers",
            mainAudience: "Main audience",
            profileFallback:
              "このクリエイターの公開プロフィールとメニューを確認し、条件に合うメニューを選んで注文できます。",
            packages: "Packages",
            all: "All",
            noMenus: "公開中のメニューがありません。",
            priceNotSet: "価格未設定",
            delivery: "納期",
            deliverables: "納品物",
            secondaryUse: "二次利用",
            allowed: "許可",
            notAllowed: "不可",
            none: "なし",
            selectedPackage: "選択中のメニュー",
            choosePackage: "メニューを選択",
            selected: "選択中",
            select: "選択する",
            orderButton: "注文へ進む",
            howItWorks:
              "支払いはStripeで保護され、クリエイターが72時間以内に承認した場合のみ決済が確定します。",
            billingRequired:
              "このプランの注文機能を使うには、有料プランの有効化が必要です。",
            checkBilling: "料金プランを見る",
            audience: "Audience",
            audienceNote:
              "SNS連携データをもとに、フォロワー数・平均再生数・エンゲージメント・視聴者属性を表示予定です。",
            portfolio: "Portfolio",
            portfolioNote:
              "クリエイターが登録した投稿実績・サンプル画像です。",
            plan: "Plan",
            verified: "Payout verified",
            noReviews: "New creator",
            analytics: "Analytics",
            marketplaceFee: "Marketplace fee",
            menuPrice: "Menu price",
            total: "Total",
            loginToOrder: "ログインして注文",
            noPortfolio: "No portfolio images yet",
            showAllPhotos: "Show All Photos",
          }
        : {
            loading: "Loading...",
            notFound:
              "Creator not found. This creator may not currently be ready to receive orders.",
            backToCreators: "Back to creators",
            share: "Share",
            save: "Save",
            saved: "Saved",
            copied: "URL copied",
            followers: "Followers",
            mainAudience: "Main audience",
            profileFallback:
              "Review this creator's public profile and menus, then choose a menu that fits your campaign.",
            packages: "Packages",
            all: "All",
            noMenus: "There are no public menus.",
            priceNotSet: "Price not set",
            delivery: "Delivery",
            deliverables: "Deliverables",
            secondaryUse: "Secondary use",
            allowed: "Allowed",
            notAllowed: "Not allowed",
            none: "None",
            selectedPackage: "Selected package",
            choosePackage: "Choose package",
            selected: "Selected",
            select: "Select",
            orderButton: "Continue to order",
            howItWorks:
              "Payments are protected by Stripe. The payment is captured only if the creator accepts within 72 hours.",
            billingRequired:
              "Your paid plan must be active before using this order flow.",
            checkBilling: "View billing plans",
            audience: "Audience",
            audienceNote:
              "Follower count, average views, engagement, and audience attributes can be shown here based on connected social data.",
            portfolio: "Portfolio",
            portfolioNote:
              "Past work and sample images uploaded by the creator.",
            plan: "Plan",
            verified: "Payout verified",
            noReviews: "New creator",
            analytics: "Analytics",
            marketplaceFee: "Marketplace fee",
            menuPrice: "Menu price",
            total: "Total",
            loginToOrder: "Log in to order",
            noPortfolio: "No portfolio images yet",
            showAllPhotos: "Show All Photos",
          },
    [safeLocale]
  );

  const [creator, setCreator] = useState<Creator | null>(null);
  const [menuCards, setMenuCards] = useState<MenuCard[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [activePackageTab, setActivePackageTab] = useState("all");
  const [gate, setGate] = useState<CompanyGateState>({
    isLoggedIn: false,
    canSendRequests: false,
    needsBilling: false,
    companyPlanCode: null,
  });
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!creatorId) return;

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      let nextGate: CompanyGateState = {
        isLoggedIn: !!user,
        canSendRequests: false,
        needsBilling: false,
        companyPlanCode: null,
      };

      if (user) {
        const [
          { data: roles },
          { data: userState },
          { data: activeSuspensions },
          { data: savedRows },
        ] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase
            .from("user_states")
            .select(
              `
                company_profile_completed,
                company_access_status,
                company_subscription_status,
                company_plan_code
              `
            )
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_suspensions")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", true),
          supabase
            .from("saved_creators")
            .select("creator_id")
            .eq("b_user_id", user.id)
            .eq("creator_id", creatorId),
        ]);

        const isCompany = (roles ?? []).some((r) => r.role === "company");
        const isSuspended = (activeSuspensions ?? []).length > 0;

        const companyPlanCode =
          (userState?.company_plan_code as
            | "free"
            | "standard"
            | "global_pro"
            | null) ?? "free";

        const companyAccountReady =
          isCompany &&
          !isSuspended &&
          !!userState?.company_profile_completed &&
          userState?.company_access_status === "approved";

        const isPaidPlan =
          companyPlanCode === "standard" || companyPlanCode === "global_pro";

        const canSendRequests =
          companyAccountReady &&
          (!isPaidPlan || userState?.company_subscription_status === "active");

        const needsBilling =
          companyAccountReady &&
          isPaidPlan &&
          userState?.company_subscription_status !== "active";

        nextGate = {
          isLoggedIn: true,
          canSendRequests,
          needsBilling,
          companyPlanCode,
        };

        if (isMounted) {
          setIsSaved(((savedRows ?? []) as SavedCreatorRow[]).length > 0);
        }
      }

      const { data: creatorData, error: creatorError } = await supabase
        .from("creators")
        .select(
          "id, display_name, avatar_url, category, user_id, stripe_onboarding_completed"
        )
        .eq("id", creatorId)
        .eq("is_public", true)
        .eq("approval_status", "approved")
        .eq("stripe_onboarding_completed", true)
        .maybeSingle();

      if (!isMounted) return;

      if (creatorError || !creatorData) {
        console.error("creator load error:", creatorError);
        setCreator(null);
        setMenuCards([]);
        setSocialAccounts([]);
        setPortfolioAssets([]);
        setGate(nextGate);
        setLoading(false);
        return;
      }

      setCreator(creatorData as Creator);

      const [
        { data: menuData, error: menuError },
        { data: socialData, error: socialError },
        { data: portfolioData, error: portfolioError },
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
          .select(
            "id, creator_id, platform, audience_country, follower_range, url"
          )
          .eq("creator_id", creatorData.id),
        supabase
          .from("creator_portfolio_assets")
          .select(
            "id, creator_id, asset_url, asset_type, title, sort_order, is_public, created_at"
          )
          .eq("creator_id", creatorData.id)
          .eq("is_public", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (!isMounted) return;

      const nextMenus = menuError ? [] : ((menuData as MenuCard[]) ?? []);
      const nextSocials = socialError
        ? []
        : ((socialData as SocialAccount[]) ?? []);
      const nextPortfolio = portfolioError
        ? []
        : ((portfolioData as PortfolioAsset[]) ?? []).filter(
            (asset) => asset.asset_type === "image"
          );

      if (menuError) console.error("menu load error:", menuError);
      if (socialError) console.error("social load error:", socialError);
      if (portfolioError) console.error("portfolio load error:", portfolioError);

      setMenuCards(nextMenus);
      setSocialAccounts(nextSocials);
      setPortfolioAssets(nextPortfolio);
      setSelectedMenuId((prev) => prev || nextMenus[0]?.id || "");
      setGate(nextGate);
      setLoading(false);
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [creatorId, supabase]);

  const packageTabs = useMemo(() => {
    const platforms = uniqueNonEmpty(
      menuCards.map((menu) => menu.platform || menu.sns)
    );

    return ["all", ...platforms];
  }, [menuCards]);

  const filteredMenus = useMemo(() => {
    if (activePackageTab === "all") return menuCards;

    return menuCards.filter(
      (menu) =>
        normalizePlatform(menu.platform || menu.sns) ===
        normalizePlatform(activePackageTab)
    );
  }, [menuCards, activePackageTab]);

  const selectedMenu = useMemo(() => {
    return (
      menuCards.find((menu) => menu.id === selectedMenuId) ??
      filteredMenus[0] ??
      menuCards[0] ??
      null
    );
  }, [menuCards, filteredMenus, selectedMenuId]);

  const platforms = uniqueNonEmpty(socialAccounts.map((s) => s.platform));
  const audienceCountries = uniqueNonEmpty(
    socialAccounts.map((s) => s.audience_country)
  );
  const audienceCountryLabels = audienceCountries.map((country) =>
    getCountryLabel(country, safeLocale)
  );

  const primarySocial = socialAccounts[0] ?? null;
  const portfolioImageUrls = portfolioAssets.map((asset) => asset.asset_url);

  const selectedMenuPrice = selectedMenu?.price ?? null;
  const buyerFeeRateBps = getBuyerFeeRateBps(gate.companyPlanCode);
  const buyerMarketplaceFee =
    selectedMenuPrice != null
      ? Math.round((selectedMenuPrice * buyerFeeRateBps) / 10000)
      : null;
  const estimatedTotal =
    selectedMenuPrice != null && buyerMarketplaceFee != null
      ? selectedMenuPrice + buyerMarketplaceFee
      : null;

  const selectedMenuPriceText = selectedMenu
    ? formatPrice(
        selectedMenu.price,
        selectedMenu.currency,
        selectedMenu.reference_price_text,
        safeLocale
      )
    : "-";

  const buyerMarketplaceFeeText =
    buyerMarketplaceFee != null
      ? formatPrice(
          buyerMarketplaceFee,
          selectedMenu?.currency ?? "JPY",
          null,
          safeLocale
        )
      : "-";

  const estimatedTotalText =
    estimatedTotal != null
      ? formatPrice(
          estimatedTotal,
          selectedMenu?.currency ?? "JPY",
          null,
          safeLocale
        )
      : "-";

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1600);
    } catch {
      setShareCopied(false);
    }
  };

  const toggleSaveCreator = async () => {
    if (!creator || saving) return;

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (isSaved) {
        const { error } = await supabase
          .from("saved_creators")
          .delete()
          .eq("b_user_id", user.id)
          .eq("creator_id", creator.id);

        if (error) throw error;

        setIsSaved(false);
      } else {
        const { error } = await supabase.from("saved_creators").insert({
          b_user_id: user.id,
          creator_id: creator.id,
        });

        if (error) throw error;

        setIsSaved(true);
      }
    } catch (e) {
      console.error("save creator error:", e);
    } finally {
      setSaving(false);
    }
  };

  const goToOrder = () => {
    if (!creator) return;

    if (!gate.isLoggedIn) {
      router.push("/login");
      return;
    }

    if (gate.needsBilling) {
      router.push(BILLING_PATH);
      return;
    }

    if (!selectedMenu) return;

    router.push(`/b/creators/${creator.id}/request?menuId=${selectedMenu.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-[390px] animate-pulse rounded-[12px] bg-slate-100" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-[28px] bg-slate-100" />
            <div className="h-48 animate-pulse rounded-[28px] bg-slate-100" />
          </div>
          <div className="h-72 animate-pulse rounded-[28px] bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-500">{copy.notFound}</p>
        <button
          type="button"
          onClick={() => router.push("/b/creators")}
          className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          {copy.backToCreators}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="text-2xl font-black text-slate-950">
          {creator.category || creator.display_name}
        </h1>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:text-slate-950"
          >
            <ShareIcon />
            {shareCopied ? copy.copied : copy.share}
          </button>

          <button
            type="button"
            onClick={toggleSaveCreator}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:text-slate-950 disabled:opacity-60"
          >
            <HeartIcon filled={isSaved} />
            {isSaved ? copy.saved : copy.save}
          </button>
        </div>
      </div>

      <HeroGallery
        creator={creator}
        images={portfolioImageUrls}
        showAllLabel={copy.showAllPhotos}
      />

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="-mt-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <Avatar name={creator.display_name} src={creator.avatar_url} />
                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="green">{copy.verified}</Badge>
                    <Badge tone="gray">{copy.noReviews}</Badge>
                  </div>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                    {creator.display_name}
                  </h1>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {creator.category || copy.profileFallback}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {platforms.length > 0 ? (
                platforms.map((platform) => {
                  const social = socialAccounts.find(
                    (item) =>
                      normalizePlatform(item.platform) ===
                      normalizePlatform(platform)
                  );

                  return (
                    <PlatformMetricBadge
                      key={platform}
                      platform={platform}
                      value={formatFollowerRange(social?.follower_range)}
                    />
                  );
                })
              ) : (
                <PlatformMetricBadge platform="UGC" value="UGC" />
              )}

              {audienceCountryLabels.length > 0 ? (
                <Badge tone="blue">
                  {copy.mainAudience}: {audienceCountryLabels.join(" / ")}
                </Badge>
              ) : null}
            </div>
          </div>

          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {copy.packages}
                </h2>
                <p className="mt-2 text-sm text-slate-500">{copy.howItWorks}</p>
              </div>
            </div>

            {packageTabs.length > 1 ? (
              <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                {packageTabs.map((tab) => {
                  const active = activePackageTab === tab;

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActivePackageTab(tab)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                        active
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-950 hover:text-slate-950"
                      }`}
                    >
                      {tab === "all" ? copy.all : getPlatformLabel(tab)}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {filteredMenus.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  {copy.noMenus}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredMenus.map((menu) => (
                  <PackageCard
                    key={menu.id}
                    menu={menu}
                    selected={selectedMenu?.id === menu.id}
                    locale={safeLocale}
                    copy={{
                      priceNotSet: copy.priceNotSet,
                      delivery: copy.delivery,
                      deliverables: copy.deliverables,
                      secondaryUse: copy.secondaryUse,
                      allowed: copy.allowed,
                      notAllowed: copy.notAllowed,
                      none: copy.none,
                      select: copy.select,
                      selected: copy.selected,
                      orderButton: copy.orderButton,
                    }}
                    onSelect={() => setSelectedMenuId(menu.id)}
                    onOrder={() => {
                      setSelectedMenuId(menu.id);
                      window.setTimeout(goToOrder, 0);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                {copy.audience}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {copy.audienceNote}
              </p>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {copy.followers}
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {primarySocial?.follower_range || "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {copy.mainAudience}
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {audienceCountryLabels.join(" / ") || "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {copy.analytics}
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    API ready
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                {copy.portfolio}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {copy.portfolioNote}
              </p>

              {portfolioImageUrls.length > 0 ? (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {portfolioImageUrls.slice(0, 6).map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="aspect-square overflow-hidden rounded-2xl bg-slate-100"
                    >
                      <img
                        src={url}
                        alt={`${creator.display_name} portfolio ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
                  {copy.noPortfolio}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[rgba(120,120,170,0.18)_0_18px_50px_-24px]">
            <p className="text-sm font-bold text-slate-500">
              {copy.selectedPackage}
            </p>

            <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">
              {selectedMenu?.title || copy.choosePackage}
            </h2>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">{copy.menuPrice}</span>
                <span className="text-sm font-black text-slate-950">
                  {selectedMenuPriceText}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  {copy.marketplaceFee}
                </span>
                <span className="text-sm font-black text-slate-950">
                  {buyerMarketplaceFeeText}
                </span>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-700">
                    {copy.total}
                  </span>
                  <span className="text-xl font-black text-slate-950">
                    {estimatedTotalText}
                  </span>
                </div>
              </div>
            </div>

            {selectedMenu ? (
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span>
                    {copy.delivery}:{" "}
                    {formatDeliveryDays(selectedMenu.delivery_days, safeLocale, "-")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span>{copy.howItWorks}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span>
                    {copy.plan}: {getPlanLabel(gate.companyPlanCode, safeLocale)}
                  </span>
                </div>
              </div>
            ) : null}

            {gate.needsBilling ? (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
                {copy.billingRequired}
              </div>
            ) : null}

            <button
              type="button"
              onClick={goToOrder}
              disabled={!selectedMenu}
              className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!gate.isLoggedIn
                ? copy.loginToOrder
                : gate.needsBilling
                ? copy.checkBilling
                : copy.orderButton}
            </button>

            <button
              type="button"
              onClick={() => router.push("/b/creators")}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              {copy.backToCreators}
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}