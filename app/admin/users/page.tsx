// File: app/admin/users/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RoleFilter = "all" | "company" | "creator" | "admin" | "unknown";
type StatusFilter =
  | "all"
  | "approved"
  | "pending"
  | "suspended"
  | "connect_incomplete"
  | "delayed";

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

function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
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

function getRoleLabel(role: string) {
  if (role === "company") return "B";
  if (role === "creator") return "C";
  if (role === "admin") return "Admin";
  return "Unknown";
}

function getPrimaryRoleLabel(role: AdminUserRow["primary_role"]) {
  if (role === "company") return "企業";
  if (role === "creator") return "クリエイター";
  if (role === "admin") return "管理者";
  return "未分類";
}

function getApprovalLabel(user: AdminUserRow) {
  if (user.primary_role === "company") {
    return user.company_approval_status ?? "-";
  }

  if (user.primary_role === "creator") {
    return user.creator_approval_status ?? "-";
  }

  return "-";
}

function isApproved(user: AdminUserRow) {
  return (
    user.company_approval_status === "approved" ||
    user.creator_approval_status === "approved" ||
    user.primary_role === "admin"
  );
}

function isPending(user: AdminUserRow) {
  return (
    user.company_approval_status === "pending" ||
    user.creator_approval_status === "pending"
  );
}

function isConnectIncomplete(user: AdminUserRow) {
  return (
    user.primary_role === "creator" &&
    user.creator_stripe_onboarding_completed === false
  );
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
  tone = "default",
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  const activeClass =
    tone === "danger"
      ? "bg-red-600 text-white shadow-[0_14px_30px_rgba(220,38,38,0.18)]"
      : "bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]";

  const inactiveClass =
    tone === "danger"
      ? "bg-white text-red-600 ring-1 ring-red-100 hover:bg-red-50"
      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
        active ? activeClass : inactiveClass
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

function UserCard({ user }: { user: AdminUserRow }) {
  const approval = getApprovalLabel(user);
  const loginDays = daysSince(user.last_sign_in_at);

  const loginTone =
    !user.last_sign_in_at || (loginDays != null && loginDays >= 30)
      ? "amber"
      : "slate";

  return (
    <article
      className={`rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ${
        user.is_suspended || user.delayed_c_order_count > 0
          ? "ring-red-100"
          : "ring-slate-100"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Pill tone={user.primary_role === "admin" ? "dark" : "slate"}>
              {getPrimaryRoleLabel(user.primary_role)}
            </Pill>

            {user.roles.map((role) => (
              <Pill key={role} tone={role === "creator" ? "rose" : "blue"}>
                {getRoleLabel(role)}
              </Pill>
            ))}

            {isApproved(user) ? (
              <Pill tone="green">承認済み</Pill>
            ) : isPending(user) ? (
              <Pill tone="amber">未承認</Pill>
            ) : null}

            {user.is_suspended ? <Pill tone="red">停止中</Pill> : null}

            {user.delayed_c_order_count > 0 ? (
              <Pill tone="red">遅延案件 {user.delayed_c_order_count}</Pill>
            ) : null}

            {isConnectIncomplete(user) ? (
              <Pill tone="amber">Connect未完了</Pill>
            ) : null}
          </div>

          <h2 className="mt-3 truncate text-[20px] font-black tracking-[-0.045em] text-slate-950">
            {user.display_name}
          </h2>

          <p className="mt-1 truncate text-sm font-semibold text-slate-400">
            {user.email ?? "メール未取得"}
          </p>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">最終ログイン</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {getLoginLabel(user.last_sign_in_at)}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                {formatDateTime(user.last_sign_in_at)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">登録日</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {formatShortDate(user.created_at)}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                {formatDateTime(user.created_at)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">注文数</p>
              <p className="mt-1 truncate font-black text-slate-800">
                B: {user.b_order_count} / C: {user.c_order_count}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                進行中 B:{user.active_b_order_count} C:{user.active_c_order_count}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">状態</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {approval}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                {user.user_id}
              </p>
            </div>
          </div>

          {user.primary_role === "company" ? (
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">企業名</p>
                <p className="mt-1 truncate font-black text-slate-800">
                  {user.company_name ?? "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">プラン</p>
                <p className="mt-1 truncate font-black text-slate-800">
                  {user.company_plan_code ?? "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">今月利用</p>
                <p className="mt-1 truncate font-black text-slate-800">
                  {user.monthly_request_used ?? 0} /{" "}
                  {user.monthly_request_limit ?? "∞"}
                </p>
              </div>
            </div>
          ) : null}

          {user.primary_role === "creator" ? (
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">表示名</p>
                <p className="mt-1 truncate font-black text-slate-800">
                  {user.creator_name ?? "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">Connect</p>
                <p className="mt-1 truncate font-black text-slate-800">
                  {user.creator_stripe_onboarding_completed ? "完了" : "未完了"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">メニュー</p>
                <p className="mt-1 truncate font-black text-slate-800">
                  {user.creator_menu_count}件
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">画像</p>
                <p className="mt-1 truncate font-black text-slate-800">
                  {user.creator_portfolio_count}枚
                </p>
              </div>
            </div>
          ) : null}

          {user.suspend_reason ? (
            <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold leading-6 text-red-700 ring-1 ring-red-100">
              停止理由：{user.suspend_reason}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
          <Link
            href={`/admin/users/${user.user_id}`}
            className="rounded-full bg-[#ff5f67] px-4 py-2.5 text-center text-xs font-black text-white shadow-[0_12px_26px_rgba(255,95,103,0.22)]"
          >
            Admin詳細
          </Link>

          {user.primary_role === "company" ? (
            <Link
              href={`/admin/companies`}
              className="rounded-full bg-slate-950 px-4 py-2.5 text-center text-xs font-black text-white"
            >
              企業管理
            </Link>
          ) : null}

          {user.primary_role === "creator" ? (
            <Link
              href={`/admin/creators`}
              className="rounded-full bg-slate-950 px-4 py-2.5 text-center text-xs font-black text-white"
            >
              C管理
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(user.user_id)}
            className="rounded-full bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-100"
          >
            IDコピー
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
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
        console.error("admin users page error:", error);
        setError("ユーザー一覧の取得に失敗しました");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const counts = useMemo(() => {
    return {
      all: users.length,
      company: users.filter((user) => user.roles.includes("company")).length,
      creator: users.filter((user) => user.roles.includes("creator")).length,
      admin: users.filter((user) => user.roles.includes("admin")).length,
      approved: users.filter(isApproved).length,
      pending: users.filter(isPending).length,
      suspended: users.filter((user) => user.is_suspended).length,
      connectIncomplete: users.filter(isConnectIncomplete).length,
      delayed: users.filter((user) => user.delayed_c_order_count > 0).length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQ = q.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "all" && !user.roles.includes(roleFilter)) {
        return false;
      }

      if (statusFilter === "approved" && !isApproved(user)) return false;
      if (statusFilter === "pending" && !isPending(user)) return false;
      if (statusFilter === "suspended" && !user.is_suspended) return false;
      if (statusFilter === "connect_incomplete" && !isConnectIncomplete(user)) {
        return false;
      }
      if (statusFilter === "delayed" && user.delayed_c_order_count <= 0) {
        return false;
      }

      if (!normalizedQ) return true;

      return [
        user.user_id,
        user.email,
        user.display_name,
        user.company_name,
        user.creator_name,
        user.company_plan_code,
        user.company_approval_status,
        user.creator_approval_status,
        ...user.roles,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQ));
    });
  }, [users, roleFilter, statusFilter, q]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="h-32 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="mt-4 h-24 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
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
              ユーザー管理
            </h1>

            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              B/C/Adminユーザー、最終ログイン、注文数、Connect状態を確認できます。
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
        <StatCard label="企業" value={counts.company} />
        <StatCard label="クリエイター" value={counts.creator} />
        <StatCard label="管理者" value={counts.admin} />
        <StatCard
          label="停止中"
          value={counts.suspended}
          tone={counts.suspended > 0 ? "danger" : "default"}
        />
        <StatCard
          label="遅延C"
          value={counts.delayed}
          tone={counts.delayed > 0 ? "danger" : "default"}
        />
      </section>

      <section className="mb-5 rounded-[28px] bg-white p-4 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              label="すべて"
              count={counts.all}
              active={roleFilter === "all"}
              onClick={() => setRoleFilter("all")}
            />
            <FilterButton
              label="企業"
              count={counts.company}
              active={roleFilter === "company"}
              onClick={() => setRoleFilter("company")}
            />
            <FilterButton
              label="クリエイター"
              count={counts.creator}
              active={roleFilter === "creator"}
              onClick={() => setRoleFilter("creator")}
            />
            <FilterButton
              label="管理者"
              count={counts.admin}
              active={roleFilter === "admin"}
              onClick={() => setRoleFilter("admin")}
            />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterButton
                label="状態すべて"
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
                label="停止中"
                count={counts.suspended}
                active={statusFilter === "suspended"}
                onClick={() => setStatusFilter("suspended")}
                tone={counts.suspended > 0 ? "danger" : "default"}
              />
              <FilterButton
                label="Connect未完了"
                count={counts.connectIncomplete}
                active={statusFilter === "connect_incomplete"}
                onClick={() => setStatusFilter("connect_incomplete")}
              />
              <FilterButton
                label="遅延C"
                count={counts.delayed}
                active={statusFilter === "delayed"}
                onClick={() => setStatusFilter("delayed")}
                tone={counts.delayed > 0 ? "danger" : "default"}
              />
            </div>

            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="名前 / メール / ID / プランで検索"
              className="min-h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-slate-400 xl:max-w-sm"
            />
          </div>
        </div>
      </section>

      {filteredUsers.length === 0 ? (
        <section className="rounded-[28px] bg-white p-8 text-center text-sm font-semibold text-slate-400 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
          該当するユーザーはありません。
        </section>
      ) : (
        <section className="space-y-3">
          {filteredUsers.map((user) => (
            <UserCard key={user.user_id} user={user} />
          ))}
        </section>
      )}
    </main>
  );
}