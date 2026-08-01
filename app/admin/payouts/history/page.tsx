// File: app/admin/payouts/history/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type BatchStatus = "draft" | "ready" | "exported" | "paid" | "failed";
type BatchStatusFilter = "all" | BatchStatus;

type BatchHistorySummary = {
  total_count: number;
  draft_count: number;
  ready_count: number;
  exported_count: number;
  paid_count: number;
  failed_count: number;
  total_orders: number;
  total_creators: number;
  total_payout_amount: number;
  total_transfer_fee: number;
  total_net_amount: number;
  paid_net_amount: number;
};

type BatchHistoryBank = {
  bank_name: string | null;
  bank_code: string | null;
  branch_name: string | null;
  branch_code: string | null;
  account_type: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  account_holder_kana: string | null;
  payout_profile_status: string | null;
};

type BatchHistoryItem = {
  id: string;
  creator_id: string;
  creator_user_id: string;
  creator_name: string;
  payout_profile_id: string | null;
  payout_method: string;
  status: string;
  gross_amount: number;
  adjustment_amount: number;
  withholding_amount: number;
  transfer_fee: number;
  net_amount: number;
  currency: string;
  order_count: number;
  order_ids: string[];
  linked_order_amount: number;
  bank: BatchHistoryBank;
  external_reference: string | null;
  failure_reason: string | null;
  exported_at: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type BatchConsistency = {
  creators_match: boolean;
  orders_match: boolean;
  payout_amount_match: boolean;
  transfer_fee_match: boolean;
  withholding_amount_match: boolean;
  adjustment_amount_match: boolean;
  net_amount_match: boolean;
};

type BatchCalculated = {
  total_items: number;
  total_orders: number;
  total_payout_amount: number;
  total_transfer_fee: number;
  total_withholding_amount: number;
  total_adjustment_amount: number;
  total_net_amount: number;
};

type BatchHistory = {
  id: string;
  batch_code: string | null;
  payout_method: string;
  status: BatchStatus;
  raw_status: string;
  period_start: string;
  period_end: string;
  scheduled_date: string | null;
  total_orders: number;
  total_creators: number;
  total_payout_amount: number;
  total_transfer_fee: number;
  total_withholding_amount: number;
  total_adjustment_amount: number;
  total_net_amount: number;
  currency: string;
  csv_file_name: string | null;
  exported_at: string | null;
  locked_at: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  failed_items: number;
  external_reference: string | null;
  created_by_user_id: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  calculated: BatchCalculated;
  consistency: BatchConsistency;
  items: BatchHistoryItem[];
};

type BatchHistoryResponse = {
  ok?: boolean;
  error?: string;
  detail?: string;
  summary?: BatchHistorySummary;
  batches?: BatchHistory[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
};

const EMPTY_SUMMARY: BatchHistorySummary = {
  total_count: 0,
  draft_count: 0,
  ready_count: 0,
  exported_count: 0,
  paid_count: 0,
  failed_count: 0,
  total_orders: 0,
  total_creators: 0,
  total_payout_amount: 0,
  total_transfer_fee: 0,
  total_net_amount: 0,
  paid_net_amount: 0,
};

const PAGE_SIZE = 30;

function formatPrice(
  value: number | null | undefined,
  currency: string | null | undefined = "JPY",
) {
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  return `${value.slice(0, 8)}...`;
}

function getStatusLabel(status: BatchStatus) {
  if (status === "draft") return "作成済み";
  if (status === "ready") return "準備完了";
  if (status === "exported") return "CSV出力済み";
  if (status === "paid") return "支払済み";
  return "失敗";
}

function getStatusClass(status: BatchStatus) {
  if (status === "draft") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (status === "ready") {
    return "bg-indigo-50 text-indigo-700 ring-indigo-100";
  }

  if (status === "exported") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === "paid") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  return "bg-red-50 text-red-700 ring-red-100";
}

function getAccountTypeLabel(value: string | null | undefined) {
  if (value === "ordinary") return "普通";
  if (value === "checking") return "当座";
  return value || "-";
}

function isConsistent(consistency: BatchConsistency) {
  return Object.values(consistency).every(Boolean);
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
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const ringClass =
    tone === "success"
      ? "ring-emerald-100"
      : tone === "warning"
        ? "ring-amber-100"
        : tone === "danger"
          ? "ring-red-100"
          : "ring-slate-100";

  const labelClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-red-500"
          : "text-slate-400";

  return (
    <div
      className={`rounded-[24px] bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ${ringClass}`}
    >
      <p className={`text-xs font-black ${labelClass}`}>{label}</p>
      <p className="mt-2 text-[26px] font-black tracking-[-0.06em] text-slate-950">
        {value}
      </p>
      {sub ? (
        <p className="mt-1 text-xs font-bold text-slate-400">{sub}</p>
      ) : null}
    </div>
  );
}

function FilterButton({
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
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const activeClass =
    tone === "success"
      ? "bg-emerald-600 text-white shadow-[0_12px_28px_rgba(5,150,105,0.18)]"
      : tone === "warning"
        ? "bg-amber-500 text-white shadow-[0_12px_28px_rgba(245,158,11,0.18)]"
        : tone === "danger"
          ? "bg-red-600 text-white shadow-[0_12px_28px_rgba(220,38,38,0.18)]"
          : "bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]";

  const inactiveClass =
    tone === "success"
      ? "bg-white text-emerald-700 ring-1 ring-emerald-100"
      : tone === "warning"
        ? "bg-white text-amber-700 ring-1 ring-amber-100"
        : tone === "danger"
          ? "bg-white text-red-600 ring-1 ring-red-100"
          : "bg-white text-slate-600 ring-1 ring-slate-200";

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

function DetailCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <div className="mt-1 break-words text-sm font-black text-slate-800">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 break-words text-xs font-bold text-slate-400">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPayoutBatchHistoryPage() {
  const [summary, setSummary] =
    useState<BatchHistorySummary>(EMPTY_SUMMARY);
  const [batches, setBatches] = useState<BatchHistory[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<BatchStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    limit: PAGE_SIZE,
    offset: 0,
    total: 0,
    has_more: false,
  });

  const loadHistory = async ({
    append = false,
    offset = 0,
  }: {
    append?: boolean;
    offset?: number;
  } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);
    setErrorDetail(null);

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(
        `/api/admin/payouts/batches/history?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const json = (await res
        .json()
        .catch(() => ({}))) as BatchHistoryResponse;

      if (!res.ok) {
        setError(json.error || "振込バッチ履歴の取得に失敗しました");
        setErrorDetail(json.detail || null);
        return;
      }

      setSummary(json.summary || EMPTY_SUMMARY);
      setBatches((current) =>
        append
          ? [...current, ...(json.batches || [])]
          : json.batches || [],
      );
      setPagination(
        json.pagination || {
          limit: PAGE_SIZE,
          offset,
          total: json.batches?.length || 0,
          has_more: false,
        },
      );
    } catch (loadError) {
      console.error("admin payout batch history page load error:", loadError);
      setError("振込バッチ履歴の取得に失敗しました");
      setErrorDetail(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setExpandedBatchIds(new Set());
    void loadHistory({ append: false, offset: 0 });
    // statusFilterが変わったときに一覧を取り直します。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredBatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return batches;
    }

    return batches.filter((batch) => {
      const creatorNames = batch.items
        .map((item) => item.creator_name)
        .join(" ");

      return [
        batch.id,
        batch.batch_code,
        batch.status,
        batch.raw_status,
        batch.csv_file_name,
        batch.external_reference,
        batch.admin_note,
        batch.period_start,
        batch.period_end,
        batch.scheduled_date,
        creatorNames,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedQuery),
        );
    });
  }, [batches, query]);

  const toggleExpanded = (batchId: string) => {
    setExpandedBatchIds((current) => {
      const next = new Set(current);

      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }

      return next;
    });
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
    } catch (copyError) {
      console.error("copy failed:", copyError);
    }
  };

  const downloadCsv = async (batch: BatchHistory) => {
    if (batch.status !== "draft" && batch.status !== "exported") {
      setError(
        "現在のCSV出力APIでは、作成済みまたはCSV出力済みのバッチのみ再出力できます。",
      );
      setErrorDetail(null);
      return;
    }

    setDownloadingBatchId(batch.id);
    setError(null);
    setErrorDetail(null);

    try {
      const res = await fetch(
        `/api/admin/payouts/export?batch_id=${encodeURIComponent(batch.id)}`,
        {
          cache: "no-store",
        },
      );

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string;
            detail?: string;
            messages?: string[];
          };

          setError(json.error || "CSV出力に失敗しました");
          setErrorDetail(
            [
              ...(json.messages || []),
              ...(json.detail ? [json.detail] : []),
            ].join("\n") || null,
          );
          return;
        }

        throw new Error("CSV出力に失敗しました");
      }

      const blob = await res.blob();
      const contentDisposition =
        res.headers.get("content-disposition") || "";
      const fileNameMatch =
        contentDisposition.match(/filename="([^"]+)"/);
      const fileName =
        fileNameMatch?.[1] ||
        batch.csv_file_name ||
        `gmo-aozora-${batch.id}.csv`;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);

      await loadHistory({ append: false, offset: 0 });
    } catch (downloadError) {
      console.error("admin payout batch history CSV error:", downloadError);
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "CSV出力に失敗しました",
      );
    } finally {
      setDownloadingBatchId(null);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="h-36 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100"
            />
          ))}
        </div>
        <div className="mt-5 h-64 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <section className="mb-5 rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">
              Payout batch history
            </p>
            <h1 className="mt-2 text-[30px] font-black tracking-[-0.06em] text-slate-950">
              振込バッチ履歴
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
              月次振込バッチの対象期間、CSV出力状況、銀行受付番号、支払日、クリエイター別の振込明細を確認できます。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/payouts"
              className="rounded-full bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 ring-1 ring-slate-100"
            >
              支払管理へ戻る
            </Link>

            <button
              type="button"
              onClick={() =>
                void loadHistory({ append: false, offset: 0 })
              }
              className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
            >
              再読み込み
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="mb-5 rounded-[24px] bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
          <p className="font-black">{error}</p>
          {errorDetail ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-6">
              {errorDetail}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="振込バッチ"
          value={`${summary.total_count}件`}
          sub={`対象注文 ${summary.total_orders}件`}
        />
        <StatCard
          label="支払済み振込総額"
          value={formatPrice(summary.paid_net_amount, "JPY")}
          sub={`${summary.paid_count}バッチ`}
          tone="success"
        />
        <StatCard
          label="CSV出力待ち・出力済み"
          value={`${summary.draft_count + summary.exported_count}件`}
          sub={`作成済み ${summary.draft_count} / 出力済み ${summary.exported_count}`}
          tone="warning"
        />
        <StatCard
          label="エラー"
          value={`${summary.failed_count}件`}
          sub={`振込対象総額 ${formatPrice(summary.total_net_amount, "JPY")}`}
          tone="danger"
        />
      </section>

      <section className="mb-5 rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              label="すべて"
              count={summary.total_count}
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <FilterButton
              label="作成済み"
              count={summary.draft_count}
              active={statusFilter === "draft"}
              onClick={() => setStatusFilter("draft")}
            />
            <FilterButton
              label="準備完了"
              count={summary.ready_count}
              active={statusFilter === "ready"}
              onClick={() => setStatusFilter("ready")}
            />
            <FilterButton
              label="CSV出力済み"
              count={summary.exported_count}
              active={statusFilter === "exported"}
              onClick={() => setStatusFilter("exported")}
              tone="warning"
            />
            <FilterButton
              label="支払済み"
              count={summary.paid_count}
              active={statusFilter === "paid"}
              onClick={() => setStatusFilter("paid")}
              tone="success"
            />
            <FilterButton
              label="失敗"
              count={summary.failed_count}
              active={statusFilter === "failed"}
              onClick={() => setStatusFilter("failed")}
              tone="danger"
            />
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="バッチコード / 受付番号 / C名で検索"
            className="w-full rounded-full bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none ring-1 ring-slate-100 placeholder:text-slate-400 xl:w-[360px]"
          />
        </div>
      </section>

      {filteredBatches.length > 0 ? (
        <section className="space-y-4">
          {filteredBatches.map((batch) => {
            const expanded = expandedBatchIds.has(batch.id);
            const consistent = isConsistent(batch.consistency);
            const canDownloadCsv =
              batch.status === "draft" || batch.status === "exported";

            return (
              <article
                key={batch.id}
                className="overflow-hidden rounded-[30px] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill className={getStatusClass(batch.status)}>
                          {getStatusLabel(batch.status)}
                        </Pill>

                        <Pill className="bg-slate-50 text-slate-500 ring-slate-100">
                          {batch.payout_method ===
                          "manual_bank_transfer"
                            ? "銀行振込"
                            : batch.payout_method}
                        </Pill>

                        <Pill
                          className={
                            consistent
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                              : "bg-red-50 text-red-700 ring-red-100"
                          }
                        >
                          {consistent ? "集計一致" : "集計不一致"}
                        </Pill>
                      </div>

                      <h2 className="mt-3 break-all text-[21px] font-black tracking-[-0.045em] text-slate-950">
                        {batch.batch_code || shortId(batch.id)}
                      </h2>

                      <p className="mt-1 break-all text-xs font-bold text-slate-400">
                        バッチID：{batch.id}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyText(batch.id)}
                        className="rounded-full bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-100"
                      >
                        IDコピー
                      </button>

                      {canDownloadCsv ? (
                        <button
                          type="button"
                          onClick={() => void downloadCsv(batch)}
                          disabled={downloadingBatchId === batch.id}
                          className="rounded-full bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {downloadingBatchId === batch.id
                            ? "CSV出力中..."
                            : batch.status === "exported"
                              ? "CSVを再出力"
                              : "CSVを出力"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => toggleExpanded(batch.id)}
                        className="rounded-full bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-700 ring-1 ring-indigo-100"
                      >
                        {expanded ? "明細を閉じる" : "明細を表示"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DetailCell
                      label="対象期間"
                      value={`${formatDate(batch.period_start)} ～ ${formatDate(
                        batch.period_end,
                      )}`}
                      sub={`振込予定 ${formatDate(batch.scheduled_date)}`}
                    />
                    <DetailCell
                      label="対象"
                      value={`${batch.total_creators}名 / ${batch.total_orders}件`}
                      sub={`明細 ${batch.items.length}件`}
                    />
                    <DetailCell
                      label="報酬総額"
                      value={formatPrice(
                        batch.total_payout_amount,
                        batch.currency,
                      )}
                      sub={`手数料 ${formatPrice(
                        batch.total_transfer_fee,
                        batch.currency,
                      )}`}
                    />
                    <DetailCell
                      label="振込総額"
                      value={formatPrice(
                        batch.total_net_amount,
                        batch.currency,
                      )}
                      sub={
                        batch.paid_at
                          ? `支払日 ${formatDateTime(batch.paid_at)}`
                          : "未支払"
                      }
                    />
                    <DetailCell
                      label="CSV"
                      value={batch.csv_file_name || "未出力"}
                      sub={`出力日時 ${formatDateTime(batch.exported_at)}`}
                    />
                    <DetailCell
                      label="銀行受付番号"
                      value={batch.external_reference || "-"}
                      sub={`送信日時 ${formatDateTime(batch.submitted_at)}`}
                    />
                    <DetailCell
                      label="作成日時"
                      value={formatDateTime(batch.created_at)}
                      sub={`更新 ${formatDateTime(batch.updated_at)}`}
                    />
                    <DetailCell
                      label="管理メモ"
                      value={batch.admin_note || "-"}
                      sub={
                        batch.failed_items > 0
                          ? `失敗明細 ${batch.failed_items}件`
                          : undefined
                      }
                    />
                  </div>

                  {!consistent ? (
                    <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
                      <p className="font-black">
                        バッチ集計値と振込明細の合計が一致していません
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {!batch.consistency.creators_match ? (
                          <span>対象C数</span>
                        ) : null}
                        {!batch.consistency.orders_match ? (
                          <span>注文数</span>
                        ) : null}
                        {!batch.consistency.payout_amount_match ? (
                          <span>報酬総額</span>
                        ) : null}
                        {!batch.consistency.transfer_fee_match ? (
                          <span>振込手数料</span>
                        ) : null}
                        {!batch.consistency.withholding_amount_match ? (
                          <span>源泉徴収額</span>
                        ) : null}
                        {!batch.consistency.adjustment_amount_match ? (
                          <span>調整額</span>
                        ) : null}
                        {!batch.consistency.net_amount_match ? (
                          <span>振込総額</span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                {expanded ? (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black tracking-[-0.04em] text-slate-950">
                          クリエイター別振込明細
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          バッチ作成時に固定された口座情報のスナップショットです。
                        </p>
                      </div>

                      <p className="text-xs font-black text-slate-400">
                        {batch.items.length}明細
                      </p>
                    </div>

                    {batch.items.length > 0 ? (
                      <div className="space-y-3">
                        {batch.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-[24px] bg-white p-4 ring-1 ring-slate-100"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="break-words font-black text-slate-950">
                                    {item.creator_name}
                                  </p>
                                  <Pill
                                    className={
                                      item.status === "paid"
                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                        : item.status === "exported"
                                          ? "bg-amber-50 text-amber-700 ring-amber-100"
                                          : "bg-slate-100 text-slate-600 ring-slate-200"
                                    }
                                  >
                                    {item.status}
                                  </Pill>
                                </div>
                                <p className="mt-1 break-all text-xs font-bold text-slate-400">
                                  C User ID：{item.creator_user_id}
                                </p>
                              </div>

                              <div className="text-left lg:text-right">
                                <p className="text-xs font-black text-slate-400">
                                  実際の振込額
                                </p>
                                <p className="mt-1 text-xl font-black tracking-[-0.05em] text-emerald-700">
                                  {formatPrice(
                                    item.net_amount,
                                    item.currency,
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              <DetailCell
                                label="報酬総額"
                                value={formatPrice(
                                  item.gross_amount,
                                  item.currency,
                                )}
                                sub={`${item.order_count}件`}
                              />
                              <DetailCell
                                label="控除・調整"
                                value={`振込手数料 -${formatPrice(
                                  item.transfer_fee,
                                  item.currency,
                                )}`}
                                sub={`源泉 ${formatPrice(
                                  item.withholding_amount,
                                  item.currency,
                                )} / 調整 ${formatPrice(
                                  item.adjustment_amount,
                                  item.currency,
                                )}`}
                              />
                              <DetailCell
                                label="銀行"
                                value={`${item.bank.bank_name || "-"} / ${
                                  item.bank.branch_name || "-"
                                }`}
                                sub={`${item.bank.bank_code || "-"} / ${
                                  item.bank.branch_code || "-"
                                }`}
                              />
                              <DetailCell
                                label="口座"
                                value={`${getAccountTypeLabel(
                                  item.bank.account_type,
                                )} / ${item.bank.account_number || "-"}`}
                                sub={item.bank.account_holder_kana || "-"}
                              />
                            </div>

                            <div className="mt-3 flex flex-col gap-2 text-xs font-bold text-slate-500 sm:flex-row sm:flex-wrap">
                              <span>
                                支払日：{formatDateTime(item.paid_at)}
                              </span>
                              <span>
                                CSV出力：{formatDateTime(item.exported_at)}
                              </span>
                              <span>
                                注文ID：
                                {item.order_ids.length > 0
                                  ? item.order_ids
                                      .map((orderId) => shortId(orderId))
                                      .join(" / ")
                                  : "-"}
                              </span>
                            </div>

                            {item.failure_reason ? (
                              <div className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700 ring-1 ring-red-100">
                                {item.failure_reason}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[24px] bg-white p-6 text-center font-bold text-slate-400 ring-1 ring-slate-100">
                        振込明細はありません
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[30px] bg-white p-10 text-center shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
          <p className="text-lg font-black text-slate-950">
            対象の振込バッチはありません
          </p>
          <p className="mt-2 text-sm font-bold text-slate-400">
            支払管理画面で月次振込バッチを作成すると、ここに表示されます。
          </p>
        </section>
      )}

      {pagination.has_more ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() =>
              void loadHistory({
                append: true,
                offset: batches.length,
              })
            }
            disabled={loadingMore}
            className="rounded-full bg-white px-6 py-3 text-sm font-black text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore
              ? "読み込み中..."
              : `さらに表示（${batches.length} / ${pagination.total}）`}
          </button>
        </div>
      ) : null}
    </main>
  );
}