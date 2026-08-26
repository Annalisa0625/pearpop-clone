// File: app/b/creators/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import CompanySignupGateModal from "@/components/CompanySignupGateModal";

const BILLING_PATH = "/b/billing";

type Creator = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  category: string | null;
  user_id: string;
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

type PayoutReadyCreatorRow = {
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

  if (normalized.includes("ugc")) return "UGC";

  return "SNS";
}

function getCreatorInitial(name: string) {
  return (name || "I").trim().slice(0, 1).toUpperCase();
}

function getCountryLabel(
  country: string | null | undefined,
  locale: "ja" | "en"
) {
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

function menuTypeLabel(
  value: string | null,
  locale: "ja" | "en",
  fallback: string
) {
  const labels: Record<string, { ja: string; en: string }> = {
    post: { ja: "投稿", en: "Post" },
    short_video: { ja: "ショート動画", en: "Short video" },
    story: { ja: "ストーリーズ", en: "Story" },
    video: { ja: "動画", en: "Video" },
    ugc: { ja: "UGC", en: "UGC" },
    package: { ja: "セット", en: "Package" },
    other: { ja: "その他", en: "Other" },
  };

  return labels[value || ""]?.[locale] || fallback;
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function PlatformMetricBadge({
  platform,
  value,
  url,
}: {
  platform: string | null | undefined;
  value: string | null | undefined;
  url?: string | null;
}) {
  const content = (
    <>
      <span>{getPlatformIcon(platform)}</span>
      <span>{value?.trim() || getPlatformLabel(platform)}</span>
    </>
  );

  if (url?.trim()) {
    return (
      <a
        href={url.trim()}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        title={getPlatformLabel(platform)}
      >
        {content}
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-black text-slate-900 shadow-sm">
      {content}
    </span>
  );
}

function PlatformPill({ platform }: { platform: string | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-900 shadow-sm">
      <span>{getPlatformIcon(platform)}</span>
      <span>{getPlatformLabel(platform)}</span>
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
          Trendre Influencer
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

          <div className="absolute bottom-4 right-4 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg">
            {showAllLabel}
          </div>
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
}: {
  menu: MenuCard;
  selected: boolean;
  locale: "ja" | "en";
  copy: {
    select: string;
    selected: string;
  };
  onSelect: () => void;
}) {
  const platform = menu.platform || menu.sns;
  const price = formatPrice(
    menu.price,
    menu.currency,
    menu.reference_price_text,
    locale
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-[22px] border px-4 py-4 text-left transition duration-200 ${
        selected
          ? "border-[#ff5f67]/55 bg-rose-50/40 shadow-[0_16px_38px_rgba(255,95,103,0.10)] ring-3 ring-rose-100/70"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_38px_rgba(15,23,42,0.055)]"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
           {platform ? <PlatformPill platform={platform} /> : null}

{menu.menu_type ? (
  <Badge tone="gray">
    {menuTypeLabel(
      menu.menu_type,
      locale,
      locale === "ja" ? "メニュー" : "Menu"
    )}
  </Badge>
) : null}
          </div>

          <h3 className="line-clamp-2 text-lg font-black leading-snug tracking-[-0.03em] text-slate-950">
            {menu.title}
          </h3>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:min-w-[140px] sm:flex-col sm:items-end">
          <p className="whitespace-nowrap text-lg font-black tracking-[-0.03em] text-slate-950">
            {price}
          </p>

          <span
            className={`inline-flex h-8 min-w-[78px] items-center justify-center gap-1 rounded-full px-3 text-[11px] font-black transition ${
              selected
                ? "bg-[#ff5f67] text-white shadow-lg shadow-rose-500/20"
                : "bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white"
            }`}
          >
            {selected ? (
              <>
                <CheckIcon />
                {copy.selected}
              </>
            ) : (
              copy.select
            )}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function CreatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params.id as string;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";
  const orderSummaryAnchorRef = useRef<HTMLDivElement | null>(null);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            notFound:
              "インフルエンサーが見つかりません。現在注文受付できない状態の可能性があります。",
            backToCreators: "インフルエンサーを探す",
            share: "Share",
            save: "Save",
            saved: "Saved",
            copied: "URL copied",
            packages: "メニュー",
            all: "All",
            noMenus: "公開中のメニューがありません。",
            selectedPackage: "選択したメニュー",
            choosePackage: "メニューを選ぶ",
            selected: "選択中",
            select: "選択する",
            orderButton: "依頼する",
            howItWorks:
              "支払いはStripeで管理され、インフルエンサーが72時間以内に承認した場合のみ決済が確定します。",
            billingRequired:
              "このプランの注文機能を使うには、有料プランの有効化が必要です。",
            checkBilling: "料金プランを見る",
            portfolio: "Portfolio",
            marketplaceFee: "Trend Mart手数料",
            menuPrice: "メニュー価格",
            total: "お支払い合計",
            signupToOrder: "依頼する",
            noPortfolio: "No portfolio images yet",
            showAllPhotos: "Show All Photos",
          }
        : {
            notFound:
              "Influencer not found. This influencer may not currently be ready to receive orders.",
            backToCreators: "Find influencers",
            share: "Share",
            save: "Save",
            saved: "Saved",
            copied: "URL copied",
            packages: "Menus",
            all: "All",
            noMenus: "There are no public menus.",
            selectedPackage: "Selected menu",
            choosePackage: "Choose a menu",
            selected: "Selected",
            select: "Select",
            orderButton: "Request",
            howItWorks:
              "Payments are protected by Stripe. The payment is captured only if the influencer accepts within 72 hours.",
            billingRequired:
              "Your paid plan must be active before using this order flow.",
            checkBilling: "View billing plans",
            portfolio: "Portfolio",
            marketplaceFee: "Trend Mart fee",
            menuPrice: "Menu price",
            total: "Total",
            signupToOrder: "Request",
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
  const [selectedMenuId, setSelectedMenuId] = useState("");
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
  const [signupGateOpen, setSignupGateOpen] = useState(false);
  const [signupGateNextPath, setSignupGateNextPath] = useState("");
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<
    number | null
  >(null);
  const [orderSummaryFloating, setOrderSummaryFloating] = useState(false);

  const openSignupGate = () => {
    const nextPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : `/b/creators/${creatorId}`;

    setSignupGateNextPath(nextPath);
    setSignupGateOpen(true);
  };

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

      const { data: payoutReadyRows, error: payoutReadyError } =
        await supabase.rpc("get_payout_ready_creator_ids");

      if (!isMounted) return;

      if (payoutReadyError) {
        console.error("payout ready creator rpc error:", payoutReadyError);
        setCreator(null);
        setMenuCards([]);
        setSocialAccounts([]);
        setPortfolioAssets([]);
        setGate(nextGate);
        setLoading(false);
        return;
      }

      const isPayoutReady = ((payoutReadyRows ?? []) as PayoutReadyCreatorRow[]).some(
  (row) => row.creator_id === creatorId
);
      if (!isPayoutReady) {
        setCreator(null);
        setMenuCards([]);
        setSocialAccounts([]);
        setPortfolioAssets([]);
        setGate(nextGate);
        setLoading(false);
        return;
      }

      const { data: creatorData, error: creatorError } = await supabase
        .from("creators")
        .select("id, display_name, avatar_url, category, user_id")
        .eq("id", creatorId)
        .eq("is_public", true)
        .eq("approval_status", "approved")
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

  useEffect(() => {
    if (!creator) return;

    const updateFloatingState = () => {
      const anchor = orderSummaryAnchorRef.current;
      if (!anchor) {
        setOrderSummaryFloating(false);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      setOrderSummaryFloating(rect.top <= 112);
    };

    updateFloatingState();

    window.addEventListener("scroll", updateFloatingState, { passive: true });
    window.addEventListener("resize", updateFloatingState);

    return () => {
      window.removeEventListener("scroll", updateFloatingState);
      window.removeEventListener("resize", updateFloatingState);
    };
  }, [creator]);

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
        openSignupGate();
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
      console.error("save influencer error:", e);
    } finally {
      setSaving(false);
    }
  };

  const goToOrder = () => {
    if (!creator) return;

    if (!gate.isLoggedIn) {
      openSignupGate();
      return;
    }

    if (gate.needsBilling) {
      router.push(BILLING_PATH);
      return;
    }

    if (!selectedMenu) return;

    router.push(`/b/creators/${creator.id}/request?menuId=${selectedMenu.id}`);
  };

  const selectedPortfolioUrl =
    selectedPortfolioIndex !== null
      ? portfolioImageUrls[selectedPortfolioIndex] ?? null
      : null;

  const openPortfolio = (index: number) => {
    setSelectedPortfolioIndex(index);
  };

  const closePortfolio = () => {
    setSelectedPortfolioIndex(null);
  };

  const showPrevPortfolio = () => {
    setSelectedPortfolioIndex((current) => {
      if (current === null || portfolioImageUrls.length === 0) return current;
      return current === 0 ? portfolioImageUrls.length - 1 : current - 1;
    });
  };

  const showNextPortfolio = () => {
    setSelectedPortfolioIndex((current) => {
      if (current === null || portfolioImageUrls.length === 0) return current;
      return current === portfolioImageUrls.length - 1 ? 0 : current + 1;
    });
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

  const renderOrderSummaryCard = () => (
    <div className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-100/80">
      <p className="text-sm font-bold text-slate-500">{copy.selectedPackage}</p>

      <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950">
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
          <span className="text-sm text-slate-500">{copy.marketplaceFee}</span>
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
        <div className="mt-5 rounded-2xl bg-emerald-50/70 p-4 text-sm font-semibold leading-6 text-slate-700">
          <div className="flex gap-2">
            <span className="mt-0.5 text-emerald-600">
              <CheckIcon />
            </span>
            <span>{copy.howItWorks}</span>
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
        className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#ff3b5c] via-[#ff5f8a] to-[#7c3aed] px-5 py-4 text-base font-black text-white shadow-[0_18px_45px_rgba(255,59,92,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(124,58,237,0.28)] disabled:cursor-not-allowed disabled:from-slate-200 disabled:via-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none"
      >
        {!gate.isLoggedIn
          ? copy.signupToOrder
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
  );

  return (
    <div className="space-y-10 pb-12">
      <div className="flex justify-end">
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

      <div ref={orderSummaryAnchorRef} className="h-px" />

      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="-mt-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <Avatar name={creator.display_name} src={creator.avatar_url} />

                <div className="pb-1">
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                    {creator.display_name}
                  </h1>
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
                      url={social?.url}
                    />
                  );
                })
              ) : (
                <PlatformMetricBadge platform="UGC" value="UGC" />
              )}

              {audienceCountryLabels.length > 0 ? (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                  {audienceCountryLabels.join(" / ")}
                </span>
              ) : null}
            </div>
          </div>

          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                {copy.packages}
              </h2>
              <p className="mt-2 text-sm text-slate-500">{copy.howItWorks}</p>
            </div>

            {packageTabs.length > 1 ? (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
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
              <div className="space-y-3">
                {filteredMenus.map((menu) => (
                  <PackageCard
                    key={menu.id}
                    menu={menu}
                    selected={selectedMenu?.id === menu.id}
                    locale={safeLocale}
                    copy={{
                      select: copy.select,
                      selected: copy.selected,
                    }}
                    onSelect={() => setSelectedMenuId(menu.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="lg:hidden">{renderOrderSummaryCard()}</div>

          <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              {copy.portfolio}
            </h2>

            {portfolioImageUrls.length > 0 ? (
              <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {portfolioImageUrls.slice(0, 12).map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => openPortfolio(index)}
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
                    aria-label={`Open portfolio image ${index + 1}`}
                  >
                    <img
                      src={url}
                      alt={`${creator.display_name} portfolio ${index + 1}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="absolute inset-0 bg-slate-950/0 transition group-hover:bg-slate-950/20" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
                {copy.noPortfolio}
              </div>
            )}
          </section>
        </div>

        <aside className="hidden lg:block">
          <div
            className={`transition-opacity duration-200 ${
              orderSummaryFloating
                ? "pointer-events-none opacity-0"
                : "lg:sticky lg:top-[112px] lg:z-20"
            }`}
          >
            {renderOrderSummaryCard()}
          </div>
        </aside>
      </section>

      {orderSummaryFloating ? (
        <div
          className="fixed top-[112px] z-40 hidden w-[380px] lg:block"
          style={{
            right: "max(2rem, calc((100vw - 1280px) / 2 + 2rem))",
          }}
        >
          {renderOrderSummaryCard()}
        </div>
      ) : null}

      {selectedPortfolioUrl ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={closePortfolio}
        >
          <button
            type="button"
            onClick={closePortfolio}
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-2xl font-black text-slate-700 shadow-xl transition hover:scale-105 hover:text-slate-950"
            aria-label="Close portfolio image"
          >
            ×
          </button>

          {portfolioImageUrls.length > 1 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showPrevPortfolio();
              }}
              className="absolute left-5 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl font-black text-slate-800 shadow-xl transition hover:scale-105 md:flex"
              aria-label="Previous portfolio image"
            >
              ‹
            </button>
          ) : null}

          <div
            className="relative max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white p-2 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={selectedPortfolioUrl}
              alt={`${creator.display_name} portfolio enlarged`}
              className="max-h-[82vh] w-full rounded-[22px] object-contain"
            />
          </div>

          {portfolioImageUrls.length > 1 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showNextPortfolio();
              }}
              className="absolute right-5 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl font-black text-slate-800 shadow-xl transition hover:scale-105 md:flex"
              aria-label="Next portfolio image"
            >
              ›
            </button>
          ) : null}
        </div>
      ) : null}

      <CompanySignupGateModal
        open={signupGateOpen}
        nextPath={signupGateNextPath}
        locale={safeLocale}
        onClose={() => setSignupGateOpen(false)}
      />
    </div>
  );
}