// File: app/b/creators/[id]/request/CreatorRequestClient.tsx
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
  stripe_onboarding_completed: boolean | null;
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
};

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
    new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))
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

function PlatformIcon({ platform }: { platform: string | null | undefined }) {
  const label = getPlatformLabel(platform);
  const normalized = label.toLowerCase();

  if (normalized === "instagram") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#ffdd55] via-[#ff4f8b] to-[#7b3cff] text-[10px] font-black text-white shadow-sm">
        IG
      </span>
    );
  }

  if (normalized === "tiktok") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-[13px] font-black text-white shadow-sm">
        ♪
      </span>
    );
  }

  if (normalized === "youtube") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm">
        ▶
      </span>
    );
  }

  if (normalized === "x") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-[11px] font-black text-white shadow-sm">
        X
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500">
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
  tone?: "gray" | "blue" | "red";
}) {
  const styles = {
    gray: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-rose-50 text-[#ff5f67]",
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
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span
        className={`text-right text-sm ${
          bold ? "font-black text-slate-950" : "font-bold text-slate-800"
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

function TextInput({
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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100"
      />
    </label>
  );
}

export default function CreatorRequestClient() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const creatorId = params.id as string;
  const initialMenuId = searchParams.get("menuId") ?? "";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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
            pageTitle: "注文内容を入力",
            pageSubtitle:
              "必要な内容を入力して、支払い確認へ進んでください。インフルエンサーが承認した場合のみ決済が確定します。",
            creatorInfo: "インフルエンサー",
            selectedMenu: "選択中",
            selectMenu: "メニュー",
            noMenus: "公開メニューがありません。",
            delivery: "納期",
            secondaryUse: "二次利用",
            allowed: "許可",
            notAllowed: "不可",
            productName: "商品名・案件名",
            productNamePlaceholder: "例：新作美容液PR / 新店舗オープン告知",
            productUrl: "商品URL・サービスURL",
            productUrlPlaceholder: "https://...",
            deadline: "希望納期",
            freeOffer: "商品の無償提供あり",
            wantsSecondaryUse: "広告素材として二次利用したい",
            secondaryUseUnavailable:
              "このメニューでは二次利用は許可されていません。",
            requirements: "依頼内容",
            requirementsPlaceholder:
              "紹介してほしいポイント、投稿内容、希望形式、避けてほしい表現、参考イメージなどを入力してください。",
            productRequired: "商品名・案件名を入力してください。",
            noteRequired: "依頼内容は10文字以上で入力してください。",
            menuRequired: "注文するメニューを選択してください。",
            freeLimitReached:
              "Basicでは月5件まで注文できます。上限に達したため、プラン変更をご検討ください。",
            submitError: "Checkoutの作成に失敗しました。",
            networkError: "通信エラーが発生しました。",
            authError: "ログイン情報を取得できませんでした。",
            checkoutUrlMissing: "Checkout URLを取得できませんでした。",
            submitting: "Checkout作成中...",
            limitReachedButton: "上限に達しています",
            submitButton: "支払い確認へ進む",
            pieces: "件",
            orderSummary: "注文サマリー",
            menuPrice: "メニュー価格",
            marketplaceFee: "Trendre手数料",
            total: "お支払い合計",
            paymentProtection:
              "支払いはStripeで保護されます。インフルエンサーが辞退した場合、請求は確定しません。",
            paymentCapture:
              "インフルエンサーが72時間以内に承認した場合のみ決済が確定します。",
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
            profileRequiredCta: "Complete Company Profile",
            billingTitle: "Plan confirmation is required",
            billingBody:
              "Your current plan status does not allow ordering. Please check your billing plan.",
            billingCta: "View Billing Plans",
            backToCreator: "Back to detail",
            mainAudience: "Main audience",
            notSet: "Not set",
            pageTitle: "Enter order details",
            pageSubtitle:
              "Enter the required details and continue to payment confirmation. Payment is only captured if the influencer accepts.",
            creatorInfo: "Influencer",
            selectedMenu: "Selected",
            selectMenu: "Menu",
            noMenus: "No public menus are available.",
            delivery: "Delivery",
            secondaryUse: "Secondary use",
            allowed: "Allowed",
            notAllowed: "Not allowed",
            productName: "Product or campaign name",
            productNamePlaceholder: "Example: New skincare serum PR",
            productUrl: "Product or service URL",
            productUrlPlaceholder: "https://...",
            deadline: "Preferred deadline",
            freeOffer: "Product will be provided for free",
            wantsSecondaryUse: "Request secondary use",
            secondaryUseUnavailable:
              "Secondary use is not allowed for this menu.",
            requirements: "Order requirements",
            requirementsPlaceholder:
              "Describe key selling points, requested content, preferred format, expressions to avoid, reference ideas, and important details.",
            productRequired: "Please enter a product or campaign name.",
            noteRequired: "Please enter at least 10 characters.",
            menuRequired: "Please select a menu to order.",
            freeLimitReached:
              "Basic allows up to 5 orders per month. You have reached the limit, so please consider upgrading.",
            submitError: "Failed to create Checkout for this order.",
            networkError: "A network error occurred.",
            authError: "Could not retrieve your login session.",
            checkoutUrlMissing: "Checkout URL was not returned.",
            submitting: "Creating Checkout...",
            limitReachedButton: "Limit Reached",
            submitButton: "Continue to payment",
            pieces: "",
            orderSummary: "Order Summary",
            menuPrice: "Menu price",
            marketplaceFee: "Trendre fee",
            total: "Total",
            paymentProtection:
              "Payment is protected by Stripe. If the influencer declines, the charge will not be finalized.",
            paymentCapture:
              "Payment is only captured if the influencer accepts within 72 hours.",
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
      const companyPlanCode = normalizePlanCode(userState?.company_plan_code);

      const monthlyRequestLimit =
        typeof userState?.monthly_request_limit === "number"
          ? userState.monthly_request_limit
          : null;

      const monthlyRequestUsed =
        typeof userState?.monthly_request_used === "number"
          ? userState.monthly_request_used
          : 0;

      const requestUsageResetAt = userState?.request_usage_reset_at ?? null;

      const accountReady =
        isCompany &&
        !isSuspended &&
        companyProfileCompleted &&
        companyAccessStatus === "approved";

      const paidPlan = isPaidPlan(companyPlanCode);

      const canSendRequests =
        accountReady &&
        (!paidPlan || companySubscriptionStatus === "active");

      const needsBilling =
        accountReady &&
        paidPlan &&
        companySubscriptionStatus !== "active";

      const { data: creatorData } = await supabase
        .from("creators")
        .select("id, user_id, display_name, stripe_onboarding_completed")
        .eq("id", creatorId)
        .eq("is_public", true)
        .eq("approval_status", "approved")
        .eq("stripe_onboarding_completed", true)
        .maybeSingle();

      if (!isMounted) return;

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

      if (!isMounted) return;

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
      });

      setLoading(false);
    };

    void boot();

    return () => {
      isMounted = false;
    };
  }, [creatorId, initialMenuId, router, supabase]);

  const selectedMenu =
    menus.find((menu) => menu.id === form.creator_menu_id) ?? null;

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

  const audienceCountries = uniqueNonEmpty(
    socialAccounts.map((s) => s.audience_country)
  );

  const audienceCountryLabels = audienceCountries.map((country) =>
    getCountryLabel(country, safeLocale)
  );

  const platforms = uniqueNonEmpty(socialAccounts.map((s) => s.platform));

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

    if (!creator || !gate.canSendRequests || reachedLimit) {
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

  return (
    <form onSubmit={onSubmit} className="relative overflow-hidden bg-[#f8fafc]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-180px] top-[-160px] h-[420px] w-[420px] rounded-full bg-rose-100/45 blur-3xl" />
        <div className="absolute right-[-180px] top-[10%] h-[520px] w-[520px] rounded-full bg-emerald-100/45 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[30px] font-black leading-tight tracking-[-0.04em] text-slate-950 md:text-[40px]">
              {copy.pageTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
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
          <main className="min-w-0 space-y-5">
            <section className="rounded-[30px] border border-white/80 bg-white/95 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    {copy.creatorInfo}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">
                    {creator.display_name}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {platforms.length > 0 ? (
                      platforms.map((platform) => (
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
              </div>
            </section>

            <section className="rounded-[30px] border border-white/80 bg-white/95 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="mb-4">
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  {copy.selectMenu}
                </h2>
              </div>

              {menus.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    {copy.noMenus}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {menus.map((menu) => {
                    const isSelected = form.creator_menu_id === menu.id;
                    const platform = menu.platform || menu.sns;

                    return (
                      <button
                        key={menu.id}
                        type="button"
                        onClick={() => handleMenuChange(menu.id)}
                        className={`rounded-[24px] border p-4 text-left transition ${
                          isSelected
                            ? "border-[#ff5f67]/60 bg-rose-50/40 shadow-[0_12px_34px_rgba(255,95,103,0.10)] ring-4 ring-rose-100/60"
                            : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {platform ? <PlatformBadge platform={platform} /> : null}

                              <Badge tone="gray">
                                {menuTypeLabel(
                                  menu.menu_type,
                                  safeLocale,
                                  menu.category || "Menu"
                                )}
                              </Badge>

                              {isSelected ? (
                                <Badge tone="red">{copy.selectedMenu}</Badge>
                              ) : null}
                            </div>

                            <h3 className="text-base font-black text-slate-950">
                              {menu.title}
                            </h3>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-lg font-black text-slate-950">
                              {formatPrice(
                                menu.price,
                                menu.currency,
                                menu.reference_price_text,
                                safeLocale
                              )}
                            </p>
                            {menu.delivery_days != null ? (
                              <p className="mt-1 text-xs font-bold text-slate-400">
                                {formatDeliveryDays(
                                  menu.delivery_days,
                                  safeLocale,
                                  "-"
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[30px] border border-white/80 bg-white/95 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="mb-6">
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  {copy.requirements}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  {copy.requirementsPlaceholder}
                </p>
              </div>

              <div className="grid gap-5">
                <TextInput
                  label={copy.productName}
                  value={form.product_name}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, product_name: value }))
                  }
                  placeholder={copy.productNamePlaceholder}
                />

                <TextInput
                  label={copy.productUrl}
                  value={form.product_url}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, product_url: value }))
                  }
                  placeholder={copy.productUrlPlaceholder}
                />

                <TextInput
                  type="date"
                  label={copy.deadline}
                  value={form.deadline}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, deadline: value }))
                  }
                />

                <label className="block">
                  <span className="text-sm font-black text-slate-800">
                    {copy.requirements}
                  </span>
                  <textarea
                    value={form.note}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        note: e.target.value,
                      }))
                    }
                    placeholder={copy.requirementsPlaceholder}
                    rows={6}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold leading-7 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={form.has_free_offer}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          has_free_offer: e.target.checked,
                        }))
                      }
                      className="mt-1"
                    />
                    <span className="block text-sm font-bold text-slate-800">
                      {copy.freeOffer}
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition ${
                      selectedMenu?.allow_secondary_use
                        ? "border-slate-200 hover:border-slate-300"
                        : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        !!selectedMenu?.allow_secondary_use &&
                        form.wants_secondary_use
                      }
                      disabled={!selectedMenu?.allow_secondary_use}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          wants_secondary_use: e.target.checked,
                        }))
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-bold text-slate-800">
                        {copy.wantsSecondaryUse}
                      </span>
                      {!selectedMenu?.allow_secondary_use ? (
                        <span className="mt-1 block text-xs font-medium text-slate-500">
                          {copy.secondaryUseUnavailable}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </div>
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

              <div className="mt-5 space-y-3 text-sm font-medium leading-6 text-slate-600">
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

              {errorMsg ? (
                <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
                  {errorMsg}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  submitting ||
                  !selectedMenu ||
                  !gate.canSendRequests ||
                  reachedLimit
                }
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-5 py-4 text-base font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? copy.submitting
                  : reachedLimit
                  ? copy.limitReachedButton
                  : copy.submitButton}
                {!submitting && !reachedLimit ? <ArrowIcon /> : null}
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
    </form>
  );
}