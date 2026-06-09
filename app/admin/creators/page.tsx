// File: app/admin/creators/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StatusFilter =
  | "all"
  | "approved"
  | "pending"
  | "public"
  | "not_public"
  | "suspended"
  | "connect_incomplete"
  | "menu_missing"
  | "image_short"
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

function isApproved(creator: AdminUserRow) {
  return creator.creator_approval_status === "approved";
}

function isPending(creator: AdminUserRow) {
  return creator.creator_approval_status === "pending";
}

function isSuspended(creator: AdminUserRow) {
  return creator.is_suspended || creator.creator_is_suspended === true;
}

function isConnectIncomplete(creator: AdminUserRow) {
  return creator.creator_stripe_onboarding_completed !== true;
}

function isMenuMissing(creator: AdminUserRow) {
  return creator.creator_menu_count <= 0;
}

function isImageShort(creator: AdminUserRow) {
  return creator.creator_portfolio_count < 3;
}

function getApprovalLabel(status: string | null) {
  if (status === "approved") return "承認済み";
  if (status === "pending") return "未承認";
  if (status === "rejected") return "却下";
  if (!status) return "未設定";
  return status;
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
  tone?: "default" | "danger" | "warning";
}) {
  const ringClass =
    tone === "danger"
      ? "ring-red-100"
      : tone === "warning"
        ? "ring-amber-100"
        : "ring-slate-100";

  const labelClass =
    tone === "danger"
      ? "text-red-500"
      : tone === "warning"
        ? "text-amber-600"
        : "text-slate-400";

  return (
    <div
      className={`rounded-[24px] bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ${ringClass}`}
    >
      <p className={`text-xs font-black ${labelClass}`}>{label}</p>
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
  tone?: "default" | "danger" | "warning";
}) {
  const activeClass =
    tone === "danger"
      ? "bg-red-600 text-white shadow-[0_14px_30px_rgba(220,38,38,0.18)]"
      : tone === "warning"
        ? "bg-amber-500 text-white shadow-[0_14px_30px_rgba(245,158,11,0.18)]"
        : "bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]";

  const inactiveClass =
    tone === "danger"
      ? "bg-white text-red-600 ring-1 ring-red-100 hover:bg-red-50"
      : tone === "warning"
        ? "bg-white text-amber-700 ring-1 ring-amber-100 hover:bg-amber-50"
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

function CreatorCard({ creator }: { creator: AdminUserRow }) {
  const approvalStatus = creator.creator_approval_status ?? "-";
  const displayName =
    creator.creator_name || creator.display_name || "表示名未設定";

  return (
    <article
      className={`rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ${
        isSuspended(creator) ||
        creator.delayed_c_order_count > 0 ||
        isImageShort(creator) ||
        isMenuMissing(creator)
          ? "ring-amber-100"
          : "ring-slate-100"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Pill tone="rose">クリエイター</Pill>

            {isApproved(creator) ? (
              <Pill tone="green">承認済み</Pill>
            ) : isPending(creator) ? (
              <Pill tone="amber">未承認</Pill>
            ) : (
              <Pill>{getApprovalLabel(approvalStatus)}</Pill>
            )}

            {creator.creator_is_public ? (
              <Pill tone="blue">公開中</Pill>
            ) : (
              <Pill>非公開</Pill>
            )}

            {creator.creator_stripe_onboarding_completed ? (
              <Pill tone="green">Connect完了</Pill>
            ) : (
              <Pill tone="amber">Connect未完了</Pill>
            )}

            {isMenuMissing(creator) ? (
              <Pill tone="amber">メニュー未作成</Pill>
            ) : null}

            {isImageShort(creator) ? (
              <Pill tone="amber">画像不足</Pill>
            ) : null}

            {creator.delayed_c_order_count > 0 ? (
              <Pill tone="red">遅延案件 {creator.delayed_c_order_count}</Pill>
            ) : null}

            {isSuspended(creator) ? <Pill tone="red">停止中</Pill> : null}
          </div>

          <h2 className="mt-3 truncate text-[20px] font-black tracking-[-0.045em] text-slate-950">
            {displayName}
          </h2>

          <p className="mt-1 truncate text-sm font-semibold text-slate-400">
            {creator.email ?? "メール未取得"}
          </p>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">最終ログイン</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {getLoginLabel(creator.last_sign_in_at)}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                {formatDateTime(creator.last_sign_in_at)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">登録日</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {formatShortDate(creator.created_at)}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                {formatDateTime(creator.created_at)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">受注数</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {creator.c_order_count}件
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                進行中 {creator.active_c_order_count}件
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">プロフィール</p>
              <p className="mt-1 truncate font-black text-slate-800">
                メニュー {creator.creator_menu_count}件
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                画像 {creator.creator_portfolio_count}枚
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">承認状態</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {getApprovalLabel(approvalStatus)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">公開状態</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {creator.creator_is_public ? "公開中" : "非公開"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">Stripe Connect</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {creator.creator_stripe_onboarding_completed ? "完了" : "未完了"}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-xs font-black text-slate-400">User ID</p>
            <p className="mt-1 break-all font-mono text-xs font-black text-slate-800">
              {creator.user_id}
            </p>
          </div>

          {creator.suspend_reason ? (
            <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold leading-6 text-red-700 ring-1 ring-red-100">
              停止理由：{creator.suspend_reason}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
          <Link
            href={`/admin/users/${creator.user_id}`}
            className="rounded-full bg-[#ff5f67] px-4 py-2.5 text-center text-xs font-black text-white shadow-[0_12px_26px_rgba(255,95,103,0.22)]"
          >
            Admin詳細
          </Link>

          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(creator.user_id)}
            className="rounded-full bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-100"
          >
            IDコピー
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminCreatorsPage() {
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
        console.error("admin creators page error:", error);
        setError("クリエイター一覧の取得に失敗しました");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const creators = useMemo(() => {
    return users.filter(
      (user) => user.primary_role === "creator" || user.roles.includes("creator")
    );
  }, [users]);

  const counts = useMemo(() => {
    return {
      all: creators.length,
      approved: creators.filter(isApproved).length,
      pending: creators.filter(isPending).length,
      public: creators.filter((creator) => creator.creator_is_public).length,
      notPublic: creators.filter((creator) => !creator.creator_is_public).length,
      suspended: creators.filter(isSuspended).length,
      connectIncomplete: creators.filter(isConnectIncomplete).length,
      menuMissing: creators.filter(isMenuMissing).length,
      imageShort: creators.filter(isImageShort).length,
      delayed: creators.filter((creator) => creator.delayed_c_order_count > 0)
        .length,
    };
  }, [creators]);

  const filteredCreators = useMemo(() => {
    const normalizedQ = q.trim().toLowerCase();

    return creators.filter((creator) => {
      if (statusFilter === "approved" && !isApproved(creator)) return false;
      if (statusFilter === "pending" && !isPending(creator)) return false;
      if (statusFilter === "public" && !creator.creator_is_public) return false;
      if (statusFilter === "not_public" && creator.creator_is_public) {
        return false;
      }
      if (statusFilter === "suspended" && !isSuspended(creator)) return false;
      if (
        statusFilter === "connect_incomplete" &&
        !isConnectIncomplete(creator)
      ) {
        return false;
      }
      if (statusFilter === "menu_missing" && !isMenuMissing(creator)) {
        return false;
      }
      if (statusFilter === "image_short" && !isImageShort(creator)) {
        return false;
      }
      if (statusFilter === "delayed" && creator.delayed_c_order_count <= 0) {
        return false;
      }

      if (!normalizedQ) return true;

      return [
        creator.user_id,
        creator.email,
        creator.display_name,
        creator.creator_name,
        creator.creator_approval_status,
        creator.creator_is_public ? "public 公開" : "private 非公開",
        creator.creator_stripe_onboarding_completed
          ? "connect completed connect完了"
          : "connect incomplete connect未完了",
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQ));
    });
  }, [creators, statusFilter, q]);

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
              クリエイター管理
            </h1>

            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              Cの承認状態、公開状態、Connect、メニュー、画像、受注状況を確認できます。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/dashboard"
              className="w-fit rounded-full bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-100"
            >
              ダッシュボードへ
            </Link>

            <Link
              href="/admin/users"
              className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              ユーザー管理へ
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="mb-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
          {error}
        </section>
      ) : null}

      <section className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="すべて" value={counts.all} />
        <StatCard label="承認済" value={counts.approved} />
        <StatCard label="未承認" value={counts.pending} />
        <StatCard
          label="Connect未完了"
          value={counts.connectIncomplete}
          tone={counts.connectIncomplete > 0 ? "warning" : "default"}
        />
        <StatCard
          label="画像不足"
          value={counts.imageShort}
          tone={counts.imageShort > 0 ? "warning" : "default"}
        />
      </section>

      <section className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="公開中" value={counts.public} />
        <StatCard label="非公開" value={counts.notPublic} />
        <StatCard
          label="メニュー未作成"
          value={counts.menuMissing}
          tone={counts.menuMissing > 0 ? "warning" : "default"}
        />
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
              label="公開中"
              count={counts.public}
              active={statusFilter === "public"}
              onClick={() => setStatusFilter("public")}
            />

            <FilterButton
              label="非公開"
              count={counts.notPublic}
              active={statusFilter === "not_public"}
              onClick={() => setStatusFilter("not_public")}
            />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
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
                tone={counts.connectIncomplete > 0 ? "warning" : "default"}
              />

              <FilterButton
                label="メニュー未作成"
                count={counts.menuMissing}
                active={statusFilter === "menu_missing"}
                onClick={() => setStatusFilter("menu_missing")}
                tone={counts.menuMissing > 0 ? "warning" : "default"}
              />

              <FilterButton
                label="画像不足"
                count={counts.imageShort}
                active={statusFilter === "image_short"}
                onClick={() => setStatusFilter("image_short")}
                tone={counts.imageShort > 0 ? "warning" : "default"}
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
              placeholder="名前 / メール / ID / 状態で検索"
              className="min-h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-slate-400 xl:max-w-sm"
            />
          </div>
        </div>
      </section>

      {filteredCreators.length === 0 ? (
        <section className="rounded-[28px] bg-white p-8 text-center text-sm font-semibold text-slate-400 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
          該当するクリエイターはありません。
        </section>
      ) : (
        <section className="space-y-3">
          {filteredCreators.map((creator) => (
            <CreatorCard key={creator.user_id} creator={creator} />
          ))}
        </section>
      )}
    </main>
  );
}