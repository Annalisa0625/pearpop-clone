// File: app/b/profile/page.tsx
"use client";

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
            title: "企業情報",
            subtitle:
              "注文時の連絡や確認に使う企業情報です。必要な内容だけ入力してください。",
            companyName: "会社名",
            companyNamePlaceholder: "例）株式会社○○",
            description: "会社説明",
            descriptionPlaceholder:
              "例）自社サービス、取扱い商材、依頼したい内容など",
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
          }
        : {
            loading: "Loading...",
            title: "Company information",
            subtitle:
              "This information is used for order communication and confirmation.",
            companyName: "Company name",
            companyNamePlaceholder: "Example: Example Inc.",
            description: "Company description",
            descriptionPlaceholder:
              "Describe your services, products, and request details.",
            contactEmail: "Contact email",
            contactEmailPlaceholder: "example@company.com",
            save: "Save",
            saving: "Saving...",
            saved: "Saved.",
            loginRequired: "Please log in.",
            fetchFailed: "Failed to load company information.",
            saveFailed: "Failed to save company information.",
            companyNameRequired: "Please enter your company name.",
            emailRequired: "Please enter your contact email.",
            emailInvalid: "Please enter a valid email address.",
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
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="h-32 animate-pulse rounded-[28px] bg-white shadow-sm" />
          <div className="h-96 animate-pulse rounded-[28px] bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[100px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-4xl px-4 py-6 pb-10 md:px-6 md:py-8">
        <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-7 md:py-7">
          <h1 className="text-[28px] font-black tracking-[-0.055em] text-slate-950 md:text-[38px]">
            {copy.title}
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
            {copy.subtitle}
          </p>
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

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] md:p-6">
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

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? copy.saving : copy.save}
          </button>
        </section>
      </div>
    </div>
  );
}