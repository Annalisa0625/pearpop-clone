// File: app/b/profile/page.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type Company = {
  id: string;
  user_id: string;
  company_name: string | null;
  description: string | null;
  contact_email: string | null;
  approval_status: string | null;
  created_at: string;
};

type FormState = {
  company_name: string;
  description: string;
  contact_email: string;
};

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
}

function getApprovalLabel(value: string | null | undefined, locale: "ja" | "en") {
  const status = (value ?? "").trim().toLowerCase();

  if (locale === "ja") {
    if (status === "approved") return "利用できます";
    if (status === "pending") return "確認中";
    if (status === "rejected") return "確認が必要";
    return "未設定";
  }

  if (status === "approved") return "Available";
  if (status === "pending") return "Reviewing";
  if (status === "rejected") return "Needs review";
  return "Not set";
}

function getApprovalClass(value: string | null | undefined) {
  const status = (value ?? "").trim().toLowerCase();

  if (status === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-800 ring-amber-100";
  }

  if (status === "rejected") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-sm font-black text-slate-800">
      {children}
    </label>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold leading-7 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3.5 last:border-b-0">
      <span className="text-sm font-bold text-slate-400">{label}</span>
      <span className="max-w-[65%] truncate text-right text-sm font-black text-slate-950">
        {value}
      </span>
    </div>
  );
}

function QuickLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-[22px] bg-slate-50 px-4 py-4 transition hover:bg-white hover:shadow-[0_14px_40px_rgba(15,23,42,0.06)]"
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-950">
          {title}
        </span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-400">
          {body}
        </span>
      </span>

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-500 transition group-hover:bg-slate-950 group-hover:text-white">
        →
      </span>
    </Link>
  );
}

function SectionCard({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] md:p-6">
      <div>
        <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
          {title}
        </h2>
        {body ? (
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            {body}
          </p>
        ) : null}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function BProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "アカウント設定",
            subtitle:
              "企業名、連絡先、会社説明を管理できます。注文やインフルエンサーとのやり取りに使われる基本情報です。",
            statusLabel: "ステータス",
            companyName: "会社名",
            companyNamePlaceholder: "例）株式会社○○",
            description: "会社説明",
            descriptionPlaceholder:
              "例）自社サービス、取扱い商材、インフルエンサーに依頼したい内容など",
            contactEmail: "連絡先メール",
            contactEmailPlaceholder: "example@company.jp",
            save: "保存する",
            saving: "保存中...",
            saved: "保存しました。",
            loginRequired: "ログインしてください",
            fetchFailed: "企業情報の取得に失敗しました。",
            saveFailed: "企業情報の保存に失敗しました。",
            companyNameRequired: "会社名を入力してください。",
            emailRequired: "連絡先メールを入力してください。",
            emailInvalid: "メールアドレスの形式が正しくありません。",
            formTitle: "基本情報",
            formBody:
              "B側の表示や注文時の連絡先として使う情報です。あとからいつでも変更できます。",
            accountInfo: "現在の情報",
            approvalStatus: "利用状態",
            createdAt: "登録日",
            noCompany: "未登録",
            quickActions: "関連ページ",
            ordersTitle: "注文",
            ordersBody: "返答待ち、進行中、完了した注文を確認します。",
            billingTitle: "料金プラン",
            billingBody: "Basic / Pro / Premium と請求を確認します。",
            searchTitle: "インフルエンサー検索",
            searchBody: "条件に合うインフルエンサーを探します。",
          }
        : {
            loading: "Loading...",
            title: "Account settings",
            subtitle:
              "Manage your company name, contact email, and company description used for orders and influencer communication.",
            statusLabel: "Status",
            companyName: "Company name",
            companyNamePlaceholder: "Example: Example Inc.",
            description: "Company description",
            descriptionPlaceholder:
              "Describe your services, products, and what kind of influencer work you want to request.",
            contactEmail: "Contact email",
            contactEmailPlaceholder: "example@company.com",
            save: "Save",
            saving: "Saving...",
            saved: "Saved.",
            loginRequired: "Please log in.",
            fetchFailed: "Failed to load company profile.",
            saveFailed: "Failed to save company profile.",
            companyNameRequired: "Please enter your company name.",
            emailRequired: "Please enter your contact email.",
            emailInvalid: "Please enter a valid email address.",
            formTitle: "Basic information",
            formBody:
              "This information is used for company display and order communication. You can update it anytime.",
            accountInfo: "Current information",
            approvalStatus: "Availability",
            createdAt: "Created at",
            noCompany: "Not registered",
            quickActions: "Related pages",
            ordersTitle: "Orders",
            ordersBody: "Review waiting, active, and completed orders.",
            billingTitle: "Billing",
            billingBody: "Review Basic / Pro / Premium and billing settings.",
            searchTitle: "Influencer search",
            searchBody: "Find influencers that match your needs.",
          },
    [safeLocale]
  );

  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<FormState>({
    company_name: "",
    description: "",
    contact_email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(copy.loginRequired);
        router.replace("/login");
        setLoading(false);
        return;
      }

      const { data, error: companyError } = await supabase
        .from("companies")
        .select(
          "id, user_id, company_name, description, contact_email, approval_status, created_at"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError) {
        console.error("company profile load error:", companyError);
        setError(copy.fetchFailed);
        setLoading(false);
        return;
      }

      if (data) {
        const row = data as Company;

        setCompany(row);
        setForm({
          company_name: row.company_name || "",
          description: row.description || "",
          contact_email: row.contact_email || user.email || "",
        });
      } else {
        setCompany(null);
        setForm({
          company_name: "",
          description: "",
          contact_email: user.email || "",
        });
      }

      setLoading(false);
    };

    void loadData();
  }, [copy.fetchFailed, copy.loginRequired, router, supabase]);

  const validate = () => {
    const companyName = form.company_name.trim();
    const email = form.contact_email.trim();

    if (!companyName) return copy.companyNameRequired;
    if (!email) return copy.emailRequired;

    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailLike) return copy.emailInvalid;

    return null;
  };

  const ensureCompanyRole = async (userId: string) => {
    const { data: existingRole, error: roleSelectError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "company")
      .maybeSingle();

    if (roleSelectError) {
      console.error("user_roles select error:", roleSelectError);
      return;
    }

    if (!existingRole) {
      const { error: roleInsertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "company",
        });

      if (roleInsertError) {
        console.error("user_roles insert error:", roleInsertError);
      }
    }
  };

  const ensureCompanyState = async (userId: string) => {
    const now = new Date().toISOString();

    const { data: existingState, error: stateSelectError } = await supabase
      .from("user_states")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (stateSelectError) {
      console.error("user_states select error:", stateSelectError);
      return;
    }

    if (existingState) {
      const { error: stateUpdateError } = await supabase
        .from("user_states")
        .update({
          company_profile_completed: true,
          company_access_status: "approved",
          updated_at: now,
        })
        .eq("user_id", userId);

      if (stateUpdateError) {
        console.error("user_states update error:", stateUpdateError);
      }

      return;
    }

    const { error: stateInsertError } = await supabase
      .from("user_states")
      .insert({
        user_id: userId,
        company_profile_completed: true,
        company_access_status: "approved",
        company_plan_code: "free",
        company_subscription_status: "inactive",
        monthly_request_limit: 5,
        monthly_request_used: 0,
        request_usage_reset_at: now,
        updated_at: now,
      });

    if (stateInsertError) {
      console.error("user_states insert error:", stateInsertError);
    }
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(copy.loginRequired);
      setSaving(false);
      router.replace("/login");
      return;
    }

    const payload = {
      company_name: form.company_name.trim(),
      description: form.description.trim() || null,
      contact_email: form.contact_email.trim(),
    };

    try {
      if (company) {
        const { error: updateError } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", company.id)
          .eq("user_id", user.id);

        if (updateError) {
          throw updateError;
        }

        setCompany((prev) =>
          prev
            ? {
                ...prev,
                ...payload,
              }
            : prev
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("companies")
          .insert({
            user_id: user.id,
            approval_status: "approved",
            ...payload,
          })
          .select(
            "id, user_id, company_name, description, contact_email, approval_status, created_at"
          )
          .maybeSingle();

        if (insertError) {
          throw insertError;
        }

        if (data) {
          setCompany(data as Company);
        }
      }

      await ensureCompanyRole(user.id);
      await ensureCompanyState(user.id);

      setSuccess(copy.saved);
      router.refresh();
    } catch (saveError) {
      console.error("company profile save error:", saveError);
      setError(copy.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-32 animate-pulse rounded-[28px] bg-white shadow-sm" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="h-96 animate-pulse rounded-[28px] bg-white shadow-sm" />
            <div className="h-80 animate-pulse rounded-[28px] bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[100px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 pb-10 md:px-6 md:py-8">
        <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-7 md:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${getApprovalClass(
                    company?.approval_status
                  )}`}
                >
                  {getApprovalLabel(company?.approval_status, safeLocale)}
                </span>
              </div>

              <h1 className="mt-4 text-[28px] font-black tracking-[-0.055em] text-slate-950 md:text-[38px]">
                {copy.title}
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {copy.subtitle}
              </p>
            </div>

            <Link
              href="/b/orders"
              className="inline-flex w-fit items-center justify-center rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
            >
              {copy.ordersTitle}
            </Link>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-[24px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
            {success}
          </div>
        ) : null}

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main>
            <SectionCard title={copy.formTitle} body={copy.formBody}>
              <div className="grid gap-5">
                <div>
                  <FieldLabel>{copy.companyName}</FieldLabel>
                  <TextInput
                    type="text"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder={copy.companyNamePlaceholder}
                  />
                </div>

                <div>
                  <FieldLabel>{copy.contactEmail}</FieldLabel>
                  <TextInput
                    type="email"
                    name="contact_email"
                    value={form.contact_email}
                    onChange={handleChange}
                    placeholder={copy.contactEmailPlaceholder}
                  />
                </div>

                <div>
                  <FieldLabel>{copy.description}</FieldLabel>
                  <TextArea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={6}
                    placeholder={copy.descriptionPlaceholder}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? copy.saving : copy.save}
                </button>

                <Link
                  href="/b/billing"
                  className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-4 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
                >
                  {copy.billingTitle}
                </Link>
              </div>
            </SectionCard>
          </main>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <SectionCard title={copy.accountInfo}>
              <div className="rounded-[22px] bg-slate-50 p-4">
                <InfoRow
                  label={copy.companyName}
                  value={company?.company_name || copy.noCompany}
                />
                <InfoRow
                  label={copy.contactEmail}
                  value={company?.contact_email || copy.noCompany}
                />
                <InfoRow
                  label={copy.approvalStatus}
                  value={getApprovalLabel(company?.approval_status, safeLocale)}
                />
                <InfoRow
                  label={copy.createdAt}
                  value={formatDate(company?.created_at, safeLocale)}
                />
              </div>
            </SectionCard>

            <SectionCard title={copy.quickActions}>
              <div className="grid gap-3">
                <QuickLink
                  href="/b/orders"
                  title={copy.ordersTitle}
                  body={copy.ordersBody}
                />
                <QuickLink
                  href="/b/creators"
                  title={copy.searchTitle}
                  body={copy.searchBody}
                />
                <QuickLink
                  href="/b/billing"
                  title={copy.billingTitle}
                  body={copy.billingBody}
                />
              </div>
            </SectionCard>
          </aside>
        </section>
      </div>
    </div>
  );
}