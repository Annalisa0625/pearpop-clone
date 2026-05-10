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

function getPlanLabel(planCode: GateState["companyPlanCode"]) {
  switch (planCode) {
    case "standard":
      return "Pro";
    case "global_pro":
      return "Premium";
    case "free":
    default:
      return "Basic";
  }
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

function getPlatformIcon(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized.includes("instagram")) return "◎";
  if (normalized.includes("tiktok")) return "♪";
  if (normalized.includes("youtube")) return "▶";
  if (normalized === "x" || normalized.includes("twitter")) return "𝕏";
  if (normalized.includes("ugc")) return "▣";

  return "●";
}

function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: "gray" | "blue" | "green" | "yellow" | "purple" | "red" | "black";
}) {
  const styles = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
    black: "bg-slate-950 text-white",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone]}`}
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
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className={`text-right text-sm ${
          bold ? "font-black text-slate-950" : "font-semibold text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
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
            creatorNotFound:
              "クリエイターが見つかりません。現在注文受付できない状態の可能性があります。",
            companyOnlyTitle: "企業アカウントのみ利用できます",
            companyOnlyBody: "この注文フォームは企業アカウント専用です。",
            unavailableTitle: "現在この機能は利用できません",
            unavailableBody:
              "アカウント状態により、現在は注文をご利用いただけません。",
            profileRequiredTitle: "企業プロフィールの完了が必要です",
            profileRequiredBody:
              "注文の前に、企業プロフィールを完了してください。",
            profileRequiredCta: "企業プロフィールを入力する",
            billingTitle: "有料プランの有効化が必要です",
            billingBody:
              "現在の有料プランが有効ではありません。Basicの場合は月額課金なしで注文できます。",
            billingCta: "料金プランを見る",
            backToCreator: "クリエイター詳細へ戻る",
            mainAudience: "主な視聴者",
            notSet: "未設定",
            pageStep: "1",
            pageStepLabel: "Place Order",
            pageTitle: "注文内容を入力",
            pageSubtitle:
              "支払いは72時間保持されます。クリエイターが承認した場合のみ決済が確定し、辞退または期限切れの場合は請求されません。",
            creatorInfo: "Creator",
            platforms: "対応SNS",
            currentPlan: "現在プラン",
            remainingThisMonth: "残り注文可能数",
            nextReset: "次回リセット目安",
            unlimited: "無制限",
            selectedMenu: "Selected package",
            selectMenu: "注文するメニュー",
            noMenus: "公開メニューがありません。",
            price: "価格",
            delivery: "納期",
            deliverables: "納品物",
            secondaryUse: "二次利用",
            allowed: "許可",
            notAllowed: "不可",
            notes: "注意事項",
            none: "なし",
            productInfo: "Requirements",
            productName: "商品名・案件名",
            productNamePlaceholder: "例：新作美容液PR",
            productUrl: "商品URL",
            productUrlPlaceholder: "https://...",
            deadline: "希望納期",
            freeOffer: "商品の無償提供あり",
            wantsSecondaryUse: "二次利用を希望する",
            secondaryUseUnavailable:
              "このメニューでは二次利用は許可されていません。",
            requirements: "注文内容・requirements",
            requirementsPlaceholder:
              "紹介してほしいポイント、投稿内容、希望形式、避けてほしい表現、参考イメージなどを記入してください。",
            productRequired: "商品名・案件名を入力してください。",
            noteRequired: "注文内容・requirementsは10文字以上で入力してください。",
            menuRequired: "注文するメニューを選択してください。",
            freeLimitReached:
              "Basicでは月5件まで注文できます。上限に達したため、プラン変更をご検討ください。",
            submitError: "注文用Checkoutの作成に失敗しました。",
            networkError: "通信エラーが発生しました。",
            authError: "ログイン情報を取得できませんでした。",
            checkoutUrlMissing: "Checkout URLを取得できませんでした。",
            submitting: "Checkout作成中...",
            limitReachedButton: "上限に達しています",
            submitButton: "Checkoutへ進む",
            pieces: "件",
            orderNotice:
              "次の画面でカードの与信枠を確保します。クリエイターが72時間以内に承認した場合のみ決済が確定します。",
            orderSummary: "Order Summary",
            menuPrice: "メニュー価格",
            marketplaceFee: "Trendre marketplace fee",
            total: "お支払い合計",
            paymentProtection:
              "Payment Protection: クリエイターが辞退した場合、請求は確定しません。",
          }
        : {
            loading: "Loading...",
            creatorNotFound:
              "Creator not found. This creator may not currently be ready to receive orders.",
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
            billingTitle: "Paid plan activation is required",
            billingBody:
              "Your paid plan is not active. Basic can place orders without a monthly subscription.",
            billingCta: "View Billing Plans",
            backToCreator: "Back to Creator Detail",
            mainAudience: "Main audience",
            notSet: "Not set",
            pageStep: "1",
            pageStepLabel: "Place Order",
            pageTitle: "Place Order",
            pageSubtitle:
              "Your payment will be held for 72 hours. It will only be captured if the creator accepts.",
            creatorInfo: "Creator",
            platforms: "Platforms",
            currentPlan: "Current Plan",
            remainingThisMonth: "Remaining orders",
            nextReset: "Next reset",
            unlimited: "Unlimited",
            selectedMenu: "Selected package",
            selectMenu: "Menu to order",
            noMenus: "No public menus are available.",
            price: "Price",
            delivery: "Delivery",
            deliverables: "Deliverables",
            secondaryUse: "Secondary use",
            allowed: "Allowed",
            notAllowed: "Not allowed",
            notes: "Notes",
            none: "None",
            productInfo: "Requirements",
            productName: "Product or campaign name",
            productNamePlaceholder: "Example: New skincare serum PR",
            productUrl: "Product URL",
            productUrlPlaceholder: "https://...",
            deadline: "Preferred deadline",
            freeOffer: "Product will be provided for free",
            wantsSecondaryUse: "Request secondary use",
            secondaryUseUnavailable:
              "Secondary use is not allowed for this menu.",
            requirements: "Order requirements",
            requirementsPlaceholder:
              "Describe key selling points, requested content, preferred format, expressions to avoid, reference ideas, and any important details.",
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
            submitButton: "Continue to Checkout",
            pieces: "",
            orderNotice:
              "Your card will be authorized on the next screen. The payment will only be captured if the creator accepts within 72 hours.",
            orderSummary: "Order Summary",
            menuPrice: "Menu price",
            marketplaceFee: "Trendre marketplace fee",
            total: "Total",
            paymentProtection:
              "Payment Protection: If the creator declines, the charge will not be finalized.",
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

  const disableSubmit =
    submitting || reachedLimit || !selectedMenu || !gate.canSendRequests;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-8 border-b pb-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400 bg-emerald-50 font-bold text-emerald-600">
            {copy.pageStep}
          </span>
          <span className="font-semibold text-slate-900">
            {copy.pageStepLabel}
          </span>
        </div>
      </div>

      <section className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">
          {copy.pageTitle}
        </h1>
        <p className="mt-3 max-w-5xl text-base leading-7 text-slate-600">
          {copy.pageSubtitle}
        </p>
      </section>

      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_0.88fr]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-black text-slate-950">
              {copy.selectMenu}
            </h2>

            {menus.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{copy.noMenus}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {menus.map((menu) => {
                  const isSelected = form.creator_menu_id === menu.id;
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
                      onClick={() => handleMenuChange(menu.id)}
                      className={`w-full rounded-[16px] border bg-white p-5 text-left transition hover:border-slate-400 ${
                        isSelected
                          ? "border-slate-950 shadow-sm"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">◉</span>
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
                            <Badge tone="blue">
                              {menu.platform || menu.sns || copy.notSet}
                            </Badge>
                            <Badge tone="purple">
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
                            ✓
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="border-t pt-8">
            <h2 className="text-xl font-black text-slate-950">
              {copy.productInfo}
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-900">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-950"
                  placeholder={copy.productNamePlaceholder}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-900">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-950"
                  placeholder={copy.productUrlPlaceholder}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-900">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-950"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold">
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

              <div className="rounded-xl border border-slate-200 bg-white p-4">
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
                  <p className="mt-2 text-xs text-slate-500">
                    {copy.secondaryUseUnavailable}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-900">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-950"
                  rows={8}
                  placeholder={copy.requirementsPlaceholder}
                  required
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-[10px] border border-slate-200 bg-white p-5 shadow-lg">
            <h2 className="text-xl font-black text-slate-950">
              {copy.orderSummary}
            </h2>

            {selectedMenu ? (
              <div className="mt-5 space-y-5">
                <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                    ◉
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black text-slate-950">
                      {selectedMenu.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      @{creator.display_name}
                    </p>
                  </div>

                  <p className="shrink-0 text-base font-black text-slate-950">
                    {formatPrice(
                      selectedMenu.price,
                      selectedMenu.currency,
                      selectedMenu.reference_price_text,
                      safeLocale
                    )}
                  </p>
                </div>

                <div className="space-y-3 border-b border-slate-100 pb-5">
                  <Row
                    label={copy.menuPrice}
                    value={formatPlainPrice(
                      menuPriceAmount,
                      selectedMenu.currency,
                      safeLocale
                    )}
                  />

                  <Row
                    label={copy.marketplaceFee}
                    value={formatPlainPrice(
                      buyerFeeAmount,
                      selectedMenu.currency,
                      safeLocale
                    )}
                  />

                  <Row
                    label={copy.total}
                    value={formatPlainPrice(
                      buyerTotalAmount,
                      selectedMenu.currency,
                      safeLocale
                    )}
                    bold
                  />
                </div>

                <div className="space-y-3">
                  <Row
                    label={copy.delivery}
                    value={formatDeliveryDays(
                      selectedMenu.delivery_days,
                      safeLocale,
                      copy.notSet
                    )}
                  />

                  <Row
                    label={copy.secondaryUse}
                    value={
                      selectedMenu.allow_secondary_use
                        ? copy.allowed
                        : copy.notAllowed
                    }
                  />

                  <Row
                    label={copy.currentPlan}
                    value={getPlanLabel(gate.companyPlanCode)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={disableSubmit}
                  className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-4 text-base font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? copy.submitting
                    : reachedLimit
                      ? copy.limitReachedButton
                      : copy.submitButton}
                </button>

                <div className="my-5 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-sm text-slate-400">or</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/b/creators/${creator.id}`)}
                  className="w-full text-center text-sm font-black text-slate-800 underline underline-offset-4 transition hover:text-slate-950"
                >
                  {copy.backToCreator}
                </button>

                <p className="mt-5 text-center text-sm leading-6 text-slate-500">
                  ⓘ {copy.paymentProtection}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{copy.noMenus}</p>
            )}
          </section>

          {errorMsg ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
              {errorMsg}
            </div>
          ) : null}

          {reachedLimit ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              {copy.freeLimitReached}
            </div>
          ) : null}

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-800">
            {copy.orderNotice}
          </section>
        </aside>
      </form>
    </div>
  );
}