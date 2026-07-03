// File: app/b/dashboard/DashboardClient.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function StatusCard({
  title,
  description,
  count,
  tone,
}: {
  title: string;
  description: string;
  count: number;
  tone: "waiting" | "active" | "review" | "done";
}) {
  const active = count > 0;
  const accentClass =
    tone === "review"
      ? "bg-[#ff5f67]"
      : tone === "waiting"
      ? "bg-amber-400"
      : tone === "active"
      ? "bg-blue-500"
      : "bg-emerald-500";

  const pillClass =
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
      className="group relative overflow-hidden rounded-[28px] bg-white p-5 ring-1 ring-slate-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(15,23,42,0.07)]"
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${active ? accentClass : "bg-slate-100"}`} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-[-0.04em] text-slate-950">
            {title}
          </h3>
          <p className="mt-1.5 text-xs font-bold leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <span
          className={`flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-black ring-1 ${
            active ? pillClass : "bg-slate-50 text-slate-400 ring-slate-100"
          }`}
        >
          {count}
        </span>
      </div>

      <div className="mt-7 flex items-center justify-between text-xs font-black text-slate-400">
        <span>{active ? "確認できます" : "現在なし"}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition group-hover:bg-slate-950 group-hover:text-white">
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
      className={`group flex items-center justify-between gap-4 rounded-[24px] px-5 py-4 ring-1 transition duration-200 hover:-translate-y-0.5 ${
        primary
          ? "bg-[#ff5f67] text-white ring-[#ff5f67] shadow-[0_16px_34px_rgba(255,95,103,0.2)]"
          : "bg-white text-slate-950 ring-slate-100 hover:shadow-[0_18px_45px_rgba(15,23,42,0.055)]"
      }`}
    >
      <div>
        <p className={`text-sm font-black ${primary ? "text-white" : "text-slate-950"}`}>
          {title}
        </p>
        <p
          className={`mt-1 text-xs font-bold leading-5 ${
            primary ? "text-white/75" : "text-slate-400"
          }`}
        >
          {body}
        </p>
      </div>

      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition ${
          primary
            ? "bg-white/18 text-white group-hover:bg-white group-hover:text-[#ff5f67]"
            : "bg-slate-50 text-slate-400 group-hover:bg-slate-950 group-hover:text-white"
        }`}
      >
        →
      </span>
    </Link>
  );
}

function StepCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-[11px] font-black tracking-[0.16em] text-[#ff5f67]">
        {number}
      </p>
      <h3 className="mt-2 text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-400">{body}</p>
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
      if (document.visibilityState === "visible") void refreshDashboard(false);
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
        title: "ダッシュボード",
        body: "",
      };
    }

    const activeOrderCount =
      dashboard.counts.pending + dashboard.counts.accepted + dashboard.counts.delivered;
    const needsActionCount = dashboard.counts.delivered;

    if (needsActionCount > 0) {
      return {
        title: "納品を確認しましょう",
        body: "確認が必要な納品があります。内容を確認して、完了または修正依頼に進めます。",
      };
    }

    if (activeOrderCount > 0) {
      return {
        title: "注文の進行状況を確認しましょう",
        body: "返答待ち、進行中、納品待ちの注文をまとめて確認できます。",
      };
    }

    return {
      title: "インフルエンサーを探して依頼を始めましょう",
      body: "SNS種別、価格、投稿内容を見ながら、目的に合うインフルエンサーを探せます。",
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
          <h1 className="text-2xl font-black text-slate-950">エラーが発生しました</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            {error || "ダッシュボード情報の取得に失敗しました。"}
          </p>
        </div>
      </div>
    );
  }

  const hasOrders =
    dashboard.counts.pending +
      dashboard.counts.accepted +
      dashboard.counts.delivered +
      dashboard.counts.completed >
    0;

  return (
    <div className="relative min-h-[calc(100vh-80px)] bg-[#f8f9fb]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-[34px] border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.055)] md:p-8">
          <div>
            <p className="text-sm font-black text-slate-400">
              {dashboard.companyName}
            </p>
            <h1 className="mt-3 max-w-2xl text-[30px] font-black leading-tight tracking-[-0.06em] text-slate-950 md:text-[42px]">
              {summary.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
              {summary.body}
            </p>
          </div>
        </section>

        {dashboard.approvalStatus !== "approved" ? (
          <section className="mt-4 rounded-[24px] bg-amber-50 px-5 py-4 text-sm font-bold leading-7 text-amber-800 ring-1 ring-amber-100">
            アカウント確認中です。確認が完了すると、依頼機能を利用できます。
          </section>
        ) : null}

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="rounded-[34px] border border-slate-100 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.045)] md:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-[28px] font-black tracking-[-0.06em] text-slate-950">
                  注文管理
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-400">
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

          <aside className="lg:self-start">
            <section className="rounded-[34px] border border-slate-100 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.045)] md:p-6">
              <h2 className="text-[22px] font-black tracking-[-0.05em] text-slate-950">
                次のアクション
              </h2>

              <div className="mt-4 grid gap-3">
                {hasOrders ? (
                  <QuickAction
                    href="/b/orders"
                    title="注文管理を見る"
                    body="進行中の注文を確認"
                    primary
                  />
                ) : null}
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
              </div>
            </section>
          </aside>
        </section>

        {!hasOrders ? (
          <section className="mt-4 rounded-[34px] border border-slate-100 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.045)] md:p-6">
            <h2 className="text-[26px] font-black tracking-[-0.055em] text-slate-950">
              最初の依頼までの流れ
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <StepCard number="01" title="探す" body="SNS種別や価格で絞り込みます。" />
              <StepCard number="02" title="確認する" body="メニュー内容と実施条件を確認します。" />
              <StepCard number="03" title="依頼する" body="支払い後、注文チャットで進めます。" />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
