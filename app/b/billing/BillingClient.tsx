// app/b/billing/BillingClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
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
    return "border-slate-950 bg-white ring-2 ring-slate-950/5 shadow-[rgba(0,0,0,0.12)_0_24px_60px_-30px]";
  }

  if (plan.tone === "purple") {
    return "border-purple-100 bg-purple-50/60";
  }

  return "border-slate-100 bg-white";
}

function getButtonClass(plan: Plan) {
  if (plan.highlight) {
    return "bg-slate-950 text-white hover:-translate-y-0.5 hover:shadow-xl";
  }

  if (plan.tone === "purple") {
    return "bg-purple-700 text-white hover:-translate-y-0.5 hover:shadow-xl";
  }

  return "bg-slate-950 text-white hover:-translate-y-0.5 hover:shadow-xl";
}

function getBadgeClass(plan: Plan) {
  if (plan.tone === "blue") {
    return "bg-blue-100 text-blue-700";
  }

  if (plan.tone === "purple") {
    return "bg-purple-100 text-purple-700";
  }

  return "bg-slate-100 text-slate-700";
}

function FeatureItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-sm leading-6 text-slate-700">
      <span className="mt-[2px] font-black text-emerald-600">✓</span>
      <span>{children}</span>
    </li>
  );
}

function CompareCell({ children }: { children: ReactNode }) {
  return <td className="border-b px-4 py-4 text-sm">{children}</td>;
}

function CompareHeader({ children }: { children: ReactNode }) {
  return (
    <th className="border-b px-4 py-4 text-left text-sm font-black text-slate-700">
      {children}
    </th>
  );
}

function InfoCard({
  title,
  body,
  tone = "white",
}: {
  title: string;
  body: string;
  tone?: "white" | "blue" | "purple";
}) {
  const className =
    tone === "blue"
      ? "border-blue-100 bg-blue-50"
      : tone === "purple"
      ? "border-purple-100 bg-purple-50"
      : "border-slate-100 bg-white";

  return (
    <div className={`rounded-[28px] border p-6 shadow-sm ${className}`}>
      <h3 className="text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}

export default function BillingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            heroLabel: "Company Pricing",
            heroTitle: "料金プラン",
            heroBody:
              "Trendreの企業向けプランは、注文件数・キャンペーン機能・分析レポート・取引手数料率で分かれます。初期MVPでは日本B × 日本CのJPY取引を中心に運用します。",
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
            supportTitle: "このページでできること",
            supportItems: [
              "Basic / Pro / Premium の違いを確認",
              "月額プランによる機能差を確認",
              "プラン別 marketplace fee を確認",
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
            planCardEyebrow: "Monthly plan",
            feeLabel: "Buyer fee",
          }
        : {
            heroLabel: "Company Pricing",
            heroTitle: "Billing Plans",
            heroBody:
              "Trendre company plans are based on order volume, campaign tools, analytics, reports, and marketplace fee rates. The initial MVP focuses on JPY transactions between Japanese companies and Japanese creators.",
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
            planCardEyebrow: "Monthly plan",
            feeLabel: "Buyer fee",
          },
    [safeLocale]
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
        const accessToken = await getAccessToken();

        const res = await fetch("/api/b/billing/select-plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
    } catch (e: unknown) {
      setErrorMsg(
        e instanceof Error
          ? e.message
          : plan.code === "free"
          ? copy.changeFailed
          : copy.checkoutFailed
      );
      setSubmittingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    setErrorMsg(null);
    setPortalLoading(true);

    try {
      await openBillingPortal();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : copy.portalFailed);
      setPortalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 pb-10 md:p-6">
      <section className="rounded-[32px] bg-slate-950 p-7 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          {copy.heroLabel}
        </p>

        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">
              {copy.heroBody}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenPortal}
            disabled={portalLoading || submittingPlan !== null}
            className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {portalLoading ? copy.opening : copy.openPortal}
          </button>
        </div>
      </section>

      {checkoutState === "cancelled" ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {copy.cancelledMessage}
        </section>
      ) : null}

      {checkoutState === "success" ? (
        <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {copy.successMessage}
        </section>
      ) : null}

      {errorMsg ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {errorMsg}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.code}
            className={`relative rounded-[32px] border p-6 shadow-sm transition ${getPlanCardClass(
              plan
            )}`}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                {copy.planCardEyebrow}
              </p>

              {plan.badgeJa || plan.badgeEn ? (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getBadgeClass(
                    plan
                  )}`}
                >
                  {safeLocale === "ja" ? plan.badgeJa : plan.badgeEn}
                </span>
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-3xl font-black text-slate-950">
                  {plan.publicName}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {safeLocale === "ja" ? plan.descriptionJa : plan.descriptionEn}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                {copy.feeLabel} {plan.marketplaceFeeLabel}
              </span>
            </div>

            <div className="mt-7 flex items-end gap-2">
              <span className="text-5xl font-black tracking-tight text-slate-950">
                {plan.priceLabel}
              </span>
              <span className="pb-2 text-base font-semibold text-slate-500">
                {safeLocale === "ja" ? plan.monthlyLabelJa : plan.monthlyLabelEn}
              </span>
            </div>

            <ul className="mt-7 space-y-3">
              {(safeLocale === "ja" ? plan.featuresJa : plan.featuresEn).map(
                (feature) => (
                  <FeatureItem key={feature}>{feature}</FeatureItem>
                )
              )}
            </ul>

            <button
              onClick={() => void handlePlanClick(plan)}
              disabled={submittingPlan !== null || portalLoading}
              className={`mt-8 w-full rounded-2xl px-5 py-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClass(
                plan
              )}`}
            >
              {submittingPlan === plan.code
                ? copy.changing
                : safeLocale === "ja"
                ? plan.ctaLabelJa
                : plan.ctaLabelEn}
            </button>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <InfoCard
          title={copy.basicFitTitle}
          body={copy.basicFitBody}
          tone="white"
        />
        <InfoCard title={copy.proFitTitle} body={copy.proFitBody} tone="blue" />
        <InfoCard
          title={copy.premiumFitTitle}
          body={copy.premiumFitBody}
          tone="purple"
        />
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">
          {copy.compareTitle}
        </h2>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full overflow-hidden rounded-2xl border border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50">
                <CompareHeader>{copy.compareItem}</CompareHeader>
                <CompareHeader>Basic</CompareHeader>
                <CompareHeader>Pro</CompareHeader>
                <CompareHeader>Premium</CompareHeader>
              </tr>
            </thead>

            <tbody className="bg-white text-slate-700">
              <tr>
                <CompareCell>{copy.compareMonthlyPrice}</CompareCell>
                <CompareCell>{copy.freeLabel}</CompareCell>
                <CompareCell>¥30,000</CompareCell>
                <CompareCell>¥50,000</CompareCell>
              </tr>

              <tr>
                <CompareCell>{copy.compareMarketplaceFee}</CompareCell>
                <CompareCell>10%</CompareCell>
                <CompareCell>10%</CompareCell>
                <CompareCell>5%</CompareCell>
              </tr>

              <tr>
                <CompareCell>{copy.compareRequestLimit}</CompareCell>
                <CompareCell>{copy.fivePerMonth}</CompareCell>
                <CompareCell>{copy.unlimited}</CompareCell>
                <CompareCell>{copy.unlimited}</CompareCell>
              </tr>

              <tr>
                <CompareCell>{copy.compareCampaignPosts}</CompareCell>
                <CompareCell>{copy.notAvailable}</CompareCell>
                <CompareCell>{copy.onePerMonth}</CompareCell>
                <CompareCell>{copy.unlimited}</CompareCell>
              </tr>

              <tr>
                <CompareCell>{copy.comparePreChat}</CompareCell>
                <CompareCell>{copy.partial}</CompareCell>
                <CompareCell>{copy.yes}</CompareCell>
                <CompareCell>{copy.yes}</CompareCell>
              </tr>

              <tr>
                <CompareCell>{copy.compareAdvancedFilters}</CompareCell>
                <CompareCell>{copy.locked}</CompareCell>
                <CompareCell>{copy.yes}</CompareCell>
                <CompareCell>{copy.yes}</CompareCell>
              </tr>

              <tr>
                <CompareCell>{copy.compareCreatorReports}</CompareCell>
                <CompareCell>{copy.notAvailable}</CompareCell>
                <CompareCell>{copy.reports20}</CompareCell>
                <CompareCell>{copy.reports50}</CompareCell>
              </tr>

              <tr>
                <CompareCell>{copy.compareLiveAnalytics}</CompareCell>
                <CompareCell>{copy.notAvailable}</CompareCell>
                <CompareCell>{copy.partial}</CompareCell>
                <CompareCell>{copy.upTo15Posts}</CompareCell>
              </tr>

              <tr>
                <CompareCell>{copy.comparePrioritySupport}</CompareCell>
                <CompareCell>{copy.notAvailable}</CompareCell>
                <CompareCell>{copy.notAvailable}</CompareCell>
                <CompareCell>{copy.yes}</CompareCell>
              </tr>

              <tr>
                <CompareCell>{copy.comparePortal}</CompareCell>
                <CompareCell>{copy.notAvailable}</CompareCell>
                <CompareCell>{copy.availableAfterPaid}</CompareCell>
                <CompareCell>{copy.availableAfterPaid}</CompareCell>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs leading-6 text-slate-500">{copy.devNote}</p>

        <p className="mt-3 text-xs text-slate-500">
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

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-black text-slate-950">
            {copy.supportTitle}
          </h3>

          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            {copy.supportItems.map((item) => (
              <li key={item}>・{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-black text-slate-950">
            {copy.portalTitle}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {copy.portalBody}
          </p>

          <button
            onClick={handleOpenPortal}
            disabled={portalLoading || submittingPlan !== null}
            className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {portalLoading ? copy.opening : copy.openPortal}
          </button>

          <div className="mt-4 grid gap-3">
            <button
              onClick={() => router.push(from)}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition active:scale-[0.98]"
            >
              {copy.back}
            </button>

            <button
              onClick={() => router.push("/b/dashboard")}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition active:scale-[0.98]"
            >
              {copy.toDashboard}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}