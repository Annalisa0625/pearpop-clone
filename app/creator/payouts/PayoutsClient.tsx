// File: app/creator/payouts/PayoutsClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
    account_type: profile?.account_type === "checking" ? "checking" : "ordinary",
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
    String.fromCharCode(char.charCodeAt(0) + 0x60)
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
  locale: "ja" | "en"
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

function maskAccountNumber(value: string | null | undefined) {
  if (!value) return "-";
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length <= 3) return "•••";
  return `••••${digits.slice(-3)}`;
}

function getProfileLabel(status: PayoutProfile["status"] | null | undefined) {
  if (status === "verified" || status === "submitted") return "登録済み";
  if (status === "rejected") return "修正必要";
  return "未登録";
}

function getProfileTone(status: PayoutProfile["status"] | null | undefined) {
  if (status === "verified" || status === "submitted") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  return "bg-amber-50 text-amber-700 ring-amber-100";
}

function LoadingView() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-5">
      <div className="h-24 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
      <div className="mt-3 h-72 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
    </main>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-1.5 text-[13px] font-black text-slate-900">{label}</p>
      {children}
      {help ? (
        <p className="mt-1.5 text-[11px] font-bold leading-5 text-slate-400">
          {help}
        </p>
      ) : null}
    </label>
  );
}

function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[16px] font-bold text-slate-950 outline-none placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100 ${className}`}
    />
  );
}

function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[16px] font-bold text-slate-950 outline-none focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100 ${className}`}
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
          ? "bg-red-50 text-red-900 ring-red-100"
          : "bg-amber-50 text-amber-900 ring-amber-100";

  return (
    <div className={`rounded-2xl p-3 ring-1 ${cls}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-bold leading-5 opacity-80">{body}</p>
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
      className={`w-full rounded-xl p-2.5 text-left ring-1 transition ${
        selected
          ? "bg-emerald-50 ring-emerald-200"
          : "bg-white ring-slate-100 hover:bg-slate-50"
      }`}
    >
      <p className="text-[13px] font-black text-slate-950">{title}</p>
      {subtitle ? (
        <p className="mt-0.5 text-[11px] font-bold text-slate-400">{subtitle}</p>
      ) : null}
    </button>
  );
}

function SmallInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value || "-"}
      </p>
    </div>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M5 18h14M12 4l8 4H4l8-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

  const hasSavedBankAccount = Boolean(profile?.bank_name || profile?.account_number);
  const showSetupForm = !hasSavedBankAccount || editing || fromSignup;

  const pendingAmount = orders
    .filter((order) => order.payout_status === "pending")
    .reduce((sum, order) => sum + Number(order.creator_payout_amount ?? 0), 0);

  const paidAmount = orders
    .filter((order) => order.payout_status === "paid")
    .reduce((sum, order) => sum + Number(order.creator_payout_amount ?? 0), 0);

  const totalAmount = orders.reduce(
    (sum, order) => sum + Number(order.creator_payout_amount ?? 0),
    0
  );

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
          setErrorMsg("報酬受け取り情報の取得に失敗しました。");
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
            "id, creator_id, user_id, payout_method, status, bank_name, bank_code, branch_name, branch_code, account_type, account_number, account_holder_name, account_holder_kana, submitted_at, verified_at, rejected_at, admin_note"
          )
          .eq("creator_id", typedCreator.id)
          .maybeSingle();

        if (payoutProfileError) {
          console.error({ payoutProfileError });
          setErrorMsg("報酬受け取り情報の取得に失敗しました。");
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

        const { data: payoutOrderRows, error: payoutOrdersError } = await db
          .from("orders")
          .select(
            "id, product_name, status, payment_status, creator_payout_amount, currency, completed_at, payout_status, payout_due_at, payout_paid_at, created_at"
          )
          .eq("creator_user_id", user.id)
          .eq("status", "completed")
          .eq("payment_status", "captured")
          .order("completed_at", { ascending: false, nullsFirst: false })
          .limit(20);

        if (payoutOrdersError) {
          console.error({ payoutOrdersError });
        }

        setOrders((payoutOrderRows ?? []) as PayoutOrderRow[]);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErrorMsg("報酬受け取り情報の取得に失敗しました。");
        setLoading(false);
      }
    };

    void load();
  }, [db, supabase.auth]);

  useEffect(() => {
    if (!showSetupForm) return;

    let active = true;

    const run = async () => {
      setBankLoading(true);

      try {
        const params = new URLSearchParams({
          q: bankQuery,
          limit: "15",
        });

        const res = await fetch(`/api/banks/search?${params.toString()}`, {
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
  }, [bankQuery, showSetupForm]);

  useEffect(() => {
    if (!showSetupForm) return;

    let active = true;

    const run = async () => {
      if (!form.bank_code) {
        setBranchOptions([]);
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
          }
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
  }, [branchQuery, form.bank_code, showSetupForm]);

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
            "id, creator_id, user_id, payout_method, status, bank_name, bank_code, branch_name, branch_code, account_type, account_number, account_holder_name, account_holder_kana, submitted_at, verified_at, rejected_at, admin_note"
          )
          .single();
      } else {
        result = await db
          .from("creator_payout_profiles")
          .insert(payload)
          .select(
            "id, creator_id, user_id, payout_method, status, bank_name, bank_code, branch_name, branch_code, account_type, account_number, account_holder_name, account_holder_kana, submitted_at, verified_at, rejected_at, admin_note"
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
      setSuccessMsg("報酬受け取り設定を保存しました。");
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
      <section className="mb-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff5f67]">
              Payout settings
            </p>
            <h1 className="mt-1 text-[26px] font-black leading-tight tracking-[-0.06em] text-slate-950">
              報酬受け取り設定
            </h1>
            <p className="mt-2 text-[13px] font-bold leading-6 text-slate-500">
              銀行口座を登録すると、メニューが企業向けに公開されます。
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${getProfileTone(
              profile?.status
            )}`}
          >
            {getProfileLabel(profile?.status)}
          </span>
        </div>
      </section>

      {fromSignup ? (
        <div className="mb-3">
          <Alert
            tone={requiredFromSignup ? "amber" : "blue"}
            title="登録の最終ステップ"
            body="報酬を受け取る銀行口座を登録してください。登録後、ホームへ進みます。"
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

      {showSetupForm ? (
        <section className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4">
            <h2 className="text-[20px] font-black tracking-[-0.05em] text-slate-950">
              銀行口座
            </h2>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
              銀行・支店は検索して選択してください。
            </p>
          </div>

          <div className="space-y-4">
            <Field label="金融機関" help="銀行名または銀行コードで検索">
              <Input
                value={bankQuery}
                placeholder="例：三菱UFJ / 0005"
                onChange={(event) => {
                  setBankQuery(event.target.value);
                  setConfirmOpen(false);
                }}
                autoComplete="off"
              />

              <div className="mt-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
                {form.bank_code && form.bank_name ? (
                  <div className="mb-2 rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
                    <p className="text-xs font-black text-emerald-800">
                      選択中：{form.bank_name} / {form.bank_code}
                    </p>
                  </div>
                ) : null}

                <div className="max-h-[168px] space-y-1.5 overflow-y-auto">
                  {bankOptions.length > 0 ? (
                    bankOptions.map((bank) => (
                      <OptionButton
                        key={bank.code}
                        title={`${bank.name}（${bank.code}）`}
                        subtitle={bank.kana || bank.hira || bank.roma || undefined}
                        selected={form.bank_code === bank.code}
                        onClick={() => selectBank(bank)}
                      />
                    ))
                  ) : (
                    <p className="rounded-xl bg-white p-2 text-xs font-bold text-slate-400 ring-1 ring-slate-100">
                      {bankLoading ? "検索中..." : "候補がありません"}
                    </p>
                  )}
                </div>
              </div>
            </Field>

            <Field label="支店" help="支店名または支店コードで検索">
              <Input
                value={branchQuery}
                placeholder="例：渋谷 / 135"
                disabled={!form.bank_code}
                onChange={(event) => {
                  setBranchQuery(event.target.value);
                  setConfirmOpen(false);
                }}
                autoComplete="off"
              />

              <div className="mt-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
                {form.branch_code && form.branch_name ? (
                  <div className="mb-2 rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
                    <p className="text-xs font-black text-emerald-800">
                      選択中：{form.branch_name} / {form.branch_code}
                    </p>
                  </div>
                ) : null}

                <div className="max-h-[168px] space-y-1.5 overflow-y-auto">
                  {!form.bank_code ? (
                    <p className="rounded-xl bg-white p-2 text-xs font-bold text-slate-400 ring-1 ring-slate-100">
                      先に金融機関を選択してください
                    </p>
                  ) : branchOptions.length > 0 ? (
                    branchOptions.map((branch) => (
                      <OptionButton
                        key={branch.code}
                        title={`${branch.name}（${branch.code}）`}
                        subtitle={branch.kana || branch.hira || branch.roma || undefined}
                        selected={form.branch_code === branch.code}
                        onClick={() => selectBranch(branch)}
                      />
                    ))
                  ) : (
                    <p className="rounded-xl bg-white p-2 text-xs font-bold text-slate-400 ring-1 ring-slate-100">
                      {branchLoading ? "検索中..." : "候補がありません"}
                    </p>
                  )}
                </div>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="口座種別">
                <Select
                  value={form.account_type}
                  onChange={(event) => {
                    updateForm(
                      "account_type",
                      event.target.value === "checking" ? "checking" : "ordinary"
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
                      normalizeDigits(event.target.value).slice(0, 7)
                    );
                    setConfirmOpen(false);
                  }}
                />
              </Field>
            </div>

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
              help="カナ・英数字・スペース中心。ひらがなは自動変換します。"
            >
              <Input
                value={form.account_holder_kana}
                placeholder="例：ヤマダ タロウ"
                onChange={(event) => {
                  updateForm(
                    "account_holder_kana",
                    normalizeTransferName(event.target.value)
                  );
                  setConfirmOpen(false);
                }}
              />
            </Field>

            {confirmOpen ? (
              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-sm font-black text-slate-950">
                  この内容で保存します
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <SmallInfo label="金融機関" value={`${form.bank_name} / ${form.bank_code}`} />
                  <SmallInfo label="支店" value={`${form.branch_name} / ${form.branch_code}`} />
                  <SmallInfo
                    label="種別"
                    value={form.account_type === "checking" ? "当座" : "普通"}
                  />
                  <SmallInfo label="口座番号" value={form.account_number} />
                  <SmallInfo label="口座名義" value={form.account_holder_name} />
                  <SmallInfo label="振込用名義" value={form.account_holder_kana} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    disabled={saving}
                    className="h-12 rounded-full bg-white text-sm font-black text-slate-700 ring-1 ring-slate-200 disabled:opacity-50"
                  >
                    戻る
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 rounded-full bg-[#ff3860] text-sm font-black text-white shadow-[0_10px_24px_rgba(255,56,96,0.24)] disabled:opacity-50"
                  >
                    {saving ? "保存中..." : "保存する"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="sticky bottom-[78px] z-20 rounded-[22px] bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 backdrop-blur">
              <div
                className={`grid gap-2 ${
                  hasSavedBankAccount && editing && !fromSignup ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {hasSavedBankAccount && editing && !fromSignup ? (
                  <button
                    type="button"
                    onClick={resetFormToSavedProfile}
                    disabled={saving}
                    className="h-12 rounded-full bg-white text-sm font-black text-slate-700 ring-1 ring-slate-200 disabled:opacity-50"
                  >
                    やめる
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleReview}
                  disabled={saving}
                  className="h-12 rounded-full bg-[#ff3860] text-sm font-black text-white shadow-[0_10px_24px_rgba(255,56,96,0.24)] disabled:opacity-50"
                >
                  {saving ? "保存中..." : "確認して保存"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!fromSignup ? (
        <>
          <section className="mt-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-black tracking-[-0.05em] text-slate-950">
                登録済み口座
              </h2>

              {hasSavedBankAccount && !showSetupForm ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setConfirmOpen(false);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-100"
                >
                  変更
                </button>
              ) : null}
            </div>

            {profile?.bank_name || profile?.account_number ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <SmallInfo
                  label="金融機関"
                  value={
                    profile.bank_code
                      ? `${profile.bank_name || "-"} / ${profile.bank_code}`
                      : profile.bank_name || "-"
                  }
                />
                <SmallInfo
                  label="支店"
                  value={
                    profile.branch_code
                      ? `${profile.branch_name || "-"} / ${profile.branch_code}`
                      : profile.branch_name || "-"
                  }
                />
                <SmallInfo
                  label="種別"
                  value={profile.account_type === "checking" ? "当座" : "普通"}
                />
                <SmallInfo label="口座番号" value={maskAccountNumber(profile.account_number)} />
                <SmallInfo label="口座名義" value={profile.account_holder_name || "-"} />
                <SmallInfo label="振込用名義" value={profile.account_holder_kana || "-"} />
              </div>
            ) : (
              <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-100">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 ring-1 ring-slate-100">
                  <BankIcon />
                </div>
                <p className="mt-3 text-sm font-black text-slate-950">
                  まだ銀行口座が登録されていません
                </p>
              </div>
            )}
          </section>

          <section className="mt-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-[20px] font-black tracking-[-0.05em] text-slate-950">
              報酬
            </h2>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <SmallInfo
                label="予定"
                value={formatMoney(pendingAmount, "JPY", safeLocale)}
              />
              <SmallInfo
                label="支払済"
                value={formatMoney(paidAmount, "JPY", safeLocale)}
              />
              <SmallInfo
                label="合計"
                value={formatMoney(totalAmount, "JPY", safeLocale)}
              />
            </div>
          </section>

          {orders.length > 0 ? (
            <section className="mt-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <h2 className="text-[20px] font-black tracking-[-0.05em] text-slate-950">
                報酬履歴
              </h2>

              <div className="mt-3 space-y-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {order.product_name || "案件名未設定"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {formatDate(order.completed_at || order.created_at, safeLocale)}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-black text-slate-950">
                        {formatMoney(
                          order.creator_payout_amount,
                          order.currency,
                          safeLocale
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}