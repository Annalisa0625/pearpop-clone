// File: app/b/billing/BillingClient.tsx
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
};

const PLANS: Plan[] = [
  {
    code: "free",
    publicName: "Basic",
    priceLabel: "¥0",
    monthlyLabelJa: "/月",
    monthlyLabelEn: "/month",
    marketplaceFeeLabel: "10%",
    descriptionJa: "まずはインフルエンサーを探して、少数の注文から試したい企業向け。",
    descriptionEn:
      "For companies that want to explore influencers and start with a small number of orders.",
    featuresJa: [
      "インフルエンサー検索・詳細閲覧",
      "公開メニューの確認・注文",
      "月5件まで注文可能",
      "注文内チャット",
      "取引手数料 10%",
    ],
    featuresEn: [
      "Browse influencer profiles",
      "Review and order public menus",
      "Up to 5 orders per month",
      "In-order chat",
      "10% transaction fee",
    ],
    ctaLabelJa: "Basicではじめる",
    ctaLabelEn: "Start with Basic",
  },
  {
    code: "standard",
    publicName: "Pro",
    priceLabel: "¥30,000",
    monthlyLabelJa: "/月",
    monthlyLabelEn: "/month",
    marketplaceFeeLabel: "10%",
    descriptionJa: "継続的にPR・UGC施策を行いたい企業向け。",
    descriptionEn:
      "For companies running ongoing PR and UGC campaigns.",
    featuresJa: [
      "Basicの全機能",
      "注文数 無制限",
      "継続施策向けの利用枠",
      "取引手数料 10%",
    ],
    featuresEn: [
      "Everything in Basic",
      "Unlimited orders",
      "Designed for ongoing campaigns",
      "10% transaction fee",
    ],
    ctaLabelJa: "Proを選ぶ",
    ctaLabelEn: "Choose Pro",
    highlight: true,
    badgeJa: "おすすめ",
    badgeEn: "Recommended",
  },
  {
    code: "global_pro",
    publicName: "Premium",
    priceLabel: "¥50,000",
    monthlyLabelJa: "/月",
    monthlyLabelEn: "/month",
    marketplaceFeeLabel: "5%",
    descriptionJa: "注文数が多く、手数料を抑えて運用したい企業向け。",
    descriptionEn:
      "For higher-volume teams that want a lower transaction fee.",
    featuresJa: [
      "Proの全機能",
      "注文数 無制限",
      "取引手数料 5%",
      "優先サポート",
    ],
    featuresEn: [
      "Everything in Pro",
      "Unlimited orders",
      "5% transaction fee",
      "Priority support",
    ],
    ctaLabelJa: "Premiumを選ぶ",
    ctaLabelEn: "Choose Premium",
    badgeJa: "手数料優遇",
    badgeEn: "Lower fee",
  },
];

function getPlanCardClass(plan: Plan) {
  if (plan.highlight) {
    return "bg-white shadow-[0_24px_80px_rgba(255,95,103,0.14)] ring-2 ring-[#ff5f67]/35";
  }

  return "bg-white shadow-[0_22px_70px_rgba(15,23,42,0.055)]";
}

function getButtonClass(plan: Plan) {
  if (plan.highlight) {
    return "bg-[#ff5f67] text-white hover:bg-[#ff4b55] shadow-[0_16px_32px_rgba(255,95,103,0.22)]";
  }

  return "bg-slate-950 text-white hover:bg-slate-800";
}

function FeatureItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-sm font-semibold leading-6 text-slate-600">
      <span className="mt-[2px] font-black text-emerald-600">✓</span>
      <span>{children}</span>
    </li>
  );
}

function PlanCard({
  plan,
  safeLocale,
  submittingPlan,
  portalLoading,
  onClick,
}: {
  plan: Plan;
  safeLocale: "ja" | "en";
  submittingPlan: PlanCode | null;
  portalLoading: boolean;
  onClick: (plan: Plan) => void;
}) {
  const features = safeLocale === "ja" ? plan.featuresJa : plan.featuresEn;

  return (
    <article
      className={`relative rounded-[30px] p-6 transition hover:-translate-y-0.5 md:p-7 ${getPlanCardClass(
        plan
      )}`}
    >
      {plan.badgeJa || plan.badgeEn ? (
        <div className="absolute right-5 top-5">
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-[#ff5f67] ring-1 ring-rose-100">
            {safeLocale === "ja" ? plan.badgeJa : plan.badgeEn}
          </span>
        </div>
      ) : null}

      <div className="pr-20">
        <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
          {plan.publicName}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
          {safeLocale === "ja" ? plan.descriptionJa : plan.descriptionEn}
        </p>
      </div>

      <div className="mt-7 flex items-end gap-2">
        <span className="text-5xl font-black tracking-[-0.06em] text-slate-950">
          {plan.priceLabel}
        </span>
        <span className="pb-2 text-sm font-black text-slate-400">
          {safeLocale === "ja" ? plan.monthlyLabelJa : plan.monthlyLabelEn}
        </span>
      </div>

      <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
        B側手数料 {plan.marketplaceFeeLabel}
      </div>

      <ul className="mt-7 space-y-3">
        {features.map((feature) => (
          <FeatureItem key={feature}>{feature}</FeatureItem>
        ))}
      </ul>

      <button
        onClick={() => onClick(plan)}
        disabled={submittingPlan !== null || portalLoading}
        className={`mt-8 w-full rounded-full px-5 py-4 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClass(
          plan
        )}`}
      >
        {submittingPlan === plan.code
          ? safeLocale === "ja"
            ? "変更中..."
            : "Updating..."
          : safeLocale === "ja"
          ? plan.ctaLabelJa
          : plan.ctaLabelEn}
      </button>
    </article>
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
            title: "料金プラン",
            body:
              "注文数と手数料に合わせてプランを選べます。まずはBasicからでも利用できます。",
            authRequired: "ログイン状態を確認できませんでした。",
            changeFailed: "プラン変更に失敗しました。",
            checkoutFailed: "Stripe Checkout の開始に失敗しました。",
            portalFailed: "Billing Portal の起動に失敗しました。",
            opening: "起動中...",
            openPortal: "支払い・請求を管理",
            cancelledMessage:
              "Checkout はキャンセルされました。再度プランを選び直せます。",
            successMessage:
              "Checkout が完了しました。反映まで数秒かかる場合があります。",
            billingNote: "プラン申込み前にご確認ください。",
            terms: "利用規約",
            businessInfo: "事業者情報",
            portalTitle: "支払い方法・請求",
            portalBody:
              "課金開始後は、支払い方法の変更・請求確認・解約をStripe上で行えます。",
            backToDashboard: "ダッシュボードへ戻る",
          }
        : {
            title: "Billing Plans",
            body:
              "Choose a plan based on order volume and transaction fees. You can start with Basic.",
            authRequired: "We could not confirm your login session.",
            changeFailed: "Failed to change the plan.",
            checkoutFailed: "Failed to start Stripe Checkout.",
            portalFailed: "Failed to open the Billing Portal.",
            opening: "Opening...",
            openPortal: "Manage billing",
            cancelledMessage:
              "Checkout was cancelled. You can choose a plan again.",
            successMessage:
              "Checkout completed. It may take a few seconds to reflect inside the app.",
            billingNote: "Please review these before applying for a plan.",
            terms: "Terms of Service",
            businessInfo: "Business Information",
            portalTitle: "Payment & invoices",
            portalBody:
              "After subscription starts, you can update payment methods, review invoices, and cancel via Stripe.",
            backToDashboard: "Back to dashboard",
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
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[120px] h-[560px] w-[560px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 pb-10 md:px-6 md:py-8">
        <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-7 md:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[28px] font-black tracking-[-0.055em] text-slate-950 md:text-[38px]">
                {copy.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {copy.body}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleOpenPortal}
                disabled={portalLoading || submittingPlan !== null}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3.5 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portalLoading ? copy.opening : copy.openPortal}
              </button>

              <button
                type="button"
                onClick={() => router.push(from || "/b/dashboard")}
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                {copy.backToDashboard}
              </button>
            </div>
          </div>
        </section>

        {checkoutState === "cancelled" ? (
          <section className="mt-4 rounded-[24px] bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
            {copy.cancelledMessage}
          </section>
        ) : null}

        {checkoutState === "success" ? (
          <section className="mt-4 rounded-[24px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
            {copy.successMessage}
          </section>
        ) : null}

        {errorMsg ? (
          <section className="mt-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {errorMsg}
          </section>
        ) : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              safeLocale={safeLocale}
              submittingPlan={submittingPlan}
              portalLoading={portalLoading}
              onClick={handlePlanClick}
            />
          ))}
        </section>

        <section className="mt-6 rounded-[26px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                {copy.portalTitle}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {copy.portalBody}
              </p>
            </div>

            <button
              onClick={handleOpenPortal}
              disabled={portalLoading || submittingPlan !== null}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {portalLoading ? copy.opening : copy.openPortal}
            </button>
          </div>

          <p className="mt-5 text-xs font-semibold leading-6 text-slate-400">
            {copy.billingNote}{" "}
            <Link href="/terms" target="_blank" className="underline underline-offset-4">
              {copy.terms}
            </Link>{" "}
            /{" "}
            <Link href="/legal" target="_blank" className="underline underline-offset-4">
              {copy.businessInfo}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}