// File: app/b/dashboard/DashboardClient.tsx
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CompanyPlanCode = "free" | "standard" | "global_pro";
type ApprovalStatus = "pending" | "approved" | "rejected" | null;
type SubscriptionStatus = "active" | "inactive" | "canceled" | null;

type DashboardCounts = {
  pending: number;
  accepted: number;
  delivered: number;
  completed: number;
};

type DashboardState = {
  companyName: string;
  approvalStatus: ApprovalStatus;
  companyPlanCodeRaw: CompanyPlanCode | null;
  companyPlanCodeDisplay: CompanyPlanCode;
  companySubscriptionStatus: SubscriptionStatus;
  monthlyRequestLimit: number | null;
  monthlyRequestUsed: number | null;
  requestUsageResetAt: string | null;
  stripeCurrentPeriodEnd: string | null;
  stripeCancelAtPeriodEnd: boolean | null;
  counts: DashboardCounts;
};

function normalizePlanCode(
  value: string | null | undefined
): CompanyPlanCode | null {
  if (value === "free" || value === "standard" || value === "global_pro") {
    return value;
  }

  return null;
}

function normalizeApprovalStatus(
  value: string | null | undefined
): ApprovalStatus {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }

  return null;
}

function normalizeSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus {
  if (value === "active" || value === "inactive" || value === "canceled") {
    return value;
  }

  return null;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
}

function getPlanLabel(plan: CompanyPlanCode) {
  if (plan === "standard") return "Pro";
  if (plan === "global_pro") return "Premium";
  return "Basic";
}

function getBuyerFeeLabel(plan: CompanyPlanCode) {
  if (plan === "global_pro") return "5%";
  return "10%";
}

function getApprovalBadge(status: ApprovalStatus) {
  if (status === "approved") {
    return {
      label: "利用できます",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    };
  }

  if (status === "rejected") {
    return {
      label: "利用停止中",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
    };
  }

  return {
    label: "確認中",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  };
}

function getSubscriptionBadge(
  rawPlanCode: CompanyPlanCode | null,
  status: SubscriptionStatus
) {
  if (rawPlanCode === "free") {
    return {
      label: "Basic",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    };
  }

  if (status === "active") {
    return {
      label: "利用中",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    };
  }

  if (status === "canceled") {
    return {
      label: "終了予定",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
    };
  }

  return {
    label: "未開始",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function MiniPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "rose" | "green";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
      : tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : "bg-white text-slate-700 ring-slate-200";

  return (
    <div
      className={`rounded-full px-4 py-2 text-sm font-black shadow-sm ring-1 ${toneClass}`}
    >
      <span className="mr-2 text-xs font-bold text-slate-400">{label}</span>
      {value}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  active,
}: {
  label: string;
  value: number;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-[28px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? "border-[#ffb3b8] bg-white shadow-[0_18px_45px_rgba(255,95,103,0.1)]"
          : "border-slate-100 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-500">{label}</p>
          <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950">
            {value}
          </p>
        </div>

        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition group-hover:translate-x-0.5 ${
            active
              ? "bg-[#ff5f67] text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          →
        </span>
      </div>
    </Link>
  );
}

function ActionCard({
  href,
  title,
  body,
  primary,
}: {
  href: string;
  title: string;
  body: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-[30px] border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        primary
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-100 bg-white text-slate-950"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-black tracking-[-0.03em]">{title}</p>
          <p
            className={`mt-3 text-sm font-semibold leading-7 ${
              primary ? "text-white/65" : "text-slate-500"
            }`}
          >
            {body}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black transition group-hover:translate-x-0.5 ${
            primary
              ? "bg-white text-slate-950"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          →
        </span>
      </div>
    </Link>
  );
}

function PlanLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-right text-sm font-black text-slate-950">
        {value}
      </span>
    </div>
  );
}

export default function CompanyDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);

  const syncRunIdRef = useRef(0);
  const initialLoadedRef = useRef(false);

  const fetchDashboardState = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return null;
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "company")
      .maybeSingle();

    if (roleError || !roleRow) {
      router.replace("/login");
      return null;
    }

    const [
      companyResult,
      userStateResult,
      legacyPendingResult,
      legacyAcceptedResult,
      legacyDeliveredResult,
      legacyCompletedResult,
      orderPendingResult,
      orderAcceptedResult,
      orderDeliveredResult,
      orderCompletedResult,
    ] = await Promise.all([
      supabase
        .from("companies")
        .select("company_name, approval_status")
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("user_states")
        .select(
          `
          company_plan_code,
          company_subscription_status,
          monthly_request_limit,
          monthly_request_used,
          request_usage_reset_at,
          stripe_current_period_end,
          stripe_cancel_at_period_end
          `
        )
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("b_user_id", user.id)
        .eq("status", "pending"),

      supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("b_user_id", user.id)
        .eq("status", "accepted"),

      supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("b_user_id", user.id)
        .eq("status", "delivered"),

      supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("b_user_id", user.id)
        .eq("status", "completed"),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("b_user_id", user.id)
        .eq("status", "authorized_pending_creator"),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("b_user_id", user.id)
        .in("status", ["accepted_captured", "in_progress"]),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("b_user_id", user.id)
        .eq("status", "delivered"),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("b_user_id", user.id)
        .eq("status", "completed"),
    ]);

    const countErrors = [
      legacyPendingResult.error,
      legacyAcceptedResult.error,
      legacyDeliveredResult.error,
      legacyCompletedResult.error,
      orderPendingResult.error,
      orderAcceptedResult.error,
      orderDeliveredResult.error,
      orderCompletedResult.error,
    ].filter(Boolean);

    if (companyResult.error || userStateResult.error || countErrors.length > 0) {
      console.error({
        companyError: companyResult.error,
        stateError: userStateResult.error,
        countErrors,
      });
      throw new Error("ダッシュボード情報の取得に失敗しました。");
    }

    const company = companyResult.data;
    const rawState = userStateResult.data as {
      company_plan_code?: string | null;
      company_subscription_status?: string | null;
      monthly_request_limit?: number | null;
      monthly_request_used?: number | null;
      request_usage_reset_at?: string | null;
      stripe_current_period_end?: string | null;
      stripe_cancel_at_period_end?: boolean | null;
    } | null;

    const rawPlanCode = normalizePlanCode(rawState?.company_plan_code ?? null);
    const displayPlanCode = rawPlanCode ?? "free";

    const nextState: DashboardState = {
      companyName: company?.company_name ?? user.email ?? "企業アカウント",
      approvalStatus: normalizeApprovalStatus(company?.approval_status ?? null),
      companyPlanCodeRaw: rawPlanCode,
      companyPlanCodeDisplay: displayPlanCode,
      companySubscriptionStatus: normalizeSubscriptionStatus(
        rawState?.company_subscription_status ?? null
      ),
      monthlyRequestLimit: rawState?.monthly_request_limit ?? null,
      monthlyRequestUsed: rawState?.monthly_request_used ?? null,
      requestUsageResetAt: rawState?.request_usage_reset_at ?? null,
      stripeCurrentPeriodEnd: rawState?.stripe_current_period_end ?? null,
      stripeCancelAtPeriodEnd: rawState?.stripe_cancel_at_period_end ?? null,
      counts: {
        pending:
          (legacyPendingResult.count ?? 0) + (orderPendingResult.count ?? 0),
        accepted:
          (legacyAcceptedResult.count ?? 0) + (orderAcceptedResult.count ?? 0),
        delivered:
          (legacyDeliveredResult.count ?? 0) +
          (orderDeliveredResult.count ?? 0),
        completed:
          (legacyCompletedResult.count ?? 0) +
          (orderCompletedResult.count ?? 0),
      },
    };

    return nextState;
  }, [router]);

  const runSubscriptionSync = useCallback(
    async (attempts: number, intervalMs: number) => {
      const runId = ++syncRunIdRef.current;

      for (let i = 0; i < attempts; i += 1) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          const accessToken = session?.access_token ?? null;

          if (accessToken) {
            await fetch("/api/stripe/sync-current-subscription", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
          }
        } catch (syncError) {
          console.warn("dashboard subscription sync skipped", syncError);
        }

        if (syncRunIdRef.current !== runId) {
          return;
        }

        const latest = await fetchDashboardState();

        if (!latest) {
          return;
        }

        if (syncRunIdRef.current !== runId) {
          return;
        }

        setDashboard(latest);

        const hasPaidPlan =
          latest.companyPlanCodeRaw === "standard" ||
          latest.companyPlanCodeRaw === "global_pro";

        const portalReturn = searchParams.get("from") === "portal";
        const billingUpdated = searchParams.get("billing") === "updated";

        const settled = billingUpdated
          ? hasPaidPlan && latest.companySubscriptionStatus === "active"
          : portalReturn
          ? latest.stripeCancelAtPeriodEnd === true ||
            latest.companyPlanCodeRaw === "free" ||
            latest.companySubscriptionStatus === "canceled"
          : true;

        if (settled) {
          return;
        }

        if (i < attempts - 1) {
          await sleep(intervalMs);
        }
      }
    },
    [fetchDashboardState, searchParams]
  );

  const refreshDashboard = useCallback(
    async (options?: {
      attempts?: number;
      intervalMs?: number;
      showLoading?: boolean;
    }) => {
      const attempts = options?.attempts ?? 1;
      const intervalMs = options?.intervalMs ?? 1200;
      const showLoading = options?.showLoading ?? false;

      if (showLoading) {
        setLoading(true);
      }

      setError("");

      try {
        await runSubscriptionSync(attempts, intervalMs);
      } catch (e) {
        console.error(e);
        setError("ダッシュボード情報の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    },
    [runSubscriptionSync]
  );

  useEffect(() => {
    const fromPortal = searchParams.get("from") === "portal";
    const billingUpdated = searchParams.get("billing") === "updated";

    const attempts = fromPortal ? 6 : billingUpdated ? 5 : 1;
    const intervalMs = fromPortal ? 1500 : 1200;

    void refreshDashboard({
      attempts,
      intervalMs,
      showLoading: !initialLoadedRef.current,
    });

    initialLoadedRef.current = true;
  }, [refreshDashboard, searchParams]);

  useEffect(() => {
    const onFocus = () => {
      void refreshDashboard({
        attempts: 4,
        intervalMs: 1500,
        showLoading: false,
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshDashboard({
          attempts: 4,
          intervalMs: 1500,
          showLoading: false,
        });
      }
    };

    const onPageShow = () => {
      void refreshDashboard({
        attempts: 4,
        intervalMs: 1500,
        showLoading: false,
      });
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [refreshDashboard]);

  const canUseRequests = useMemo(() => {
    if (!dashboard) return false;

    return (
      dashboard.companyPlanCodeRaw === "free" ||
      dashboard.companySubscriptionStatus === "active"
    );
  }, [dashboard]);

  if (loading) {
    return (
      <div className="relative overflow-hidden bg-white px-4 py-8 md:px-6">
        <div className="mx-auto max-w-6xl rounded-[34px] border border-slate-100 bg-white p-7 shadow-sm">
          <p className="text-sm font-bold text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="relative overflow-hidden bg-white px-4 py-8 md:px-6">
        <div className="mx-auto max-w-4xl rounded-[34px] border border-rose-100 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            エラーが発生しました
          </h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            {error || "ダッシュボード情報の取得に失敗しました。"}
          </p>
        </div>
      </div>
    );
  }

  const approvalBadge = getApprovalBadge(dashboard.approvalStatus);
  const subscriptionBadge = getSubscriptionBadge(
    dashboard.companyPlanCodeRaw,
    dashboard.companySubscriptionStatus
  );

  const planLabel = getPlanLabel(dashboard.companyPlanCodeDisplay);
  const buyerFee = getBuyerFeeLabel(dashboard.companyPlanCodeDisplay);

  const remaining =
    dashboard.monthlyRequestLimit === null
      ? null
      : Math.max(
          dashboard.monthlyRequestLimit - (dashboard.monthlyRequestUsed ?? 0),
          0
        );

  const activeOrderCount =
    dashboard.counts.pending +
    dashboard.counts.accepted +
    dashboard.counts.delivered;

  return (
    <div className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute left-[-260px] top-[40px] h-[620px] w-[620px] rounded-full bg-rose-100/42 blur-[110px]" />
        <div className="absolute right-[-260px] top-[60px] h-[700px] w-[700px] rounded-full bg-emerald-100/44 blur-[120px]" />
        <div className="absolute left-1/2 top-[360px] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-slate-100/40 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <section className="relative overflow-hidden rounded-[38px] border border-slate-100 bg-white/90 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-180px] top-[-180px] h-[380px] w-[380px] rounded-full bg-rose-100/45 blur-[90px]" />
            <div className="absolute right-[-180px] top-[-160px] h-[420px] w-[420px] rounded-full bg-emerald-100/50 blur-[100px]" />
          </div>

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-[#ff5f67]">
                {dashboard.companyName}
              </p>

              <h1 className="mt-3 text-[34px] font-black leading-tight tracking-[-0.05em] text-slate-950 md:text-[46px]">
                クリエイターを探して、
                <br className="hidden sm:block" />
                そのまま注文できます。
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                気になるクリエイターを保存し、メニューを選んで注文できます。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/b/creators"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-7 py-4 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
              >
                クリエイターを探す
                <ArrowIcon />
              </Link>

              <Link
                href="/b/jobs"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-4 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                注文を見る
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <div className="relative mt-8 flex flex-wrap gap-2">
            <MiniPill label="プラン" value={planLabel} />
            <MiniPill
              label="残り"
              value={remaining === null ? "無制限" : `${remaining}件`}
              tone="rose"
            />
            <MiniPill label="手数料" value={buyerFee} />
            <MiniPill
              label="状態"
              value={approvalBadge.label}
              tone={dashboard.approvalStatus === "approved" ? "green" : "default"}
            />
          </div>
        </section>

        {!canUseRequests ? (
          <section className="mt-6 rounded-[30px] border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              注文を始めるにはプランの確認が必要です
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
              クリエイターの閲覧はできます。注文はプラン開始後に利用できます。
            </p>
            <Link
              href="/b/billing"
              className="mt-5 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white"
            >
              料金プランを見る
            </Link>
          </section>
        ) : null}

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="返答待ち"
            value={dashboard.counts.pending}
            href="/b/requests"
            active={dashboard.counts.pending > 0}
          />
          <StatCard
            label="進行中"
            value={dashboard.counts.accepted}
            href="/b/jobs"
            active={dashboard.counts.accepted > 0}
          />
          <StatCard
            label="確認する"
            value={dashboard.counts.delivered}
            href="/b/jobs"
            active={dashboard.counts.delivered > 0}
          />
          <StatCard
            label="完了"
            value={dashboard.counts.completed}
            href="/b/jobs"
            active={false}
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="grid gap-4 md:grid-cols-2">
            <ActionCard
              href="/b/creators"
              title="探す"
              body="条件に合うクリエイターとメニューを見つけます。"
              primary
            />

            <ActionCard
              href="/b/saved-creators"
              title="保存済み"
              body="気になったクリエイターをあとで確認できます。"
            />

            <ActionCard
              href="/b/jobs"
              title="注文を見る"
              body={
                activeOrderCount > 0
                  ? `${activeOrderCount}件の注文があります。`
                  : "注文中の内容を確認できます。"
              }
            />

            <ActionCard
              href="/b/billing"
              title="プラン"
              body={`現在は${planLabel}です。必要に応じて変更できます。`}
            />
          </main>

          <aside className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.07)] lg:self-start">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                アカウント
              </h2>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${subscriptionBadge.className}`}
              >
                {subscriptionBadge.label}
              </span>
            </div>

            <div className="mt-5">
              <PlanLine label="プラン" value={planLabel} />
              <PlanLine
                label="今月残り"
                value={remaining === null ? "無制限" : `${remaining}件`}
              />
              <PlanLine
                label="リセット"
                value={formatDate(dashboard.requestUsageResetAt)}
              />
              {dashboard.stripeCurrentPeriodEnd ? (
                <PlanLine
                  label="次回更新"
                  value={formatDate(dashboard.stripeCurrentPeriodEnd)}
                />
              ) : null}
              {dashboard.stripeCancelAtPeriodEnd ? (
                <PlanLine label="更新" value="終了予定" />
              ) : null}
            </div>

            <Link
              href="/b/billing"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              料金プランを確認
            </Link>
          </aside>
        </section>
      </div>
    </div>
  );
}