// File: app/admin/payouts/page.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

type PayoutMethod = "manual_bank_transfer" | "stripe_connect";

type PayoutStatus = "unpaid" | "pending" | "paid" | "withheld" | "failed";

type TabKey = "pending" | "paid" | "withheld" | "failed" | "all";

type PayoutSummary = {
  total_count: number;
  pending_count: number;
  paid_count: number;
  withheld_count: number;
  failed_count: number;
  pending_amount: number;
  paid_amount: number;
  withheld_amount: number;
  failed_amount: number;
};

type CreatorSummary = {
  creator_id: string | null;
  creator_user_id: string;
  creator_name: string;
  payout_method: PayoutMethod;
  payout_status: PayoutStatus;
  total_amount: number;
  order_count: number;
  bank_name: string | null;
  branch_name: string | null;
  account_type: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  account_holder_kana: string | null;
  has_bank_account: boolean;
};

type PayoutItem = {
  id: string;
  order_id: string;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  product_name: string | null;
  menu_title_snapshot: string | null;
  company_user_id: string;
  company_name: string;
  creator_id: string | null;
  creator_user_id: string;
  creator_name: string;
  status: string;
  payment_status: string;
  payout_method: PayoutMethod;
  payout_status: PayoutStatus;
  payout_due_at: string | null;
  payout_paid_at: string | null;
  payout_batch_id: string | null;
  payout_note: string | null;
  creator_payout_amount: number;
  currency: string;
  payout_profile_status: string | null;
  bank_name: string | null;
  bank_code: string | null;
  branch_name: string | null;
  branch_code: string | null;
  account_type: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  account_holder_kana: string | null;
  bank_submitted_at: string | null;
  bank_verified_at: string | null;
  has_bank_account: boolean;
};

type PayoutListResponse = {
  ok: boolean;
  summary: PayoutSummary;
  creator_summary: CreatorSummary[];
  items: PayoutItem[];
};

const EMPTY_SUMMARY: PayoutSummary = {
  total_count: 0,
  pending_count: 0,
  paid_count: 0,
  withheld_count: 0,
  failed_count: 0,
  pending_amount: 0,
  paid_amount: 0,
  withheld_amount: 0,
  failed_amount: 0,
};

function formatPrice(value: number | null | undefined, currency?: string | null) {
  const amount = Number(value ?? 0);
  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return safeCurrency === "USD"
      ? `$${amount.toLocaleString()}`
      : `¥${amount.toLocaleString()}`;
  }
}

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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  return `${value.slice(0, 8)}...`;
}

function getPayoutStatusLabel(status: PayoutStatus) {
  if (status === "pending") return "支払待ち";
  if (status === "paid") return "支払済み";
  if (status === "withheld") return "保留";
  if (status === "failed") return "失敗";
  return "未処理";
}

function getPayoutMethodLabel(method: PayoutMethod) {
  if (method === "stripe_connect") return "Stripe Connect";
  return "銀行振込";
}

function getAccountTypeLabel(value: string | null | undefined) {
  if (value === "checking") return "当座";
  if (value === "ordinary") return "普通";
  return value || "-";
}

function getStatusClass(status: PayoutStatus) {
  if (status === "pending") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (status === "paid") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "withheld") return "bg-slate-100 text-slate-600 ring-slate-200";
  if (status === "failed") return "bg-red-50 text-red-700 ring-red-100";
  return "bg-slate-50 text-slate-500 ring-slate-100";
}

function isSelectableForPaid(item: PayoutItem) {
  return (
    item.payout_status === "pending" &&
    item.payout_method === "manual_bank_transfer" &&
    item.has_bank_account
  );
}

function Pill({
  children,
  className,
}: {
  children: ReactNode;
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
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "danger" | "success" | "warning";
}) {
  const ringClass =
    tone === "danger"
      ? "ring-red-100"
      : tone === "success"
        ? "ring-emerald-100"
        : tone === "warning"
          ? "ring-amber-100"
          : "ring-slate-100";

  const labelClass =
    tone === "danger"
      ? "text-red-500"
      : tone === "success"
        ? "text-emerald-600"
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
      {sub ? <p className="mt-1 text-xs font-bold text-slate-400">{sub}</p> : null}
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
  tone = "default",
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: "default" | "danger" | "success" | "warning";
}) {
  const inactiveClass =
    tone === "danger"
      ? "bg-white text-red-600 ring-1 ring-red-100 hover:bg-red-50"
      : tone === "success"
        ? "bg-white text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50"
        : tone === "warning"
          ? "bg-white text-amber-700 ring-1 ring-amber-100 hover:bg-amber-50"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50";

  const activeClass =
    tone === "danger"
      ? "bg-red-600 text-white shadow-[0_14px_30px_rgba(220,38,38,0.18)]"
      : tone === "success"
        ? "bg-emerald-600 text-white shadow-[0_14px_30px_rgba(5,150,105,0.18)]"
        : tone === "warning"
          ? "bg-amber-500 text-white shadow-[0_14px_30px_rgba(245,158,11,0.18)]"
          : "bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
        active ? activeClass : inactiveClass
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

function CreatorSummaryCard({ creator }: { creator: CreatorSummary }) {
  return (
    <article className="rounded-[24px] bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-[-0.04em] text-slate-950">
            {creator.creator_name}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            {creator.order_count}件 / {getPayoutMethodLabel(creator.payout_method)}
          </p>
        </div>
        <p className="shrink-0 text-lg font-black tracking-[-0.05em] text-slate-950">
          {formatPrice(creator.total_amount, "JPY")}
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
        <p className="text-xs font-black text-slate-400">振込先</p>
        {creator.has_bank_account ? (
          <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
            {creator.bank_name || "-"} / {creator.branch_name || "-"} /{" "}
            {getAccountTypeLabel(creator.account_type)} /{" "}
            {creator.account_number || "-"}
          </p>
        ) : (
          <p className="mt-1 text-sm font-bold text-red-600">
            銀行口座情報が不足しています
          </p>
        )}
      </div>
    </article>
  );
}

function PayoutCard({
  item,
  selected,
  onToggle,
}: {
  item: PayoutItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const title =
    item.product_name?.trim() ||
    item.menu_title_snapshot?.trim() ||
    "注文名未設定";

  const selectable = isSelectableForPaid(item);

  return (
    <article className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill className={getStatusClass(item.payout_status)}>
              {getPayoutStatusLabel(item.payout_status)}
            </Pill>

            <Pill className="bg-slate-50 text-slate-500 ring-slate-100">
              {getPayoutMethodLabel(item.payout_method)}
            </Pill>

            {item.has_bank_account ? (
              <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-100">
                口座あり
              </Pill>
            ) : (
              <Pill className="bg-red-50 text-red-700 ring-red-100">
                口座不足
              </Pill>
            )}

            {item.payout_due_at ? (
              <Pill className="bg-amber-50 text-amber-700 ring-amber-100">
                支払予定 {formatDate(item.payout_due_at)}
              </Pill>
            ) : null}
          </div>

          <h2 className="mt-3 truncate text-[20px] font-black tracking-[-0.045em] text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-400">
            注文ID：{shortId(item.order_id)}
          </p>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">C受取額</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {formatPrice(item.creator_payout_amount, item.currency)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">企業</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {item.company_name}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">インフルエンサー</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {item.creator_name}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">完了日</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {formatDateTime(item.completed_at)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">支払済み日</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {formatDateTime(item.payout_paid_at)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">銀行</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {item.bank_name || "-"} / {item.branch_name || "-"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">口座</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {getAccountTypeLabel(item.account_type)} /{" "}
                {item.account_number || "-"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 sm:col-span-2">
              <p className="text-xs font-black text-slate-400">名義</p>
              <p className="mt-1 truncate font-black text-slate-800">
                {item.account_holder_name || "-"} /{" "}
                {item.account_holder_kana || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
          {selectable ? (
            <label
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-black ring-1 transition ${
                selected
                  ? "bg-emerald-600 text-white ring-emerald-600"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggle}
                className="h-4 w-4"
              />
              支払対象
            </label>
          ) : null}

          <Link
            href={`/admin/orders/${item.order_id}`}
            className="rounded-full bg-[#ff5f67] px-4 py-2.5 text-center text-xs font-black text-white shadow-[0_12px_26px_rgba(255,95,103,0.22)]"
          >
            注文詳細
          </Link>

          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(item.order_id)}
            className="rounded-full bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-100"
          >
            IDコピー
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminPayoutsPage() {
  const [summary, setSummary] = useState<PayoutSummary>(EMPTY_SUMMARY);
  const [creatorSummary, setCreatorSummary] = useState<CreatorSummary[]>([]);
  const [items, setItems] = useState<PayoutItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<TabKey>("pending");
  const [q, setQ] = useState("");
  const [note, setNote] = useState("Admin manual payout marked as paid");
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/payouts/list", {
        cache: "no-store",
      });

      const json = (await res.json().catch(() => ({}))) as Partial<PayoutListResponse> & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json?.error ?? "failed to load payouts");
      }

      setSummary(json.summary ?? EMPTY_SUMMARY);
      setCreatorSummary(json.creator_summary ?? []);
      setItems(json.items ?? []);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("admin payouts page load error:", error);
      setError("支払管理一覧の取得に失敗しました");
      setSummary(EMPTY_SUMMARY);
      setCreatorSummary([]);
      setItems([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    return {
      all: items.length,
      pending: items.filter((item) => item.payout_status === "pending").length,
      paid: items.filter((item) => item.payout_status === "paid").length,
      withheld: items.filter((item) => item.payout_status === "withheld").length,
      failed: items.filter((item) => item.payout_status === "failed").length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQ = q.trim().toLowerCase();

    return items.filter((item) => {
      if (tab !== "all" && item.payout_status !== tab) {
        return false;
      }

      if (!normalizedQ) return true;

      return [
        item.order_id,
        item.product_name,
        item.menu_title_snapshot,
        item.company_name,
        item.creator_name,
        item.creator_user_id,
        item.bank_name,
        item.branch_name,
        item.account_holder_name,
        item.account_holder_kana,
        item.payout_status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQ));
    });
  }, [items, q, tab]);

  const selectableIds = useMemo(() => {
    return filteredItems
      .filter((item) => isSelectableForPaid(item))
      .map((item) => item.order_id);
  }, [filteredItems]);

  const selectedTotalAmount = useMemo(() => {
    return items
      .filter((item) => selectedIds.has(item.order_id))
      .reduce((sum, item) => sum + item.creator_payout_amount, 0);
  }, [items, selectedIds]);

  const allSelectableSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));

  const toggleSelected = (orderId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }

      return next;
    });
  };

  const toggleAllSelectable = () => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allSelectableSelected) {
        for (const id of selectableIds) {
          next.delete(id);
        }
      } else {
        for (const id of selectableIds) {
          next.add(id);
        }
      }

      return next;
    });
  };

  const downloadCsv = () => {
    window.location.href = "/api/admin/payouts/export";
  };

  const markSelectedPaid = async () => {
    const orderIds = Array.from(selectedIds);

    if (orderIds.length === 0) {
      alert("支払済みにする注文を選択してください");
      return;
    }

    const ok = confirm(
      `${orderIds.length}件、合計 ${formatPrice(
        selectedTotalAmount,
        "JPY"
      )} を支払済みに更新します。よろしいですか？`
    );

    if (!ok) return;

    setMarkingPaid(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/payouts/mark-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          order_ids: orderIds,
          note,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? "支払済み更新に失敗しました");
      }

      alert("支払済みに更新しました");
      await load();
    } catch (error) {
      console.error("admin mark paid page error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "支払済み更新に失敗しました"
      );
    } finally {
      setMarkingPaid(false);
    }
  };

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
              支払管理
            </h1>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              B完了承認後に pending になったC報酬を確認し、CSV出力・支払済み更新を行います。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/orders"
              className="rounded-full bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 ring-1 ring-slate-100"
            >
              注文管理へ
            </Link>

            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full bg-white px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200"
            >
              再読み込み
            </button>

            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
            >
              CSV出力
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-5 rounded-[24px] bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      ) : null}

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="支払待ち"
          value={formatPrice(summary.pending_amount, "JPY")}
          sub={`${summary.pending_count}件`}
          tone="warning"
        />
        <StatCard
          label="支払済み"
          value={formatPrice(summary.paid_amount, "JPY")}
          sub={`${summary.paid_count}件`}
          tone="success"
        />
        <StatCard
          label="保留"
          value={formatPrice(summary.withheld_amount, "JPY")}
          sub={`${summary.withheld_count}件`}
        />
        <StatCard
          label="失敗"
          value={formatPrice(summary.failed_amount, "JPY")}
          sub={`${summary.failed_count}件`}
          tone="danger"
        />
      </section>

      {creatorSummary.length > 0 ? (
        <section className="mb-5 rounded-[30px] bg-white/60 p-4 ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-[-0.04em] text-slate-950">
                支払待ちクリエイター別集計
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-400">
                CSVはこの集計に近い形で、クリエイターごとに合算されます。
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {creatorSummary.slice(0, 6).map((creator) => (
              <CreatorSummaryCard
                key={creator.creator_id || creator.creator_user_id}
                creator={creator}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-5 rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton
              label="支払待ち"
              count={counts.pending}
              active={tab === "pending"}
              onClick={() => setTab("pending")}
              tone="warning"
            />
            <TabButton
              label="支払済み"
              count={counts.paid}
              active={tab === "paid"}
              onClick={() => setTab("paid")}
              tone="success"
            />
            <TabButton
              label="保留"
              count={counts.withheld}
              active={tab === "withheld"}
              onClick={() => setTab("withheld")}
            />
            <TabButton
              label="失敗"
              count={counts.failed}
              active={tab === "failed"}
              onClick={() => setTab("failed")}
              tone="danger"
            />
            <TabButton
              label="すべて"
              count={counts.all}
              active={tab === "all"}
              onClick={() => setTab("all")}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="注文ID / C名 / 企業名 / 銀行名で検索"
              className="w-full rounded-full bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none ring-1 ring-slate-100 placeholder:text-slate-400 sm:w-[320px]"
            />
          </div>
        </div>
      </section>

      <section className="sticky top-3 z-10 mb-5 rounded-[28px] bg-white/95 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">
              選択中：{selectedIds.size}件 /{" "}
              {formatPrice(selectedTotalAmount, "JPY")}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              支払待ち・銀行振込・口座情報ありの注文だけ支払済みに更新できます。
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="支払メモ"
              className="w-full rounded-full bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none ring-1 ring-slate-100 sm:w-[360px]"
            />

            <button
              type="button"
              onClick={toggleAllSelectable}
              disabled={selectableIds.length === 0}
              className="rounded-full bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {allSelectableSelected ? "選択解除" : "表示分を選択"}
            </button>

            <button
              type="button"
              onClick={markSelectedPaid}
              disabled={markingPaid || selectedIds.size === 0}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(5,150,105,0.18)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {markingPaid ? "更新中..." : "支払済みにする"}
            </button>
          </div>
        </div>
      </section>

      {filteredItems.length > 0 ? (
        <section className="space-y-4">
          {filteredItems.map((item) => (
            <PayoutCard
              key={item.order_id}
              item={item}
              selected={selectedIds.has(item.order_id)}
              onToggle={() => toggleSelected(item.order_id)}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-[30px] bg-white p-10 text-center shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
          <p className="text-lg font-black text-slate-950">
            対象の支払データはありません
          </p>
          <p className="mt-2 text-sm font-bold text-slate-400">
            Bが注文を完了承認すると、支払待ちデータがここに表示されます。
          </p>
        </section>
      )}
    </main>
  );
}