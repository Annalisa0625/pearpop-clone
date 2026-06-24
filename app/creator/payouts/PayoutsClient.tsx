// File: app/creator/payouts/PayoutsClient.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
};

type PayoutProfile = {
  id: string;
  creator_id: string;
  user_id: string;
  payout_method: "manual_bank_transfer" | "stripe_connect";
  status: "not_submitted" | "submitted" | "verified" | "rejected";
  bank_name: string | null;
  bank_code: string | null;
  branch_name: string | null;
  branch_code: string | null;
  account_type: "ordinary" | "checking" | null;
  account_number: string | null;
  account_holder_name: string | null;
  account_holder_kana: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  admin_note: string | null;
};

type PayoutOrderRow = {
  id: string;
  product_name: string | null;
  status: string | null;
  payment_status: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
  completed_at: string | null;
  payout_status: "unpaid" | "pending" | "paid" | "withheld" | "failed" | null;
  payout_due_at: string | null;
  payout_paid_at: string | null;
  created_at: string | null;
};

type FormState = {
  bank_name: string;
  bank_code: string;
  branch_name: string;
  branch_code: string;
  account_type: "ordinary" | "checking";
  account_number: string;
  account_holder_name: string;
  account_holder_kana: string;
};

type BankOption = {
  code: string;
  name: string;
  kana: string | null;
  hira: string | null;
  roma: string | null;
};

type BranchOption = {
  code: string;
  name: string;
  kana: string | null;
  hira: string | null;
  roma: string | null;
};

const DEFAULT_BANK_TRANSFER_FEE_AMOUNT = 165;
const MIN_PAYOUT_AMOUNT = 3000;

function createEmptyForm(): FormState {
  return {
    bank_name: "",
    bank_code: "",
    branch_name: "",
    branch_code: "",
    account_type: "ordinary",
    account_number: "",
    account_holder_name: "",
    account_holder_kana: "",
  };
}

function profileToForm(profile: PayoutProfile | null): FormState {
  return {
    bank_name: profile?.bank_name ?? "",
    bank_code: profile?.bank_code ?? "",
    branch_name: profile?.branch_name ?? "",
    branch_code: profile?.branch_code ?? "",
    account_type:
      profile?.account_type === "checking" ? "checking" : "ordinary",
    account_number: profile?.account_number ?? "",
    account_holder_name: profile?.account_holder_name ?? "",
    account_holder_kana: profile?.account_holder_kana ?? "",
  };
}

function normalizeDigits(value: string) {
  return value.normalize("NFKC").replace(/[^\d]/g, "");
}

function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hiraganaToKatakana(value: string) {
  return value.replace(/[ぁ-ゖ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60),
  );
}

function normalizeTransferName(value: string) {
  return hiraganaToKatakana(value)
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\t\r\n]+/g, " ")
    .replace(/[　\s]+/g, " ")
    .trim();
}

function isUnsafeDisplayName(value: string) {
  if (!value.trim()) return true;
  if (value.length > 80) return true;
  if (/[\u0000-\u001F\u007F]/.test(value)) return true;
  return false;
}

function isValidTransferName(value: string) {
  const normalized = normalizeTransferName(value);

  if (!normalized) return false;
  if (normalized.length > 48) return false;

  return /^[ァ-ヶー・A-Z0-9 ()().,\-\/&]+$/.test(normalized);
}

function isInvalidAccountNumber(value: string) {
  const digits = normalizeDigits(value);

  if (digits.length !== 7) return true;
  if (digits === "0000000") return true;
  if (/^(\d)\1{6}$/.test(digits)) return true;

  return false;
}

function normalizeFormState(form: FormState): FormState {
  return {
    ...form,
    bank_name: normalizeName(form.bank_name),
    bank_code: normalizeDigits(form.bank_code).slice(0, 4),
    branch_name: normalizeName(form.branch_name),
    branch_code: normalizeDigits(form.branch_code).slice(0, 3),
    account_number: normalizeDigits(form.account_number).slice(0, 7),
    account_holder_name: normalizeName(form.account_holder_name),
    account_holder_kana: normalizeTransferName(form.account_holder_kana),
  };
}

function formatMoney(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: "ja" | "en",
) {
  const amount = Number(value ?? 0);
  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    if (safeCurrency === "JPY") return `¥${amount.toLocaleString()}`;
    return `${safeCurrency} ${amount.toLocaleString()}`;
  }
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function formatShortDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}

function formatMonth(value: Date, locale: "ja" | "en") {
  return value.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long",
  });
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(value: Date, months: number) {
  return new Date(
    value.getFullYear(),
    value.getMonth() + months,
    1,
    0,
    0,
    0,
    0,
  );
}

function getMonthlyPayoutDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 25, 0, 0, 0, 0);
}

function getOrderDate(order: PayoutOrderRow) {
  const raw = order.completed_at || order.created_at;
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function maskAccountNumber(value: string | null | undefined) {
  if (!value) return "-";

  const digits = value.replace(/[^\d]/g, "");

  if (digits.length <= 3) return "•••";
  return `••••${digits.slice(-3)}`;
}

function isPayablePayoutStatus(
  status: PayoutOrderRow["payout_status"] | null | undefined,
) {
  return !status || status === "unpaid" || status === "pending";
}

function getPayoutStatusLabel(
  status: PayoutOrderRow["payout_status"] | null | undefined,
) {
  if (status === "paid") return "支払い済み";
  if (status === "withheld") return "確認中";
  if (status === "failed") return "確認が必要";
  if (status === "pending") return "支払い予定";
  return "未払い";
}

function getPayoutStatusTone(
  status: PayoutOrderRow["payout_status"] | null | undefined,
) {
  if (status === "paid")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "withheld") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "failed") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-slate-50 text-slate-600 ring-slate-100";
}

function getPayoutNoteText() {
  return "振込手数料がある場合は、振込時に差し引かれます。その他の調整がある場合は、支払い前にお知らせします。";
}

function LoadingView() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-5">
      <div className="h-16 animate-pulse rounded-[18px] bg-white ring-1 ring-slate-100" />
      <div className="mt-3 h-44 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
      <div className="mt-3 h-32 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
    </main>
  );
}

function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[24px] bg-white ring-1 ring-slate-100 ${className}`}>
      {children}
    </section>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-1.5 text-[12px] font-semibold text-slate-700">{label}</p>
      {children}
      {help ? (
        <p className="mt-1.5 text-[11px] font-medium leading-5 text-slate-500">
          {help}
        </p>
      ) : null}
    </label>
  );
}

function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-[16px] border border-slate-200 bg-white px-3.5 text-[15px] font-medium text-slate-950 outline-none placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
    />
  );
}

function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-[16px] border border-slate-200 bg-white px-3.5 text-[15px] font-medium text-slate-950 outline-none focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100 ${className}`}
    >
      {children}
    </select>
  );
}

function Alert({
  tone,
  title,
  body,
}: {
  tone: "blue" | "amber" | "green" | "red";
  title: string;
  body: string;
}) {
  const cls =
    tone === "blue"
      ? "bg-blue-50 text-blue-900 ring-blue-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
        : tone === "red"
          ? "bg-rose-50 text-rose-900 ring-rose-100"
          : "bg-amber-50 text-amber-900 ring-amber-100";

  return (
    <div className={`rounded-[16px] p-3 ring-1 ${cls}`}>
      <p className="text-[13px] font-bold">{title}</p>
      <p className="mt-1 text-xs font-medium leading-5 opacity-85">{body}</p>
    </div>
  );
}

function OptionButton({
  title,
  subtitle,
  selected,
  onClick,
}: {
  title: string;
  subtitle?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[14px] p-2.5 text-left ring-1 transition ${
        selected
          ? "bg-emerald-50 ring-emerald-200"
          : "bg-white ring-slate-100 hover:bg-slate-50"
      }`}
    >
      <p className="text-[13px] font-bold text-slate-950">{title}</p>
      {subtitle ? (
        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
          {subtitle}
        </p>
      ) : null}
    </button>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-[12px] font-medium text-slate-500">
        {label}
      </span>
      <span
        className={`min-w-0 text-right text-[13px] leading-5 ${
          strong ? "font-bold text-slate-950" : "font-medium text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CollapsibleCard({
  title,
  subtitle,
  badge,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[22px] bg-white ring-1 ring-slate-100"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold tracking-[-0.035em] text-slate-950">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-[12px] font-medium leading-5 text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {badge}
          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-sm font-bold text-slate-500 ring-1 ring-slate-100 transition group-open:rotate-180">
            ↓
          </span>
        </div>
      </summary>

      <div className="border-t border-slate-100 p-4 sm:p-5">{children}</div>
    </details>
  );
}

function AccountTypeLabel({ value }: { value: string | null }) {
  if (value === "checking") return <>当座</>;
  return <>普通</>;
}

function sumPayoutAmount(orders: PayoutOrderRow[]) {
  return orders.reduce(
    (sum, order) => sum + Number(order.creator_payout_amount ?? 0),
    0,
  );
}

function PayoutHero({
  currentMonthAmount,
  nextPayoutAmount,
  currentMonthCount,
  nextPayoutCount,
  currentMonthLabel,
  nextPayoutDateLabel,
  locale,
}: {
  currentMonthAmount: number;
  nextPayoutAmount: number;
  currentMonthCount: number;
  nextPayoutCount: number;
  currentMonthLabel: string;
  nextPayoutDateLabel: string;
  locale: "ja" | "en";
}) {
  return (
    <Surface className="overflow-hidden">
      <div className="px-4 py-4 sm:px-5">
        <h1 className="text-[22px] font-bold tracking-[-0.045em] text-slate-950">
          報酬
        </h1>
        <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
          今月の積み上げと、次回の振込予定を確認できます。
        </p>
      </div>

      <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
        <p className="text-[12px] font-semibold text-slate-500">今月の報酬</p>
        <p className="mt-1 whitespace-nowrap text-[34px] font-bold tracking-[-0.055em] text-slate-950">
          {formatMoney(currentMonthAmount, "JPY", locale)}
        </p>
        <p className="mt-1 text-[12px] font-medium leading-5 text-slate-600">
          {currentMonthLabel}に完了した案件が積み上がります。
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[16px] bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
            <p className="text-[11px] font-semibold text-slate-500">今月完了</p>
            <p className="mt-1 text-[16px] font-bold text-slate-950">
              {currentMonthCount}件
            </p>
          </div>

          <div className="rounded-[16px] bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
            <p className="text-[11px] font-semibold text-slate-500">次回予定</p>
            <p className="mt-1 text-[16px] font-bold text-slate-950">
              {formatMoney(nextPayoutAmount, "JPY", locale)}
            </p>
            <p className="mt-1 text-[10px] font-medium text-slate-400">
              {nextPayoutCount > 0 ? nextPayoutDateLabel : "対象なし"}
            </p>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function NextPayoutCard({
  gross,
  fee,
  net,
  note,
  payoutDateLabel,
  blockedReason,
  locale,
}: {
  gross: number;
  fee: number;
  net: number;
  note: string;
  payoutDateLabel: string;
  blockedReason: string | null;
  locale: "ja" | "en";
}) {
  return (
    <Surface className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[18px] font-bold tracking-[-0.035em] text-slate-950">
            次回振込予定
          </h2>
          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            前月以前に完了した未払い分です。
          </p>
        </div>

        <StatusPill className="bg-slate-50 text-slate-600 ring-slate-100">
          {payoutDateLabel}
        </StatusPill>
      </div>

      <div className="mt-4 rounded-[18px] bg-rose-50/55 px-4 py-4 ring-1 ring-rose-100">
        <p className="text-[12px] font-semibold text-slate-600">
          振込予定額
        </p>
        <p className="mt-1 whitespace-nowrap text-[30px] font-bold tracking-[-0.045em] text-slate-950">
          {formatMoney(net, "JPY", locale)}
        </p>
      </div>

      <div className="mt-3 divide-y divide-slate-100 rounded-[16px] bg-slate-50/45 px-4 py-1 ring-1 ring-slate-100">
        <DetailRow label="対象報酬" value={formatMoney(gross, "JPY", locale)} strong />
        <DetailRow label="振込手数料" value={`-${formatMoney(fee, "JPY", locale)}`} />
      </div>

      <p className="mt-3 text-[11px] font-medium leading-5 text-slate-500">
        {note}
      </p>

      {blockedReason ? (
        <div className="mt-3">
          <Alert tone="amber" title="支払いについて" body={blockedReason} />
        </div>
      ) : null}
    </Surface>
  );
}

function BankAccountCard({
  profile,
  onEdit,
}: {
  profile: PayoutProfile | null;
  onEdit: () => void;
}) {
  return (
    <Surface className="px-4 py-3.5 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold tracking-[-0.035em] text-slate-950">
            受け取り口座
          </h2>
          <p className="mt-0.5 text-[12px] font-medium leading-5 text-slate-500">
            現在の振込先です
          </p>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-100"
        >
          変更
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-slate-950">
            {profile?.bank_name || "-"} / {profile?.branch_name || "-"}
          </p>
          <p className="mt-1 text-[12px] font-medium text-slate-500">
            <AccountTypeLabel value={profile?.account_type ?? null} />{" "}
            {maskAccountNumber(profile?.account_number)}
          </p>
        </div>

        <StatusPill className="bg-emerald-50 text-emerald-700 ring-emerald-100">
          登録済み
        </StatusPill>
      </div>
    </Surface>
  );
}

function SetupFormHeader({ fromSignup }: { fromSignup: boolean }) {
  return (
    <Surface className="p-4 sm:p-5">
      <h1 className="text-[22px] font-bold tracking-[-0.045em] text-slate-950">
        受け取り口座
      </h1>
      <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
        {fromSignup
          ? "報酬を受け取るため、銀行口座を登録してください。"
          : "案件完了後の報酬は、登録した銀行口座へ振り込まれます。"}
      </p>
    </Surface>
  );
}

export default function PayoutsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const db = useMemo(() => supabase as any, [supabase]);

  const fromSignup = searchParams.get("from") === "signup";
  const requiredFromSignup = searchParams.get("required") === "1";

  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const [creator, setCreator] = useState<CreatorRow | null>(null);
  const [profile, setProfile] = useState<PayoutProfile | null>(null);
  const [form, setForm] = useState<FormState>(createEmptyForm());
  const [orders, setOrders] = useState<PayoutOrderRow[]>([]);

  const [bankQuery, setBankQuery] = useState("");
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [bankLoading, setBankLoading] = useState(false);

  const [branchQuery, setBranchQuery] = useState("");
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const currentMonthStart = useMemo(() => startOfMonth(now), [now]);
  const nextMonthStart = useMemo(
    () => addMonths(currentMonthStart, 1),
    [currentMonthStart],
  );
  const previousMonthStart = useMemo(
    () => addMonths(currentMonthStart, -1),
    [currentMonthStart],
  );

  const currentMonthLabel = formatMonth(currentMonthStart, safeLocale);
  const previousMonthLabel = formatMonth(previousMonthStart, safeLocale);
  const nextPayoutDate = getMonthlyPayoutDate(previousMonthStart);
  const currentMonthPayoutDate = getMonthlyPayoutDate(currentMonthStart);
  const nextPayoutDateLabel = `${formatShortDate(nextPayoutDate.toISOString(), safeLocale)}頃`;
  const currentMonthPayoutDateLabel = `${formatShortDate(currentMonthPayoutDate.toISOString(), safeLocale)}頃`;

  const hasSavedBankAccount = Boolean(
    profile?.bank_name || profile?.account_number,
  );
  const showSetupForm = !hasSavedBankAccount || editing || fromSignup;
  const showNormalSections = hasSavedBankAccount && !editing && !fromSignup;

  const bankSearchReady = bankQuery.trim().length >= 2;
  const branchSearchReady =
    Boolean(form.bank_code) && branchQuery.trim().length >= 1;

  const payableOrders = orders.filter((order) =>
    isPayablePayoutStatus(order.payout_status),
  );

  const paidOrders = orders.filter((order) => order.payout_status === "paid");

  const currentMonthOrders = payableOrders.filter((order) => {
    const orderDate = getOrderDate(order);
    return (
      !!orderDate &&
      orderDate >= currentMonthStart &&
      orderDate < nextMonthStart
    );
  });

  const closedUnpaidOrders = payableOrders.filter((order) => {
    const orderDate = getOrderDate(order);
    return !!orderDate && orderDate < currentMonthStart;
  });

  const currentMonthAmount = sumPayoutAmount(currentMonthOrders);
  const nextPayoutGrossAmount = sumPayoutAmount(closedUnpaidOrders);
  const paidAmount = sumPayoutAmount(paidOrders);

  const estimatedBankFeeAmount =
    nextPayoutGrossAmount >= MIN_PAYOUT_AMOUNT
      ? DEFAULT_BANK_TRANSFER_FEE_AMOUNT
      : 0;

  const estimatedNextPayoutAmount = Math.max(
    nextPayoutGrossAmount - estimatedBankFeeAmount,
    0,
  );

  const canReceivePayout =
    profile?.status === "submitted" || profile?.status === "verified";

  const payoutBlockedReason = !canReceivePayout
    ? "口座を登録すると、完了した案件の報酬を受け取れるようになります。"
    : nextPayoutGrossAmount > 0 && nextPayoutGrossAmount < MIN_PAYOUT_AMOUNT
      ? `次回振込予定額が${formatMoney(
          MIN_PAYOUT_AMOUNT,
          "JPY",
          safeLocale,
        )}未満のため、翌月以降へ繰り越されます。`
      : null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMsg("ログインしてください。");
          setLoading(false);
          return;
        }

        const { data: creatorRow, error: creatorError } = await db
          .from("creators")
          .select("id, user_id, display_name, full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (creatorError) {
          console.error({ creatorError });
          setErrorMsg("報酬情報の取得に失敗しました。");
          setLoading(false);
          return;
        }

        if (!creatorRow) {
          setErrorMsg("インフルエンサー情報が見つかりませんでした。");
          setLoading(false);
          return;
        }

        const typedCreator = creatorRow as CreatorRow;
        setCreator(typedCreator);

        const { data: payoutProfileRow, error: payoutProfileError } = await db
          .from("creator_payout_profiles")
          .select(
            "id, creator_id, user_id, payout_method, status, bank_name, bank_code, branch_name, branch_code, account_type, account_number, account_holder_name, account_holder_kana, submitted_at, verified_at, rejected_at, admin_note",
          )
          .eq("creator_id", typedCreator.id)
          .maybeSingle();

        if (payoutProfileError) {
          console.error({ payoutProfileError });
          setErrorMsg("報酬情報の取得に失敗しました。");
          setLoading(false);
          return;
        }

        const typedProfile = (payoutProfileRow ?? null) as PayoutProfile | null;
        const nextForm = profileToForm(typedProfile);

        setProfile(typedProfile);
        setForm(nextForm);
        setBankQuery(nextForm.bank_name);
        setBranchQuery(nextForm.branch_name);
        setEditing(false);
        setConfirmOpen(false);
        setBankOptions([]);
        setBranchOptions([]);

        const { data: payoutOrderRows, error: payoutOrdersError } = await db
          .from("orders")
          .select(
            "id, product_name, status, payment_status, creator_payout_amount, currency, completed_at, payout_status, payout_due_at, payout_paid_at, created_at",
          )
          .eq("creator_user_id", user.id)
          .eq("status", "completed")
          .eq("payment_status", "captured")
          .order("completed_at", { ascending: false, nullsFirst: false })
          .limit(100);

        if (payoutOrdersError) {
          console.error({ payoutOrdersError });
        }

        setOrders((payoutOrderRows ?? []) as PayoutOrderRow[]);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErrorMsg("報酬情報の取得に失敗しました。");
        setLoading(false);
      }
    };

    void load();
  }, [db, supabase.auth]);

  useEffect(() => {
    if (!showSetupForm) return;

    let active = true;

    const run = async () => {
      if (!bankSearchReady) {
        setBankOptions([]);
        setBankLoading(false);
        return;
      }

      setBankLoading(true);

      try {
        const params = new URLSearchParams({
          q: bankQuery,
          limit: "15",
        });

        const res = await fetch(`/api/banks?${params.toString()}`, {
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!active) return;

        if (!res.ok) {
          setBankOptions([]);
          return;
        }

        setBankOptions((json?.banks ?? []) as BankOption[]);
      } catch {
        if (active) setBankOptions([]);
      } finally {
        if (active) setBankLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void run();
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [bankQuery, bankSearchReady, showSetupForm]);

  useEffect(() => {
    if (!showSetupForm) return;

    let active = true;

    const run = async () => {
      if (!branchSearchReady) {
        setBranchOptions([]);
        setBranchLoading(false);
        return;
      }

      setBranchLoading(true);

      try {
        const params = new URLSearchParams({
          q: branchQuery,
          limit: "20",
        });

        const res = await fetch(
          `/api/banks/${encodeURIComponent(form.bank_code)}/branches?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

        const json = await res.json().catch(() => ({}));

        if (!active) return;

        if (!res.ok) {
          setBranchOptions([]);
          return;
        }

        setBranchOptions((json?.branches ?? []) as BranchOption[]);
      } catch {
        if (active) setBranchOptions([]);
      } finally {
        if (active) setBranchLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void run();
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [branchQuery, branchSearchReady, form.bank_code, showSetupForm]);

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetFormToSavedProfile = () => {
    const nextForm = profileToForm(profile);

    setForm(nextForm);
    setBankQuery(nextForm.bank_name);
    setBranchQuery(nextForm.branch_name);
    setBankOptions([]);
    setBranchOptions([]);
    setConfirmOpen(false);
    setEditing(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const selectBank = (bank: BankOption) => {
    setForm((current) => ({
      ...current,
      bank_name: bank.name,
      bank_code: bank.code,
      branch_name: "",
      branch_code: "",
    }));
    setBankQuery(bank.name);
    setBranchQuery("");
    setBankOptions([]);
    setBranchOptions([]);
    setConfirmOpen(false);
  };

  const selectBranch = (branch: BranchOption) => {
    setForm((current) => ({
      ...current,
      branch_name: branch.name,
      branch_code: branch.code,
    }));
    setBranchQuery(branch.name);
    setBranchOptions([]);
    setConfirmOpen(false);
  };

  const validateForm = (targetForm: FormState = form) => {
    const normalized = normalizeFormState(targetForm);

    if (!normalized.bank_name || normalized.bank_code.length !== 4) {
      return "金融機関を検索して選択してください。";
    }

    if (!normalized.branch_name || normalized.branch_code.length !== 3) {
      return "支店を検索して選択してください。";
    }

    if (isInvalidAccountNumber(normalized.account_number)) {
      return "口座番号は7桁の数字で入力してください。";
    }

    if (isUnsafeDisplayName(normalized.account_holder_name)) {
      return "口座名義を入力してください。";
    }

    if (!isValidTransferName(normalized.account_holder_kana)) {
      return "振込用口座名義は、カナ・英数字・スペース・一部記号のみで48文字以内にしてください。";
    }

    return null;
  };

  const handleReview = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const normalizedForm = normalizeFormState(form);
    setForm(normalizedForm);

    const validationMessage = validateForm(normalizedForm);

    if (validationMessage) {
      setErrorMsg(validationMessage);
      setConfirmOpen(false);
      return;
    }

    setConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!creator) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const normalizedForm = normalizeFormState(form);
    const validationMessage = validateForm(normalizedForm);

    if (validationMessage) {
      setForm(normalizedForm);
      setErrorMsg(validationMessage);
      setSaving(false);
      setConfirmOpen(false);
      return;
    }

    try {
      const nowIso = new Date().toISOString();

      const payload = {
        creator_id: creator.id,
        user_id: creator.user_id,
        payout_method: "manual_bank_transfer",
        status: "submitted",
        bank_name: normalizedForm.bank_name,
        bank_code: normalizedForm.bank_code,
        branch_name: normalizedForm.branch_name,
        branch_code: normalizedForm.branch_code,
        account_type: normalizedForm.account_type,
        account_number: normalizedForm.account_number,
        account_holder_name: normalizedForm.account_holder_name,
        account_holder_kana: normalizedForm.account_holder_kana,
        submitted_at: nowIso,
        rejected_at: null,
        admin_note: null,
      };

      let result;

      if (profile?.id) {
        result = await db
          .from("creator_payout_profiles")
          .update(payload)
          .eq("id", profile.id)
          .eq("user_id", creator.user_id)
          .select(
            "id, creator_id, user_id, payout_method, status, bank_name, bank_code, branch_name, branch_code, account_type, account_number, account_holder_name, account_holder_kana, submitted_at, verified_at, rejected_at, admin_note",
          )
          .single();
      } else {
        result = await db
          .from("creator_payout_profiles")
          .insert(payload)
          .select(
            "id, creator_id, user_id, payout_method, status, bank_name, bank_code, branch_name, branch_code, account_type, account_number, account_holder_name, account_holder_kana, submitted_at, verified_at, rejected_at, admin_note",
          )
          .single();
      }

      if (result.error) {
        console.error({ saveError: result.error });
        setErrorMsg("保存に失敗しました。入力内容を確認してください。");
        setSaving(false);
        return;
      }

      const savedProfile = result.data as PayoutProfile;

      setProfile(savedProfile);
      setForm(profileToForm(savedProfile));
      setBankQuery(savedProfile.bank_name ?? "");
      setBranchQuery(savedProfile.branch_name ?? "");
      setBankOptions([]);
      setBranchOptions([]);
      setConfirmOpen(false);
      setEditing(false);
      setSuccessMsg("受け取り口座を保存しました。");
      setSaving(false);

      if (fromSignup) {
        router.replace("/creator/dashboard");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("保存に失敗しました。入力内容を確認してください。");
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView />;
  }

  return (
    <main className="mx-auto max-w-[760px] px-4 pb-24 pt-4">
      {fromSignup ? (
        <div className="mb-3">
          <Alert
            tone={requiredFromSignup ? "amber" : "blue"}
            title="受け取り口座を登録してください"
            body="報酬を受け取るために必要です。登録後、ホームへ進みます。"
          />
        </div>
      ) : null}

      {errorMsg ? (
        <div className="mb-3">
          <Alert tone="red" title="エラー" body={errorMsg} />
        </div>
      ) : null}

      {successMsg && !fromSignup ? (
        <div className="mb-3">
          <Alert tone="green" title="保存しました" body={successMsg} />
        </div>
      ) : null}

      {profile?.status === "rejected" && profile.admin_note ? (
        <div className="mb-3">
          <Alert
            tone="red"
            title="口座情報の修正が必要です"
            body={profile.admin_note}
          />
        </div>
      ) : null}

      {showSetupForm ? (
        <SetupFormHeader fromSignup={fromSignup} />
      ) : null}

      {showSetupForm ? (
        <Surface className="mt-3 p-4 sm:p-5">
          <div className="space-y-3">
            <CollapsibleCard
              title="金融機関・支店"
              subtitle="銀行名と支店名を検索して選択します"
              defaultOpen
            >
              <div className="space-y-4">
                <Field label="金融機関" help="2文字以上入力すると候補が出ます">
                  <Input
                    value={bankQuery}
                    placeholder="例：三菱UFJ / 0005"
                    onChange={(event) => {
                      const nextValue = event.target.value;

                      setBankQuery(nextValue);
                      setConfirmOpen(false);

                      if (form.bank_name && nextValue !== form.bank_name) {
                        setForm((current) => ({
                          ...current,
                          bank_name: "",
                          bank_code: "",
                          branch_name: "",
                          branch_code: "",
                        }));
                        setBranchQuery("");
                        setBranchOptions([]);
                      }
                    }}
                    autoComplete="off"
                  />

                  {form.bank_code && form.bank_name ? (
                    <div className="mt-2 rounded-[14px] bg-emerald-50 p-2 ring-1 ring-emerald-100">
                      <p className="text-xs font-bold text-emerald-800">
                        {form.bank_name} / {form.bank_code}
                      </p>
                    </div>
                  ) : null}

                  {bankSearchReady ? (
                    <div className="mt-2 rounded-[16px] bg-slate-50 p-2 ring-1 ring-slate-100">
                      <div className="max-h-[168px] space-y-1.5 overflow-y-auto">
                        {bankOptions.length > 0 ? (
                          bankOptions.map((bank) => (
                            <OptionButton
                              key={bank.code}
                              title={`${bank.name}（${bank.code}）`}
                              subtitle={
                                bank.kana || bank.hira || bank.roma || undefined
                              }
                              selected={form.bank_code === bank.code}
                              onClick={() => selectBank(bank)}
                            />
                          ))
                        ) : (
                          <p className="rounded-[14px] bg-white p-2 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
                            {bankLoading ? "検索中..." : "候補がありません"}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </Field>

                <Field
                  label="支店"
                  help={form.bank_code ? "支店名を入力してください" : "先に金融機関を選択してください"}
                >
                  <Input
                    value={branchQuery}
                    placeholder="例：渋谷 / 135"
                    disabled={!form.bank_code}
                    onChange={(event) => {
                      const nextValue = event.target.value;

                      setBranchQuery(nextValue);
                      setConfirmOpen(false);

                      if (form.branch_name && nextValue !== form.branch_name) {
                        setForm((current) => ({
                          ...current,
                          branch_name: "",
                          branch_code: "",
                        }));
                      }
                    }}
                    autoComplete="off"
                  />

                  {form.branch_code && form.branch_name ? (
                    <div className="mt-2 rounded-[14px] bg-emerald-50 p-2 ring-1 ring-emerald-100">
                      <p className="text-xs font-bold text-emerald-800">
                        {form.branch_name} / {form.branch_code}
                      </p>
                    </div>
                  ) : null}

                  {branchSearchReady ? (
                    <div className="mt-2 rounded-[16px] bg-slate-50 p-2 ring-1 ring-slate-100">
                      <div className="max-h-[168px] space-y-1.5 overflow-y-auto">
                        {branchOptions.length > 0 ? (
                          branchOptions.map((branch) => (
                            <OptionButton
                              key={branch.code}
                              title={`${branch.name}（${branch.code}）`}
                              subtitle={
                                branch.kana ||
                                branch.hira ||
                                branch.roma ||
                                undefined
                              }
                              selected={form.branch_code === branch.code}
                              onClick={() => selectBranch(branch)}
                            />
                          ))
                        ) : (
                          <p className="rounded-[14px] bg-white p-2 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
                            {branchLoading ? "検索中..." : "候補がありません"}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </Field>
              </div>
            </CollapsibleCard>

            <CollapsibleCard
              title="口座情報"
              subtitle="口座種別と口座番号を入力します"
              defaultOpen
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="口座種別">
                  <Select
                    value={form.account_type}
                    onChange={(event) => {
                      updateForm(
                        "account_type",
                        event.target.value === "checking"
                          ? "checking"
                          : "ordinary",
                      );
                      setConfirmOpen(false);
                    }}
                  >
                    <option value="ordinary">普通</option>
                    <option value="checking">当座</option>
                  </Select>
                </Field>

                <Field label="口座番号">
                  <Input
                    value={form.account_number}
                    placeholder="1234567"
                    inputMode="numeric"
                    onChange={(event) => {
                      updateForm(
                        "account_number",
                        normalizeDigits(event.target.value).slice(0, 7),
                      );
                      setConfirmOpen(false);
                    }}
                  />
                </Field>
              </div>
            </CollapsibleCard>

            <CollapsibleCard
              title="口座名義"
              subtitle="振込用名義はカタカナで保存されます"
              defaultOpen
            >
              <div className="space-y-4">
                <Field label="口座名義">
                  <Input
                    value={form.account_holder_name}
                    placeholder="例：山田 太郎"
                    onChange={(event) => {
                      updateForm("account_holder_name", event.target.value);
                      setConfirmOpen(false);
                    }}
                  />
                </Field>

                <Field
                  label="振込用口座名義"
                  help="確認時にカタカナへ整形します"
                >
                  <Input
                    value={form.account_holder_kana}
                    placeholder="例：ヤマダ タロウ"
                    onChange={(event) => {
                      updateForm("account_holder_kana", event.target.value);
                      setConfirmOpen(false);
                    }}
                    onBlur={() => {
                      updateForm(
                        "account_holder_kana",
                        normalizeTransferName(form.account_holder_kana),
                      );
                    }}
                  />
                </Field>
              </div>
            </CollapsibleCard>

            {confirmOpen ? (
              <div className="rounded-[16px] bg-slate-50/75 p-3 ring-1 ring-slate-100">
                <p className="text-[13px] font-bold text-slate-950">
                  この内容で保存します
                </p>

                <div className="mt-3 divide-y divide-slate-100 rounded-[14px] bg-white px-3 py-1 ring-1 ring-slate-100">
                  <DetailRow
                    label="金融機関"
                    value={`${form.bank_name} / ${form.bank_code}`}
                    strong
                  />
                  <DetailRow
                    label="支店"
                    value={`${form.branch_name} / ${form.branch_code}`}
                  />
                  <DetailRow
                    label="種別"
                    value={form.account_type === "checking" ? "当座" : "普通"}
                  />
                  <DetailRow label="口座番号" value={form.account_number} />
                  <DetailRow
                    label="口座名義"
                    value={form.account_holder_name}
                  />
                  <DetailRow
                    label="振込用名義"
                    value={form.account_holder_kana}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    disabled={saving}
                    className="h-11 rounded-full bg-white text-[13px] font-bold text-slate-700 ring-1 ring-slate-200 disabled:opacity-50"
                  >
                    戻る
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-11 rounded-full bg-[#ff5f67] text-[13px] font-bold text-white shadow-[0_10px_22px_rgba(255,95,103,0.18)] disabled:opacity-50"
                  >
                    {saving ? "保存中..." : "保存する"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="sticky bottom-[78px] z-20 rounded-[18px] bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 backdrop-blur">
              <div
                className={`grid gap-2 ${
                  hasSavedBankAccount && editing && !fromSignup
                    ? "grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                {hasSavedBankAccount && editing && !fromSignup ? (
                  <button
                    type="button"
                    onClick={resetFormToSavedProfile}
                    disabled={saving}
                    className="h-11 rounded-full bg-white text-[13px] font-bold text-slate-700 ring-1 ring-slate-200 disabled:opacity-50"
                  >
                    やめる
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleReview}
                  disabled={saving}
                  className="h-11 rounded-full bg-[#ff5f67] text-[13px] font-bold text-white shadow-[0_10px_22px_rgba(255,95,103,0.18)] disabled:opacity-50"
                >
                  {saving ? "保存中..." : "確認して保存"}
                </button>
              </div>
            </div>
          </div>
        </Surface>
      ) : null}

      {showNormalSections ? (
        <div className="space-y-3">
          <PayoutHero
            currentMonthAmount={currentMonthAmount}
            nextPayoutAmount={estimatedNextPayoutAmount}
            currentMonthCount={currentMonthOrders.length}
            nextPayoutCount={closedUnpaidOrders.length}
            currentMonthLabel={currentMonthLabel}
            nextPayoutDateLabel={nextPayoutDateLabel}
            locale={safeLocale}
          />

          <NextPayoutCard
            gross={nextPayoutGrossAmount}
            fee={estimatedBankFeeAmount}
            net={estimatedNextPayoutAmount}
            note={getPayoutNoteText()}
            payoutDateLabel={nextPayoutDateLabel}
            blockedReason={payoutBlockedReason}
            locale={safeLocale}
          />

          <BankAccountCard
            profile={profile}
            onEdit={() => {
              setEditing(true);
              setConfirmOpen(false);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
          />

          <CollapsibleCard
            title="今月完了した案件"
            subtitle={`今月の報酬に含まれる案件です。振込予定：${currentMonthPayoutDateLabel}`}
            badge={
              <StatusPill className="bg-slate-50 text-slate-600 ring-slate-100">
                {currentMonthOrders.length}件
              </StatusPill>
            }
          >
            <PayoutOrderList orders={currentMonthOrders} locale={safeLocale} />
          </CollapsibleCard>

          <CollapsibleCard
            title="次回振込予定の案件"
            subtitle={`${previousMonthLabel}以前に完了した未払い案件です`}
            badge={
              <StatusPill className="bg-slate-50 text-slate-600 ring-slate-100">
                {closedUnpaidOrders.length}件
              </StatusPill>
            }
          >
            <PayoutOrderList orders={closedUnpaidOrders} locale={safeLocale} />
          </CollapsibleCard>

          <CollapsibleCard
            title="支払い済みの案件"
            subtitle="過去に支払い済みになった案件です"
            badge={
              <StatusPill className="bg-slate-50 text-slate-600 ring-slate-100">
                {paidOrders.length}件
              </StatusPill>
            }
          >
            <PayoutOrderList orders={paidOrders} locale={safeLocale} />
          </CollapsibleCard>
        </div>
      ) : null}
    </main>
  );
}

function PayoutOrderList({
  orders,
  locale,
}: {
  orders: PayoutOrderRow[];
  locale: "ja" | "en";
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-[16px] bg-slate-50 px-4 py-5 text-center ring-1 ring-slate-100">
        <p className="text-[13px] font-bold text-slate-600">
          対象の案件はありません
        </p>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
          案件が完了するとここに表示されます。
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 rounded-[16px] bg-slate-50/45 ring-1 ring-slate-100">
      {orders.map((order) => (
        <div key={order.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-slate-950">
                {order.product_name || "案件名未設定"}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                完了日：
                {formatDate(order.completed_at || order.created_at, locale)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="whitespace-nowrap text-[13px] font-bold text-slate-950">
                {formatMoney(
                  order.creator_payout_amount,
                  order.currency,
                  locale,
                )}
              </p>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${getPayoutStatusTone(
                  order.payout_status,
                )}`}
              >
                {getPayoutStatusLabel(order.payout_status)}
              </span>
            </div>
          </div>

          {order.payout_paid_at ? (
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              支払日：{formatDate(order.payout_paid_at, locale)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
