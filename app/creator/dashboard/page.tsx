"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CreatorLinkInquiryInboxResponse } from "@/lib/trendre-link/inquiry-inbox";

type Period = 7 | 30 | 90;
type Metric = "link" | "profile";
type SeriesPoint = { date: string; count: number };

type HomeState = {
  displayName: string;
  linkStarted: boolean;
  martStarted: boolean;
  linkSlug: string | null;
  pendingOrders: number;
  activeJobs: number;
};

type AnalyticsState = {
  totals: Record<Metric, number>;
  series: Record<Metric, SeriesPoint[]>;
};

type AnalyticsResponse =
  | {
      ok: true;
      days: Period;
      totals: Record<Metric, number>;
      series: Record<Metric, SeriesPoint[]>;
      setupPending?: boolean;
    }
  | { ok: false; error: string };

const EMPTY_HOME: HomeState = {
  displayName: "Creator",
  linkStarted: false,
  martStarted: false,
  linkSlug: null,
  pendingOrders: 0,
  activeJobs: 0,
};

const EMPTY_ANALYTICS: AnalyticsState = {
  totals: { link: 0, profile: 0 },
  series: { link: [], profile: [] },
};

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m4 16 5-5 4 3 7-8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6h5v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatShortDate(value: string, locale: "ja" | "en") {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}

function LineChart({
  points,
  metric,
  period,
  locale,
  emptyText,
}: {
  points: SeriesPoint[];
  metric: Metric;
  period: Period;
  locale: "ja" | "en";
  emptyText: string;
}) {
  const width = 340;
  const height = 150;
  const paddingX = 18;
  const paddingTop = 16;
  const paddingBottom = 28;
  const plotHeight = height - paddingTop - paddingBottom;
  const values = points.map((point) => point.count);
  const maximum = Math.max(...values, 1);
  const hasData = values.some((value) => value > 0);

  const coordinates = points.map((point, index) => {
    const x = points.length <= 1
      ? width / 2
      : paddingX + (index / (points.length - 1)) * (width - paddingX * 2);
    const y = paddingTop + plotHeight - (point.count / maximum) * (plotHeight - 8);
    return { x, y, count: point.count, date: point.date };
  });

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = coordinates.length > 0
    ? `${linePath} L${coordinates[coordinates.length - 1].x.toFixed(2)} ${(height - paddingBottom).toFixed(2)} L${coordinates[0].x.toFixed(2)} ${(height - paddingBottom).toFixed(2)} Z`
    : "";
  const gradientId = `analytics-${metric}-${period}`;

  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl bg-[#fafafd] ring-1 ring-slate-100">
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-[168px] w-full" role="img" aria-label={emptyText}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b65cff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ff5aa5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#f04f9b" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={paddingX}
            x2={width - paddingX}
            y1={paddingTop + plotHeight * ratio}
            y2={paddingTop + plotHeight * ratio}
            stroke="#e8eaf0"
            strokeWidth="1"
          />
        ))}
        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={height - paddingBottom}
          y2={height - paddingBottom}
          stroke="#dfe2e9"
          strokeWidth="1"
        />

        {hasData && areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
        {hasData && linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke={`url(#${gradientId}-line)`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {hasData
          ? coordinates.map((point, index) => {
              const showPoint = period === 7 || index === coordinates.length - 1;
              return showPoint ? (
                <circle
                  key={`${point.date}:${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="#ffffff"
                  stroke={metric === "link" ? "#9b5cf6" : "#ed579f"}
                  strokeWidth="2"
                />
              ) : null;
            })
          : null}

        {points.length > 0 ? (
          <>
            <text x={paddingX} y={height - 8} fill="#94a3b8" fontSize="10">
              {formatShortDate(points[0].date, locale)}
            </text>
            <text x={width - paddingX} y={height - 8} fill="#94a3b8" fontSize="10" textAnchor="end">
              {formatShortDate(points[points.length - 1].date, locale)}
            </text>
          </>
        ) : null}
      </svg>

      {!hasData ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 pb-5 text-center">
          <div>
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
              <TrendIcon />
            </span>
            <p className="mt-3 text-xs font-medium leading-5 text-slate-400">{emptyText}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AttentionRow({
  href,
  title,
  description,
  count,
  notify,
}: {
  href: string;
  title: string;
  description: string;
  count: number;
  notify?: boolean;
}) {
  return (
    <Link href={href} className="group flex min-h-[72px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 active:bg-slate-50">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">
        {count}
        {notify && count > 0 ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#ff385c] ring-2 ring-white" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold tracking-[-0.025em] text-slate-900">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-400">{description}</span>
      </span>
      <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"><ArrowIcon /></span>
    </Link>
  );
}

function Promotion({
  href,
  title,
  body,
  cta,
}: {
  href: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link href={href} className="group relative block overflow-hidden rounded-2xl bg-[#17131f] p-5 text-white shadow-[0_18px_55px_rgba(40,24,69,0.2)] active:scale-[0.99]">
      <div className="absolute -right-12 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/40 blur-3xl" />
      <div className="absolute -bottom-24 left-8 h-44 w-44 rounded-full bg-violet-500/35 blur-3xl" />
      <div className="relative z-10">
        <h2 className="max-w-md text-[23px] font-semibold leading-tight tracking-[-0.045em]">{title}</h2>
        <p className="mt-3 max-w-lg text-sm font-medium leading-7 text-white/65">{body}</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition group-hover:gap-3">
          {cta}
          <ArrowIcon />
        </span>
      </div>
    </Link>
  );
}

export default function CreatorDashboardPage() {
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState<HomeState>(EMPTY_HOME);
  const [analytics, setAnalytics] = useState<AnalyticsState>(EMPTY_ANALYTICS);
  const [period, setPeriod] = useState<Period>(7);
  const [metric, setMetric] = useState<Metric>("link");
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const copy = safeLocale === "ja"
    ? {
        greeting: "こんにちは",
        overview: "今日の状況を確認しましょう。",
        access: "アクセス",
        link: "リンク",
        profile: "プロフィール",
        opens: "回",
        seven: "7日",
        thirty: "30日",
        ninety: "90日",
        chartEmpty: "公開ページが開かれると、ここに推移が表示されます",
        chartLoading: "アクセスを読み込んでいます",
        attention: "対応が必要",
        orders: "注文・見積もり依頼",
        ordersBody: "成立前の依頼を確認します",
        jobs: "進行中の仕事",
        jobsBody: "成立後の案件を進めます",
        startMartTitle: "企業から見つけてもらう",
        startMartBody: "公開プロフィールを整えると、企業の検索やメニュー注文から新しい仕事につながります。",
        startMartCta: "プロフィールを作成",
        startLinkTitle: "SNSから相談を受け付ける",
        startLinkBody: "専用リンクをSNSプロフィールに置いて、企業から相談や見積もり依頼を直接受け取れます。",
        startLinkCta: "リンクを作成",
        loading: "ホームを読み込んでいます…",
      }
    : {
        greeting: "Hello",
        overview: "Here is what is happening today.",
        access: "Traffic",
        link: "Link",
        profile: "Profile",
        opens: "views",
        seven: "7D",
        thirty: "30D",
        ninety: "90D",
        chartEmpty: "Traffic will appear here after your public page is opened",
        chartLoading: "Loading traffic",
        attention: "Needs attention",
        orders: "Orders and quote requests",
        ordersBody: "Review work before agreement",
        jobs: "Active jobs",
        jobsBody: "Continue work after agreement",
        startMartTitle: "Help companies discover you",
        startMartBody: "Publish your profile to appear in company searches and receive menu orders.",
        startMartCta: "Create profile",
        startLinkTitle: "Receive inquiries from social media",
        startLinkBody: "Add your dedicated link to social profiles and receive inquiries and quote requests.",
        startLinkCta: "Create link",
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

  useEffect(() => {
    const controller = new AbortController();
    setAnalyticsLoading(true);

    void fetch(`/api/creator/analytics?days=${period}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.assign("/login?next=/creator/dashboard");
          return null;
        }
        const body = (await response.json().catch(() => null)) as AnalyticsResponse | null;
        return response.ok && body?.ok ? body : null;
      })
      .then((body) => {
        if (!body) return;
        setAnalytics({ totals: body.totals, series: body.series });
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setAnalytics(EMPTY_ANALYTICS);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAnalyticsLoading(false);
      });

    return () => controller.abort();
  }, [period]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm font-medium text-slate-400">{copy.loading}</div>;
  }

  const promotion = state.linkStarted && !state.martStarted
    ? {
        href: "/creator/profile?start=trend-mart",
        title: copy.startMartTitle,
        body: copy.startMartBody,
        cta: copy.startMartCta,
      }
    : state.martStarted && !state.linkStarted
      ? {
          href: "/creator/link",
          title: copy.startLinkTitle,
          body: copy.startLinkBody,
          cta: copy.startLinkCta,
        }
      : null;

  const activePoints = analytics.series[metric] ?? [];
  const activeTotal = analytics.totals[metric] ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl pb-5 pt-3">
      <section className="px-1 pb-5 pt-2">
        <h1 className="text-[29px] font-semibold tracking-[-0.055em] text-slate-950">{copy.greeting}、{state.displayName}</h1>
        <p className="mt-1.5 text-sm font-medium text-slate-500">{copy.overview}</p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-[0_16px_45px_rgba(31,24,48,0.055)] ring-1 ring-slate-200/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">{copy.access}</p>
            <p className="mt-1 flex items-baseline gap-1.5 text-[36px] font-semibold tracking-[-0.065em] text-slate-950">
              {activeTotal.toLocaleString(safeLocale === "ja" ? "ja-JP" : "en-US")}
              <span className="text-sm font-medium tracking-normal text-slate-400">{copy.opens}</span>
            </p>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-500">
            {([7, 30, 90] as Period[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`min-h-8 rounded-lg px-3 transition ${period === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}
              >
                {value === 7 ? copy.seven : value === 30 ? copy.thirty : copy.ninety}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-6 border-b border-slate-100">
          {(["link", "profile"] as Metric[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMetric(value)}
              className={`relative pb-3 text-sm font-semibold transition ${metric === value ? "text-slate-950" : "text-slate-400"}`}
            >
              {value === "link" ? copy.link : copy.profile}
              {metric === value ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500" /> : null}
            </button>
          ))}
        </div>

        <LineChart
          points={activePoints}
          metric={metric}
          period={period}
          locale={safeLocale}
          emptyText={analyticsLoading ? copy.chartLoading : copy.chartEmpty}
        />
      </section>

      <section className="mt-6">
        <h2 className="px-1 text-[17px] font-semibold tracking-[-0.035em] text-slate-950">{copy.attention}</h2>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
          <AttentionRow
            href="/creator/orders"
            title={copy.orders}
            description={copy.ordersBody}
            count={state.pendingOrders}
            notify
          />
          <AttentionRow
            href="/creator/jobs"
            title={copy.jobs}
            description={copy.jobsBody}
            count={state.activeJobs}
          />
        </div>
      </section>

      {promotion ? (
        <section className="mt-6">
          <Promotion {...promotion} />
        </section>
      ) : null}
    </div>
  );
}
