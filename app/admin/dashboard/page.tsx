// File: app/admin/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type TabKey =
  | "checkout"
  | "waiting"
  | "active"
  | "review"
  | "completed"
  | "canceled"
  | "other";

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  accepted_at: string | null;
  captured_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  status: string;
  payment_status: string;
  product_name: string | null;
  menu_title_snapshot: string | null;
  b_user_id: string;
  creator_user_id: string;
  company_name: string | null;
  creator_name: string | null;
  creator_avatar_url: string | null;
  menu_price_amount: number | null;
  buyer_total_amount: number | null;
  stripe_amount: number | null;
  creator_payout_amount: number | null;
  currency: string | null;
  delivered_post_url: string | null;
  creator_accept_deadline: string | null;
  auto_complete_at: string | null;
  revision_requested_at: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
};

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

function getTime(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  return time;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value: number | null | undefined, currency?: string | null) {
  if (value == null) return "-";

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    return safeCurrency === "USD"
      ? `$${value.toLocaleString()}`
      : `¥${value.toLocaleString()}`;
  }
}

function mapOrderTab(status: string): TabKey {
  if (status === "checkout_pending") return "checkout";
  if (status === "authorized_pending_creator") return "waiting";

  if (
    status === "accepted_captured" ||
    status === "in_progress" ||
    status === "revision_requested"
  ) {
    return "active";
  }

  if (status === "delivered") return "review";
  if (status === "completed") return "completed";

  if (
    status === "declined_canceled" ||
    status === "expired_canceled" ||
    status === "capture_failed" ||
    status === "canceled" ||
    status === "cancelled"
  ) {
    return "canceled";
  }

  return "other";
}

function getStatusLabel(status: string) {
  if (status === "checkout_pending") return "Checkout未完了";
  if (status === "authorized_pending_creator") return "C返答待ち";
  if (status === "accepted_captured") return "進行中";
  if (status === "in_progress") return "進行中";
  if (status === "revision_requested") return "修正依頼中";
  if (status === "delivered") return "納品確認";
  if (status === "completed") return "完了";
  if (status === "declined_canceled") return "C辞退";
  if (status === "expired_canceled") return "期限切れ";
  if (status === "capture_failed") return "決済確定失敗";
  if (status === "canceled" || status === "cancelled") return "キャンセル";

  return status;
}

function isActiveOrder(order: OrderRow) {
  return mapOrderTab(order.status) === "active";
}

function getAcceptedDays(order: OrderRow) {
  const acceptedTime =
    getTime(order.accepted_at) ??
    getTime(order.captured_at) ??
    getTime(order.updated_at ?? order.created_at);

  if (acceptedTime == null) return null;

  const diff = Date.now() - acceptedTime;

  if (diff < 0) return 0;

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isAttentionOrder(order: OrderRow) {
  if (!isActiveOrder(order)) return false;
  if (order.delivered_post_url) return false;

  const acceptedDays = getAcceptedDays(order);

  return acceptedDays != null && acceptedDays >= 7;
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

function getDisplayName(order: OrderRow) {
  return (
    order.product_name?.trim() ||
    order.menu_title_snapshot?.trim() ||
    "注文名未設定"
  );
}

function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
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
  href,
  tone = "default",
  body,
}: {
  label: string;
  value: number | string;
  href: string;
  tone?: "default" | "danger" | "warning" | "success";
  body?: string;
}) {
  const ringClass =
    tone === "danger"
      ? "ring-red-100"
      : tone === "warning"
        ? "ring-amber-100"
        : tone === "success"
          ? "ring-emerald-100"
          : "ring-slate-100";

  const labelClass =
    tone === "danger"
      ? "text-red-500"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "success"
          ? "text-emerald-600"
          : "text-slate-400";

  return (
    <Link
      href={href}
      className={`block rounded-[24px] bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 transition hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(15,23,42,0.08)] ${ringClass}`}
    >
      <p className={`text-xs font-black ${labelClass}`}>{label}</p>

      <p className="mt-2 text-[30px] font-black tracking-[-0.06em] text-slate-950">
        {value}
      </p>

      {body ? (
        <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
          {body}
        </p>
      ) : null}
    </Link>
  );
}

function QuickLink({
  href,
  title,
  body,
  badge,
  tone = "default",
}: {
  href: string;
  title: string;
  body: string;
  badge?: string | number;
  tone?: "default" | "danger" | "warning" | "success" | "blue" | "rose";
}) {
  const badgeClass =
    tone === "danger"
      ? "bg-red-50 text-red-700 ring-red-100"
      : tone === "warning"
        ? "bg-amber-50 text-amber-800 ring-amber-100"
        : tone === "success"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : tone === "blue"
            ? "bg-blue-50 text-blue-700 ring-blue-100"
            : tone === "rose"
              ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
              : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <Link
      href={href}
      className="block rounded-[24px] bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-black tracking-[-0.04em] text-slate-950">
            {title}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {body}
          </p>
        </div>

        {typeof badge !== "undefined" ? (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ring-1 ${badgeClass}`}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function OrderMiniCard({ order }: { order: OrderRow }) {
  const acceptedDays = getAcceptedDays(order);

  return (
    <Link
      href={`/admin/orders/${order.id}`}
      className="block rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-white"
    >
      <div className="mb-2 flex flex-wrap gap-2">
        <Pill tone={isAttentionOrder(order) ? "red" : "slate"}>
          {getStatusLabel(order.status)}
        </Pill>

        {isAttentionOrder(order) && acceptedDays != null ? (
          <Pill tone="amber">C承認から{acceptedDays}日</Pill>
        ) : null}
      </div>

      <p className="truncate text-sm font-black text-slate-950">
        {getDisplayName(order)}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-slate-400">
        {order.company_name || "企業名未設定"} /{" "}
        {order.creator_name || "C名未設定"}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
        <span>{formatDateTime(order.created_at)}</span>
        <span>
          {formatPrice(
            order.buyer_total_amount ?? order.stripe_amount,
            order.currency
          )}
        </span>
      </div>
    </Link>
  );
}

function UserMiniCard({ user }: { user: AdminUserRow }) {
  const isCreator = user.roles.includes("creator");
  const isCompany = user.roles.includes("company");

  return (
    <Link
      href={`/admin/users/${user.user_id}`}
      className="block rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-white"
    >
      <div className="mb-2 flex flex-wrap gap-2">
        {isCompany ? <Pill tone="blue">企業</Pill> : null}
        {isCreator ? <Pill tone="rose">C</Pill> : null}

        {user.is_suspended ? (
          <Pill tone="red">停止中</Pill>
        ) : isPending(user) ? (
          <Pill tone="amber">未承認</Pill>
        ) : isConnectIncomplete(user) ? (
          <Pill tone="amber">Connect未完了</Pill>
        ) : null}
      </div>

      <p className="truncate text-sm font-black text-slate-950">
        {user.display_name}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-slate-400">
        {user.email ?? "メール未取得"}
      </p>

      <p className="mt-3 text-xs font-bold text-slate-400">
        最終ログイン：
        {user.last_sign_in_at
          ? formatDateTime(user.last_sign_in_at)
          : "未ログイン"}
      </p>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [ordersRes, usersRes] = await Promise.all([
        fetch("/api/admin/orders/list", {
          cache: "no-store",
        }),
        fetch("/api/admin/users/list", {
          cache: "no-store",
        }),
      ]);

      const [ordersJson, usersJson] = await Promise.all([
        ordersRes.json().catch(() => ({})),
        usersRes.json().catch(() => ({})),
      ]);

      if (!ordersRes.ok) {
        throw new Error(ordersJson?.error ?? "注文情報の取得に失敗しました");
      }

      if (!usersRes.ok) {
        throw new Error(usersJson?.error ?? "ユーザー情報の取得に失敗しました");
      }

      setOrders((ordersJson?.orders ?? []) as OrderRow[]);
      setUsers((usersJson?.users ?? []) as AdminUserRow[]);
    } catch (error) {
      console.error("admin dashboard load error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "管理データの取得に失敗しました"
      );
      setOrders([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const checkoutOrders = orders.filter(
      (order) => mapOrderTab(order.status) === "checkout"
    );
    const waitingOrders = orders.filter(
      (order) => mapOrderTab(order.status) === "waiting"
    );
    const activeOrders = orders.filter(
      (order) => mapOrderTab(order.status) === "active"
    );
    const reviewOrders = orders.filter(
      (order) => mapOrderTab(order.status) === "review"
    );
    const completedOrders = orders.filter(
      (order) => mapOrderTab(order.status) === "completed"
    );
    const attentionOrders = orders.filter(isAttentionOrder);

    const companies = users.filter((user) => user.roles.includes("company"));
    const creators = users.filter((user) => user.roles.includes("creator"));

    const pendingUsers = users.filter(isPending);
    const suspendedUsers = users.filter((user) => user.is_suspended);
    const connectIncompleteCreators = users.filter(isConnectIncomplete);
    const delayedCreators = users.filter(
      (user) => user.delayed_c_order_count > 0
    );

    const capturedOrders = orders.filter((order) =>
      [
        "accepted_captured",
        "in_progress",
        "revision_requested",
        "delivered",
        "completed",
      ].includes(order.status)
    );

    const buyerTotal = capturedOrders.reduce((total, order) => {
      return total + (order.buyer_total_amount ?? order.stripe_amount ?? 0);
    }, 0);

    const creatorPayoutTotal = capturedOrders.reduce((total, order) => {
      return total + (order.creator_payout_amount ?? 0);
    }, 0);

    return {
      checkoutOrders,
      waitingOrders,
      activeOrders,
      reviewOrders,
      completedOrders,
      attentionOrders,
      companies,
      creators,
      pendingUsers,
      suspendedUsers,
      connectIncompleteCreators,
      delayedCreators,
      buyerTotal,
      creatorPayoutTotal,
    };
  }, [orders, users]);

  const urgentOrders = useMemo(() => {
    return [
      ...stats.attentionOrders,
      ...stats.reviewOrders,
      ...stats.waitingOrders,
    ]
      .filter(Boolean)
      .slice(0, 6);
  }, [stats.attentionOrders, stats.reviewOrders, stats.waitingOrders]);

  const urgentUsers = useMemo(() => {
    return [
      ...stats.suspendedUsers,
      ...stats.pendingUsers,
      ...stats.connectIncompleteCreators,
      ...stats.delayedCreators,
    ]
      .filter((user, index, array) => {
        return array.findIndex((item) => item.user_id === user.user_id) === index;
      })
      .slice(0, 6);
  }, [
    stats.suspendedUsers,
    stats.pendingUsers,
    stats.connectIncompleteCreators,
    stats.delayedCreators,
  ]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="h-40 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <section className="mb-5 rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5f67]">
              Admin
            </p>

            <h1 className="mt-2 text-[32px] font-black tracking-[-0.06em] text-slate-950">
              管理者ダッシュボード
            </h1>

            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              注文・ユーザー・支払・要確認項目をここから確認できます。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-100"
            >
              再読み込み
            </button>

            <Link
              href="/admin/payouts"
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(5,150,105,0.22)]"
            >
              支払管理へ
            </Link>

            <Link
              href="/admin/orders"
              className="rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(255,95,103,0.22)]"
            >
              注文管理へ
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="mb-5 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
          {error}
        </section>
      ) : null}

      <section className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="要確認"
          value={stats.attentionOrders.length}
          href="/admin/orders"
          tone={stats.attentionOrders.length > 0 ? "danger" : "default"}
          body="C承認後7日以上・納品URL未提出"
        />

        <StatCard
          label="C返答待ち"
          value={stats.waitingOrders.length}
          href="/admin/orders"
          tone={stats.waitingOrders.length > 0 ? "warning" : "default"}
          body="Cが受ける/辞退する前"
        />

        <StatCard
          label="進行中"
          value={stats.activeOrders.length}
          href="/admin/orders"
          body="受注後の案件"
        />

        <StatCard
          label="納品確認"
          value={stats.reviewOrders.length}
          href="/admin/orders"
          tone={stats.reviewOrders.length > 0 ? "warning" : "default"}
          body="B側の確認待ち"
        />

        <StatCard
          label="停止中"
          value={stats.suspendedUsers.length}
          href="/admin/users"
          tone={stats.suspendedUsers.length > 0 ? "danger" : "default"}
          body="停止中ユーザー"
        />

        <StatCard
          label="受取設定注意"
          value={stats.connectIncompleteCreators.length}
          href="/admin/users"
          tone={stats.connectIncompleteCreators.length > 0 ? "warning" : "default"}
          body="Cの受取設定確認"
        />
      </section>

      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="総注文"
          value={orders.length}
          href="/admin/orders"
          body="orders全体"
        />

        <StatCard
          label="Checkout未完了"
          value={stats.checkoutOrders.length}
          href="/admin/orders"
          tone={stats.checkoutOrders.length > 0 ? "warning" : "default"}
          body="未同期/未決済の注文"
        />

        <StatCard
          label="B支払合計"
          value={formatPrice(stats.buyerTotal, "JPY")}
          href="/admin/orders"
          tone="success"
          body="成立済み注文ベース"
        />

        <StatCard
          label="C支払管理"
          value={formatPrice(stats.creatorPayoutTotal, "JPY")}
          href="/admin/payouts"
          tone="success"
          body="CSV出力・支払済み更新へ"
        />
      </section>

      <section className="mb-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-black tracking-[-0.05em] text-slate-950">
                今見るべき注文
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                要確認・納品確認・C返答待ちを優先表示します。
              </p>
            </div>

            <Link
              href="/admin/orders"
              className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-100"
            >
              すべて見る
            </Link>
          </div>

          {urgentOrders.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
              現在、優先確認が必要な注文はありません。
            </div>
          ) : (
            <div className="grid gap-3">
              {urgentOrders.map((order) => (
                <OrderMiniCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-black tracking-[-0.05em] text-slate-950">
                ユーザー確認
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                未承認・停止中・受取設定注意を表示します。
              </p>
            </div>

            <Link
              href="/admin/users"
              className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-100"
            >
              すべて見る
            </Link>
          </div>

          {urgentUsers.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
              現在、優先確認が必要なユーザーはありません。
            </div>
          ) : (
            <div className="grid gap-3">
              {urgentUsers.map((user) => (
                <UserMiniCard key={user.user_id} user={user} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QuickLink
          href="/admin/orders"
          title="注文管理"
          body="注文・決済・C返答待ち・進行中・納品確認・要確認案件を確認します。"
          badge={orders.length}
        />

        <QuickLink
          href="/admin/payouts"
          title="支払管理"
          body="C報酬の支払待ち確認、CSV出力、支払済み更新を行います。"
          badge="CSV"
          tone="success"
        />

        <QuickLink
          href="/admin/users"
          title="ユーザー管理"
          body="B/C/Admin、メール、最終ログイン、停止状態、注文数を確認します。"
          badge={users.length}
        />

        <QuickLink
          href="/admin/companies"
          title="企業管理"
          body="B企業の登録状態、プラン、注文状況、最終ログインを確認します。"
          badge={stats.companies.length}
          tone="blue"
        />

        <QuickLink
          href="/admin/creators"
          title="クリエイター管理"
          body="Cのプロフィール、SNS、公開状態、承認状態を確認します。"
          badge={stats.creators.length}
          tone="rose"
        />

        <QuickLink
          href="/admin/inquiries"
          title="問い合わせ"
          body="ユーザーからの問い合わせや連絡を確認します。"
        />

        <QuickLink
          href="/admin/requests"
          title="旧リクエスト管理"
          body="旧requestsテーブル確認用です。現在の本線は注文管理です。"
        />
      </section>
    </main>
  );
}