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

type PayoutAccountValidation = {
  ready: boolean;
  warnings: string[];
};

type CreatedPayoutBatch = {
  id: string;
  batch_code: string | null;
  payout_method: PayoutMethod;
  status: string;
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
  created_at: string;
};

type InvalidBatchCreator = {
  creator_id: string;
  creator_user_id: string;
  creator_name: string;
  order_ids: string[];
  warnings: string[];
};

type CarriedBatchCreator = {
  creator_id: string;
  creator_user_id: string;
  creator_name: string;
  gross_amount: number;
  minimum_payout: number;
  order_ids: string[];
};

type CreatePayoutBatchResponse = {
  ok?: boolean;
  error?: string;
  detail?: string;
  batch?: CreatedPayoutBatch;
  settings?: {
    transfer_fee: number;
    minimum_payout: number;
  };
  included_creator_count?: number;
  included_order_count?: number;
  invalid_creators?: InvalidBatchCreator[];
  carried_creators?: CarriedBatchCreator[];
  invalid_messages?: string[];
  existing_batch?: Partial<CreatedPayoutBatch>;
};

type PayoutBatchCandidate = {
  id: string;
  order_count: number;
  creator_count: number;
  gross_amount: number;
  currency: string;
};

type MarkPayoutBatchPaidResponse = {
  ok?: boolean;
  already_paid?: boolean;
  error?: string;
  detail?: string;
  batch?: {
    id: string;
    batch_code: string | null;
    status: string;
    paid_at: string | null;
    total_orders: number;
    total_creators: number;
    total_payout_amount: number;
    total_transfer_fee: number;
    total_net_amount: number;
    currency: string;
  };
  order_ids?: string[];
  payout_item_ids?: string[];
  paid_at?: string;
  note?: string;
  external_reference?: string | null;
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

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getJstTodayInputValue(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function getDefaultBatchFormDates(now = new Date()) {
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();

  return {
    periodStart: toDateInputValue(new Date(Date.UTC(year, month - 1, 1))),
    periodEnd: toDateInputValue(new Date(Date.UTC(year, month, 0))),
    scheduledDate: toDateInputValue(new Date(Date.UTC(year, month, 25))),
  };
}

function buildBatchErrorDetails(json: CreatePayoutBatchResponse) {
  const details: string[] = [];

  if (Array.isArray(json.invalid_messages)) {
    details.push(...json.invalid_messages);
  }

  if (Array.isArray(json.carried_creators)) {
    for (const creator of json.carried_creators) {
      details.push(
        `${creator.creator_name}: ${formatPrice(
          creator.gross_amount,
          "JPY"
        )}（最低振込額 ${formatPrice(creator.minimum_payout, "JPY")} 未満のため繰越）`
      );
    }
  }

  if (json.existing_batch?.batch_code) {
    details.push(`既存バッチ: ${json.existing_batch.batch_code}`);
  }

  if (json.detail && !details.includes(json.detail)) {
    details.push(json.detail);
  }

  return Array.from(new Set(details));
}

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

function normalizeDigits(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[^\d]/g, "");
}

function normalizeDisplayName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hiraganaToKatakana(value: string) {
  return value.replace(/[ぁ-ゖ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

function normalizeTransferName(value: string | null | undefined) {
  return hiraganaToKatakana(String(value ?? ""))
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\t\r\n]+/g, " ")
    .replace(/[　\s]+/g, " ")
    .trim();
}

function isInvalidAccountNumber(value: string | null | undefined) {
  const digits = normalizeDigits(value);

  if (digits.length !== 7) return true;
  if (digits === "0000000") return true;
  if (/^(\d)\1{6}$/.test(digits)) return true;

  return false;
}

function isUnsafeDisplayName(value: string | null | undefined) {
  const normalized = normalizeDisplayName(value);

  if (!normalized) return true;
  if (normalized.length > 80) return true;
  if (/[\u0000-\u001F\u007F]/.test(normalized)) return true;

  return false;
}

function isValidTransferName(value: string | null | undefined) {
  const normalized = normalizeTransferName(value);

  if (!normalized) return false;
  if (normalized.length > 48) return false;

  return /^[ァ-ヶー・A-Z0-9 ()().,\-\/&]+$/.test(normalized);
}

function validatePayoutAccount(item: PayoutItem): PayoutAccountValidation {
  const warnings: string[] = [];

  const bankName = normalizeDisplayName(item.bank_name);
  const bankCode = normalizeDigits(item.bank_code);
  const branchName = normalizeDisplayName(item.branch_name);
  const branchCode = normalizeDigits(item.branch_code);
  const accountNumber = normalizeDigits(item.account_number);
  const accountHolderName = normalizeDisplayName(item.account_holder_name);
  const transferName = normalizeTransferName(item.account_holder_kana);

  if (!bankName) {
    warnings.push("金融機関名なし");
  }

  if (bankCode.length !== 4) {
    warnings.push("金融機関コード不備");
  }

  if (!branchName) {
    warnings.push("支店名なし");
  }

  if (branchCode.length !== 3) {
    warnings.push("支店コード不備");
  }

  if (item.account_type !== "ordinary" && item.account_type !== "checking") {
    warnings.push("口座種別不備");
  }

  if (isInvalidAccountNumber(accountNumber)) {
    warnings.push("口座番号不備");
  }

  if (isUnsafeDisplayName(accountHolderName)) {
    warnings.push("口座名義不備");
  }

  if (!isValidTransferName(transferName)) {
    warnings.push("振込用名義不備");
  }

  return {
    ready: warnings.length === 0,
    warnings,
  };
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

function PayoutCard({ item }: { item: PayoutItem }) {
  const title =
    item.product_name?.trim() ||
    item.menu_title_snapshot?.trim() ||
    "注文名未設定";

  const validation = validatePayoutAccount(item);

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

            {validation.ready ? (
              <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-100">
                口座OK
              </Pill>
            ) : (
              <Pill className="bg-red-50 text-red-700 ring-red-100">
                口座不備
              </Pill>
            )}

            {item.payout_status === "pending" ? (
              item.payout_batch_id ? (
                <Pill className="bg-indigo-50 text-indigo-700 ring-indigo-100">
                  バッチ登録済み
                </Pill>
              ) : (
                <Pill className="bg-slate-100 text-slate-600 ring-slate-200">
                  バッチ未登録
                </Pill>
              )
            ) : null}

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

          {item.payout_batch_id ? (
            <p className="mt-1 text-xs font-bold text-indigo-500">
              振込バッチ：{shortId(item.payout_batch_id)}
            </p>
          ) : null}

          {!validation.ready ? (
            <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold leading-6 text-red-700 ring-1 ring-red-100">
              <p className="font-black">
                次回の振込バッチ作成前に口座情報の修正が必要です
              </p>
              <ul className="mt-1 list-disc pl-5">
                {validation.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">C報酬額</p>
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
              <p className="text-xs font-black text-slate-400">クリエイター</p>
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
              <p className="mt-1 truncate text-xs font-bold text-slate-400">
                {item.bank_code || "-"} / {item.branch_code || "-"}
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
                {item.account_holder_name || "-"}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-500">
                振込用：{item.account_holder_kana || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
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
  const [tab, setTab] = useState<TabKey>("pending");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const defaultBatchDates = useMemo(() => getDefaultBatchFormDates(), []);
  const [batchPeriodStart, setBatchPeriodStart] = useState(
    defaultBatchDates.periodStart
  );
  const [batchPeriodEnd, setBatchPeriodEnd] = useState(
    defaultBatchDates.periodEnd
  );
  const [batchScheduledDate, setBatchScheduledDate] = useState(
    defaultBatchDates.scheduledDate
  );
  const [batchTransferFee, setBatchTransferFee] = useState("165");
  const [batchMinimumPayout, setBatchMinimumPayout] = useState("3000");
  const [batchAdminNote, setBatchAdminNote] = useState("");
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchErrorDetails, setBatchErrorDetails] = useState<string[]>([]);
  const [batchResult, setBatchResult] =
    useState<CreatePayoutBatchResponse | null>(null);

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batchPaidAt, setBatchPaidAt] = useState(getJstTodayInputValue());
  const [batchPaidNote, setBatchPaidNote] = useState(
    "GMOあおぞら銀行の振込完了を管理者が確認"
  );
  const [batchExternalReference, setBatchExternalReference] = useState("");
  const [markingBatchPaid, setMarkingBatchPaid] = useState(false);
  const [batchPaidResult, setBatchPaidResult] =
    useState<MarkPayoutBatchPaidResponse | null>(null);
  const [lastExportedBatchId, setLastExportedBatchId] = useState<string | null>(
    null
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    setErrorDetails([]);

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
    } catch (error) {
      console.error("admin payouts page load error:", error);
      setError("支払管理一覧の取得に失敗しました");
      setSummary(EMPTY_SUMMARY);
      setCreatorSummary([]);
      setItems([]);
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

  const invalidPendingItems = useMemo(() => {
    return items.filter((item) => {
      return (
        item.payout_status === "pending" &&
        item.payout_method === "manual_bank_transfer" &&
        !validatePayoutAccount(item).ready
      );
    });
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
        item.bank_code,
        item.branch_name,
        item.branch_code,
        item.account_holder_name,
        item.account_holder_kana,
        item.payout_status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQ));
    });
  }, [items, q, tab]);

  const batchCandidates = useMemo<PayoutBatchCandidate[]>(() => {
    const groups = new Map<
      string,
      {
        orderIds: Set<string>;
        creatorIds: Set<string>;
        grossAmount: number;
        currency: string;
      }
    >();

    for (const item of items) {
      if (
        item.payout_status !== "pending" ||
        item.payout_method !== "manual_bank_transfer" ||
        !item.payout_batch_id
      ) {
        continue;
      }

      const current = groups.get(item.payout_batch_id) ?? {
        orderIds: new Set<string>(),
        creatorIds: new Set<string>(),
        grossAmount: 0,
        currency: item.currency || "JPY",
      };

      if (!current.orderIds.has(item.order_id)) {
        current.orderIds.add(item.order_id);
        current.grossAmount += Number(item.creator_payout_amount ?? 0);
      }

      current.creatorIds.add(item.creator_id || item.creator_user_id);
      groups.set(item.payout_batch_id, current);
    }

    return Array.from(groups.entries()).map(([id, group]) => ({
      id,
      order_count: group.orderIds.size,
      creator_count: group.creatorIds.size,
      gross_amount: group.grossAmount,
      currency: group.currency,
    }));
  }, [items]);

  const selectedBatch = useMemo(
    () => batchCandidates.find((batch) => batch.id === selectedBatchId) ?? null,
    [batchCandidates, selectedBatchId]
  );

  const unbatchedPendingCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.payout_status === "pending" &&
          item.payout_method === "manual_bank_transfer" &&
          !item.payout_batch_id
      ).length,
    [items]
  );

  useEffect(() => {
    if (
      selectedBatchId &&
      batchCandidates.some((batch) => batch.id === selectedBatchId)
    ) {
      return;
    }

    setSelectedBatchId(batchCandidates[0]?.id ?? "");
  }, [batchCandidates, selectedBatchId]);

  const createMonthlyBatch = async () => {
    const transferFee = Number(batchTransferFee);
    const minimumPayout = Number(batchMinimumPayout);

    if (!batchPeriodStart || !batchPeriodEnd || !batchScheduledDate) {
      setBatchError("対象期間と振込予定日を入力してください");
      setBatchErrorDetails([]);
      return;
    }

    if (batchPeriodStart > batchPeriodEnd) {
      setBatchError("対象期間の開始日は終了日以前にしてください");
      setBatchErrorDetails([]);
      return;
    }

    if (batchScheduledDate <= batchPeriodEnd) {
      setBatchError("振込予定日は対象期間終了日より後にしてください");
      setBatchErrorDetails([]);
      return;
    }

    if (
      !Number.isFinite(transferFee) ||
      transferFee < 0 ||
      !Number.isInteger(transferFee)
    ) {
      setBatchError("振込事務手数料は0以上の整数で入力してください");
      setBatchErrorDetails([]);
      return;
    }

    if (
      !Number.isFinite(minimumPayout) ||
      minimumPayout < 0 ||
      !Number.isInteger(minimumPayout)
    ) {
      setBatchError("最低振込額は0以上の整数で入力してください");
      setBatchErrorDetails([]);
      return;
    }

    const ok = confirm(
      [
        "月次振込バッチを作成します。",
        `対象期間：${batchPeriodStart} ～ ${batchPeriodEnd}`,
        `振込予定日：${batchScheduledDate}`,
        `振込事務手数料：${formatPrice(transferFee, "JPY")} / C`,
        `最低振込額：${formatPrice(minimumPayout, "JPY")}`,
        "",
        "作成後、対象注文はこのバッチに固定されます。よろしいですか？",
      ].join("\n")
    );

    if (!ok) return;

    setCreatingBatch(true);
    setBatchError(null);
    setBatchErrorDetails([]);
    setBatchResult(null);

    try {
      const res = await fetch("/api/admin/payouts/batches/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          period_start: batchPeriodStart,
          period_end: batchPeriodEnd,
          scheduled_date: batchScheduledDate,
          transfer_fee: transferFee,
          minimum_payout: minimumPayout,
          admin_note: batchAdminNote.trim() || undefined,
        }),
      });

      const json = (await res
        .json()
        .catch(() => ({}))) as CreatePayoutBatchResponse;

      if (!res.ok) {
        setBatchError(json.error ?? "振込バッチの作成に失敗しました");
        setBatchErrorDetails(buildBatchErrorDetails(json));
        return;
      }

      setBatchResult(json);

      if (json.batch?.id) {
        setSelectedBatchId(json.batch.id);
      }

      setBatchPaidResult(null);
      await load();
    } catch (error) {
      console.error("admin create payout batch error:", error);
      setBatchError(
        error instanceof Error
          ? error.message
          : "振込バッチの作成に失敗しました"
      );
      setBatchErrorDetails([]);
    } finally {
      setCreatingBatch(false);
    }
  };

  const downloadCsv = async (batchId?: string) => {
    const targetBatchId = batchId || selectedBatchId || batchResult?.batch?.id;

    if (!targetBatchId) {
      setError(
        "CSV出力する振込バッチがありません。先に月次振込バッチを作成してください。"
      );
      setErrorDetails([]);
      return;
    }

    setDownloadingCsv(true);
    setError(null);
    setErrorDetails([]);

    try {
      const res = await fetch(
        `/api/admin/payouts/export?batch_id=${encodeURIComponent(targetBatchId)}`,
        {
          cache: "no-store",
        }
      );

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string;
            messages?: string[];
            detail?: string;
          };

          setError(json.error ?? "CSV出力に失敗しました");
          setErrorDetails(
            [
              ...(Array.isArray(json.messages) ? json.messages : []),
              ...(json.detail ? [json.detail] : []),
            ].filter(Boolean)
          );
          return;
        }

        throw new Error("CSV出力に失敗しました");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const fileName =
        fileNameMatch?.[1] ?? `gmo-aozora-${targetBatchId}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      setLastExportedBatchId(targetBatchId);
      setBatchResult((current) => {
        if (!current?.batch || current.batch.id !== targetBatchId) {
          return current;
        }

        return {
          ...current,
          batch: {
            ...current.batch,
            status: "exported",
          },
        };
      });
    } catch (error) {
      console.error("admin payout CSV download error:", error);
      setError(
        error instanceof Error ? error.message : "CSV出力に失敗しました"
      );
    } finally {
      setDownloadingCsv(false);
    }
  };

  const markBatchPaid = async () => {
    if (!selectedBatchId || !selectedBatch) {
      setError("支払済みにする振込バッチを選択してください");
      setErrorDetails([]);
      return;
    }

    if (!batchPaidAt) {
      setError("振込完了日を入力してください");
      setErrorDetails([]);
      return;
    }

    const knownBatch =
      batchResult?.batch?.id === selectedBatchId
        ? batchResult.batch
        : null;

    const displayAmount = knownBatch
      ? formatPrice(knownBatch.total_net_amount, knownBatch.currency)
      : `${formatPrice(
          selectedBatch.gross_amount,
          selectedBatch.currency
        )}からバッチ内の手数料等を控除した金額`;

    const ok = confirm(
      [
        "この振込バッチを支払済みに更新します。",
        `バッチID：${selectedBatchId}`,
        `対象C：${selectedBatch.creator_count}名`,
        `対象注文：${selectedBatch.order_count}件`,
        `振込対象額：${displayAmount}`,
        `振込完了日：${batchPaidAt}`,
        "",
        "GMOあおぞら銀行側で振込内容を確定した後に実行してください。",
        "実行後、バッチ・振込明細・対象注文がすべて支払済みになります。",
      ].join("\n")
    );

    if (!ok) return;

    setMarkingBatchPaid(true);
    setError(null);
    setErrorDetails([]);
    setBatchPaidResult(null);

    try {
      const res = await fetch("/api/admin/payouts/batches/mark-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          batch_id: selectedBatchId,
          paid_at: batchPaidAt,
          note: batchPaidNote.trim() || undefined,
          external_reference:
            batchExternalReference.trim() || undefined,
        }),
      });

      const json = (await res
        .json()
        .catch(() => ({}))) as MarkPayoutBatchPaidResponse;

      if (!res.ok) {
        setError(json.error ?? "振込バッチの支払済み更新に失敗しました");
        setErrorDetails(json.detail ? [json.detail] : []);
        return;
      }

      setBatchPaidResult(json);
      setBatchResult((current) => {
        if (!current?.batch || current.batch.id !== selectedBatchId) {
          return current;
        }

        return {
          ...current,
          batch: {
            ...current.batch,
            status: "paid",
          },
        };
      });
      setTab("paid");
      await load();
    } catch (error) {
      console.error("admin payout batch mark paid page error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "振込バッチの支払済み更新に失敗しました"
      );
    } finally {
      setMarkingBatchPaid(false);
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

            <Link
              href="/admin/payouts/history"
              className="rounded-full bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700 ring-1 ring-indigo-100"
            >
              振込バッチ履歴
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
              onClick={() => void downloadCsv(selectedBatchId)}
              disabled={downloadingCsv || !selectedBatchId}
              className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingCsv ? "CSV確認中..." : "CSV出力"}
            </button>
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">
                Monthly payout batch
              </p>
              <h2 className="mt-2 text-[22px] font-black tracking-[-0.05em] text-slate-950">
                月次振込バッチを作成
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                締め期間終了日までに完了した未精算注文をCごとに集約し、銀行口座のスナップショットと注文明細を固定します。最低振込額未満は次回へ繰り越します。
              </p>
            </div>

            <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-xs font-bold leading-5 text-indigo-700 ring-1 ring-indigo-100">
              CSV出力・支払済み更新は振込バッチ基準です。
              <br />
              注文を個別選択せず、バッチ全体を一括処理します。
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-500">
                対象期間 開始
              </span>
              <input
                type="date"
                value={batchPeriodStart}
                onChange={(event) => setBatchPeriodStart(event.target.value)}
                disabled={creatingBatch}
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 disabled:opacity-50"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-500">
                対象期間 終了
              </span>
              <input
                type="date"
                value={batchPeriodEnd}
                onChange={(event) => setBatchPeriodEnd(event.target.value)}
                disabled={creatingBatch}
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 disabled:opacity-50"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-500">
                振込予定日
              </span>
              <input
                type="date"
                value={batchScheduledDate}
                onChange={(event) => setBatchScheduledDate(event.target.value)}
                disabled={creatingBatch}
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 disabled:opacity-50"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-500">
                振込事務手数料 / C
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={batchTransferFee}
                onChange={(event) => setBatchTransferFee(event.target.value)}
                disabled={creatingBatch}
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 disabled:opacity-50"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-500">
                最低振込額
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={batchMinimumPayout}
                onChange={(event) => setBatchMinimumPayout(event.target.value)}
                disabled={creatingBatch}
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 disabled:opacity-50"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs font-black text-slate-500">
                管理メモ（任意）
              </span>
              <input
                value={batchAdminNote}
                onChange={(event) => setBatchAdminNote(event.target.value)}
                disabled={creatingBatch}
                placeholder="例：2026年7月締め・8月25日振込"
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 placeholder:text-slate-400 disabled:opacity-50"
              />
            </label>

            <button
              type="button"
              onClick={() => void createMonthlyBatch()}
              disabled={creatingBatch}
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(79,70,229,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingBatch ? "バッチ作成中..." : "振込バッチを作成"}
            </button>
          </div>

          {batchError ? (
            <div className="rounded-[22px] bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
              <p className="font-black">{batchError}</p>
              {batchErrorDetails.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {batchErrorDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {batchResult?.batch ? (
            <div className="rounded-[24px] bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-100">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
                    Created
                  </p>
                  <h3 className="mt-1 text-lg font-black">
                    振込バッチを作成しました
                  </h3>
                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    {batchResult.batch.batch_code || shortId(batchResult.batch.id)} /
                    {" "}
                    {formatDate(batchResult.batch.period_start)} ～ {" "}
                    {formatDate(batchResult.batch.period_end)} / 振込予定 {" "}
                    {formatDate(batchResult.batch.scheduled_date)}
                  </p>
                </div>

                <Pill className="bg-white text-emerald-700 ring-emerald-200">
                  {batchResult.batch.status}
                </Pill>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-black text-emerald-600">対象C</p>
                  <p className="mt-1 text-xl font-black">
                    {batchResult.batch.total_creators}名
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-black text-emerald-600">対象注文</p>
                  <p className="mt-1 text-xl font-black">
                    {batchResult.batch.total_orders}件
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-black text-emerald-600">報酬総額</p>
                  <p className="mt-1 text-xl font-black">
                    {formatPrice(
                      batchResult.batch.total_payout_amount,
                      batchResult.batch.currency
                    )}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-black text-emerald-600">手数料合計</p>
                  <p className="mt-1 text-xl font-black">
                    {formatPrice(
                      batchResult.batch.total_transfer_fee,
                      batchResult.batch.currency
                    )}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-black text-emerald-600">振込予定総額</p>
                  <p className="mt-1 text-xl font-black">
                    {formatPrice(
                      batchResult.batch.total_net_amount,
                      batchResult.batch.currency
                    )}
                  </p>
                </div>
              </div>

              {(batchResult.invalid_creators?.length ?? 0) > 0 ? (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100">
                  <p className="font-black">
                    口座不備などにより除外：
                    {batchResult.invalid_creators?.length ?? 0}名
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {batchResult.invalid_creators?.map((creator) => (
                      <li key={creator.creator_id}>
                        {creator.creator_name}: {creator.warnings.join("、")}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(batchResult.carried_creators?.length ?? 0) > 0 ? (
                <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm font-bold text-sky-800 ring-1 ring-sky-100">
                  <p className="font-black">
                    最低振込額未満で次回へ繰越：
                    {batchResult.carried_creators?.length ?? 0}名
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {batchResult.carried_creators?.map((creator) => (
                      <li key={creator.creator_id}>
                        {creator.creator_name}: {formatPrice(creator.gross_amount, "JPY")}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mb-5 rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                Batch settlement
              </p>
              <h2 className="mt-2 text-[22px] font-black tracking-[-0.05em] text-slate-950">
                振込バッチを支払済みにする
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                GMOあおぞら銀行でCSVの内容と振込結果を確認した後、対象バッチ全体を支払済みに更新します。
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700 ring-1 ring-red-100">
              実際の振込完了前には押さないでください。
              <br />
              更新後はC側の報酬画面にも支払済みとして反映されます。
            </div>
          </div>

          {batchCandidates.length > 0 ? (
            <>
              <div className="grid gap-3 lg:grid-cols-4">
                <label className="block lg:col-span-2">
                  <span className="mb-1.5 block text-xs font-black text-slate-500">
                    対象振込バッチ
                  </span>
                  <select
                    value={selectedBatchId}
                    onChange={(event) => {
                      setSelectedBatchId(event.target.value);
                      setBatchPaidResult(null);
                    }}
                    disabled={markingBatchPaid}
                    className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 disabled:opacity-50"
                  >
                    {batchCandidates.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {shortId(batch.id)} / {batch.creator_count}名 /{" "}
                        {batch.order_count}件 /{" "}
                        {formatPrice(batch.gross_amount, batch.currency)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-500">
                    振込完了日
                  </span>
                  <input
                    type="date"
                    value={batchPaidAt}
                    onChange={(event) => setBatchPaidAt(event.target.value)}
                    disabled={markingBatchPaid}
                    className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-500">
                    銀行側の受付番号（任意）
                  </span>
                  <input
                    value={batchExternalReference}
                    onChange={(event) =>
                      setBatchExternalReference(event.target.value)
                    }
                    disabled={markingBatchPaid}
                    placeholder="例：GMO受付番号"
                    className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 placeholder:text-slate-400 disabled:opacity-50"
                  />
                </label>
              </div>

              {selectedBatch ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black text-slate-400">対象C</p>
                    <p className="mt-1 text-xl font-black text-slate-900">
                      {selectedBatch.creator_count}名
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black text-slate-400">対象注文</p>
                    <p className="mt-1 text-xl font-black text-slate-900">
                      {selectedBatch.order_count}件
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black text-slate-400">報酬総額</p>
                    <p className="mt-1 text-xl font-black text-slate-900">
                      {formatPrice(
                        selectedBatch.gross_amount,
                        selectedBatch.currency
                      )}
                    </p>
                  </div>
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-slate-500">
                  支払メモ
                </span>
                <input
                  value={batchPaidNote}
                  onChange={(event) => setBatchPaidNote(event.target.value)}
                  disabled={markingBatchPaid}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-100 disabled:opacity-50"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => void downloadCsv(selectedBatchId)}
                  disabled={downloadingCsv || markingBatchPaid}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {downloadingCsv
                    ? "CSV出力中..."
                    : lastExportedBatchId === selectedBatchId
                      ? "CSVを再ダウンロード"
                      : "このバッチのCSVを出力"}
                </button>

                <button
                  type="button"
                  onClick={() => void markBatchPaid()}
                  disabled={markingBatchPaid || downloadingCsv}
                  className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(5,150,105,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {markingBatchPaid
                    ? "支払済み更新中..."
                    : "この振込バッチを支払済みにする"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-[24px] bg-slate-50 p-6 text-center ring-1 ring-slate-100">
              <p className="font-black text-slate-800">
                支払待ちの振込バッチはありません
              </p>
              <p className="mt-2 text-sm font-bold text-slate-400">
                先に月次振込バッチを作成し、CSVを出力してください。
              </p>
            </div>
          )}

          {unbatchedPendingCount > 0 ? (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100">
              バッチ未登録の支払待ち注文が {unbatchedPendingCount} 件あります。
              次回の月次振込バッチ作成時に処理してください。
            </div>
          ) : null}

          {batchPaidResult?.ok ? (
            <div className="rounded-[24px] bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
                Paid
              </p>
              <h3 className="mt-1 text-lg font-black">
                振込バッチを支払済みに更新しました
              </h3>
              <p className="mt-2 text-sm font-bold text-emerald-700">
                {batchPaidResult.batch?.batch_code ||
                  shortId(batchPaidResult.batch?.id)}{" "}
                / 支払済み日 {formatDateTime(batchPaidResult.paid_at)}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-black text-emerald-600">対象C</p>
                  <p className="mt-1 text-xl font-black">
                    {batchPaidResult.batch?.total_creators ?? 0}名
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-black text-emerald-600">
                    対象注文
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {batchPaidResult.batch?.total_orders ?? 0}件
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-black text-emerald-600">
                    振込総額
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {formatPrice(
                      batchPaidResult.batch?.total_net_amount,
                      batchPaidResult.batch?.currency
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="mb-5 rounded-[24px] bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
          <p className="font-black">{error}</p>
          {errorDetails.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errorDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {invalidPendingItems.length > 0 ? (
        <section className="mb-5 rounded-[24px] bg-amber-50 p-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100">
          <p className="font-black">
            口座情報に不備がある支払待ちデータが {invalidPendingItems.length} 件あります。
          </p>
          <p className="mt-1">
            不備があるデータはCSV出力・支払済み更新の対象外です。Cの口座情報を修正してください。
          </p>
        </section>
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

      {filteredItems.length > 0 ? (
        <section className="space-y-4">
          {filteredItems.map((item) => (
            <PayoutCard key={item.order_id} item={item} />
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