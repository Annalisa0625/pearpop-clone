// app/b/billing/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppLocale } from "@/lib/i18n/locale";
import { supabase } from "@/lib/supabaseClient";

type Plan = {
  code: "free" | "standard" | "global_pro";
  name: string;
  priceLabel: string;
  monthlyLabelJa: string;
  monthlyLabelEn: string;
  descriptionJa: string;
  descriptionEn: string;
  featuresJa: string[];
  featuresEn: string[];
  ctaLabelJa: string;
  ctaLabelEn: string;
  highlight?: boolean;
  badgeJa?: string;
  badgeEn?: string;
  tone: "gray" | "blue" | "purple";
};

const PLANS: Plan[] = [
  {
    code: "free",
    name: "Free",
    priceLabel: "¥0",
    monthlyLabelJa: "/月",
    monthlyLabelEn: "/month",
    descriptionJa: "まずは日本市場向けの候補探索を始めたい企業向け",
    descriptionEn:
      "For companies that want to start exploring creators for the Japan market",
    featuresJa: [
      "クリエイター一覧の閲覧",
      "クリエイター詳細の閲覧",
      "参考条件カードの閲覧",
      "日本向け案件に合うクリエイターの確認",
      "月5件まで依頼送信可能",
    ],
    featuresEn: [
      "Creator list browsing",
      "Creator detail browsing",
      "Rate card browsing",
      "Access to creators suitable for Japan-focused campaigns",
      "Up to 5 requests per month",
    ],
    ctaLabelJa: "Freeではじめる",
    ctaLabelEn: "Start with Free",
    tone: "gray",
  },
  {
    code: "standard",
    name: "Standard",
    priceLabel: "¥30,000",
    monthlyLabelJa: "/月",
    monthlyLabelEn: "/month",
    descriptionJa:
      "海外ブランド・海外事業者が日本市場向け施策を継続運用したい場合に最適",
    descriptionEn:
      "Best for overseas brands and businesses running ongoing campaigns for the Japan market",
    featuresJa: [
      "日本市場向けクリエイターへの依頼",
      "依頼送信無制限",
      "案件進行管理",
      "チャット利用",
      "企業向け主要機能",
    ],
    featuresEn: [
      "Requests to creators for Japan-focused campaigns",
      "Unlimited requests",
      "Project management",
      "Chat access",
      "Core company features",
    ],
    ctaLabelJa: "Standardを選ぶ",
    ctaLabelEn: "Choose Standard",
    highlight: true,
    badgeJa: "おすすめ",
    badgeEn: "Recommended",
    tone: "blue",
  },
  {
    code: "global_pro",
    name: "GlobalPro",
    priceLabel: "¥50,000",
    monthlyLabelJa: "/月",
    monthlyLabelEn: "/month",
    descriptionJa:
      "日本市場向けに加えて、海外向け視聴者を持つクリエイターも含めて広く活用したい企業向け",
    descriptionEn:
      "For companies that want Japan-focused campaigns plus access to creators with broader international audience reach",
    featuresJa: [
      "日本市場向け + 海外向け視聴者を持つクリエイターにも依頼可能",
      "依頼送信無制限",
      "案件進行管理",
      "チャット利用",
      "より広い展開向けの上位プラン",
    ],
    featuresEn: [
      "Access to Japan-focused creators plus creators with broader international audience reach",
      "Unlimited requests",
      "Project management",
      "Chat access",
      "Advanced plan for broader expansion",
    ],
    ctaLabelJa: "GlobalProを選ぶ",
    ctaLabelEn: "Choose GlobalPro",
    badgeJa: "上位プラン",
    badgeEn: "Advanced",
    tone: "purple",
  },
];

function getPlanCardClass(plan: Plan) {
  if (plan.highlight) {
    return "border-blue-500 bg-blue-50 shadow-md";
  }
  if (plan.tone === "purple") {
    return "border-purple-200 bg-purple-50";
  }
  return "border-gray-200 bg-white";
}

function getButtonClass(plan: Plan) {
  if (plan.highlight) {
    return "bg-blue-600 text-white hover:bg-blue-700";
  }
  if (plan.tone === "purple") {
    return "bg-purple-600 text-white hover:bg-purple-700";
  }
  return "bg-gray-900 text-white hover:bg-black";
}

function getBadgeClass(plan: Plan) {
  if (plan.tone === "blue") {
    return "bg-blue-100 text-blue-700";
  }
  if (plan.tone === "purple") {
    return "bg-purple-100 text-purple-700";
  }
  return "bg-gray-100 text-gray-700";
}

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            heroLabel: "Company Plan",
            heroTitle: "料金プラン",
            heroBody:
              "海外ブランド・海外事業者が、日本市場向けに日本のクリエイターを活用するためのプランです。まずは Free で候補探索を始め、継続運用するなら Standard、より広い対象へ依頼したい場合は GlobalPro を選べます。",
            authRequired: "ログイン状態を確認できませんでした。",
            changeFailed: "プラン変更に失敗しました。",
            checkoutFailed: "Stripe Checkout の開始に失敗しました。",
            portalFailed: "Billing Portal の起動に失敗しました。",
            networkError: "通信エラーが発生しました。",
            changing: "変更中...",
            opening: "起動中...",
            compareTitle: "プラン比較",
            compareItem: "項目",
            compareMonthlyPrice: "月額料金",
            compareBestFor: "向いている使い方",
            compareRequestScope: "主な依頼対象",
            compareRequestLimit: "リクエスト送信数",
            compareCreatorBrowse: "クリエイター閲覧",
            compareProjectManage: "案件進行管理",
            compareChat: "チャット利用",
            comparePortal: "Billing Portal",
            freeLabel: "無料",
            trialUse: "まず試したい",
            japanEntry: "日本市場向け継続運用",
            broaderExpansion: "より広い展開",
            japanCreators: "日本市場向け施策に合うクリエイター",
            japanPlusGlobalCreators:
              "日本市場向け + 海外向け視聴者を持つクリエイター",
            fivePerMonth: "5件 / 月",
            unlimited: "無制限",
            availableAfterPaid: "課金開始後",
            devNote:
              "※ Free はアプリ内で即時反映され、Standard / GlobalPro は Stripe Checkout 完了後にアプリへ自動同期されます。",
            whichPlanTitle: "どのプランを選ぶべき？",
            freeFitTitle: "Free が向いている企業",
            freeFitBody:
              "まずは日本市場向けの候補を探したい、少数の依頼から始めたい企業向けです。",
            standardFitTitle: "Standard が向いている企業",
            standardFitBody:
              "海外ブランド・海外事業者として、日本向けの認知獲得や販売促進を継続的に進めたい場合に最適です。",
            globalFitTitle: "GlobalPro が向いている企業",
            globalFitBody:
              "日本向けに加えて、より広い視聴者層や越境展開も見据えて活用したい企業向けです。",
            supportTitle: "このページで案内していること",
            supportItems: [
              "Free / Standard / GlobalPro の違い",
              "Stripe Checkout による課金開始",
              "Billing Portal からの支払い方法変更・請求確認・解約",
              "課金状態の自動同期",
              "ダッシュボード / クリエイター一覧への反映",
            ],
            back: "前の画面に戻る",
            toDashboard: "ダッシュボードへ戻る",
            yes: "○",
            partial: "△",
            no: "—",
            terms: "利用規約",
            businessInfo: "事業者情報",
            billingNote: "プラン申込み前にご確認ください。",
            portalTitle: "支払い方法・請求管理",
            portalBody:
              "課金開始後は Stripe の Billing Portal から、支払い方法変更・請求確認・解約ができます。",
            openPortal: "Billing Portal を開く",
            cancelledMessage:
              "Checkout はキャンセルされました。再度プランを選び直せます。",
            successMessage:
              "Checkout が完了しました。プラン状態は自動同期されます。反映まで数秒かかる場合があります。",
          }
        : {
            heroLabel: "Company Plan",
            heroTitle: "Billing Plans",
            heroBody:
              "Plans for overseas brands and businesses that want to work with creators for the Japan market. Start with Free to explore creators, choose Standard for ongoing Japan-focused campaigns, or use GlobalPro for broader expansion.",
            authRequired: "We could not confirm your login session.",
            changeFailed: "Failed to change the plan.",
            checkoutFailed: "Failed to start Stripe Checkout.",
            portalFailed: "Failed to open the Billing Portal.",
            networkError: "A network error occurred.",
            changing: "Updating...",
            opening: "Opening...",
            compareTitle: "Plan Comparison",
            compareItem: "Item",
            compareMonthlyPrice: "Monthly Price",
            compareBestFor: "Best For",
            compareRequestScope: "Main Request Scope",
            compareRequestLimit: "Request Limit",
            compareCreatorBrowse: "Creator Browsing",
            compareProjectManage: "Project Management",
            compareChat: "Chat Access",
            comparePortal: "Billing Portal",
            freeLabel: "Free",
            trialUse: "Trying the platform first",
            japanEntry: "Ongoing Japan market campaigns",
            broaderExpansion: "Broader expansion",
            japanCreators: "Creators suitable for Japan-focused campaigns",
            japanPlusGlobalCreators:
              "Japan-focused creators plus creators with broader international audience reach",
            fivePerMonth: "5 requests / month",
            unlimited: "Unlimited",
            availableAfterPaid: "After paid subscription starts",
            devNote:
              "Free is reflected immediately inside the app, while Standard and GlobalPro are automatically synced after Stripe Checkout is completed.",
            whichPlanTitle: "Which plan should you choose?",
            freeFitTitle: "Who should choose Free?",
            freeFitBody:
              "Best for companies that want to explore creators for the Japan market first and start with a small number of requests.",
            standardFitTitle: "Who should choose Standard?",
            standardFitBody:
              "Best for overseas brands and businesses that want to run ongoing awareness or sales campaigns for customers in Japan.",
            globalFitTitle: "Who should choose GlobalPro?",
            globalFitBody:
              "Best for companies that want Japan-focused campaigns plus broader audience reach for wider expansion.",
            supportTitle: "What this page helps you manage",
            supportItems: [
              "The differences between Free, Standard, and GlobalPro",
              "Starting paid plans with Stripe Checkout",
              "Updating payment methods, reviewing invoices, and canceling from Billing Portal",
              "Automatic sync of subscription status",
              "Reflecting plan status in the dashboard and creator pages",
            ],
            back: "Back",
            toDashboard: "Back to Dashboard",
            yes: "Yes",
            partial: "Partial",
            no: "—",
            terms: "Terms of Service",
            businessInfo: "Business Information",
            billingNote: "Please review these before applying for a plan.",
            portalTitle: "Payment Method & Billing Management",
            portalBody:
              "After subscription starts, you can use Stripe Billing Portal to update payment methods, review invoices, and cancel your subscription.",
            openPortal: "Open Billing Portal",
            cancelledMessage:
              "Checkout was cancelled. You can choose a plan again.",
            successMessage:
              "Checkout completed. Your plan status will sync automatically. It may take a few seconds to reflect inside the app.",
          },
    [locale]
  );

  const [submittingPlan, setSubmittingPlan] = useState<
    "free" | "standard" | "global_pro" | null
  >(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const from = useMemo(() => {
    const raw = searchParams.get("from");
    if (!raw) return "/b/dashboard";
    if (!raw.startsWith("/")) return "/b/dashboard";
    return raw;
  }, [searchParams]);

  const checkoutState = searchParams.get("checkout");

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  };

  const startStripeCheckout = async (plan: "standard" | "global_pro") => {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error(copy.authRequired);
    }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ plan }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.url) {
      throw new Error(json?.error ?? copy.checkoutFailed);
    }

    window.location.href = json.url;
  };

  const openBillingPortal = async () => {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error(copy.authRequired);
    }

    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.url) {
      throw new Error(json?.error ?? copy.portalFailed);
    }

    window.location.href = json.url;
  };

  const handlePlanClick = async (plan: Plan) => {
    setErrorMsg(null);
    setSubmittingPlan(plan.code);

    try {
      if (plan.code === "free") {
        const res = await fetch("/api/b/billing/select-plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan: "free",
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error?.message ?? copy.changeFailed);
        }

        router.push("/b/dashboard");
        router.refresh();
        return;
      }

      await startStripeCheckout(plan.code);
    } catch (e: any) {
      setErrorMsg(
        e?.message ??
          (plan.code === "free" ? copy.changeFailed : copy.checkoutFailed)
      );
      setSubmittingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    setErrorMsg(null);
    setPortalLoading(true);

    try {
      await openBillingPortal();
    } catch (e: any) {
      setErrorMsg(e?.message ?? copy.portalFailed);
      setPortalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-blue-600">
          {copy.heroLabel}
        </p>
        <h1 className="text-3xl font-bold">{copy.heroTitle}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
          {copy.heroBody}
        </p>
      </section>

      {checkoutState === "cancelled" && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {copy.cancelledMessage}
        </section>
      )}

      {checkoutState === "success" && (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {copy.successMessage}
        </section>
      )}

      {errorMsg && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.code}
            className={`relative rounded-3xl border p-6 shadow-sm transition ${getPlanCardClass(
              plan
            )}`}
          >
            {plan.badgeJa || plan.badgeEn ? (
              <div className="mb-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(
                    plan
                  )}`}
                >
                  {locale === "ja" ? plan.badgeJa : plan.badgeEn}
                </span>
              </div>
            ) : (
              <div className="mb-4 h-[28px]" />
            )}

            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {locale === "ja" ? plan.descriptionJa : plan.descriptionEn}
            </p>

            <div className="mt-6 flex items-end gap-2">
              <span className="text-4xl font-bold">{plan.priceLabel}</span>
              <span className="pb-1 text-base text-gray-500">
                {locale === "ja" ? plan.monthlyLabelJa : plan.monthlyLabelEn}
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              {(locale === "ja" ? plan.featuresJa : plan.featuresEn).map(
                (feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-[2px] text-green-600">✓</span>
                    <span>{feature}</span>
                  </li>
                )
              )}
            </ul>

            <button
              onClick={() => handlePlanClick(plan)}
              disabled={submittingPlan !== null || portalLoading}
              className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClass(
                plan
              )}`}
            >
              {submittingPlan === plan.code
                ? copy.changing
                : locale === "ja"
                ? plan.ctaLabelJa
                : plan.ctaLabelEn}
            </button>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">{copy.compareTitle}</h2>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full overflow-hidden rounded-2xl border border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
                  {copy.compareItem}
                </th>
                <th className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
                  Free
                </th>
                <th className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
                  Standard
                </th>
                <th className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
                  GlobalPro
                </th>
              </tr>
            </thead>
            <tbody className="bg-white text-sm">
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareMonthlyPrice}
                </td>
                <td className="border-b px-4 py-3">{copy.freeLabel}</td>
                <td className="border-b px-4 py-3">¥30,000</td>
                <td className="border-b px-4 py-3">¥50,000</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareBestFor}
                </td>
                <td className="border-b px-4 py-3">{copy.trialUse}</td>
                <td className="border-b px-4 py-3">{copy.japanEntry}</td>
                <td className="border-b px-4 py-3">{copy.broaderExpansion}</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareRequestScope}
                </td>
                <td className="border-b px-4 py-3">{copy.japanCreators}</td>
                <td className="border-b px-4 py-3">{copy.japanCreators}</td>
                <td className="border-b px-4 py-3">
                  {copy.japanPlusGlobalCreators}
                </td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareRequestLimit}
                </td>
                <td className="border-b px-4 py-3">{copy.fivePerMonth}</td>
                <td className="border-b px-4 py-3">{copy.unlimited}</td>
                <td className="border-b px-4 py-3">{copy.unlimited}</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareCreatorBrowse}
                </td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareProjectManage}
                </td>
                <td className="border-b px-4 py-3">{copy.partial}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareChat}
                </td>
                <td className="border-b px-4 py-3">{copy.partial}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-700">
                  {copy.comparePortal}
                </td>
                <td className="px-4 py-3">{copy.no}</td>
                <td className="px-4 py-3">{copy.availableAfterPaid}</td>
                <td className="px-4 py-3">{copy.availableAfterPaid}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs leading-6 text-gray-500">{copy.devNote}</p>

        <p className="mt-3 text-xs text-gray-500">
          {copy.billingNote}{" "}
          <Link
            href="/terms"
            target="_blank"
            className="underline underline-offset-4"
          >
            {copy.terms}
          </Link>{" "}
          /{" "}
          <Link
            href="/legal"
            target="_blank"
            className="underline underline-offset-4"
          >
            {copy.businessInfo}
          </Link>
        </p>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">{copy.portalTitle}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
          {copy.portalBody}
        </p>

        <button
          onClick={handleOpenPortal}
          disabled={portalLoading || submittingPlan !== null}
          className="mt-6 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {portalLoading ? copy.opening : copy.openPortal}
        </button>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border bg-blue-50 p-6">
          <h3 className="text-xl font-bold">{copy.whichPlanTitle}</h3>

          <div className="mt-5 space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-semibold">{copy.freeFitTitle}</p>
              <p className="mt-1 text-gray-600">{copy.freeFitBody}</p>
            </div>

            <div>
              <p className="font-semibold">{copy.standardFitTitle}</p>
              <p className="mt-1 text-gray-600">{copy.standardFitBody}</p>
            </div>

            <div>
              <p className="font-semibold">{copy.globalFitTitle}</p>
              <p className="mt-1 text-gray-600">{copy.globalFitBody}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold">{copy.supportTitle}</h3>

          <ul className="mt-5 space-y-3 text-sm text-gray-700">
            {copy.supportItems.map((item) => (
              <li key={item}>・{item}</li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push(from)}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {copy.back}
            </button>
            <button
              onClick={() => router.push("/b/dashboard")}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {copy.toDashboard}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}