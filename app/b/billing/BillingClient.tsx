// app/b/billing/BillingClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppLocale } from "@/lib/i18n/locale";
import { supabase } from "@/lib/supabaseClient";

type PlanCode = "free" | "standard" | "global_pro";

type Plan = {
  code: PlanCode;
  publicName: "Basic" | "Pro" | "Premium";
  priceLabel: string;
  monthlyLabelJa: string;
  monthlyLabelEn: string;
  marketplaceFeeLabel: string;
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
    publicName: "Basic",
    priceLabel: "¥0",
    monthlyLabelJa: "/月",
    monthlyLabelEn: "/month",
    marketplaceFeeLabel: "10%",
    descriptionJa:
      "まずはクリエイターを探し、少数のメニュー購入から始めたい企業向け。",
    descriptionEn:
      "For companies that want to explore creators and start with a small number of menu purchases.",
    featuresJa: [
      "クリエイター一覧・詳細の閲覧",
      "公開メニューの確認・購入",
      "月5件まで注文・依頼可能",
      "案件ページ内の基本チャット",
      "取引ごとの marketplace fee 10%",
      "詳細インサイト・高度フィルターは制限",
    ],
    featuresEn: [
      "Browse creator lists and profiles",
      "Review and purchase public menus",
      "Up to 5 orders / requests per month",
      "Basic in-project chat",
      "10% marketplace fee per transaction",
      "Detailed insights and advanced filters are limited",
    ],
    ctaLabelJa: "Basicではじめる",
    ctaLabelEn: "Start with Basic",
    tone: "gray",
  },
  {
    code: "standard",
    publicName: "Pro",
    priceLabel: "¥30,000",
    monthlyLabelJa: "/月",
    monthlyLabelEn: "/month",
    marketplaceFeeLabel: "10%",
    descriptionJa:
      "継続的にクリエイター施策を行い、検索・事前確認・レポートを強化したい企業向け。",
    descriptionEn:
      "For companies running ongoing creator campaigns with stronger discovery, pre-check, and reporting tools.",
    featuresJa: [
      "Basicの全機能",
      "注文・依頼数無制限",
      "キャンペーン投稿 1件/月",
      "高度フィルター",
      "購入前チャット・交渉",
      "クリエイター簡易レポート 20件/月",
      "取引ごとの marketplace fee 10%",
    ],
    featuresEn: [
      "Everything in Basic",
      "Unlimited orders / requests",
      "1 campaign post per month",
      "Advanced filters",
      "Pre-purchase chat and negotiation",
      "20 creator reports per month",
      "10% marketplace fee per transaction",
    ],
    ctaLabelJa: "Proを選ぶ",
    ctaLabelEn: "Choose Pro",
    highlight: true,
    badgeJa: "おすすめ",
    badgeEn: "Recommended",
    tone: "blue",
  },
  {
    code: "global_pro",
    publicName: "Premium",
    priceLabel: "¥50,000",
    monthlyLabelJa: "/月",
    monthlyLabelEn: "/month",
    marketplaceFeeLabel: "5%",
    descriptionJa:
      "取引量が多く、手数料を下げながら分析・レポート・優先サポートを使いたい企業向け。",
    descriptionEn:
      "For higher-volume teams that want lower marketplace fees, deeper reporting, and priority support.",
    featuresJa: [
      "Proの全機能",
      "キャンペーン投稿 無制限",
      "ライブ分析 15投稿まで",
      "クリエイター詳細レポート 50件/月",
      "優先サポート",
      "取引ごとの marketplace fee 5%",
      "チーム管理・請求管理の拡張に対応予定",
    ],
    featuresEn: [
      "Everything in Pro",
      "Unlimited campaign posts",
      "Live analytics for up to 15 posts",
      "50 detailed creator reports per month",
      "Priority support",
      "5% marketplace fee per transaction",
      "Prepared for team and billing controls",
    ],
    ctaLabelJa: "Premiumを選ぶ",
    ctaLabelEn: "Choose Premium",
    badgeJa: "手数料優遇",
    badgeEn: "Lower fee",
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
              "Trendreの企業向けプランは、国やクリエイターの閲覧範囲ではなく、注文件数・キャンペーン機能・分析レポート・取引手数料率で分かれます。初期MVPでは日本B × 日本CのJPY取引を中心に運用します。",
            authRequired: "ログイン状態を確認できませんでした。",
            changeFailed: "プラン変更に失敗しました。",
            checkoutFailed: "Stripe Checkout の開始に失敗しました。",
            portalFailed: "Billing Portal の起動に失敗しました。",
            changing: "変更中...",
            opening: "起動中...",
            compareTitle: "プラン比較",
            compareItem: "項目",
            compareMonthlyPrice: "月額料金",
            compareMarketplaceFee: "B側 marketplace fee",
            compareRequestLimit: "注文・依頼数",
            compareCampaignPosts: "キャンペーン投稿",
            comparePreChat: "購入前チャット・交渉",
            compareAdvancedFilters: "高度フィルター",
            compareCreatorReports: "クリエイターレポート",
            compareLiveAnalytics: "ライブ分析",
            comparePrioritySupport: "優先サポート",
            comparePortal: "Billing Portal",
            freeLabel: "無料",
            fivePerMonth: "5件 / 月",
            unlimited: "無制限",
            onePerMonth: "1件 / 月",
            reports20: "20件 / 月",
            reports50: "50件 / 月",
            upTo15Posts: "15投稿まで",
            availableAfterPaid: "課金開始後",
            locked: "制限あり",
            notAvailable: "—",
            yes: "○",
            partial: "△",
            devNote:
              "※ 内部コードは既存互換のため free / standard / global_pro のまま使い、表示名だけ Basic / Pro / Premium に統一しています。",
            whichPlanTitle: "どのプランを選ぶべき？",
            basicFitTitle: "Basic が向いている企業",
            basicFitBody:
              "まずはクリエイターを探し、少数のメニュー購入で反応を見たい企業向けです。",
            proFitTitle: "Pro が向いている企業",
            proFitBody:
              "継続的にクリエイター施策を行い、事前チャット・高度フィルター・レポートを使いたい企業向けです。",
            premiumFitTitle: "Premium が向いている企業",
            premiumFitBody:
              "取引量が多く、手数料率を下げながら詳細レポートや優先サポートを使いたい企業向けです。",
            supportTitle: "このページで案内していること",
            supportItems: [
              "Basic / Pro / Premium の違い",
              "月額プランによる機能差",
              "プラン別 marketplace fee",
              "Stripe Checkout による課金開始",
              "Billing Portal からの支払い方法変更・請求確認・解約",
            ],
            back: "前の画面に戻る",
            toDashboard: "ダッシュボードへ戻る",
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
              "Trendre company plans are based on order volume, campaign tools, analytics, reports, and marketplace fee rates rather than country access. The initial MVP focuses on JPY transactions between Japanese companies and Japanese creators.",
            authRequired: "We could not confirm your login session.",
            changeFailed: "Failed to change the plan.",
            checkoutFailed: "Failed to start Stripe Checkout.",
            portalFailed: "Failed to open the Billing Portal.",
            changing: "Updating...",
            opening: "Opening...",
            compareTitle: "Plan Comparison",
            compareItem: "Item",
            compareMonthlyPrice: "Monthly Price",
            compareMarketplaceFee: "Buyer marketplace fee",
            compareRequestLimit: "Orders / Requests",
            compareCampaignPosts: "Campaign Posts",
            comparePreChat: "Pre-purchase Chat",
            compareAdvancedFilters: "Advanced Filters",
            compareCreatorReports: "Creator Reports",
            compareLiveAnalytics: "Live Analytics",
            comparePrioritySupport: "Priority Support",
            comparePortal: "Billing Portal",
            freeLabel: "Free",
            fivePerMonth: "5 / month",
            unlimited: "Unlimited",
            onePerMonth: "1 / month",
            reports20: "20 / month",
            reports50: "50 / month",
            upTo15Posts: "Up to 15 posts",
            availableAfterPaid: "After paid subscription starts",
            locked: "Limited",
            notAvailable: "—",
            yes: "Yes",
            partial: "Partial",
            devNote:
              "Internal plan codes remain free / standard / global_pro for compatibility, while the customer-facing names are Basic / Pro / Premium.",
            whichPlanTitle: "Which plan should you choose?",
            basicFitTitle: "Who should choose Basic?",
            basicFitBody:
              "Best for companies that want to explore creators and test a small number of menu purchases first.",
            proFitTitle: "Who should choose Pro?",
            proFitBody:
              "Best for companies running ongoing creator campaigns and needing pre-purchase chat, advanced filters, and reports.",
            premiumFitTitle: "Who should choose Premium?",
            premiumFitBody:
              "Best for higher-volume teams that want a lower marketplace fee, deeper reports, and priority support.",
            supportTitle: "What this page helps you manage",
            supportItems: [
              "Differences between Basic, Pro, and Premium",
              "Feature differences by monthly plan",
              "Marketplace fee rates by plan",
              "Starting paid plans with Stripe Checkout",
              "Updating payment methods, reviewing invoices, and canceling from Billing Portal",
            ],
            back: "Back",
            toDashboard: "Back to Dashboard",
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

  const [submittingPlan, setSubmittingPlan] = useState<PlanCode | null>(null);
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

            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">{plan.publicName}</h2>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                Fee {plan.marketplaceFeeLabel}
              </span>
            </div>

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
                  Basic
                </th>
                <th className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
                  Pro
                </th>
                <th className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
                  Premium
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
                  {copy.compareMarketplaceFee}
                </td>
                <td className="border-b px-4 py-3">10%</td>
                <td className="border-b px-4 py-3">10%</td>
                <td className="border-b px-4 py-3">5%</td>
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
                  {copy.compareCampaignPosts}
                </td>
                <td className="border-b px-4 py-3">{copy.notAvailable}</td>
                <td className="border-b px-4 py-3">{copy.onePerMonth}</td>
                <td className="border-b px-4 py-3">{copy.unlimited}</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.comparePreChat}
                </td>
                <td className="border-b px-4 py-3">{copy.partial}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareAdvancedFilters}
                </td>
                <td className="border-b px-4 py-3">{copy.locked}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareCreatorReports}
                </td>
                <td className="border-b px-4 py-3">{copy.notAvailable}</td>
                <td className="border-b px-4 py-3">{copy.reports20}</td>
                <td className="border-b px-4 py-3">{copy.reports50}</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.compareLiveAnalytics}
                </td>
                <td className="border-b px-4 py-3">{copy.notAvailable}</td>
                <td className="border-b px-4 py-3">{copy.partial}</td>
                <td className="border-b px-4 py-3">{copy.upTo15Posts}</td>
              </tr>
              <tr>
                <td className="border-b px-4 py-3 font-medium text-gray-700">
                  {copy.comparePrioritySupport}
                </td>
                <td className="border-b px-4 py-3">{copy.notAvailable}</td>
                <td className="border-b px-4 py-3">{copy.notAvailable}</td>
                <td className="border-b px-4 py-3">{copy.yes}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-700">
                  {copy.comparePortal}
                </td>
                <td className="px-4 py-3">{copy.notAvailable}</td>
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
              <p className="font-semibold">{copy.basicFitTitle}</p>
              <p className="mt-1 text-gray-600">{copy.basicFitBody}</p>
            </div>

            <div>
              <p className="font-semibold">{copy.proFitTitle}</p>
              <p className="mt-1 text-gray-600">{copy.proFitBody}</p>
            </div>

            <div>
              <p className="font-semibold">{copy.premiumFitTitle}</p>
              <p className="mt-1 text-gray-600">{copy.premiumFitBody}</p>
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
