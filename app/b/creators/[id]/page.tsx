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

type CompanyGateState = {
  isLoggedIn: boolean;
  canSendRequests: boolean;
  needsBilling: boolean;
  companyPlanCode: "free" | "standard" | "global_pro" | null;
};

type SavedCreatorRow = {
  creator_id: string;
};

function cleanCountryInput(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  const normalized = raw
    .toLowerCase()
    .replace(/\u3000/g, " ")
    .replace(/[_\-/:|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const compact = normalized.replace(/\s+/g, "");

  if (
    normalized === "日本" ||
    normalized === "japan" ||
    normalized === "jp" ||
    normalized === "jpn" ||
    normalized.startsWith("jp ") ||
    compact === "jp日本" ||
    compact === "japan日本" ||
    compact.includes("日本")
  ) {
    return "japan";
  }

  if (
    normalized === "韓国" ||
    normalized === "korea" ||
    normalized === "south korea" ||
    normalized === "republic of korea" ||
    normalized === "kr" ||
    normalized.startsWith("kr ") ||
    compact === "kr韓国" ||
    compact.includes("韓国")
  ) {
    return "korea";
  }

  if (
    normalized === "台湾" ||
    normalized === "taiwan" ||
    normalized === "tw" ||
    normalized.startsWith("tw ") ||
    compact === "tw台湾" ||
    compact.includes("台湾")
  ) {
    return "taiwan";
  }

  if (
    normalized === "香港" ||
    normalized === "hong kong" ||
    normalized === "hk" ||
    normalized.startsWith("hk ") ||
    compact === "hk香港" ||
    compact.includes("香港")
  ) {
    return "hong_kong";
  }

  if (
    normalized === "中国" ||
    normalized === "china" ||
    normalized === "cn" ||
    normalized.startsWith("cn ") ||
    compact === "cn中国" ||
    compact.includes("中国")
  ) {
    return "china";
  }

  if (
    normalized === "タイ" ||
    normalized === "thailand" ||
    normalized === "th" ||
    normalized.startsWith("th ") ||
    compact === "thタイ" ||
    compact.includes("タイ")
  ) {
    return "thailand";
  }

  if (
    normalized === "ベトナム" ||
    normalized === "vietnam" ||
    normalized === "vn" ||
    normalized.startsWith("vn ") ||
    compact === "vnベトナム" ||
    compact.includes("ベトナム")
  ) {
    return "vietnam";
  }

  if (
    normalized === "インドネシア" ||
    normalized === "indonesia" ||
    normalized === "id" ||
    normalized.startsWith("id ") ||
    compact.includes("インドネシア")
  ) {
    return "indonesia";
  }

  if (
    normalized === "フィリピン" ||
    normalized === "philippines" ||
    normalized === "ph" ||
    normalized.startsWith("ph ") ||
    compact.includes("フィリピン")
  ) {
    return "philippines";
  }

  if (
    normalized === "マレーシア" ||
    normalized === "malaysia" ||
    normalized === "my" ||
    normalized.startsWith("my ") ||
    compact.includes("マレーシア")
  ) {
    return "malaysia";
  }

  if (
    normalized === "シンガポール" ||
    normalized === "singapore" ||
    normalized === "sg" ||
    normalized.startsWith("sg ") ||
    compact.includes("シンガポール")
  ) {
    return "singapore";
  }

  if (
    normalized === "インド" ||
    normalized === "india" ||
    normalized === "in" ||
    normalized.startsWith("in ") ||
    compact.includes("インド")
  ) {
    return "india";
  }

  if (
    normalized === "uae" ||
    normalized === "ae" ||
    normalized.startsWith("ae ") ||
    compact.includes("uae")
  ) {
    return "uae";
  }

  if (
    normalized === "サウジアラビア" ||
    normalized === "saudi arabia" ||
    normalized === "sa" ||
    normalized.startsWith("sa ") ||
    compact.includes("サウジアラビア")
  ) {
    return "saudi_arabia";
  }

  if (
    normalized === "アメリカ" ||
    normalized === "united states" ||
    normalized === "usa" ||
    normalized === "us" ||
    normalized.startsWith("us ") ||
    compact.includes("アメリカ")
  ) {
    return "united_states";
  }

  if (
    normalized === "カナダ" ||
    normalized === "canada" ||
    normalized === "ca" ||
    normalized.startsWith("ca ") ||
    compact.includes("カナダ")
  ) {
    return "canada";
  }

  if (
    normalized === "イギリス" ||
    normalized === "united kingdom" ||
    normalized === "uk" ||
    normalized === "gb" ||
    normalized.startsWith("uk ") ||
    compact.includes("イギリス")
  ) {
    return "united_kingdom";
  }

  if (
    normalized === "フランス" ||
    normalized === "france" ||
    normalized === "fr" ||
    normalized.startsWith("fr ") ||
    compact.includes("フランス")
  ) {
    return "france";
  }

  if (
    normalized === "ドイツ" ||
    normalized === "germany" ||
    normalized === "de" ||
    normalized.startsWith("de ") ||
    compact.includes("ドイツ")
  ) {
    return "germany";
  }

  if (
    normalized === "イタリア" ||
    normalized === "italy" ||
    normalized === "it" ||
    normalized.startsWith("it ") ||
    compact.includes("イタリア")
  ) {
    return "italy";
  }

  if (
    normalized === "スペイン" ||
    normalized === "spain" ||
    normalized === "es" ||
    normalized.startsWith("es ") ||
    compact.includes("スペイン")
  ) {
    return "spain";
  }

  if (
    normalized === "オーストラリア" ||
    normalized === "australia" ||
    normalized === "au" ||
    normalized.startsWith("au ") ||
    compact.includes("オーストラリア")
  ) {
    return "australia";
  }

  if (
    normalized === "その他" ||
    normalized === "other" ||
    compact.includes("その他")
  ) {
    return "other";
  }

  return raw;
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))
  );
}

function getCountryLabel(
  country: string | null | undefined,
  locale: "ja" | "en"
) {
  const cleaned = cleanCountryInput(country);

  const jaMap: Record<string, string> = {
    japan: "日本",
    korea: "韓国",
    taiwan: "台湾",
    hong_kong: "香港",
    china: "中国",
    thailand: "タイ",
    vietnam: "ベトナム",
    indonesia: "インドネシア",
    philippines: "フィリピン",
    malaysia: "マレーシア",
    singapore: "シンガポール",
    india: "インド",
    uae: "UAE",
    saudi_arabia: "サウジアラビア",
    united_states: "アメリカ",
    canada: "カナダ",
    united_kingdom: "イギリス",
    france: "フランス",
    germany: "ドイツ",
    italy: "イタリア",
    spain: "スペイン",
    australia: "オーストラリア",
    other: "その他",
  };

  const enMap: Record<string, string> = {
    japan: "Japan",
    korea: "Korea",
    taiwan: "Taiwan",
    hong_kong: "Hong Kong",
    china: "China",
    thailand: "Thailand",
    vietnam: "Vietnam",
    indonesia: "Indonesia",
    philippines: "Philippines",
    malaysia: "Malaysia",
    singapore: "Singapore",
    india: "India",
    uae: "UAE",
    saudi_arabia: "Saudi Arabia",
    united_states: "United States",
    canada: "Canada",
    united_kingdom: "United Kingdom",
    france: "France",
    germany: "Germany",
    italy: "Italy",
    spain: "Spain",
    australia: "Australia",
    other: "Other",
  };

  return locale === "ja"
    ? jaMap[cleaned] ?? ((country ?? "").trim() || "不明")
    : enMap[cleaned] ?? ((country ?? "").trim() || "Unknown");
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

  if (normalized.includes("instagram")) return "◎";
  if (normalized.includes("tiktok")) return "♪";
  if (normalized.includes("youtube")) return "▶";
  if (normalized === "x" || normalized.includes("twitter")) return "𝕏";
  if (normalized.includes("ugc")) return "▣";

  return "●";
}

function getCreatorInitial(name: string) {
  return (name || "C").trim().slice(0, 1).toUpperCase();
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

function HeroTile({
  creator,
  index,
  src,
}: {
  creator: Creator;
  index: number;
  src: string | null;
}) {
  const gradients = [
    "from-slate-950 via-slate-700 to-slate-300",
    "from-orange-500 via-amber-400 to-yellow-200",
    "from-blue-500 via-violet-400 to-pink-200",
  ];

  if (src) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-slate-100">
        <img
          src={src}
          alt={creator.display_name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${
        gradients[index % gradients.length]
      }`}
    >
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

function Avatar({ name, src }: { name: string; src: string | null }) {
  const initial = getCreatorInitial(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-orange-500 text-2xl font-black text-white shadow-lg">
      {initial}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M5 7.5 10 12l5-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
            creatorUnavailable:
              "このクリエイターは現在、報酬受け取り設定または公開準備が完了していないため、企業側には表示されません。",
            share: "Share",
            save: "Save",
            saved: "Saved",
            copied: "URL copied",
            invite: "注文へ進む",
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
            orderButton: "注文へ進む",
            negotiate: "条件を相談する",
            howItWorks: "支払いはStripeで保護され、クリエイター承認後に案件が開始します。",
            billingRequired:
              "このプランの注文機能を使うには、有料プランの有効化が必要です。",
            checkBilling: "料金プランを見る",
            audience: "Audience",
            audienceNote:
              "詳細な分析データは今後、SNS連携・実績データに応じて表示予定です。",
            portfolio: "Portfolio",
            portfolioNote:
              "投稿実績やサンプル動画は、今後クリエイターのポートフォリオ機能として追加できます。",
            plan: "Plan",
            notSet: "Not set",
          }
        : {
            loading: "Loading...",
            notFound:
              "Creator not found. This creator may not be ready to receive orders.",
            backToCreators: "Back to creators",
            creatorUnavailable:
              "This creator is not currently visible to companies because payout setup or public readiness is not complete.",
            share: "Share",
            save: "Save",
            saved: "Saved",
            copied: "URL copied",
            invite: "Order now",
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
            orderButton: "Continue to order",
            negotiate: "Negotiate a package",
            howItWorks:
              "Payments are protected by Stripe. The project starts after creator approval.",
            billingRequired:
              "Your paid plan must be active before using this order flow.",
            checkBilling: "View billing plans",
            audience: "Audience",
            audienceNote:
              "Detailed analytics can be displayed later based on SNS connections and performance data.",
            portfolio: "Portfolio",
            portfolioNote:
              "Past work and sample videos can be added later as the creator portfolio feature.",
            plan: "Plan",
            notSet: "Not set",
          },
    [safeLocale]
  );

  const [creator, setCreator] = useState<Creator | null>(null);
  const [menuCards, setMenuCards] = useState<MenuCard[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
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
        setGate(nextGate);
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
          .select(
            "id, creator_id, platform, audience_country, follower_range, url"
          )
          .eq("creator_id", creatorData.id),
      ]);

      if (!isMounted) return;

      const nextMenus = menuError ? [] : ((menuData as MenuCard[]) ?? []);
      const nextSocials = socialError
        ? []
        : ((socialData as SocialAccount[]) ?? []);

      if (menuError) console.error("menu load error:", menuError);
      if (socialError) console.error("social load error:", socialError);

      setMenuCards(nextMenus);
      setSocialAccounts(nextSocials);
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
  const followerLabel = primarySocial?.follower_range?.trim() || "—";

  const goToBilling = () => {
    if (!creator) return;
    router.push(
      `${BILLING_PATH}?from=${encodeURIComponent(`/b/creators/${creator.id}`)}`
    );
  };

  const handleOrderClick = (menuId?: string) => {
    if (!creator) return;

    if (!gate.isLoggedIn) {
      router.push("/login");
      return;
    }

    if (gate.canSendRequests) {
      const url = menuId
        ? `/b/creators/${creator.id}/request?menuId=${menuId}`
        : `/b/creators/${creator.id}/request`;
      router.push(url);
      return;
    }

    if (gate.needsBilling) {
      goToBilling();
      return;
    }

    router.push("/b/dashboard");
  };

  const toggleSaveCreator = async () => {
    if (!creator || saving) return;

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
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

  const shareCreator = async () => {
    if (typeof window === "undefined") return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1600);
    } catch (e) {
      console.error("share error:", e);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <p className="text-sm text-slate-500">{copy.loading}</p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            {copy.notFound}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {copy.creatorUnavailable}
          </p>
          <button
            type="button"
            onClick={() => router.push("/b/creators")}
            className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {copy.backToCreators}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-xl font-black tracking-tight text-slate-950 md:text-2xl">
          {creator.category || "Influencer / Content Creator"}
        </h1>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={shareCreator}
            className="text-sm font-semibold text-slate-700 transition hover:text-slate-950"
          >
            {shareCopied ? copy.copied : `↗ ${copy.share}`}
          </button>

          <button
            type="button"
            onClick={toggleSaveCreator}
            disabled={saving}
            className="text-sm font-semibold text-slate-700 transition hover:text-slate-950 disabled:opacity-60"
          >
            {isSaved ? `♥ ${copy.saved}` : `♡ ${copy.save}`}
          </button>

          <button
            type="button"
            onClick={() => handleOrderClick(selectedMenu?.id)}
            className="hidden rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:inline-flex"
          >
            {copy.invite}
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[6px] bg-white">
        <div className="grid h-[300px] gap-1 md:h-[420px] md:grid-cols-3">
          <HeroTile creator={creator} index={0} src={creator.avatar_url} />
          <HeroTile creator={creator} index={1} src={null} />
          <div className="relative">
            <HeroTile creator={creator} index={2} src={creator.avatar_url} />
            <button
              type="button"
              className="absolute bottom-4 right-4 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950 shadow-lg"
            >
              ▦ Show Photos
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_410px]">
        <main className="min-w-0">
          <section className="border-b border-slate-200 py-6">
            <div className="flex items-start gap-4">
              <Avatar name={creator.display_name} src={creator.avatar_url} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-2xl font-black tracking-tight text-slate-950">
                    {creator.display_name}
                  </h2>
                  <span className="text-lg text-amber-400">★</span>
                  <span className="text-sm font-bold text-slate-900">5.0</span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {audienceCountryLabels.length > 0
                    ? audienceCountryLabels.join(" / ")
                    : copy.notSet}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {socialAccounts.length > 0 ? (
                    socialAccounts.map((account) => (
                      <a
                        key={account.id}
                        href={account.url || "#"}
                        target={account.url ? "_blank" : undefined}
                        rel={account.url ? "noreferrer" : undefined}
                        onClick={(e) => {
                          if (!account.url) e.preventDefault();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                      >
                        <span>{getPlatformIcon(account.platform)}</span>
                        <span>
                          {account.follower_range?.trim() ||
                            getPlatformLabel(account.platform)}
                        </span>
                      </a>
                    ))
                  ) : (
                    <Badge>{copy.notSet}</Badge>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-8 text-slate-700">
              {copy.profileFallback}
            </p>
          </section>

          <section className="border-b border-slate-200 py-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {copy.packages}
            </h2>

            <div className="mt-5 flex flex-wrap gap-7 border-b border-slate-200">
              {packageTabs.map((tab) => {
                const active = activePackageTab === tab;
                const label =
                  tab === "all" ? copy.all : getPlatformLabel(tab);

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivePackageTab(tab)}
                    className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-black transition ${
                      active
                        ? "border-slate-950 text-slate-950"
                        : "border-transparent text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    {tab !== "all" ? (
                      <span>{getPlatformIcon(tab)}</span>
                    ) : null}
                    {label}
                  </button>
                );
              })}
            </div>

            {filteredMenus.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">
                {copy.noMenus}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filteredMenus.map((menu) => {
                  const isSelected = selectedMenu?.id === menu.id;
                  const platformLabel = menu.platform || menu.sns || copy.notSet;
                  const price = formatPrice(
                    menu.price,
                    menu.currency,
                    menu.reference_price_text,
                    safeLocale
                  );

                  return (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => setSelectedMenuId(menu.id)}
                      className={`w-full rounded-[16px] border bg-white p-5 text-left transition hover:border-slate-400 ${
                        isSelected
                          ? "border-slate-950 shadow-sm"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">
                              {getPlatformIcon(platformLabel)}
                            </span>
                            <h3 className="truncate text-xl font-black text-slate-950">
                              {menu.title}
                            </h3>
                          </div>

                          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                            {menu.description?.trim() ||
                              menu.deliverables?.trim() ||
                              copy.none}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge>
                              {getPlatformLabel(platformLabel)}
                            </Badge>
                            <Badge tone="blue">
                              {menuTypeLabel(
                                menu.menu_type,
                                safeLocale,
                                copy.notSet
                              )}
                            </Badge>
                            {menu.delivery_days != null ? (
                              <Badge tone="green">
                                {copy.delivery}:{" "}
                                {formatDeliveryDays(
                                  menu.delivery_days,
                                  safeLocale,
                                  copy.notSet
                                )}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          <span className="text-xl font-black text-slate-950">
                            {price}
                          </span>
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            <CheckIcon />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="border-b border-slate-200 py-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {copy.audience}
            </h2>

            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {copy.mainAudience}
                </h3>

                <div className="mt-5 space-y-4">
                  {audienceCountryLabels.length > 0 ? (
                    audienceCountryLabels.map((country, index) => (
                      <div key={`${country}-${index}`}>
                        <div className="mb-2 flex justify-between text-sm font-semibold">
                          <span>{country}</span>
                          <span>
                            {Math.max(
                              10,
                              Math.round(100 / audienceCountryLabels.length)
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-300"
                            style={{
                              width: `${Math.max(
                                10,
                                Math.round(100 / audienceCountryLabels.length)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">{copy.notSet}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {copy.followers}
                </h3>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-3xl font-black text-slate-950">
                      {followerLabel}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {copy.followers}
                    </p>
                  </div>

                  <div>
                    <p className="text-3xl font-black text-slate-950">—</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Average Views
                    </p>
                  </div>

                  <div>
                    <p className="text-3xl font-black text-slate-950">—</p>
                    <p className="mt-1 text-sm text-slate-500">Engagement</p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-500">
                  {copy.audienceNote}
                </p>
              </div>
            </div>
          </section>

          <section className="py-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {copy.portfolio}
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="aspect-[9/12] overflow-hidden rounded-[16px] bg-slate-100"
                >
                  <HeroTile creator={creator} index={index} src={index === 0 ? creator.avatar_url : null} />
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-500">
              {copy.portfolioNote}
            </p>
          </section>
        </main>

        <aside className="lg:relative">
          <div className="sticky top-28 rounded-[10px] border border-slate-200 bg-white p-5 shadow-lg">
            {selectedMenu ? (
              <>
                <p className="text-3xl font-black tracking-tight text-slate-950">
                  {formatPrice(
                    selectedMenu.price,
                    selectedMenu.currency,
                    selectedMenu.reference_price_text,
                    safeLocale
                  )}
                </p>

                <div className="relative mt-5">
                  <select
                    value={selectedMenu.id}
                    onChange={(e) => setSelectedMenuId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-base font-black text-slate-950 outline-none transition focus:border-slate-950"
                  >
                    {menuCards.map((menu) => (
                      <option key={menu.id} value={menu.id}>
                        {getPlatformIcon(menu.platform || menu.sns)} {menu.title}
                      </option>
                    ))}
                  </select>

                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <ChevronDownIcon />
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  {selectedMenu.description?.trim() ||
                    selectedMenu.deliverables?.trim() ||
                    copy.none}
                </p>

                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">{copy.delivery}</span>
                    <span className="font-bold text-slate-950">
                      {formatDeliveryDays(
                        selectedMenu.delivery_days,
                        safeLocale,
                        copy.notSet
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">{copy.secondaryUse}</span>
                    <span className="font-bold text-slate-950">
                      {selectedMenu.allow_secondary_use
                        ? copy.allowed
                        : copy.notAllowed}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">{copy.plan}</span>
                    <span className="font-bold text-slate-950">
                      {getPlanLabel(gate.companyPlanCode, safeLocale)}
                    </span>
                  </div>
                </div>

                {gate.needsBilling ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    {copy.billingRequired}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleOrderClick(selectedMenu.id)}
                  className="mt-5 w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {gate.needsBilling ? copy.checkBilling : copy.orderButton}
                </button>

                <div className="my-5 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-sm text-slate-400">or</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={() => handleOrderClick(undefined)}
                  className="w-full text-center text-sm font-black text-slate-800 underline underline-offset-4 transition hover:text-slate-950"
                >
                  {copy.negotiate}
                </button>

                <p className="mt-6 text-center text-sm leading-6 text-slate-500">
                  ⓘ {copy.howItWorks}
                </p>
              </>
            ) : (
              <div className="py-10 text-center">
                <p className="text-lg font-black text-slate-950">
                  {copy.choosePackage}
                </p>
                <p className="mt-2 text-sm text-slate-500">{copy.noMenus}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}