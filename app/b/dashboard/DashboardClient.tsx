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
  if (status === "rejected") {
    return {
      label: "現在このアカウントは利用できません。",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
    };
  }

  return {
    label: "アカウント確認中です。注文機能の利用まで少しお待ちください。",
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

function OrderStatusRow({
  label,
  body,
  value,
  href,
  active,
}: {
  label: string;
  body: string;
  value: number;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl px-2 py-3 transition hover:bg-slate-50 md:px-3"
    >
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-950">{label}</p>
        <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
          {body}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`text-2xl font-black tracking-[-0.06em] ${
            active ? "text-[#ff5f67]" : "text-slate-950"
          }`}
        >
          {value}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500 transition group-hover:bg-slate-950 group-hover:text-white">
          →
        </span>
      </div>
    </Link>
  );
}

function PlanLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
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
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl rounded-[26px] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-bold text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-4xl rounded-[26px] bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
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
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[110px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-7 md:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-400">
                {dashboard.companyName}
              </p>

              <h1 className="mt-3 text-[28px] font-black tracking-[-0.055em] text-slate-950 md:text-[38px]">
                インフルエンサーを探す
              </h1>

              <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                気になるインフルエンサーを保存して、メニューから注文できます。
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/b/creators"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
              >
                インフルエンサーを探す
                <ArrowIcon />
              </Link>

              <Link
                href="/b/saved-creators"
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3.5 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
              >
                保存済みを見る
              </Link>
            </div>
          </div>
        </section>

        {dashboard.approvalStatus !== "approved" ? (
          <section
            className={`mt-4 rounded-[24px] px-5 py-4 text-sm font-bold ring-1 ${approvalBadge.className}`}
          >
            {approvalBadge.label}
          </section>
        ) : null}

        {!canUseRequests ? (
          <section className="mt-4 rounded-[24px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                  注文を始めるにはプランの確認が必要です
                </h2>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                  インフルエンサーの閲覧はできます。注文はプラン開始後に利用できます。
                </p>
              </div>

              <Link
                href="/b/billing"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                料金プランを見る
              </Link>
            </div>
          </section>
        ) : null}

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="rounded-[28px] bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:p-7">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                  注文の状況
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  {activeOrderCount > 0
                    ? `${activeOrderCount}件の注文が進行中です。`
                    : "現在進行中の注文はありません。"}
                </p>
              </div>

              <Link
                href="/b/jobs"
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-950 hover:text-white"
              >
                注文を見る
                <ArrowIcon />
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              <OrderStatusRow
                label="返答待ち"
                body="インフルエンサーの返答待ち"
                value={dashboard.counts.pending}
                href="/b/requests"
                active={dashboard.counts.pending > 0}
              />
              <OrderStatusRow
                label="進行中"
                body="やり取り・納品待ち"
                value={dashboard.counts.accepted}
                href="/b/jobs"
                active={dashboard.counts.accepted > 0}
              />
              <OrderStatusRow
                label="確認する"
                body="納品確認が必要"
                value={dashboard.counts.delivered}
                href="/b/jobs"
                active={dashboard.counts.delivered > 0}
              />
              <OrderStatusRow
                label="完了"
                body="完了した注文"
                value={dashboard.counts.completed}
                href="/b/jobs"
                active={false}
              />
            </div>
          </main>

          <aside className="rounded-[28px] bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:p-7 lg:self-start">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                  プラン
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  現在の利用内容
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${subscriptionBadge.className}`}
              >
                {subscriptionBadge.label}
              </span>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              <PlanLine label="現在" value={planLabel} />
              <PlanLine label="今月残り" value={remaining === null ? "無制限" : `${remaining}件`} />
              <PlanLine label="手数料" value={buyerFee} />
            </div>

            <Link
              href="/b/billing"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-950 hover:text-white"
            >
              料金プランを確認
            </Link>
          </aside>
        </section>
      </div>
    </div>
  );
}