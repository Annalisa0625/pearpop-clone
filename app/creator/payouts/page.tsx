// File: app/creator/payouts/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorBadge,
  CreatorButton,
  CreatorCard,
  CreatorEmptyState,
  CreatorField,
  CreatorHero,
  CreatorInput,
  CreatorMiniInfo,
  CreatorNotice,
  CreatorPage,
  CreatorSection,
  CreatorSelect,
  CreatorSkeleton,
  CreatorStickyFooter,
} from "@/app/creator/_components/CreatorDesignSystem";

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
  return value.replace(/[^\d]/g, "");
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

function getProfileStatusMeta(
  status: PayoutProfile["status"] | null | undefined,
  locale: "ja" | "en"
): {
  label: string;
  title: string;
  body: string;
  tone: "green" | "blue" | "amber" | "red" | "slate";
} {
  const normalized = status || "not_submitted";

  if (locale === "ja") {
    if (normalized === "verified") {
      return {
        label: "登録済み",
        title: "報酬受け取り設定は完了しています",
        body: "案件完了後の報酬は、登録済みの銀行口座へ月末締めでお支払いします。",
        tone: "green",
      };
    }

    if (normalized === "submitted") {
      return {
        label: "登録済み",
        title: "銀行口座情報を受け付けました",
        body: "報酬の振込先として保存されています。変更がある場合はこの画面から更新できます。",
        tone: "blue",
      };
    }

    if (normalized === "rejected") {
      return {
        label: "修正が必要",
        title: "銀行口座情報の確認が必要です",
        body: "口座情報に誤りがある可能性があります。内容を確認して再登録してください。",
        tone: "red",
      };
    }

    return {
      label: "未登録",
      title: "報酬受け取り設定が未完了です",
      body: "注文を受けるには、報酬を受け取る銀行口座の登録が必要です。",
      tone: "amber",
    };
  }

  if (normalized === "verified") {
    return {
      label: "Ready",
      title: "Payout setup is complete",
      body: "Your completed order payouts will be sent to your registered bank account.",
      tone: "green",
    };
  }

  if (normalized === "submitted") {
    return {
      label: "Submitted",
      title: "Bank account saved",
      body: "Your bank account is saved for manual payout processing.",
      tone: "blue",
    };
  }

  if (normalized === "rejected") {
    return {
      label: "Needs update",
      title: "Please review your bank account",
      body: "There may be an issue with your bank account information.",
      tone: "red",
    };
  }

  return {
    label: "Not set",
    title: "Payout setup is not complete",
    body: "Please register your bank account before accepting paid orders.",
    tone: "amber",
  };
}

function getPayoutStatusMeta(
  status: PayoutOrderRow["payout_status"],
  locale: "ja" | "en"
): {
  label: string;
  tone: "green" | "blue" | "amber" | "red" | "slate";
} {
  const normalized = status || "unpaid";

  if (locale === "ja") {
    if (normalized === "paid") return { label: "支払済み", tone: "green" };
    if (normalized === "pending") return { label: "支払予定", tone: "blue" };
    if (normalized === "withheld") return { label: "保留中", tone: "amber" };
    if (normalized === "failed") return { label: "確認が必要", tone: "red" };
    return { label: "未確定", tone: "slate" };
  }

  if (normalized === "paid") return { label: "Paid", tone: "green" };
  if (normalized === "pending") return { label: "Scheduled", tone: "blue" };
  if (normalized === "withheld") return { label: "On hold", tone: "amber" };
  if (normalized === "failed") return { label: "Needs check", tone: "red" };
  return { label: "Not ready", tone: "slate" };
}

function maskAccountNumber(value: string | null | undefined) {
  if (!value) return "-";
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length <= 3) return "•••";
  return `••••${digits.slice(-3)}`;
}

function LoadingView() {
  return (
    <CreatorPage>
      <CreatorSkeleton className="h-40" />
      <CreatorSkeleton className="h-52" />
      <CreatorSkeleton className="h-56" />
    </CreatorPage>
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

function YenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m7 5 5 7 5-7M12 12v7M8 13h8M8 16h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M12 3v18M17 6.5c-.9-1-2.5-1.7-4.2-1.7-2.4 0-4.3 1.2-4.3 3.1 0 2.2 2.2 2.8 4.5 3.3 2.2.5 4.2 1.1 4.2 3.4 0 2-1.9 3.3-4.5 3.3-2.1 0-3.9-.8-4.9-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PayoutHistoryRow({
  order,
  locale,
}: {
  order: PayoutOrderRow;
  locale: "ja" | "en";
}) {
  const statusMeta = getPayoutStatusMeta(order.payout_status, locale);

  return (
    <div className="rounded-[24px] bg-[#F8F9FA] p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <CreatorBadge tone={statusMeta.tone}>{statusMeta.label}</CreatorBadge>
          </div>

          <p className="truncate text-[16px] font-black tracking-[-0.04em] text-slate-950">
            {order.product_name || (locale === "ja" ? "案件名未設定" : "Untitled order")}
          </p>

          <p className="mt-1.5 text-xs font-bold text-slate-400">
            {locale === "ja" ? "完了日" : "Completed"}：
            {formatDate(order.completed_at || order.created_at, locale)}
          </p>

          {order.payout_due_at ? (
            <p className="mt-1 text-xs font-bold text-slate-400">
              {locale === "ja" ? "振込予定日" : "Payout due"}：
              {formatDate(order.payout_due_at, locale)}
            </p>
          ) : null}

          {order.payout_paid_at ? (
            <p className="mt-1 text-xs font-bold text-slate-400">
              {locale === "ja" ? "支払日" : "Paid at"}：
              {formatDate(order.payout_paid_at, locale)}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[17px] font-black tracking-[-0.05em] text-slate-950">
            {formatMoney(order.creator_payout_amount, order.currency, locale)}
          </p>
          <p className="mt-1 text-[11px] font-black text-slate-400">
            {locale === "ja" ? "報酬" : "Payout"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CreatorPayoutsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const db = supabase as any;

  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";

  const [creator, setCreator] = useState<CreatorRow | null>(null);
  const [profile, setProfile] = useState<PayoutProfile | null>(null);
  const [form, setForm] = useState<FormState>(createEmptyForm());
  const [orders, setOrders] = useState<PayoutOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loginRequired: "ログインしてください。",
            creatorNotFound: "インフルエンサー情報が見つかりませんでした。",
            loadFailed: "報酬受け取り情報の取得に失敗しました。",
            saveFailed: "保存に失敗しました。入力内容を確認して、もう一度お試しください。",
            saved: "報酬受け取り設定を保存しました。",

            title: "報酬受け取り設定",
            subtitle:
              "案件完了後の報酬を受け取るため、振込先の銀行口座を登録してください。",
            heroEyebrow: "Payout settings",

            setupTitle: "銀行口座を登録",
            setupDescription:
              "初期版ではStripe Connectではなく、月末締めの銀行振込で報酬をお支払いします。",
            requiredNoticeTitle: "注文を受ける前に必要です",
            requiredNoticeBody:
              "銀行口座が未登録の場合、有料案件を受けることができません。先に振込先を登録してください。",

            bankName: "金融機関名",
            bankNamePlaceholder: "例：GMOあおぞらネット銀行",
            bankCode: "金融機関コード",
            bankCodePlaceholder: "例：0310",
            branchName: "支店名",
            branchNamePlaceholder: "例：法人営業部",
            branchCode: "支店コード",
            branchCodePlaceholder: "例：101",
            accountType: "口座種別",
            ordinary: "普通",
            checking: "当座",
            accountNumber: "口座番号",
            accountNumberPlaceholder: "例：1234567",
            accountHolderName: "口座名義",
            accountHolderNamePlaceholder: "例：ヤマダ タロウ",
            accountHolderKana: "口座名義カナ",
            accountHolderKanaPlaceholder: "例：ヤマダ タロウ",

            bankNameHelp: "銀行名・信用金庫名などを入力してください。",
            bankCodeHelp: "分かる場合のみ入力してください。後からでも変更できます。",
            branchCodeHelp: "分かる場合のみ入力してください。",
            accountHolderHelp:
              "振込エラー防止のため、銀行口座に登録されている名義と同じ表記で入力してください。",

            save: "保存する",
            saving: "保存中...",

            currentTitle: "現在の登録内容",
            noBankInfo: "まだ銀行口座が登録されていません。",
            maskedAccount: "口座番号",
            submittedAt: "登録日",

            summaryTitle: "報酬サマリー",
            pendingAmount: "支払予定",
            paidAmount: "支払済み",
            totalAmount: "完了報酬",
            pendingHelper: "月末締めで支払い予定",
            paidHelper: "支払済みに更新された金額",
            totalHelper: "完了済み案件の報酬合計",

            historyTitle: "報酬履歴",
            historyDescription:
              "完了済み案件の報酬と支払い状況を確認できます。",
            noHistoryTitle: "まだ報酬履歴はありません",
            noHistoryBody:
              "案件が完了し、企業が承認すると報酬予定として表示されます。",

            privacyTitle: "口座情報の取り扱い",
            privacyBody:
              "登録された銀行口座情報は、報酬支払いのためにのみ使用します。変更がある場合は、振込前に必ず更新してください。",
          }
        : {
            loginRequired: "Please log in.",
            creatorNotFound: "Influencer profile was not found.",
            loadFailed: "Failed to load payout information.",
            saveFailed: "Failed to save payout settings. Please check your input.",
            saved: "Payout settings saved.",

            title: "Payout settings",
            subtitle:
              "Register your bank account to receive payouts after completed orders.",
            heroEyebrow: "Payout settings",

            setupTitle: "Register bank account",
            setupDescription:
              "For the initial release, payouts are processed by monthly bank transfer instead of Stripe Connect.",
            requiredNoticeTitle: "Required before accepting orders",
            requiredNoticeBody:
              "You need to register a bank account before accepting paid orders.",

            bankName: "Bank name",
            bankNamePlaceholder: "Example: GMO Aozora Net Bank",
            bankCode: "Bank code",
            bankCodePlaceholder: "Example: 0310",
            branchName: "Branch name",
            branchNamePlaceholder: "Example: Main branch",
            branchCode: "Branch code",
            branchCodePlaceholder: "Example: 101",
            accountType: "Account type",
            ordinary: "Ordinary",
            checking: "Checking",
            accountNumber: "Account number",
            accountNumberPlaceholder: "Example: 1234567",
            accountHolderName: "Account holder name",
            accountHolderNamePlaceholder: "Example: TARO YAMADA",
            accountHolderKana: "Account holder kana",
            accountHolderKanaPlaceholder: "Example: TARO YAMADA",

            bankNameHelp: "Enter your bank or credit union name.",
            bankCodeHelp: "Optional. You can update it later.",
            branchCodeHelp: "Optional. You can update it later.",
            accountHolderHelp:
              "Use the exact account holder name registered with your bank.",

            save: "Save",
            saving: "Saving...",

            currentTitle: "Current bank account",
            noBankInfo: "No bank account has been registered yet.",
            maskedAccount: "Account number",
            submittedAt: "Submitted",

            summaryTitle: "Payout summary",
            pendingAmount: "Scheduled",
            paidAmount: "Paid",
            totalAmount: "Completed payout",
            pendingHelper: "Scheduled for monthly payout",
            paidHelper: "Amount marked as paid",
            totalHelper: "Total payout from completed orders",

            historyTitle: "Payout history",
            historyDescription:
              "Check completed order payouts and payment status.",
            noHistoryTitle: "No payout history yet",
            noHistoryBody:
              "Completed and approved orders will appear here as scheduled payouts.",

            privacyTitle: "Bank account handling",
            privacyBody:
              "Your bank account is used only for payout processing. Please update it before payout if anything changes.",
          },
    [safeLocale]
  );

  const profileMeta = getProfileStatusMeta(profile?.status, safeLocale);

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
          setErrorMsg(copy.loginRequired);
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
          setErrorMsg(copy.loadFailed);
          setLoading(false);
          return;
        }

        if (!creatorRow) {
          setErrorMsg(copy.creatorNotFound);
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
          setErrorMsg(copy.loadFailed);
          setLoading(false);
          return;
        }

        const typedProfile = (payoutProfileRow ?? null) as PayoutProfile | null;
        setProfile(typedProfile);
        setForm(profileToForm(typedProfile));

        const { data: payoutOrderRows, error: payoutOrdersError } = await db
          .from("orders")
          .select(
            "id, product_name, status, payment_status, creator_payout_amount, currency, completed_at, payout_status, payout_due_at, payout_paid_at, created_at"
          )
          .eq("creator_user_id", user.id)
          .eq("status", "completed")
          .eq("payment_status", "captured")
          .order("completed_at", { ascending: false, nullsFirst: false })
          .limit(50);

        if (payoutOrdersError) {
          console.error({ payoutOrdersError });
          setErrorMsg(copy.loadFailed);
          setLoading(false);
          return;
        }

        setOrders((payoutOrderRows ?? []) as PayoutOrderRow[]);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErrorMsg(copy.loadFailed);
        setLoading(false);
      }
    };

    void load();
  }, [copy.creatorNotFound, copy.loadFailed, copy.loginRequired, db, supabase.auth]);

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const validateForm = () => {
    if (!form.bank_name.trim()) return copy.bankName;
    if (!form.branch_name.trim()) return copy.branchName;
    if (!form.account_number.trim()) return copy.accountNumber;
    if (!form.account_holder_name.trim()) return copy.accountHolderName;
    return null;
  };

  const handleSave = async () => {
    if (!creator) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const missingLabel = validateForm();
    if (missingLabel) {
      setErrorMsg(
        safeLocale === "ja"
          ? `${missingLabel}を入力してください。`
          : `Please enter ${missingLabel}.`
      );
      setSaving(false);
      return;
    }

    try {
      const nowIso = new Date().toISOString();

      const payload = {
        creator_id: creator.id,
        user_id: creator.user_id,
        payout_method: "manual_bank_transfer",
        status: "submitted",
        bank_name: form.bank_name.trim(),
        bank_code: normalizeDigits(form.bank_code),
        branch_name: form.branch_name.trim(),
        branch_code: normalizeDigits(form.branch_code),
        account_type: form.account_type,
        account_number: normalizeDigits(form.account_number),
        account_holder_name: form.account_holder_name.trim(),
        account_holder_kana: form.account_holder_kana.trim(),
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
        setErrorMsg(copy.saveFailed);
        setSaving(false);
        return;
      }

      const savedProfile = result.data as PayoutProfile;
      setProfile(savedProfile);
      setForm(profileToForm(savedProfile));
      setSuccessMsg(copy.saved);
      setSaving(false);
    } catch (e) {
      console.error(e);
      setErrorMsg(copy.saveFailed);
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView />;
  }

  return (
    <CreatorPage>
      <CreatorHero
        title={copy.title}
        description={copy.subtitle}
        eyebrow={copy.heroEyebrow}
        right={<CreatorBadge tone={profileMeta.tone}>{profileMeta.label}</CreatorBadge>}
      >
        <div className="rounded-[24px] bg-white/75 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-rose-50 text-[#FF3B5C] ring-1 ring-rose-100">
              <BankIcon />
            </span>
            <div className="min-w-0">
              <p className="text-[16px] font-black tracking-[-0.04em] text-slate-950">
                {profileMeta.title}
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-500">
                {profileMeta.body}
              </p>
            </div>
          </div>
        </div>
      </CreatorHero>

      {errorMsg ? (
        <CreatorNotice tone="red" title={safeLocale === "ja" ? "エラー" : "Error"} description={errorMsg} />
      ) : null}

      {successMsg ? (
        <CreatorNotice tone="green" title={safeLocale === "ja" ? "保存しました" : "Saved"} description={successMsg} />
      ) : null}

      {profile?.status === "not_submitted" || !profile ? (
        <CreatorNotice
          tone="amber"
          title={copy.requiredNoticeTitle}
          description={copy.requiredNoticeBody}
        />
      ) : null}

      <CreatorSection title={copy.setupTitle} description={copy.setupDescription}>
        <div className="space-y-4">
          <CreatorField label={copy.bankName} help={copy.bankNameHelp}>
            <CreatorInput
              value={form.bank_name}
              placeholder={copy.bankNamePlaceholder}
              onChange={(event) => updateForm("bank_name", event.target.value)}
              autoComplete="organization"
            />
          </CreatorField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CreatorField label={copy.bankCode} help={copy.bankCodeHelp}>
              <CreatorInput
                value={form.bank_code}
                placeholder={copy.bankCodePlaceholder}
                inputMode="numeric"
                onChange={(event) =>
                  updateForm("bank_code", normalizeDigits(event.target.value).slice(0, 4))
                }
              />
            </CreatorField>

            <CreatorField label={copy.branchCode} help={copy.branchCodeHelp}>
              <CreatorInput
                value={form.branch_code}
                placeholder={copy.branchCodePlaceholder}
                inputMode="numeric"
                onChange={(event) =>
                  updateForm("branch_code", normalizeDigits(event.target.value).slice(0, 3))
                }
              />
            </CreatorField>
          </div>

          <CreatorField label={copy.branchName}>
            <CreatorInput
              value={form.branch_name}
              placeholder={copy.branchNamePlaceholder}
              onChange={(event) => updateForm("branch_name", event.target.value)}
            />
          </CreatorField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CreatorField label={copy.accountType}>
              <CreatorSelect
                value={form.account_type}
                onChange={(event) =>
                  updateForm(
                    "account_type",
                    event.target.value === "checking" ? "checking" : "ordinary"
                  )
                }
              >
                <option value="ordinary">{copy.ordinary}</option>
                <option value="checking">{copy.checking}</option>
              </CreatorSelect>
            </CreatorField>

            <CreatorField label={copy.accountNumber}>
              <CreatorInput
                value={form.account_number}
                placeholder={copy.accountNumberPlaceholder}
                inputMode="numeric"
                onChange={(event) =>
                  updateForm("account_number", normalizeDigits(event.target.value).slice(0, 8))
                }
              />
            </CreatorField>
          </div>

          <CreatorField label={copy.accountHolderName} help={copy.accountHolderHelp}>
            <CreatorInput
              value={form.account_holder_name}
              placeholder={copy.accountHolderNamePlaceholder}
              onChange={(event) => updateForm("account_holder_name", event.target.value)}
            />
          </CreatorField>

          <CreatorField label={copy.accountHolderKana}>
            <CreatorInput
              value={form.account_holder_kana}
              placeholder={copy.accountHolderKanaPlaceholder}
              onChange={(event) => updateForm("account_holder_kana", event.target.value)}
            />
          </CreatorField>

          <CreatorStickyFooter>
            <CreatorButton
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? copy.saving : copy.save}
            </CreatorButton>
          </CreatorStickyFooter>
        </div>
      </CreatorSection>

      <CreatorSection title={copy.currentTitle}>
        {profile?.bank_name || profile?.account_number ? (
          <CreatorCard tone="soft" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CreatorMiniInfo
                label={copy.bankName}
                value={profile.bank_name || "-"}
                strong
              />
              <CreatorMiniInfo
                label={copy.branchName}
                value={profile.branch_name || "-"}
                strong
              />
              <CreatorMiniInfo
                label={copy.accountType}
                value={
                  profile.account_type === "checking" ? copy.checking : copy.ordinary
                }
                strong
              />
              <CreatorMiniInfo
                label={copy.maskedAccount}
                value={maskAccountNumber(profile.account_number)}
                strong
              />
              <CreatorMiniInfo
                label={copy.accountHolderName}
                value={profile.account_holder_name || "-"}
                strong
              />
              <CreatorMiniInfo
                label={copy.submittedAt}
                value={formatDate(profile.submitted_at, safeLocale)}
                strong
              />
            </div>
          </CreatorCard>
        ) : (
          <CreatorEmptyState title={copy.noBankInfo} icon={<BankIcon />} />
        )}
      </CreatorSection>

      <CreatorSection title={copy.summaryTitle}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CreatorCard tone="soft">
            <CreatorMiniInfo
              label={copy.pendingAmount}
              value={formatMoney(pendingAmount, "JPY", safeLocale)}
              strong
            />
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              {copy.pendingHelper}
            </p>
          </CreatorCard>

          <CreatorCard tone="soft">
            <CreatorMiniInfo
              label={copy.paidAmount}
              value={formatMoney(paidAmount, "JPY", safeLocale)}
              strong
            />
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              {copy.paidHelper}
            </p>
          </CreatorCard>

          <CreatorCard tone="soft">
            <CreatorMiniInfo
              label={copy.totalAmount}
              value={formatMoney(totalAmount, "JPY", safeLocale)}
              strong
            />
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              {copy.totalHelper}
            </p>
          </CreatorCard>
        </div>
      </CreatorSection>

      <CreatorSection
        title={copy.historyTitle}
        description={copy.historyDescription}
        right={
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-[#FF3B5C] ring-1 ring-rose-100">
            <YenIcon />
          </span>
        }
      >
        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <PayoutHistoryRow key={order.id} order={order} locale={safeLocale} />
            ))}
          </div>
        ) : (
          <CreatorEmptyState
            icon={<EmptyIcon />}
            title={copy.noHistoryTitle}
            description={copy.noHistoryBody}
          />
        )}
      </CreatorSection>

      <CreatorNotice
        tone="slate"
        title={copy.privacyTitle}
        description={copy.privacyBody}
      />
    </CreatorPage>
  );
}