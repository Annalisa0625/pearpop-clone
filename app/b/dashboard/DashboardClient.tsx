// File: app/b/dashboard/DashboardClient.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  counts: DashboardCounts;
  savedCount: number;
};

function normalizePlanCode(value: string | null | undefined): CompanyPlanCode | null {
  if (value === "free" || value === "standard" || value === "global_pro") return value;
  return null;
}

function normalizeApprovalStatus(value: string | null | undefined): ApprovalStatus {
  if (value === "pending" || value === "approved" || value === "rejected") return value;
  return null;
}

function normalizeSubscriptionStatus(value: string | null | undefined): SubscriptionStatus {
  if (value === "active" || value === "inactive" || value === "canceled") return value;
  return null;
}

function getBuyerFeeLabel(plan: CompanyPlanCode) {
  if (plan === "global_pro") return "5%";
  return "10%";
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m4.75 10.3 3.05 3.05 7.45-7.7"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsageLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-right text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}

function StatusCard({
  title,
  description,
  count,
  tone,
}: {
  title: string;
  description: string;
  count: number;
  tone: "review" | "waiting" | "active" | "done";
}) {
  const active = count > 0;

  const toneClass =
    tone === "review"
      ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
      : tone === "waiting"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : tone === "active"
      ? "bg-blue-50 text-blue-700 ring-blue-100"
      : "bg-emerald-50 text-emerald-700 ring-emerald-100";

  return (
    <Link
      href="/b/orders"
      className={`group flex min-h-[132px] flex-col justify-between rounded-[26px] p-5 ring-1 transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${
        active ? "bg-white ring-slate-100" : "bg-slate-50/80 ring-slate-100"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black tracking-[-0.03em] text-slate-950">
            {title}
          </h3>
          <p className="mt-1.5 text-xs font-bold leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <span
          className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-black ring-1 ${
            active ? toneClass : "bg-white text-slate-400 ring-slate-100"
          }`}
        >
          {count}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs font-black text-slate-400">
        <span>{active ? "確認できます" : "現在なし"}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-100 transition group-hover:bg-slate-950 group-hover:text-white">
          →
        </span>
      </div>
    </Link>
  );
}

function QuickAction({
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
      className={`group flex items-center justify-between gap-4 rounded-[24px] px-5 py-4 ring-1 transition hover:-translate-y-0.5 ${
        primary
          ? "bg-slate-950 text-white ring-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
          : "bg-white text-slate-950 ring-slate-100 hover:shadow-[0_18px_45px_rgba(15,23,42,0.07)]"
      }`}
    >
      <div>
        <p className={`text-sm font-black ${primary ? "text-white" : "text-slate-950"}`}>
          {title}
        </p>
        <p
          className={`mt-1 text-xs font-bold leading-5 ${
            primary ? "text-white/55" : "text-slate-400"
          }`}
        >
          {body}
        </p>
      </div>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition ${
          primary
            ? "bg-white/10 text-white group-hover:bg-white group-hover:text-slate-950"
            : "bg-slate-50 text-slate-400 group-hover:bg-slate-950 group-hover:text-white"
        }`}
      >
        →
      </span>
    </Link>
  );
}

function EmptyGuide() {
  return (
    <div className="rounded-[30px] bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[12px] font-black tracking-[0.18em] text-[#ff5f67]">
            START
          </p>
          <h2 className="mt-2 text-[26px] font-black tracking-[-0.055em] text-slate-950 md:text-[32px]">
            まずはインフルエンサーを探しましょう
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
            公開メニューから、価格・SNS・投稿内容を確認して依頼できます。
          </p>
        </div>

        <Link
          href="/b/creators"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
        >
          インフルエンサーを探す
          <ArrowIcon />
        </Link>
      </div>
    </div>
  );
}

export default function CompanyDashboardClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);

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
      savedCreatorsResult,
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
        .select("company_plan_code, company_subscription_status")
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("saved_creators")
        .select("creator_id", { count: "exact", head: true })
        .eq("b_user_id", user.id),

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
      savedCreatorsResult.error,
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
    } | null;

    const rawPlanCode = normalizePlanCode(rawState?.company_plan_code ?? null);
    const displayPlanCode = rawPlanCode ?? "free";

    return {
      companyName: company?.company_name ?? user.email ?? "企業アカウント",
      approvalStatus: normalizeApprovalStatus(company?.approval_status ?? null),
      companyPlanCodeRaw: rawPlanCode,
      companyPlanCodeDisplay: displayPlanCode,
      companySubscriptionStatus: normalizeSubscriptionStatus(
        rawState?.company_subscription_status ?? null
      ),
      savedCount: savedCreatorsResult.count ?? 0,
      counts: {
        pending: (legacyPendingResult.count ?? 0) + (orderPendingResult.count ?? 0),
        accepted:
          (legacyAcceptedResult.count ?? 0) + (orderAcceptedResult.count ?? 0),
        delivered:
          (legacyDeliveredResult.count ?? 0) + (orderDeliveredResult.count ?? 0),
        completed:
          (legacyCompletedResult.count ?? 0) + (orderCompletedResult.count ?? 0),
      },
    };
  }, [router]);

  const refreshDashboard = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError("");

      try {
        const latest = await fetchDashboardState();
        if (latest) setDashboard(latest);
      } catch (e) {
        console.error(e);
        setError("ダッシュボード情報の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    },
    [fetchDashboardState]
  );

  useEffect(() => {
    void refreshDashboard(true);
  }, [refreshDashboard]);

  useEffect(() => {
    const onFocus = () => void refreshDashboard(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshDashboard(false);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshDashboard]);

  const summary = useMemo(() => {
    if (!dashboard) {
      return {
        activeOrderCount: 0,
        needsActionCount: 0,
        heroTitle: "ダッシュボード",
        heroBody: "",
        primaryHref: "/b/creators",
        primaryLabel: "インフルエンサーを探す",
      };
    }

    const activeOrderCount =
      dashboard.counts.pending + dashboard.counts.accepted + dashboard.counts.delivered;
    const needsActionCount = dashboard.counts.delivered;

    if (activeOrderCount > 0) {
      return {
        activeOrderCount,
        needsActionCount,
        heroTitle: "注文の進行状況を確認しましょう",
        heroBody:
          "返答待ち、進行中、納品確認が必要な注文をまとめて確認できます。",
        primaryHref: "/b/orders",
        primaryLabel: "注文管理を見る",
      };
    }

    return {
      activeOrderCount,
      needsActionCount,
      heroTitle: "インフルエンサーを探して依頼を始めましょう",
      heroBody:
        "SNS種別、価格、投稿内容を見ながら、目的に合うインフルエンサーを探せます。",
      primaryHref: "/b/creators",
      primaryLabel: "インフルエンサーを探す",
    };
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

  const buyerFee = getBuyerFeeLabel(dashboard.companyPlanCodeDisplay);
  const hasOrders =
    dashboard.counts.pending +
      dashboard.counts.accepted +
      dashboard.counts.delivered +
      dashboard.counts.completed >
    0;

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/30 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[110px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <section className="overflow-hidden rounded-[32px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="p-6 md:p-8">
              <p className="text-sm font-black text-slate-400">
                {dashboard.companyName}
              </p>

              <h1 className="mt-3 max-w-2xl text-[30px] font-black tracking-[-0.06em] text-slate-950 md:text-[42px]">
                {summary.heroTitle}
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {summary.heroBody}
              </p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={summary.primaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {summary.primaryLabel}
                  <ArrowIcon />
                </Link>

                <Link
                  href="/b/creators"
                  className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3.5 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
                >
                  新しく探す
                </Link>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-950 p-6 text-white md:p-8 lg:border-l lg:border-t-0">
              <p className="text-[12px] font-black tracking-[0.18em] text-white/35">
                SUMMARY
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-bold text-white/45">進行中</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.07em]">
                    {summary.activeOrderCount}
                  </p>
                </div>
                <div className="rounded-[22px] bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-bold text-white/45">要確認</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.07em]">
                    {summary.needsActionCount}
                  </p>
                </div>
                <div className="rounded-[22px] bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-bold text-white/45">保存済み</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.07em]">
                    {dashboard.savedCount}
                  </p>
                </div>
                <div className="rounded-[22px] bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-bold text-white/45">完了</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.07em]">
                    {dashboard.counts.completed}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {dashboard.approvalStatus !== "approved" ? (
          <section className="mt-4 rounded-[24px] bg-amber-50 px-5 py-4 text-sm font-bold leading-7 text-amber-800 ring-1 ring-amber-100">
            アカウント確認中です。確認が完了すると、依頼機能を利用できます。
          </section>
        ) : null}

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="rounded-[32px] bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[12px] font-black tracking-[0.18em] text-[#ff5f67]">
                  ORDERS
                </p>
                <h2 className="mt-2 text-[26px] font-black tracking-[-0.055em] text-slate-950">
                  注文管理
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  返答待ち、進行中、納品確認、完了をまとめて確認できます。
                </p>
              </div>

              <Link
                href="/b/orders"
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-950 hover:text-white"
              >
                すべて見る
                <ArrowIcon />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatusCard
                title="返答待ち"
                description="インフルエンサーが依頼内容を確認中"
                count={dashboard.counts.pending}
                tone="waiting"
              />
              <StatusCard
                title="進行中"
                description="チャット・撮影・納品待ち"
                count={dashboard.counts.accepted}
                tone="active"
              />
              <StatusCard
                title="納品確認"
                description="内容確認または修正依頼が必要"
                count={dashboard.counts.delivered}
                tone="review"
              />
              <StatusCard
                title="完了"
                description="完了した注文"
                count={dashboard.counts.completed}
                tone="done"
              />
            </div>
          </main>

          <aside className="grid gap-4 lg:self-start">
            <section className="rounded-[32px] bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-6">
              <p className="text-[12px] font-black tracking-[0.18em] text-[#ff5f67]">
                QUICK ACTION
              </p>

              <div className="mt-4 grid gap-3">
                <QuickAction
                  href="/b/creators"
                  title="インフルエンサーを探す"
                  body="価格と投稿内容を見て依頼"
                  primary={!hasOrders}
                />
                <QuickAction
                  href="/b/saved-creators"
                  title="保存済みを見る"
                  body={`${dashboard.savedCount}件を保存中`}
                />
                <QuickAction
                  href="/b/orders"
                  title="注文管理を見る"
                  body="進行中の注文を確認"
                  primary={hasOrders}
                />
              </div>
            </section>

            <section className="rounded-[32px] bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[12px] font-black tracking-[0.18em] text-slate-400">
                    PLAN
                  </p>
                  <h2 className="mt-2 text-[24px] font-black tracking-[-0.05em] text-slate-950">
                    利用状況
                  </h2>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  利用可能
                </span>
              </div>

              <div className="mt-5 grid gap-2">
                <UsageLine label="月額" value="なし" />
                <UsageLine label="依頼" value="利用可能" />
                <UsageLine label="案件手数料" value={buyerFee} />
              </div>

              <Link
                href="/b/billing"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-950 hover:text-white"
              >
                料金を見る
              </Link>
            </section>
          </aside>
        </section>

        {!hasOrders ? <div className="mt-4"><EmptyGuide /></div> : null}
      </div>
    </div>
  );
}
