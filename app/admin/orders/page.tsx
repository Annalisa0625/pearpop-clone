// File: app/admin/orders/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TabKey =
  | "all"
  | "waiting"
  | "active"
  | "review"
  | "completed"
  | "canceled";

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
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

function mapStatusToTab(status: string): TabKey {
  if (status === "authorized_pending_creator" || status === "checkout_pending") {
    return "waiting";
  }

  if (
    status === "accepted_captured" ||
    status === "in_progress" ||
    status === "revision_requested"
  ) {
    return "active";
  }

  if (status === "delivered") {
    return "review";
  }

  if (
    status === "declined_canceled" ||
    status === "expired_canceled" ||
    status === "canceled" ||
    status === "cancelled"
  ) {
    return "canceled";
  }

  return "completed";
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

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  return `${value.slice(0, 8)}...`;
}

function getStatusLabel(status: string, paymentStatus: string) {
  if (status === "checkout_pending") return "Checkout未完了";
  if (status === "authorized_pending_creator") return "C返答待ち";
  if (status === "accepted_captured") return "進行中";
  if (status === "in_progress") return "進行中";
  if (status === "revision_requested") return "修正依頼中";
  if (status === "delivered") return "納品確認待ち";
  if (status === "completed") return "完了";
  if (status === "declined_canceled") return "C辞退";
  if (status === "expired_canceled") return "期限切れ";
  if (status === "canceled" || status === "cancelled") return "キャンセル";

  return `${status} / ${paymentStatus}`;
}

function getStatusClass(tab: TabKey) {
  if (tab === "waiting") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (tab === "active") return "bg-slate-950 text-white ring-slate-950";
  if (tab === "review") return "bg-rose-50 text-[#ff5f67] ring-rose-100";
  if (tab === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (tab === "canceled") return "bg-slate-100 text-slate-500 ring-slate-200";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
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
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-[28px] font-black tracking-[-0.06em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
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
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function OrderCard({ order }: { order: OrderRow }) {
  const tab = mapStatusToTab(order.status);
  const title =
    order.product_name?.trim() ||
    order.menu_title_snapshot?.trim() ||
    "注文名未設定";

  return (
    <article className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Pill className={getStatusClass(tab)}>
              {getStatusLabel(order.status, order.payment_status)}
            </Pill>

            <Pill className="bg-slate-50 text-slate-500 ring-slate-100">
              {order.payment_status}
            </Pill>

            {order.delivered_post_url ? (
              <Pill className="bg-rose-50 text-[#ff5f67] ring-rose-100">
                納品URLあり
              </Pill>
            ) : null}
          </div>

          <h2 className="mt-3 truncate text-[20px] font-black tracking-[-0.045em] text-slate-950">
            {title}
          </h2>

          {order.menu_title_snapshot ? (
            <p className="mt-1 truncate text-sm font-semibold text-slate-400">
              メニュー：{order.menu_title_snapshot}
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">企業</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {order.company_name || shortId(order.b_user_id)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">クリエイター</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {order.creator_name || shortId(order.creator_user_id)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">B支払額</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {formatPrice(
                  order.buyer_total_amount ?? order.stripe_amount,
                  order.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">C受取予定</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {formatPrice(order.creator_payout_amount, order.currency)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">作成</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {formatDateTime(order.created_at)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">更新</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {formatDateTime(order.updated_at ?? order.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
          <Link
            href={`/b/orders/${order.id}`}
            className="rounded-full bg-slate-950 px-4 py-2.5 text-center text-xs font-black text-white"
          >
            B詳細
          </Link>

          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(order.id)}
            className="rounded-full bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-100"
          >
            IDコピー
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/admin/orders/list", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error ?? "failed to load orders");
        }

        setOrders((json?.orders ?? []) as OrderRow[]);
      } catch (error) {
        console.error("admin orders page error:", error);
        setError("注文一覧の取得に失敗しました");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      waiting: orders.filter((order) => mapStatusToTab(order.status) === "waiting")
        .length,
      active: orders.filter((order) => mapStatusToTab(order.status) === "active")
        .length,
      review: orders.filter((order) => mapStatusToTab(order.status) === "review")
        .length,
      completed: orders.filter(
        (order) => mapStatusToTab(order.status) === "completed"
      ).length,
      canceled: orders.filter(
        (order) => mapStatusToTab(order.status) === "canceled"
      ).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedQ = q.trim().toLowerCase();

    return orders.filter((order) => {
      const orderTab = mapStatusToTab(order.status);

      if (tab !== "all" && orderTab !== tab) return false;

      if (!normalizedQ) return true;

      return [
        order.id,
        order.product_name,
        order.menu_title_snapshot,
        order.company_name,
        order.creator_name,
        order.b_user_id,
        order.creator_user_id,
        order.status,
        order.payment_status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQ));
    });
  }, [orders, q, tab]);

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
              注文管理
            </h1>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              ordersテーブルの注文・決済・進行状態を確認できます。
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
        <StatCard label="C返答待ち" value={counts.waiting} />
        <StatCard label="進行中" value={counts.active} />
        <StatCard label="納品確認" value={counts.review} />
        <StatCard label="完了" value={counts.completed} />
        <StatCard label="キャンセル" value={counts.canceled} />
      </section>

      <section className="mb-5 rounded-[28px] bg-white p-4 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton
              label="すべて"
              count={counts.all}
              active={tab === "all"}
              onClick={() => setTab("all")}
            />
            <TabButton
              label="C返答待ち"
              count={counts.waiting}
              active={tab === "waiting"}
              onClick={() => setTab("waiting")}
            />
            <TabButton
              label="進行中"
              count={counts.active}
              active={tab === "active"}
              onClick={() => setTab("active")}
            />
            <TabButton
              label="納品確認"
              count={counts.review}
              active={tab === "review"}
              onClick={() => setTab("review")}
            />
            <TabButton
              label="完了"
              count={counts.completed}
              active={tab === "completed"}
              onClick={() => setTab("completed")}
            />
            <TabButton
              label="キャンセル"
              count={counts.canceled}
              active={tab === "canceled"}
              onClick={() => setTab("canceled")}
            />
          </div>

          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="注文名 / 企業 / C / IDで検索"
            className="min-h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-slate-400 xl:max-w-sm"
          />
        </div>
      </section>

      {filteredOrders.length === 0 ? (
        <section className="rounded-[28px] bg-white p-8 text-center text-sm font-semibold text-slate-400 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
          該当する注文はありません。
        </section>
      ) : (
        <section className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </section>
      )}
    </main>
  );
}