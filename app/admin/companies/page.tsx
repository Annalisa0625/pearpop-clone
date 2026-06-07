// File: app/admin/companies/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AdminUserRow = {
  user_id: string;
  email: string | null;
  roles: string[];
  primary_role: "admin" | "company" | "creator" | "unknown";
  display_name: string;
  created_at: string | null;
  last_sign_in_at: string | null;

  is_suspended: boolean;
  suspend_level: number | null;
  suspend_reason: string | null;

  company_name: string | null;
  company_approval_status: string | null;
  company_plan_code: string | null;
  company_subscription_status: string | null;
  monthly_request_used: number | null;
  monthly_request_limit: number | null;

  creator_name: string | null;
  creator_approval_status: string | null;
  creator_is_public: boolean | null;
  creator_is_suspended: boolean | null;
  creator_stripe_onboarding_completed: boolean | null;
  creator_menu_count: number;
  creator_portfolio_count: number;

  b_order_count: number;
  c_order_count: number;
  active_b_order_count: number;
  active_c_order_count: number;
  delayed_c_order_count: number;
};

type StatusFilter = "all" | "approved" | "pending" | "active" | "free" | "paid";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  const diff = Date.now() - time;

  if (diff < 0) return 0;

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getLoginLabel(value: string | null) {
  if (!value) return "未ログイン";

  const days = daysSince(value);

  if (days == null) return formatDateTime(value);
  if (days === 0) return "今日";
  if (days === 1) return "1日前";
  if (days < 30) return `${days}日前`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;

  return `${Math.floor(days / 365)}年以上前`;
}

function isApproved(company: AdminUserRow) {
  return company.company_approval_status === "approved";
}

function isPending(company: AdminUserRow) {
  return company.company_approval_status === "pending";
}

function isPaid(company: AdminUserRow) {
  const plan = company.company_plan_code ?? "free";
  return plan !== "free" && plan !== "inactive";
}

function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "dark" | "rose" | "amber" | "green" | "red" | "blue";
}) {
  const className =
    tone === "dark"
      ? "bg-slate-950 text-white ring-slate-950"
      : tone === "rose"
        ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
        : tone === "amber"
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : tone === "green"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : tone === "red"
              ? "bg-red-50 text-red-700 ring-red-100"
              : tone === "blue"
                ? "bg-blue-50 text-blue-700 ring-blue-100"
                : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "danger";
}) {
  return (
    <div
      className={`rounded-[24px] bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ${
        tone === "danger" ? "ring-red-100" : "ring-slate-100"
      }`}
    >
      <p
        className={`text-xs font-black ${
          tone === "danger" ? "text-red-500" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-[28px] font-black tracking-[-0.06em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
        active
          ? "bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function CompanyCard({ company }: { company: AdminUserRow }) {
  const approvalStatus = company.company_approval_status ?? "-";
  const plan = company.company_plan_code ?? "free";
  const subscriptionStatus = company.company_subscription_status ?? "-";

  return (
    <article className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">企業</Pill>

            {isApproved(company) ? (
              <Pill tone="green">承認済み</Pill>
            ) : isPending(company) ? (
              <Pill tone="amber">未承認</Pill>
            ) : (
              <Pill>{approvalStatus}</Pill>
            )}

            {isPaid(company) ? (
              <Pill tone="dark">{plan}</Pill>
            ) : (
              <Pill>free</Pill>
            )}

            {company.active_b_order_count > 0 ? (
              <Pill tone="rose">進行中 {company.active_b_order_count}</Pill>
            ) : null}

            {company.is_suspended ? <Pill tone="red">停止中</Pill> : null}
          </div>

          <h2 className="mt-3 truncate text-[20px] font-black tracking-[-0.045em] text-slate-950">
            {company.company_name || company.display_name || "会社名未設定"}
          </h2>

          <p className="mt-1 truncate text-sm font-semibold text-slate-400">
            {company.email ?? "メール未取得"}
          </p>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">最終ログイン</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {getLoginLabel(company.last_sign_in_at)}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                {formatDateTime(company.last_sign_in_at)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">プラン</p>
              <p className="mt-1 truncate font-black text-slate-800">{plan}</p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                {subscriptionStatus}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">今月利用</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {company.monthly_request_used ?? 0} /{" "}
                {company.monthly_request_limit ?? "∞"}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                旧リクエスト制限
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">注文数</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {company.b_order_count}件
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                進行中 {company.active_b_order_count}件
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-xs font-black text-slate-400">User ID</p>
            <p className="mt-1 break-all font-mono text-xs font-black text-slate-800">
              {company.user_id}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
          <Link
            href={`/admin/users/${company.user_id}`}
            className="rounded-full bg-[#ff5f67] px-4 py-2.5 text-center text-xs font-black text-white shadow-[0_12px_26px_rgba(255,95,103,0.22)]"
          >
            Admin詳細
          </Link>

          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(company.user_id)}
            className="rounded-full bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-100"
          >
            IDコピー
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminCompaniesPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/admin/users/list", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error ?? "failed to load users");
        }

        setUsers((json?.users ?? []) as AdminUserRow[]);
      } catch (error) {
        console.error("admin companies page error:", error);
        setError("企業一覧の取得に失敗しました");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const companies = useMemo(() => {
    return users.filter(
      (user) => user.primary_role === "company" || user.roles.includes("company")
    );
  }, [users]);

  const counts = useMemo(() => {
    return {
      all: companies.length,
      approved: companies.filter(isApproved).length,
      pending: companies.filter(isPending).length,
      active: companies.filter((company) => company.active_b_order_count > 0)
        .length,
      free: companies.filter((company) => !isPaid(company)).length,
      paid: companies.filter(isPaid).length,
    };
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const normalizedQ = q.trim().toLowerCase();

    return companies.filter((company) => {
      if (statusFilter === "approved" && !isApproved(company)) return false;
      if (statusFilter === "pending" && !isPending(company)) return false;
      if (statusFilter === "active" && company.active_b_order_count <= 0) {
        return false;
      }
      if (statusFilter === "free" && isPaid(company)) return false;
      if (statusFilter === "paid" && !isPaid(company)) return false;

      if (!normalizedQ) return true;

      return [
        company.user_id,
        company.email,
        company.display_name,
        company.company_name,
        company.company_plan_code,
        company.company_subscription_status,
        company.company_approval_status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQ));
    });
  }, [companies, statusFilter, q]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="h-32 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="mt-4 h-24 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <section className="mb-5 rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5f67]">
              Admin
            </p>

            <h1 className="mt-2 text-[30px] font-black tracking-[-0.06em] text-slate-950">
              企業管理
            </h1>

            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              B企業の登録状態、最終ログイン、プラン、注文状況を確認できます。
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            ダッシュボードへ
          </Link>
        </div>
      </section>

      {error ? (
        <section className="mb-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
          {error}
        </section>
      ) : null}

      <section className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="すべて" value={counts.all} />
        <StatCard label="承認済" value={counts.approved} />
        <StatCard label="未承認" value={counts.pending} />
        <StatCard label="進行中あり" value={counts.active} />
        <StatCard label="Free" value={counts.free} />
        <StatCard label="有料" value={counts.paid} />
      </section>

      <section className="mb-5 rounded-[28px] bg-white p-4 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              label="すべて"
              count={counts.all}
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <FilterButton
              label="承認済"
              count={counts.approved}
              active={statusFilter === "approved"}
              onClick={() => setStatusFilter("approved")}
            />
            <FilterButton
              label="未承認"
              count={counts.pending}
              active={statusFilter === "pending"}
              onClick={() => setStatusFilter("pending")}
            />
            <FilterButton
              label="進行中あり"
              count={counts.active}
              active={statusFilter === "active"}
              onClick={() => setStatusFilter("active")}
            />
            <FilterButton
              label="Free"
              count={counts.free}
              active={statusFilter === "free"}
              onClick={() => setStatusFilter("free")}
            />
            <FilterButton
              label="有料"
              count={counts.paid}
              active={statusFilter === "paid"}
              onClick={() => setStatusFilter("paid")}
            />
          </div>

          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="会社名 / メール / ID / プランで検索"
            className="min-h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-slate-400 xl:max-w-sm"
          />
        </div>
      </section>

      {filteredCompanies.length === 0 ? (
        <section className="rounded-[28px] bg-white p-8 text-center text-sm font-semibold text-slate-400 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
          該当する企業はありません。
        </section>
      ) : (
        <section className="space-y-3">
          {filteredCompanies.map((company) => (
            <CompanyCard key={company.user_id} company={company} />
          ))}
        </section>
      )}
    </main>
  );
}