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
};

type CompanyGateState = {
  isLoggedIn: boolean;
  canSendRequests: boolean;
  needsBilling: boolean;
  companyPlanCode: "free" | "standard" | "global_pro" | null;
  needsUpgradeForRegion: boolean;
};

function Avatar({ name, src }: { name: string; src: string | null }) {
  const initial = (name?.trim()?.[0] ?? "C").toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-20 w-20 rounded-full border object-cover"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-700">
      {initial}
    </div>
  );
}

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

function isJapanCountry(value: string | null | undefined) {
  return cleanCountryInput(value) === "japan";
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))
  );
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
  tone?: "gray" | "blue" | "green" | "yellow" | "purple" | "red";
}) {
  const styles = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
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
            notFound: "クリエイターが見つかりません。現在注文受付できない状態の可能性があります。",
            planSuffix: "プラン",
            japanAudience: "日本市場向け",
            broaderAudience: "より広い視聴者層",
            globalProRequired: "Premiumが必要",
            requestAvailable: "注文可能",
            platforms: "対応SNS",
            mainAudience: "主な視聴者",
            notSet: "未設定",
            profileTitle: "クリエイター概要",
            profileBody:
              "公開プロフィールとメニューを確認し、条件に合うメニューを選んで注文へ進めます。",
            menuSectionTitle: "公開メニュー",
            menuSectionBody:
              "このクリエイターが企業向けに公開している購入・注文可能なメニューです。価格、納期、納品物を確認して注文できます。",
            noMenus: "公開中のメニューがありません。",
            price: "価格",
            delivery: "納期",
            deliverables: "納品物",
            secondaryUse: "二次利用",
            allowed: "許可",
            notAllowed: "不可",
            none: "なし",
            menuType: "種別",
            accountUrl: "対象アカウント",
            openAccount: "アカウントを開く",
            viewAllMenus: "すべてのメニューを見る",
            viewMenuDetail: "メニュー詳細を見る",
            orderMenu: "このメニューを注文する",
            billingRequiredBody: "注文にはプラン開始が必要です。",
            upgradeExtraBody:
              "このクリエイターはより広い視聴者層を持つため、注文には Premium が必要です。",
            freeUpgradeBody:
              "Basicプランでは、国内市場向けの候補探索から始められます。",
            standardUpgradeBody:
              "Proプランでは、国内市場向けの継続施策に合うクリエイターへ注文できます。",
            genericUpgradeBody:
              "このクリエイターへの注文には上位プランが必要です。",
            checkGlobalPro: "Premiumを確認する",
            checkBilling: "料金プランを見る",
            temporaryNotice:
              "現在は注文フロー移行中のため、次の画面では既存の依頼フォームを利用します。今後、checkoutとrequirements提出に置き換える予定です。",
          }
        : {
            loading: "Loading...",
            notFound:
              "Creator not found. This creator may not be ready to receive orders.",
            planSuffix: "",
            japanAudience: "Japan market fit",
            broaderAudience: "Broader audience reach",
            globalProRequired: "Premium required",
            requestAvailable: "Order available",
            platforms: "Platforms",
            mainAudience: "Main audience",
            notSet: "Not set",
            profileTitle: "Creator Overview",
            profileBody:
              "Review this creator's public profile and menus, then choose a menu that fits your campaign.",
            menuSectionTitle: "Public Menus",
            menuSectionBody:
              "These are the menus this creator offers for companies to purchase or order. Review price, delivery timing, and deliverables before ordering.",
            noMenus: "There are no public menus.",
            price: "Price",
            delivery: "Delivery",
            deliverables: "Deliverables",
            secondaryUse: "Secondary Use",
            allowed: "Allowed",
            notAllowed: "Not allowed",
            none: "None",
            menuType: "Type",
            accountUrl: "Account",
            openAccount: "Open account",
            viewAllMenus: "View All Menus",
            viewMenuDetail: "View Menu Detail",
            orderMenu: "Order This Menu",
            billingRequiredBody: "Starting a plan is required before ordering.",
            upgradeExtraBody:
              "This creator has broader audience reach, so Premium is required to order.",
            freeUpgradeBody:
              "With the Basic plan, you can start by exploring creators for Japan-focused campaigns.",
            standardUpgradeBody:
              "With the Pro plan, you can order from creators who fit Japan-focused campaigns.",
            genericUpgradeBody:
              "A higher-tier plan is required to order from this creator.",
            checkGlobalPro: "Check Premium",
            checkBilling: "View Billing Plans",
            temporaryNotice:
              "The order flow is being migrated. For now, the next screen uses the existing request form. It will later be replaced with checkout and requirements submission.",
          },
    [safeLocale]
  );

  const [creator, setCreator] = useState<Creator | null>(null);
  const [menuCards, setMenuCards] = useState<MenuCard[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [gate, setGate] = useState<CompanyGateState>({
    isLoggedIn: false,
    canSendRequests: false,
    needsBilling: false,
    companyPlanCode: null,
    needsUpgradeForRegion: false,
  });

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
        needsUpgradeForRegion: false,
      };

      if (user) {
        const [
          { data: roles },
          { data: userState },
          { data: activeSuspensions },
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

        // MVP仕様:
        // Basic/free は月額課金なしで注文可能。
        // Pro/Premium相当の有料プランだけ subscription_status=active を要求する。
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
          needsUpgradeForRegion: false,
        };
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
          .select("id, creator_id, platform, audience_country")
          .eq("creator_id", creatorData.id),
      ]);

      if (!isMounted) return;

      if (menuError) {
        console.error("menu load error:", menuError);
        setMenuCards([]);
      } else {
        setMenuCards((menuData as MenuCard[]) ?? []);
      }

      if (socialError) {
        console.error("social load error:", socialError);
        setSocialAccounts([]);
      } else {
        setSocialAccounts((socialData as SocialAccount[]) ?? []);
      }

      const hasJapanAudience = ((socialData as SocialAccount[]) ?? []).some(
        (row) => isJapanCountry(row.audience_country)
      );

      if (
        (nextGate.companyPlanCode === "free" ||
          nextGate.companyPlanCode === "standard") &&
        !hasJapanAudience
      ) {
        nextGate = {
          ...nextGate,
          canSendRequests: false,
          needsUpgradeForRegion: true,
        };
      }

      setGate(nextGate);
      setLoading(false);
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [creatorId, supabase]);

  const audienceCountries = uniqueNonEmpty(
    socialAccounts.map((s) => s.audience_country)
  );
  const audienceCountryLabels = audienceCountries.map((country) =>
    getCountryLabel(country, safeLocale)
  );
  const platforms = uniqueNonEmpty(socialAccounts.map((s) => s.platform));
  const hasJapanAudience = socialAccounts.some((s) =>
    isJapanCountry(s.audience_country)
  );

  const isFree = gate.companyPlanCode === "free";
  const isStandard = gate.companyPlanCode === "standard";

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

    if (gate.needsUpgradeForRegion || gate.needsBilling) {
      goToBilling();
      return;
    }

    router.push("/b/dashboard");
  };

  if (loading) return <p className="p-6">{copy.loading}</p>;

  if (!creator) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">
            {copy.notFound}
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {safeLocale === "ja"
              ? "このクリエイターは現在、報酬受け取り設定または公開準備が完了していないため、企業側には表示されません。"
              : "This creator is not currently visible to companies because payout setup or public readiness is not complete."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/b/creators")}
            className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {safeLocale === "ja" ? "クリエイター一覧へ戻る" : "Back to creators"}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={creator.display_name} src={creator.avatar_url} />

            <div>
              <p className="text-sm font-semibold text-blue-600">
                Creator Profile
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                @{creator.display_name}
              </h1>

              {creator.category ? (
                <p className="mt-1 text-sm text-gray-500">
                  {creator.category}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="purple">
                  {getPlanLabel(gate.companyPlanCode, safeLocale)}
                  {copy.planSuffix}
                </Badge>

                {hasJapanAudience ? (
                  <Badge tone="green">{copy.japanAudience}</Badge>
                ) : (
                  <Badge tone="purple">{copy.broaderAudience}</Badge>
                )}

                {gate.needsUpgradeForRegion ? (
                  <Badge tone="red">{copy.globalProRequired}</Badge>
                ) : gate.canSendRequests ? (
                  <Badge tone="blue">{copy.requestAvailable}</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/b/creators/${creator.id}/menus`)}
            className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {copy.viewAllMenus}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">{copy.profileTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {copy.profileBody}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.platforms}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {platforms.length > 0 ? platforms.join(" / ") : copy.notSet}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.mainAudience}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {audienceCountryLabels.length > 0
                ? audienceCountryLabels.join(" / ")
                : copy.notSet}
            </p>
          </div>
        </div>
      </section>

      {(gate.needsUpgradeForRegion || gate.needsBilling) && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          {gate.needsUpgradeForRegion ? (
            <p className="text-sm font-medium leading-7 text-amber-900">
              {isFree
                ? copy.freeUpgradeBody
                : isStandard
                  ? copy.standardUpgradeBody
                  : copy.genericUpgradeBody}{" "}
              {copy.upgradeExtraBody}
            </p>
          ) : (
            <p className="text-sm font-medium leading-7 text-amber-900">
              {copy.billingRequiredBody}
            </p>
          )}

          <button
            type="button"
            onClick={goToBilling}
            className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {gate.needsUpgradeForRegion
              ? copy.checkGlobalPro
              : copy.checkBilling}
          </button>
        </section>
      )}

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {copy.menuSectionTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              {copy.menuSectionBody}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/b/creators/${creator.id}/menus`)}
            className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {copy.viewAllMenus}
          </button>
        </div>

        {menuCards.length === 0 ? (
          <div className="mt-5 rounded-2xl border bg-gray-50 p-6 text-sm text-gray-500">
            {copy.noMenus}
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {menuCards.slice(0, 3).map((menu) => {
              const platformLabel = menu.platform || menu.sns || copy.notSet;

              return (
                <div
                  key={menu.id}
                  className="rounded-3xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="blue">{platformLabel}</Badge>
                        <Badge tone="purple">
                          {menuTypeLabel(
                            menu.menu_type,
                            safeLocale,
                            copy.notSet
                          )}
                        </Badge>
                        {menu.category ? (
                          <Badge tone="gray">{menu.category}</Badge>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-xl font-bold tracking-tight">
                        {menu.title}
                      </h3>

                      {menu.description ? (
                        <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                          {menu.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4 lg:min-w-[220px]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {copy.price}
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        {formatPrice(
                          menu.price,
                          menu.currency,
                          menu.reference_price_text,
                          safeLocale
                        )}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {copy.delivery}:{" "}
                        <span className="font-semibold text-gray-900">
                          {formatDeliveryDays(
                            menu.delivery_days,
                            safeLocale,
                            copy.notSet
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {copy.deliverables}
                      </p>
                      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                        {menu.deliverables?.trim() || copy.none}
                      </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {copy.secondaryUse}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {menu.allow_secondary_use
                          ? copy.allowed
                          : copy.notAllowed}
                      </p>

                      {menu.account_url ? (
                        <a
                          href={menu.account_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline"
                        >
                          {copy.openAccount}
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {(gate.needsUpgradeForRegion || gate.needsBilling) && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                      {gate.needsUpgradeForRegion
                        ? copy.upgradeExtraBody
                        : copy.billingRequiredBody}
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/b/creators/${creator.id}/menus/${menu.id}`)
                      }
                      className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      {copy.viewMenuDetail}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOrderClick(menu.id)}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      {gate.needsUpgradeForRegion
                        ? copy.checkGlobalPro
                        : gate.needsBilling
                          ? copy.checkBilling
                          : copy.orderMenu}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {menuCards.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            {copy.temporaryNotice}
          </div>
        ) : null}
      </section>
    </div>
  );
}