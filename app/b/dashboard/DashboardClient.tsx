// app/b/dashboard/DashboardClient.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  return date.toLocaleDateString("ja-JP");
}

function getPlanLabel(plan: CompanyPlanCode) {
  if (plan === "standard") return "Pro";
  if (plan === "global_pro") return "Premium";
  return "Basic";
}

function getApprovalBadge(status: ApprovalStatus) {
  if (status === "approved") {
    return {
      label: "承認済み",
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (status === "rejected") {
    return {
      label: "却下",
      className: "bg-red-100 text-red-700",
    };
  }

  return {
    label: "審査中",
    className: "bg-yellow-100 text-yellow-700",
  };
}

function getSubscriptionBadge(
  rawPlanCode: CompanyPlanCode | null,
  status: SubscriptionStatus
) {
  if (rawPlanCode === "free") {
    return {
      label: "Basic",
      className: "bg-purple-100 text-purple-700",
    };
  }

  if (status === "active") {
    return {
      label: "利用中",
      className: "bg-green-100 text-green-700",
    };
  }

  if (status === "canceled") {
    return {
      label: "終了予定",
      className: "bg-red-100 text-red-700",
    };
  }

  return {
    label: "未開始",
    className: "bg-yellow-100 text-yellow-700",
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function CompanyDashboardPage() {
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
      <div className="space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-7">
          <p className="text-base text-slate-600">読み込み中...</p>
        </section>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="space-y-6">
        <section className="rounded-[32px] border border-red-200 bg-red-50 p-7">
          <h1 className="text-[24px] font-bold text-slate-900">
            エラーが発生しました
          </h1>
          <p className="mt-3 text-base text-slate-600">
            {error || "ダッシュボード情報の取得に失敗しました。"}
          </p>
        </section>
      </div>
    );
  }

  const approvalBadge = getApprovalBadge(dashboard.approvalStatus);
  const subscriptionBadge = getSubscriptionBadge(
    dashboard.companyPlanCodeRaw,
    dashboard.companySubscriptionStatus
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-base font-semibold text-blue-600">
              Company Dashboard
            </p>
            <h1 className="mt-2 text-[28px] font-bold text-slate-900">
              {dashboard.companyName}
            </h1>
            <p className="mt-3 text-base leading-8 text-slate-600">
              クリエイター活用、注文・依頼状況、進行中案件をまとめて確認できます。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${approvalBadge.className}`}
            >
              {approvalBadge.label}
            </span>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${subscriptionBadge.className}`}
            >
              {subscriptionBadge.label}
            </span>

            <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
              {getPlanLabel(dashboard.companyPlanCodeDisplay)}
            </span>
          </div>
        </div>
      </section>

      {!canUseRequests && (
        <section className="rounded-[32px] border border-blue-200 bg-blue-50 p-7">
          <h2 className="text-[22px] font-bold text-slate-900">
            依頼送信にはプラン開始が必要です
          </h2>
          <p className="mt-3 text-base leading-8 text-slate-600">
            クリエイターの閲覧は利用できます。依頼送信や案件進行は、プラン開始後に解放されます。
          </p>
          <div className="mt-6">
            <Link
              href="/b/billing"
              className="inline-flex rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white"
            >
              料金プランを見る
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="grid self-start grid-cols-1 gap-5 items-start md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-400">承認待ち注文・依頼</p>
            <p className="mt-4 text-[52px] font-bold leading-none text-slate-900">
              {dashboard.counts.pending}
            </p>
            <p className="mt-4 text-sm text-slate-500">
              pending / authorized
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-400">進行中案件</p>
            <p className="mt-4 text-[52px] font-bold leading-none text-slate-900">
              {dashboard.counts.accepted}
            </p>
            <p className="mt-4 text-sm text-slate-500">
              accepted / captured
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-400">納品待ち確認</p>
            <p className="mt-4 text-[52px] font-bold leading-none text-slate-900">
              {dashboard.counts.delivered}
            </p>
            <p className="mt-4 text-sm text-slate-500">delivered</p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-400">完了案件</p>
            <p className="mt-4 text-[52px] font-bold leading-none text-slate-900">
              {dashboard.counts.completed}
            </p>
            <p className="mt-4 text-sm text-slate-500">completed</p>
          </div>
        </div>

        <div className="self-start rounded-[28px] border border-slate-200 bg-white p-6">
          <h2 className="text-[24px] font-bold text-slate-900">
            現在の利用状況
          </h2>

          <div className="mt-6 space-y-4 text-base">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">審査状態</span>
              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${approvalBadge.className}`}
              >
                {approvalBadge.label}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">プラン</span>
              <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
                {getPlanLabel(dashboard.companyPlanCodeDisplay)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">利用状態</span>
              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${subscriptionBadge.className}`}
              >
                {subscriptionBadge.label}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">月間上限</span>
              <span className="font-semibold text-slate-900">
                {dashboard.monthlyRequestLimit === null
                  ? "無制限"
                  : `${dashboard.monthlyRequestLimit}件`}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">今月の送信数</span>
              <span className="font-semibold text-slate-900">
                {dashboard.monthlyRequestUsed ?? 0}件
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">使用量リセット日</span>
              <span className="font-semibold text-slate-900">
                {formatDate(dashboard.requestUsageResetAt)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">次回更新日</span>
              <span className="font-semibold text-slate-900">
                {formatDate(dashboard.stripeCurrentPeriodEnd)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">期間終了時解約</span>
              <span className="font-semibold text-slate-900">
                {dashboard.stripeCancelAtPeriodEnd ? "あり" : "なし"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
          <h2 className="text-[24px] font-bold text-slate-900">まずやること</h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href="/b/creators"
              className="rounded-[24px] border border-slate-200 p-5 transition hover:bg-slate-50"
            >
              <p className="text-[18px] font-bold text-slate-900">
                クリエイターを探す
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                クリエイターや公開メニューを確認します。
              </p>
            </Link>

            <Link
              href="/b/requests"
              className="rounded-[24px] border border-slate-200 p-5 transition hover:bg-slate-50"
            >
              <p className="text-[18px] font-bold text-slate-900">
                承認待ちを見る
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                送信した注文・依頼の承認状況を確認します。
              </p>
            </Link>

            <Link
              href="/b/jobs"
              className="rounded-[24px] border border-slate-200 p-5 transition hover:bg-slate-50"
            >
              <p className="text-[18px] font-bold text-slate-900">
                進行中案件を見る
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                決済確定・納品済み・完了済みの案件を確認します。
              </p>
            </Link>

            <Link
              href="/b/billing"
              className="rounded-[24px] border border-slate-200 p-5 transition hover:bg-slate-50"
            >
              <p className="text-[18px] font-bold text-slate-900">
                料金プランを確認する
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Basic / Pro / Premium の機能・件数・手数料率を確認できます。
              </p>
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
          <h2 className="text-[24px] font-bold text-slate-900">補足メモ</h2>
          <div className="mt-5 space-y-3 text-sm leading-8 text-slate-600">
            <p>
              ・件数は旧 requests と新 orders の両方を合算して表示しています。
            </p>
            <p>
              ・プラン表示は内部コード free / standard / global_pro を Basic / Pro / Premium に読み替えています。
            </p>
            <p>
              ・利用状態は user_states.company_subscription_status を基準に表示しています。
            </p>
            <p>
              ・Pro は継続利用・高度検索・レポート向け、Premium は取引手数料5%・分析強化・優先サポート向けです。
            </p>
            <p>
              ・Basic は月5件までを前提に動作し、Pro / Premium は注文・依頼数無制限を想定しています。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}