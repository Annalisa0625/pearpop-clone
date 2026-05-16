// File: app/b/profile/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    if (status === "approved") return "承認済み";
    if (status === "pending") return "審査中";
    if (status === "rejected") return "却下";
    return "未設定";
  }

  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  return "Not set";
}

function getApprovalClass(value: string | null | undefined) {
  const status = (value ?? "").trim().toLowerCase();

  if (status === "approved") return "bg-blue-100 text-blue-700";
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "rejected") return "bg-rose-100 text-rose-700";

  return "bg-slate-100 text-slate-700";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-black text-slate-800">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-slate-950 ${
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
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-right text-sm font-black text-slate-950">
        {value}
      </span>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-950">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-950">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {body}
        </span>
      </span>
      <span className="text-slate-300">›</span>
    </Link>
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
            eyebrow: "Company Profile",
            title: "企業プロフィール",
            subtitle:
              "企業名、会社説明、連絡先メールを管理します。注文・請求・クリエイターとのやり取りで使われる基本情報です。",
            companyName: "会社名",
            companyNamePlaceholder: "例）株式会社○○",
            description: "会社説明",
            descriptionPlaceholder:
              "例）自社サービス、取扱い商材、クリエイターに依頼したい内容など",
            contactEmail: "連絡先メール",
            contactEmailPlaceholder: "example@company.jp",
            save: "保存する",
            saving: "保存中...",
            saved: "企業情報を保存しました。",
            loginRequired: "ログインしてください",
            fetchFailed: "企業情報の取得に失敗しました。",
            saveFailed: "企業情報の保存に失敗しました。",
            companyNameRequired: "会社名を入力してください。",
            emailRequired: "連絡先メールを入力してください。",
            emailInvalid: "メールアドレスの形式が正しくありません。",
            accountInfo: "アカウント情報",
            approvalStatus: "審査状態",
            createdAt: "登録日",
            noCompany: "未登録",
            quickActions: "関連ページ",
            dashboardTitle: "ダッシュボード",
            dashboardBody: "注文状況、プラン、利用状態を確認します。",
            billingTitle: "料金プラン",
            billingBody: "Basic / Pro / Premium と請求管理を確認します。",
            requestsTitle: "承認待ち",
            requestsBody: "送信済み注文の承認状況を確認します。",
            jobsTitle: "進行中案件",
            jobsBody: "進行中、納品済み、完了済みの案件を確認します。",
          }
        : {
            loading: "Loading...",
            eyebrow: "Company Profile",
            title: "Company Profile",
            subtitle:
              "Manage your company name, description, and contact email used for orders, billing, and creator communication.",
            companyName: "Company name",
            companyNamePlaceholder: "Example: Example Inc.",
            description: "Company description",
            descriptionPlaceholder:
              "Describe your services, products, and what kind of creator work you want to request.",
            contactEmail: "Contact email",
            contactEmailPlaceholder: "example@company.com",
            save: "Save",
            saving: "Saving...",
            saved: "Company profile saved.",
            loginRequired: "Please log in.",
            fetchFailed: "Failed to load company profile.",
            saveFailed: "Failed to save company profile.",
            companyNameRequired: "Please enter your company name.",
            emailRequired: "Please enter your contact email.",
            emailInvalid: "Please enter a valid email address.",
            accountInfo: "Account information",
            approvalStatus: "Approval status",
            createdAt: "Created at",
            noCompany: "Not registered",
            quickActions: "Related pages",
            dashboardTitle: "Dashboard",
            dashboardBody: "Check orders, plan, and current usage.",
            billingTitle: "Billing",
            billingBody: "Review Basic / Pro / Premium and billing settings.",
            requestsTitle: "Pending",
            requestsBody: "Check creator approval status for sent orders.",
            jobsTitle: "Active jobs",
            jobsBody: "Review active, delivered, and completed jobs.",
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
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <div className="h-40 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="h-72 animate-pulse rounded-[28px] bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-10 md:p-6">
      <section className="rounded-[32px] bg-slate-950 p-7 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          {copy.eyebrow}
        </p>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">
              {copy.subtitle}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-4 py-2 text-sm font-black ${getApprovalClass(
              company?.approval_status
            )}`}
          >
            {copy.approvalStatus}:{" "}
            {getApprovalLabel(company?.approval_status, safeLocale)}
          </span>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <section className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-950">
                {copy.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {copy.subtitle}
              </p>
            </div>

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
                  rows={7}
                  placeholder={copy.descriptionPlaceholder}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:min-w-[180px]"
            >
              {saving ? copy.saving : copy.save}
            </button>
          </section>
        </main>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.accountInfo}
            </h2>

            <div className="mt-5 rounded-[22px] bg-slate-50 p-4">
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
                value={
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${getApprovalClass(
                      company?.approval_status
                    )}`}
                  >
                    {getApprovalLabel(company?.approval_status, safeLocale)}
                  </span>
                }
              />
              <InfoRow
                label={copy.createdAt}
                value={formatDate(company?.created_at, safeLocale)}
              />
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.quickActions}
            </h2>

            <div className="mt-5 grid gap-3">
              <QuickLink
                href="/b/dashboard"
                icon="⌂"
                title={copy.dashboardTitle}
                body={copy.dashboardBody}
              />
              <QuickLink
                href="/b/billing"
                icon="¥"
                title={copy.billingTitle}
                body={copy.billingBody}
              />
              <QuickLink
                href="/b/requests"
                icon="◎"
                title={copy.requestsTitle}
                body={copy.requestsBody}
              />
              <QuickLink
                href="/b/jobs"
                icon="▣"
                title={copy.jobsTitle}
                body={copy.jobsBody}
              />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}