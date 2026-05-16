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

function getBuyerFeeLabel(plan: CompanyPlanCode) {
  if (plan === "global_pro") return "5%";
  return "10%";
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

function StatCard({
  label,
  value,
  helper,
  href,
  tone = "default",
}: {
  label: string;
  value: number | string;
  helper?: string;
  href?: string;
  tone?: "default" | "dark" | "blue" | "purple" | "green" | "amber";
}) {
  const styles = {
    default: "border-slate-100 bg-white text-slate-950",
    dark: "border-slate-950 bg-slate-950 text-white",
    blue: "border-blue-100 bg-blue-50 text-slate-950",
    purple: "border-purple-100 bg-purple-50 text-slate-950",
    green: "border-emerald-100 bg-emerald-50 text-slate-950",
    amber: "border-amber-100 bg-amber-50 text-slate-950",
  };

  const card = (
    <div
      className={`rounded-[28px] border p-5 shadow-sm transition ${
        href ? "hover:-translate-y-0.5 hover:shadow-md" : ""
      } ${styles[tone]}`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.2em] ${
          tone === "dark" ? "text-white/60" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-4 text-4xl font-black ${
          tone === "dark" ? "text-white" : "text-slate-950"
        }`}
      >
        {value}
      </p>
      {helper ? (
        <p
          className={`mt-2 text-xs leading-5 ${
            tone === "dark" ? "text-white/70" : "text-slate-500"
          }`}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );

  if (!href) return card;

  return <Link href={href}>{card}</Link>;
}

function ActionCard({
  href,
  icon,
  title,
  body,
  strong,
}: {
  href: string;
  icon: string;
  title: string;
  body: string;
  strong?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[28px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        strong
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-100 bg-white text-slate-950"
      }`}
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black ${
          strong ? "bg-white text-slate-950" : "bg-slate-100 text-slate-950"
        }`}
      >
        {icon}
      </div>
      <p className="text-base font-black">{title}</p>
      <p
        className={`mt-2 text-sm leading-6 ${
          strong ? "text-white/70" : "text-slate-500"
        }`}
      >
        {body}
      </p>
    </Link>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
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
      <div className="space-y-6">
        <section className="rounded-[32px] border border-slate-100 bg-white p-7 shadow-sm">
          <p className="text-base font-semibold text-slate-500">
            読み込み中...
          </p>
        </section>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="space-y-6">
        <section className="rounded-[32px] border border-red-200 bg-red-50 p-7">
          <h1 className="text-2xl font-black text-slate-900">
            エラーが発生しました
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
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

  const planLabel = getPlanLabel(dashboard.companyPlanCodeDisplay);
  const buyerFee = getBuyerFeeLabel(dashboard.companyPlanCodeDisplay);

  const remaining =
    dashboard.monthlyRequestLimit === null
      ? null
      : Math.max(
          dashboard.monthlyRequestLimit - (dashboard.monthlyRequestUsed ?? 0),
          0
        );

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-slate-950 p-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
              Company Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              {dashboard.companyName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              クリエイター検索、注文状況、進行中案件、プラン状態をまとめて確認できます。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-4 py-2 text-sm font-black ${approvalBadge.className}`}
            >
              {approvalBadge.label}
            </span>
            <span
              className={`rounded-full px-4 py-2 text-sm font-black ${subscriptionBadge.className}`}
            >
              {subscriptionBadge.label}
            </span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
              {planLabel}
            </span>
          </div>
        </div>
      </section>

      {!canUseRequests ? (
        <section className="rounded-[28px] border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-black text-slate-950">
            依頼送信にはプラン開始が必要です
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            クリエイターの閲覧は利用できます。依頼送信や案件進行は、プラン開始後に解放されます。
          </p>
          <Link
            href="/b/billing"
            className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            料金プランを見る
          </Link>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="承認待ち"
          value={dashboard.counts.pending}
          helper="pending / authorized"
          href="/b/requests"
          tone={dashboard.counts.pending > 0 ? "amber" : "default"}
        />
        <StatCard
          label="進行中"
          value={dashboard.counts.accepted}
          helper="accepted / captured"
          href="/b/jobs"
          tone={dashboard.counts.accepted > 0 ? "blue" : "default"}
        />
        <StatCard
          label="納品確認"
          value={dashboard.counts.delivered}
          helper="delivered"
          href="/b/jobs"
          tone={dashboard.counts.delivered > 0 ? "purple" : "default"}
        />
        <StatCard
          label="完了"
          value={dashboard.counts.completed}
          helper="completed"
          href="/b/jobs"
          tone={dashboard.counts.completed > 0 ? "green" : "default"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="space-y-6">
          <section>
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Quick Actions
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                まずやること
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ActionCard
                href="/b/creators"
                icon="◎"
                title="クリエイターを探す"
                body="公開中のクリエイターとメニューを検索・比較します。"
                strong
              />
              <ActionCard
                href="/b/saved-creators"
                icon="♥"
                title="保存済みを見る"
                body="気になるクリエイターをまとめて確認します。"
              />
              <ActionCard
                href="/b/requests"
                icon="◌"
                title="承認待ちを見る"
                body="送信した注文・依頼の承認状況を確認します。"
              />
              <ActionCard
                href="/b/jobs"
                icon="▣"
                title="進行中案件を見る"
                body="決済確定・納品済み・完了済みの案件を確認します。"
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              プランの使い方
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  現在プラン
                </p>
                <p className="mt-2 text-xl font-black text-slate-950">
                  {planLabel}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  B側手数料
                </p>
                <p className="mt-2 text-xl font-black text-slate-950">
                  {buyerFee}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  今月残り
                </p>
                <p className="mt-2 text-xl font-black text-slate-950">
                  {remaining === null ? "無制限" : `${remaining}件`}
                </p>
              </div>
            </div>

            <Link
              href="/b/billing"
              className="mt-5 inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              料金プランを確認する
            </Link>
          </section>
        </main>

        <aside className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm xl:sticky xl:top-24 xl:self-start">
          <h2 className="text-2xl font-black text-slate-950">
            現在の利用状況
          </h2>

          <div className="mt-5">
            <StatusRow
              label="審査状態"
              value={
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${approvalBadge.className}`}
                >
                  {approvalBadge.label}
                </span>
              }
            />

            <StatusRow
              label="プラン"
              value={
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
                  {planLabel}
                </span>
              }
            />

            <StatusRow
              label="利用状態"
              value={
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${subscriptionBadge.className}`}
                >
                  {subscriptionBadge.label}
                </span>
              }
            />

            <StatusRow
              label="月間上限"
              value={
                dashboard.monthlyRequestLimit === null
                  ? "無制限"
                  : `${dashboard.monthlyRequestLimit}件`
              }
            />

            <StatusRow
              label="今月の送信数"
              value={`${dashboard.monthlyRequestUsed ?? 0}件`}
            />

            <StatusRow
              label="使用量リセット日"
              value={formatDate(dashboard.requestUsageResetAt)}
            />

            <StatusRow
              label="次回更新日"
              value={formatDate(dashboard.stripeCurrentPeriodEnd)}
            />

            <StatusRow
              label="期間終了時解約"
              value={dashboard.stripeCancelAtPeriodEnd ? "あり" : "なし"}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}