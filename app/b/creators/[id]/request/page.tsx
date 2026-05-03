// File: app/b/creators/[id]/request/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

const BILLING_PATH = "/b/billing";

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
  product_name: string;
  product_url: string;
  deadline: string;
  note: string;
  has_free_offer: boolean;
  wants_secondary_use: boolean;
  creator_menu_id: string;
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
  requestUsageResetAt: string | null;
  canSendRequests: boolean;
  needsBilling: boolean;
  needsUpgradeForRegion: boolean;
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
    compact.includes("韓国")
  ) {
    return "korea";
  }

  if (
    normalized === "台湾" ||
    normalized === "taiwan" ||
    normalized === "tw" ||
    normalized.startsWith("tw ") ||
    compact.includes("台湾")
  ) {
    return "taiwan";
  }

  if (
    normalized === "香港" ||
    normalized === "hong kong" ||
    normalized === "hk" ||
    normalized.startsWith("hk ") ||
    compact.includes("香港")
  ) {
    return "hong_kong";
  }

  if (
    normalized === "中国" ||
    normalized === "china" ||
    normalized === "cn" ||
    normalized.startsWith("cn ") ||
    compact.includes("中国")
  ) {
    return "china";
  }

  if (
    normalized === "タイ" ||
    normalized === "thailand" ||
    normalized === "th" ||
    normalized.startsWith("th ") ||
    compact.includes("タイ")
  ) {
    return "thailand";
  }

  if (
    normalized === "ベトナム" ||
    normalized === "vietnam" ||
    normalized === "vn" ||
    normalized.startsWith("vn ") ||
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
  planCode: GateState["companyPlanCode"],
  locale: "ja" | "en"
) {
  switch (planCode) {
    case "free":
      return "Free";
    case "standard":
      return "Standard";
    case "global_pro":
      return "GlobalPro";
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
    united_states: "アメリカ",
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
    united_states: "United States",
    other: "Other",
  };

  return locale === "ja"
    ? jaMap[cleaned] ?? ((country ?? "").trim() || "不明")
    : enMap[cleaned] ?? ((country ?? "").trim() || "Unknown");
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
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

export default function CreatorRequestPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const creatorId = params.id as string;
  const initialMenuId = searchParams.get("menuId") ?? "";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            creatorNotFound: "クリエイターが見つかりません。",
            companyOnlyTitle: "企業アカウントのみ利用できます",
            companyOnlyBody: "この注文フォームは企業アカウント専用です。",
            unavailableTitle: "現在この機能は利用できません",
            unavailableBody:
              "アカウント状態により、現在は注文をご利用いただけません。",
            profileRequiredTitle: "企業プロフィールの完了が必要です",
            profileRequiredBody:
              "注文の前に、企業プロフィールを完了してください。",
            profileRequiredCta: "企業プロフィールを入力する",
            billingTitle: "注文にはプラン開始が必要です",
            billingBody:
              "このクリエイターの詳細や公開メニューは閲覧できますが、注文はプラン開始後に利用できます。",
            billingCta: "料金プランを見る",
            backToCreator: "クリエイター詳細へ戻る",
            globalTitle: "このクリエイターへの注文にはGlobalProが必要です",
            freeGlobalBody:
              "Freeプランでは、日本市場向けの候補探索から始められます。",
            standardGlobalBody:
              "Standardプランでは、日本市場向けの継続施策に合うクリエイターへ注文できます。",
            globalExtraBody:
              "このクリエイターはより広い視聴者層を持つため、注文には GlobalPro プランが必要です。",
            mainAudience: "主な視聴者",
            notSet: "未設定",
            globalCta: "GlobalProを確認する",
            pageTitle: "注文内容を入力",
            pageSubtitle:
              "選択したメニューをもとに、商品情報・希望内容・納期を入力します。次の画面で支払い方法を確認し、クリエイター承認待ちの注文を作成します。",
            creatorInfo: "クリエイター情報",
            audienceType: "視聴者タイプ",
            japanAudience: "日本市場向け",
            broaderAudience: "より広い視聴者層",
            planStatus: "現在のプラン状況",
            currentPlan: "現在プラン",
            sentThisMonth: "今月の送信数",
            remainingThisMonth: "残り送信可能数",
            nextReset: "次回リセット目安",
            unlimited: "無制限",
            selectedMenu: "選択中のメニュー",
            selectMenu: "注文するメニュー",
            noMenus: "公開メニューがありません。",
            menuType: "種別",
            price: "価格",
            delivery: "納期",
            deliverables: "納品物",
            secondaryUse: "二次利用",
            allowed: "許可",
            notAllowed: "不可",
            notes: "注意事項",
            none: "なし",
            productInfo: "商品・案件情報",
            productName: "商品名・案件名（必須）",
            productNamePlaceholder: "例：新作美容液PR",
            productUrl: "商品URL",
            productUrlPlaceholder: "https://...",
            deadline: "希望納期",
            freeOffer: "商品の無償提供あり",
            wantsSecondaryUse: "二次利用を希望する",
            secondaryUseUnavailable:
              "このメニューでは二次利用は許可されていません。",
            requirements: "注文内容・requirements（必須・10文字以上）",
            requirementsPlaceholder:
              "紹介してほしいポイント、投稿内容、希望形式、避けてほしい表現、参考イメージなどを記入してください。",
            productRequired: "商品名・案件名を入力してください。",
            noteRequired: "注文内容・requirementsは10文字以上で入力してください。",
            menuRequired: "注文するメニューを選択してください。",
            freeLimitReached:
              "Freeプランでは月5件まで送信できます。上限に達したため、プラン変更をご検討ください。",
            submitError: "注文用Checkoutの作成に失敗しました。",
            networkError: "通信エラーが発生しました。",
            authError: "ログイン情報を取得できませんでした。",
            checkoutUrlMissing: "Checkout URLを取得できませんでした。",
            submitting: "Checkout作成中...",
            limitReachedButton: "上限に達しています",
            globalRequiredButton: "GlobalProが必要です",
            submitButton: "注文内容を確認して決済へ進む",
            pieces: "件",
            temporaryNotice:
              "次の画面でカードの与信枠を確保します。クリエイターが48時間以内に承認した場合のみ決済が確定し、辞退または期限切れの場合は請求が確定しません。",
          }
        : {
            loading: "Loading...",
            creatorNotFound: "Creator not found.",
            companyOnlyTitle: "Company accounts only",
            companyOnlyBody:
              "This order form is only available to company accounts.",
            unavailableTitle: "This feature is currently unavailable",
            unavailableBody:
              "Based on your account status, ordering is currently unavailable.",
            profileRequiredTitle: "Complete your company profile first",
            profileRequiredBody:
              "Please complete your company profile before placing orders.",
            profileRequiredCta: "Complete Company Profile",
            billingTitle: "Starting a plan is required to order",
            billingBody:
              "You can view this creator and their public menus, but ordering is unlocked after plan activation.",
            billingCta: "View Billing Plans",
            backToCreator: "Back to Creator Detail",
            globalTitle: "GlobalPro is required to order from this creator",
            freeGlobalBody:
              "With the Free plan, you can start by exploring creators for Japan-focused campaigns.",
            standardGlobalBody:
              "With the Standard plan, you can order from creators who fit Japan-focused campaigns.",
            globalExtraBody:
              "This creator has broader audience reach, so GlobalPro is required to order.",
            mainAudience: "Main audience",
            notSet: "Not set",
            globalCta: "Check GlobalPro",
            pageTitle: "Enter Order Requirements",
            pageSubtitle:
              "Enter product details, requirements, and timing based on the selected menu. On the next screen, your payment method will be authorized and the order will wait for creator approval.",
            creatorInfo: "Creator Information",
            audienceType: "Audience Type",
            japanAudience: "Japan market fit",
            broaderAudience: "Broader audience reach",
            planStatus: "Current Plan Status",
            currentPlan: "Current Plan",
            sentThisMonth: "Requests this month",
            remainingThisMonth: "Remaining requests",
            nextReset: "Next reset",
            unlimited: "Unlimited",
            selectedMenu: "Selected Menu",
            selectMenu: "Menu to Order",
            noMenus: "No public menus are available.",
            menuType: "Type",
            price: "Price",
            delivery: "Delivery",
            deliverables: "Deliverables",
            secondaryUse: "Secondary Use",
            allowed: "Allowed",
            notAllowed: "Not allowed",
            notes: "Notes",
            none: "None",
            productInfo: "Product / Campaign Information",
            productName: "Product or Campaign Name (required)",
            productNamePlaceholder: "Example: New skincare serum PR",
            productUrl: "Product URL",
            productUrlPlaceholder: "https://...",
            deadline: "Preferred Deadline",
            freeOffer: "Product will be provided for free",
            wantsSecondaryUse: "Request secondary use",
            secondaryUseUnavailable:
              "Secondary use is not allowed for this menu.",
            requirements: "Order Requirements (required, 10+ characters)",
            requirementsPlaceholder:
              "Describe key selling points, requested content, preferred format, expressions to avoid, reference ideas, and any important details.",
            productRequired: "Please enter a product or campaign name.",
            noteRequired: "Please enter at least 10 characters.",
            menuRequired: "Please select a menu to order.",
            freeLimitReached:
              "The Free plan allows up to 5 sends per month. You have reached the limit, so please consider upgrading.",
            submitError: "Failed to create Checkout for this order.",
            networkError: "A network error occurred.",
            authError: "Could not retrieve your login session.",
            checkoutUrlMissing: "Checkout URL was not returned.",
            submitting: "Creating Checkout...",
            limitReachedButton: "Limit Reached",
            globalRequiredButton: "GlobalPro Required",
            submitButton: "Review Order and Continue to Payment",
            pieces: "",
            temporaryNotice:
              "Your card will be authorized on the next screen. The payment will only be captured if the creator accepts within 48 hours. If the creator declines or the deadline expires, the charge will not be finalized.",
          },
    [safeLocale]
  );

  const [creator, setCreator] = useState<Creator | null>(null);
  const [menus, setMenus] = useState<CreatorMenu[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    requestUsageResetAt: null,
    canSendRequests: false,
    needsBilling: false,
    needsUpgradeForRegion: false,
  });

  const [form, setForm] = useState<FormState>({
    product_name: "",
    product_url: "",
    deadline: "",
    note: "",
    has_free_offer: false,
    wants_secondary_use: false,
    creator_menu_id: "",
  });

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      setErrorMsg(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
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
              monthly_request_used,
              request_usage_reset_at
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
      const companyProfileCompleted = !!userState?.company_profile_completed;
      const companyAccessStatus = userState?.company_access_status ?? null;
      const companySubscriptionStatus =
        userState?.company_subscription_status ?? null;
      const companyPlanCode =
        (userState?.company_plan_code as
          | "free"
          | "standard"
          | "global_pro"
          | null) ?? null;
      const monthlyRequestLimit =
        typeof userState?.monthly_request_limit === "number"
          ? userState.monthly_request_limit
          : null;
      const monthlyRequestUsed =
        typeof userState?.monthly_request_used === "number"
          ? userState.monthly_request_used
          : 0;
      const requestUsageResetAt = userState?.request_usage_reset_at ?? null;

      const baseCanSendRequests =
        isCompany &&
        !isSuspended &&
        companyProfileCompleted &&
        companyAccessStatus === "approved" &&
        companySubscriptionStatus === "active";

      const needsBilling =
        isCompany &&
        !isSuspended &&
        companyProfileCompleted &&
        companyAccessStatus === "approved" &&
        companySubscriptionStatus !== "active";

      const { data: creatorData } = await supabase
        .from("creators")
        .select("id, user_id, display_name")
        .eq("id", creatorId)
        .eq("is_public", true)
        .eq("approval_status", "approved")
        .maybeSingle();

      if (!creatorData) {
        setCreator(null);
        setMenus([]);
        setSocialAccounts([]);
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
          requestUsageResetAt,
          canSendRequests: false,
          needsBilling,
          needsUpgradeForRegion: false,
        });
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

      if (menuError) {
        console.error(menuError);
        setMenus([]);
      } else {
        const nextMenus = (menuData as CreatorMenu[]) ?? [];
        setMenus(nextMenus);

        const defaultSelectedId =
          initialMenuId && nextMenus.some((m) => m.id === initialMenuId)
            ? initialMenuId
            : nextMenus[0]?.id ?? "";

        const selected = nextMenus.find((m) => m.id === defaultSelectedId);

        setForm((prev) => ({
          ...prev,
          creator_menu_id: defaultSelectedId,
          wants_secondary_use: selected?.allow_secondary_use
            ? prev.wants_secondary_use
            : false,
        }));
      }

      if (socialError) {
        console.error(socialError);
        setSocialAccounts([]);
      } else {
        setSocialAccounts((socialData as SocialAccount[]) ?? []);
      }

      const audienceRows = (socialData as SocialAccount[]) ?? [];
      const hasJapanAudience = audienceRows.some((row) =>
        isJapanCountry(row.audience_country)
      );

      const needsUpgradeForRegion =
        (companyPlanCode === "free" || companyPlanCode === "standard") &&
        !hasJapanAudience;

      const canSendRequests = baseCanSendRequests && !needsUpgradeForRegion;

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
        requestUsageResetAt,
        canSendRequests,
        needsBilling,
        needsUpgradeForRegion,
      });

      setLoading(false);
    };

    void boot();
  }, [creatorId, initialMenuId, router, supabase]);

  const selectedMenu =
    menus.find((menu) => menu.id === form.creator_menu_id) ?? null;

  const remainingRequests =
    gate.monthlyRequestLimit === null
      ? null
      : Math.max(gate.monthlyRequestLimit - gate.monthlyRequestUsed, 0);

  const reachedLimit =
    gate.monthlyRequestLimit !== null && remainingRequests === 0;

  const audienceCountries = uniqueNonEmpty(
    socialAccounts.map((s) => s.audience_country)
  );
  const audienceCountryLabels = audienceCountries.map((country) =>
    getCountryLabel(country, safeLocale)
  );
  const hasJapanAudience = socialAccounts.some((s) =>
    isJapanCountry(s.audience_country)
  );

  const handleMenuChange = (menuId: string) => {
    const nextMenu = menus.find((menu) => menu.id === menuId) ?? null;

    setForm((prev) => ({
      ...prev,
      creator_menu_id: menuId,
      wants_secondary_use: nextMenu?.allow_secondary_use
        ? prev.wants_secondary_use
        : false,
    }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !creator ||
      !gate.canSendRequests ||
      reachedLimit ||
      gate.needsUpgradeForRegion
    ) {
      return;
    }

    if (!selectedMenu) {
      setErrorMsg(copy.menuRequired);
      return;
    }

    if (!form.product_name.trim()) {
      setErrorMsg(copy.productRequired);
      return;
    }

    if (form.note.trim().length < 10) {
      setErrorMsg(copy.noteRequired);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token ?? null;

      if (!accessToken) {
        setErrorMsg(copy.authError);
        setSubmitting(false);
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          creator_id: creator.id,
          creator_menu_id: selectedMenu.id,
          product_name: form.product_name.trim(),
          product_url: form.product_url.trim() || null,
          deadline: form.deadline || null,
          requirements: form.note.trim(),
          has_free_offer: form.has_free_offer,
          wants_secondary_use:
            !!selectedMenu.allow_secondary_use && form.wants_secondary_use,
        }),
      });

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
    } catch (e: any) {
      setErrorMsg(e?.message ?? copy.networkError);
      setSubmitting(false);
    }
  };

  if (loading) return <p className="p-6">{copy.loading}</p>;
  if (!creator) return <p className="p-6">{copy.creatorNotFound}</p>;

  if (!gate.isCompany) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <h1 className="mb-2 text-2xl font-bold">{copy.companyOnlyTitle}</h1>
          <p className="text-sm text-gray-700">{copy.companyOnlyBody}</p>
        </div>
      </div>
    );
  }

  if (gate.isSuspended || gate.companyAccessStatus !== "approved") {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <h1 className="mb-2 text-2xl font-bold">{copy.unavailableTitle}</h1>
          <p className="text-sm text-gray-700">{copy.unavailableBody}</p>
        </div>
      </div>
    );
  }

  if (!gate.companyProfileCompleted) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-6">
          <h1 className="mb-2 text-2xl font-bold">
            {copy.profileRequiredTitle}
          </h1>
          <p className="mb-4 text-sm text-gray-700">
            {copy.profileRequiredBody}
          </p>
          <button
            onClick={() => router.push("/b/onboarding")}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {copy.profileRequiredCta}
          </button>
        </div>
      </div>
    );
  }

  if (gate.needsBilling) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
          <p className="mb-2 text-sm text-gray-600">@{creator.display_name}</p>
          <h1 className="mb-2 text-2xl font-bold">{copy.billingTitle}</h1>
          <p className="mb-4 text-sm text-gray-700">{copy.billingBody}</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                router.push(
                  `${BILLING_PATH}?from=${encodeURIComponent(
                    `/b/creators/${creator.id}/request${
                      initialMenuId ? `?menuId=${initialMenuId}` : ""
                    }`
                  )}`
                )
              }
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {copy.billingCta}
            </button>
            <button
              onClick={() => router.push(`/b/creators/${creator.id}`)}
              className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {copy.backToCreator}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gate.needsUpgradeForRegion) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="mb-2 text-sm text-gray-600">@{creator.display_name}</p>
          <h1 className="mb-2 text-2xl font-bold">{copy.globalTitle}</h1>
          <p className="mb-4 text-sm text-gray-700">
            {gate.companyPlanCode === "free"
              ? copy.freeGlobalBody
              : copy.standardGlobalBody}{" "}
            {copy.globalExtraBody}
          </p>

          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-gray-500">{copy.mainAudience}</p>
            <p className="mt-2 text-base font-semibold text-gray-900">
              {audienceCountryLabels.length > 0
                ? audienceCountryLabels.join(" / ")
                : copy.notSet}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() =>
                router.push(
                  `${BILLING_PATH}?from=${encodeURIComponent(
                    `/b/creators/${creator.id}/request${
                      initialMenuId ? `?menuId=${initialMenuId}` : ""
                    }`
                  )}`
                )
              }
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {copy.globalCta}
            </button>
            <button
              onClick={() => router.push(`/b/creators/${creator.id}`)}
              className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {copy.backToCreator}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const disableSubmit =
    submitting || reachedLimit || !selectedMenu || !gate.canSendRequests;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">@{creator.display_name}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {copy.pageTitle}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pageSubtitle}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">{copy.creatorInfo}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="text-sm text-gray-500">{copy.mainAudience}</p>
              <p className="mt-2 text-lg font-bold">
                {audienceCountryLabels.length > 0
                  ? audienceCountryLabels.join(" / ")
                  : copy.notSet}
              </p>
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="text-sm text-gray-500">{copy.audienceType}</p>
              <p className="mt-2 text-lg font-bold">
                {hasJapanAudience ? copy.japanAudience : copy.broaderAudience}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">{copy.planStatus}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="text-sm text-gray-500">{copy.currentPlan}</p>
              <p className="mt-2 text-lg font-bold">
                {getPlanLabel(gate.companyPlanCode, safeLocale)}
              </p>
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="text-sm text-gray-500">{copy.remainingThisMonth}</p>
              <p className="mt-2 text-lg font-bold">
                {remainingRequests === null
                  ? copy.unlimited
                  : `${remainingRequests.toLocaleString(
                      safeLocale === "ja" ? "ja-JP" : "en-US"
                    )}${copy.pieces}`}
              </p>
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4 sm:col-span-2">
              <p className="text-sm text-gray-500">{copy.nextReset}</p>
              <p className="mt-2 text-lg font-bold">
                {formatDate(gate.requestUsageResetAt, safeLocale)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {reachedLimit ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          {copy.freeLimitReached}
        </div>
      ) : null}

      {errorMsg ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.selectMenu}</h2>

            {menus.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">{copy.noMenus}</p>
            ) : (
              <div className="mt-4">
                <select
                  value={form.creator_menu_id}
                  onChange={(e) => handleMenuChange(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                >
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.productInfo}</h2>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.productName}
                </label>
                <input
                  value={form.product_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      product_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  placeholder={copy.productNamePlaceholder}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.productUrl}
                </label>
                <input
                  type="url"
                  value={form.product_url}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      product_url: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  placeholder={copy.productUrlPlaceholder}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.deadline}
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deadline: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border bg-gray-50 p-4 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.has_free_offer}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      has_free_offer: e.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                {copy.freeOffer}
              </label>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.wants_secondary_use}
                    disabled={!selectedMenu?.allow_secondary_use}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        wants_secondary_use: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  {copy.wantsSecondaryUse}
                </label>

                {!selectedMenu?.allow_secondary_use ? (
                  <p className="mt-2 text-xs text-gray-500">
                    {copy.secondaryUseUnavailable}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {copy.requirements}
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                  rows={7}
                  placeholder={copy.requirementsPlaceholder}
                  required
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">{copy.selectedMenu}</h2>

            {selectedMenu ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">
                      {selectedMenu.platform ||
                        selectedMenu.sns ||
                        copy.notSet}
                    </Badge>
                    <Badge tone="purple">
                      {menuTypeLabel(
                        selectedMenu.menu_type,
                        safeLocale,
                        copy.notSet
                      )}
                    </Badge>
                    {selectedMenu.category ? (
                      <Badge tone="gray">{selectedMenu.category}</Badge>
                    ) : null}
                  </div>

                  <h3 className="mt-3 text-xl font-bold">
                    {selectedMenu.title}
                  </h3>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {copy.price}
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {formatPrice(
                      selectedMenu.price,
                      selectedMenu.currency,
                      selectedMenu.reference_price_text,
                      safeLocale
                    )}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {copy.delivery}:{" "}
                    <span className="font-semibold text-gray-900">
                      {formatDeliveryDays(
                        selectedMenu.delivery_days,
                        safeLocale,
                        copy.notSet
                      )}
                    </span>
                  </p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {copy.deliverables}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                    {selectedMenu.deliverables?.trim() || copy.none}
                  </p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {copy.secondaryUse}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {selectedMenu.allow_secondary_use
                      ? copy.allowed
                      : copy.notAllowed}
                  </p>
                </div>

                {selectedMenu.notes?.trim() ? (
                  <div className="rounded-2xl border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.notes}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {selectedMenu.notes}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">{copy.noMenus}</p>
            )}
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-800">
            {copy.temporaryNotice}
          </section>

          <button
            type="submit"
            disabled={disableSubmit}
            className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? copy.submitting
              : reachedLimit
              ? copy.limitReachedButton
              : gate.needsUpgradeForRegion
              ? copy.globalRequiredButton
              : copy.submitButton}
          </button>
        </aside>
      </form>
    </div>
  );
}