"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CreatorLinkInquiryInboxResponse } from "@/lib/trendre-link/inquiry-inbox";

type HomeState = {
  displayName: string;
  linkStarted: boolean;
  martStarted: boolean;
  linkSlug: string | null;
  pendingOrders: number;
  activeJobs: number;
};

const EMPTY_STATE: HomeState = {
  displayName: "Creator",
  linkStarted: false,
  martStarted: false,
  linkSlug: null,
  pendingOrders: 0,
  activeJobs: 0,
};

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrackingPanel({
  eyebrow,
  title,
  emptyLabel,
  description,
}: {
  eyebrow: string;
  title: string;
  emptyLabel: string;
  description: string;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] bg-white ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-[18px] font-bold tracking-[-0.035em] text-slate-950">{title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">{emptyLabel}</span>
      </div>

      <div className="relative mx-5 mt-5 flex h-[126px] items-center justify-center overflow-hidden rounded-[18px] bg-slate-50/80 ring-1 ring-slate-100">
        <div className="absolute inset-x-5 top-1/4 h-px bg-slate-200/70" />
        <div className="absolute inset-x-5 top-1/2 h-px bg-slate-200/70" />
        <div className="absolute inset-x-5 top-3/4 h-px bg-slate-200/70" />
        <div className="relative z-10 flex flex-col items-center text-slate-300">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100">
            <AnalyticsIcon />
          </span>
          <span className="mt-3 text-xs font-semibold text-slate-400">{emptyLabel}</span>
        </div>
      </div>

      <p className="px-5 pb-5 pt-4 text-xs font-medium leading-5 text-slate-400">{description}</p>
    </section>
  );
}

function SummaryLink({ href, label, value, detail }: { href: string; label: string; value: number; detail: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 border-b border-white/10 py-4 last:border-b-0 active:opacity-70">
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">{label}</span>
        <span className="mt-1 block text-sm font-medium text-white/70">{detail}</span>
      </span>
      <span className="text-[28px] font-bold tracking-[-0.06em] text-white">{value}</span>
      <span className="text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white/70"><ArrowIcon /></span>
    </Link>
  );
}

function Promotion({
  href,
  eyebrow,
  title,
  body,
  cta,
  children,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="group relative block overflow-hidden rounded-[28px] bg-[#17131f] p-6 text-white shadow-[0_20px_60px_rgba(34,21,63,0.18)] active:scale-[0.99]">
      <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-fuchsia-500/35 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-violet-500/30 blur-3xl" />
      <div className="relative z-10 max-w-[500px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/50">{eyebrow}</p>
        <h2 className="mt-3 text-[25px] font-bold leading-tight tracking-[-0.05em]">{title}</h2>
        <p className="mt-3 text-sm font-medium leading-7 text-white/65">{body}</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition group-hover:gap-3">
          {cta}
          <ArrowIcon />
        </span>
      </div>
      {children ? <div className="relative z-10 mt-5">{children}</div> : null}
    </Link>
  );
}

export default function CreatorDashboardPage() {
  const { locale } = useAppLocale();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState<HomeState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  const copy = locale === "ja"
    ? {
        greeting: "こんにちは",
        overview: "今日の状況を確認しましょう。",
        analytics: "アクセス分析",
        period: "7日間",
        sevenDays: "7日",
        thirtyDays: "30日",
        ninetyDays: "90日",
        linkVisitors: "Link訪問者",
        profileVisitors: "プロフィールページ訪問者",
        notMeasured: "未計測",
        noTracking: "アクセス計測を開始すると、訪問者数の推移がここに表示されます。",
        order: "Order",
        orderDetail: "成立前の注文・相談",
        job: "Job",
        jobDetail: "進行中の案件",
        startMartEyebrow: "Grow with Trend Mart",
        startMartTitle: "企業との仕事を、もっと見つけやすく。",
        startMartBody: "Trendre Linkの情報を初期入力に使い、Trend Martプロフィールをすぐに始められます。作成後はLinkとは別々に編集できます。",
        startMartCta: "Trend Martを始める",
        startLinkEyebrow: "Start Trendre Link",
        startLinkTitle: "SNSに置ける、あなた専用の仕事受付リンク。",
        startLinkBody: "Trend Martのプロフィール情報を初期入力に使って、企業から直接相談を受け取るLinkを作成します。",
        startLinkCta: "Trendre Linkを作る",
        bothEyebrow: "Your Trendre Link",
        bothTitle: "LinkとTrend Martをひとつの仕事導線に。",
        bothBody: "Linkから届いた相談はOrderで確認し、成立後はJobでTrend Martの注文と一緒に進行できます。",
        editLink: "Linkを編集",
        loading: "ホームを読み込んでいます…",
      }
    : {
        greeting: "Hello",
        overview: "Here is what is happening today.",
        analytics: "Analytics",
        period: "7 days",
        sevenDays: "7D",
        thirtyDays: "30D",
        ninetyDays: "90D",
        linkVisitors: "Link visitors",
        profileVisitors: "Profile page visitors",
        notMeasured: "Not measured",
        noTracking: "Visitor trends will appear here after tracking is enabled.",
        order: "Order",
        orderDetail: "Orders and inquiries before agreement",
        job: "Job",
        jobDetail: "Active jobs",
        startMartEyebrow: "Grow with Trend Mart",
        startMartTitle: "Find more opportunities with companies.",
        startMartBody: "Start your Trend Mart profile with information prefilled from Trendre Link. The profiles remain independent after setup.",
        startMartCta: "Start Trend Mart",
        startLinkEyebrow: "Start Trendre Link",
        startLinkTitle: "Your own work inquiry link for social profiles.",
        startLinkBody: "Use your Trend Mart profile as the initial value and receive direct inquiries from companies.",
        startLinkCta: "Create Trendre Link",
        bothEyebrow: "Your Trendre Link",
        bothTitle: "Connect Link and Trend Mart into one workflow.",
        bothBody: "Review Link inquiries in Order, then manage accepted work together with Trend Mart orders in Job.",
        editLink: "Edit Link",
        loading: "Loading Home…",
      };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign("/login?next=/creator/dashboard");
        return;
      }

      const [creatorResult, userStateResult, linkResult, pendingResult, jobsResult, inquiryResult] = await Promise.all([
        supabase.from("creators").select("display_name, full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_states").select("creator_profile_completed").eq("user_id", user.id).maybeSingle(),
        supabase.from("creator_link_pages").select("slug, status").eq("owner_user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("creator_user_id", user.id).eq("status", "authorized_pending_creator"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("creator_user_id", user.id).in("status", ["accepted", "accepted_captured", "in_progress", "delivered", "revision_requested"]),
        fetch("/api/creator/link/inquiries", { credentials: "same-origin", cache: "no-store" })
          .then(async (response) => ({ response, body: (await response.json().catch(() => null)) as CreatorLinkInquiryInboxResponse | null }))
          .catch(() => null),
      ]);

      if (cancelled) return;

      const creator = creatorResult.data as { display_name?: string | null; full_name?: string | null } | null;
      const martStarted = Boolean((userStateResult.data as { creator_profile_completed?: boolean } | null)?.creator_profile_completed);
      const link = linkResult.data as { slug?: string | null } | null;
      const inquiryCount = inquiryResult?.response.ok && inquiryResult.body?.ok
        ? inquiryResult.body.counts.new + inquiryResult.body.counts.active
        : 0;

      setState({
        displayName: creator?.display_name || creator?.full_name || user.email?.split("@")[0] || "Creator",
        linkStarted: Boolean(link?.slug),
        martStarted,
        linkSlug: link?.slug ?? null,
        pendingOrders: (pendingResult.count ?? 0) + inquiryCount,
        activeJobs: jobsResult.count ?? 0,
      });
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [supabase]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm font-medium text-slate-400">{copy.loading}</div>;
  }

  const promotion = state.linkStarted && !state.martStarted
    ? {
        href: "/creator/profile?start=trend-mart",
        eyebrow: copy.startMartEyebrow,
        title: copy.startMartTitle,
        body: copy.startMartBody,
        cta: copy.startMartCta,
      }
    : state.martStarted && !state.linkStarted
      ? {
          href: "/creator/link",
          eyebrow: copy.startLinkEyebrow,
          title: copy.startLinkTitle,
          body: copy.startLinkBody,
          cta: copy.startLinkCta,
        }
      : {
          href: "/creator/link",
          eyebrow: copy.bothEyebrow,
          title: copy.bothTitle,
          body: copy.bothBody,
          cta: copy.editLink,
        };

  return (
    <div className="mx-auto w-full max-w-4xl pb-4 pt-3">
      <section className="px-1 pb-6 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff4765]">Home</p>
        <h1 className="mt-2 text-[34px] font-bold tracking-[-0.06em] text-slate-950">{copy.greeting}、{state.displayName}</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">{copy.overview}</p>
      </section>

      <section className="overflow-hidden rounded-[28px] bg-[#121117] px-5 py-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
        <SummaryLink href="/creator/orders" label={copy.order} value={state.pendingOrders} detail={copy.orderDetail} />
        <SummaryLink href="/creator/jobs" label={copy.job} value={state.activeJobs} detail={copy.jobDetail} />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.analytics}</p>
            <h2 className="mt-1 text-[23px] font-bold tracking-[-0.045em] text-slate-950">{copy.period}</h2>
          </div>
          <div className="flex rounded-full bg-white p-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200/70">
            <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">{copy.sevenDays}</span>
            <span className="px-3 py-1.5">{copy.thirtyDays}</span>
            <span className="px-3 py-1.5">{copy.ninetyDays}</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TrackingPanel eyebrow="Trendre Link" title={copy.linkVisitors} emptyLabel={copy.notMeasured} description={copy.noTracking} />
          <TrackingPanel eyebrow="Trend Mart" title={copy.profileVisitors} emptyLabel={copy.notMeasured} description={copy.noTracking} />
        </div>
      </section>

      <section className="mt-8">
        <Promotion {...promotion}>
          {state.linkStarted && state.linkSlug ? (
            <p className="truncate border-t border-white/10 pt-4 text-xs font-medium text-white/45">trendre.jp/in/{state.linkSlug}</p>
          ) : null}
        </Promotion>
      </section>
    </div>
  );
}
