// File: app/b/profile/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type LocaleOption = {
  value: string;
  ja: string;
  en: string;
};

const USAGE_PURPOSE_OPTIONS: LocaleOption[] = [
  { value: "新規顧客の獲得", ja: "新規顧客の獲得", en: "Acquire new customers" },
  { value: "認知拡大", ja: "認知拡大", en: "Increase brand awareness" },
  { value: "商品PR", ja: "商品PR", en: "Product promotion" },
  { value: "SNS運用強化", ja: "SNS運用強化", en: "Strengthen social media marketing" },
  { value: "海外向けPR", ja: "海外向けPR", en: "Global promotion" },
  { value: "その他", ja: "その他", en: "Other" },
];

type Company = {
  id: string;
  user_id: string;
  company_name: string | null;
  description: string | null;
  contact_email: string | null;
  website_url: string | null;
  phone_number: string | null;
  usage_purpose: string | null;
  approval_status: string | null;
  created_at: string;
};

type FormState = {
  company_name: string;
  description: string;
  contact_email: string;
  website_url: string;
  phone_number: string;
  usage_purpose: string;
};

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-black text-slate-800">{children}</label>;
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100 ${
        props.className ?? ""
      }`}
    />
  );
}

function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100 ${
        props.className ?? ""
      }`}
    />
  );
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold leading-7 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100 ${
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
            eyebrow: "COMPANY PROFILE",
            subtitle:
              "依頼時の確認、支払い、納品連絡に使う情報です。最新の内容にしておくと、インフルエンサーとのやり取りがスムーズになります。",
            cardTitle: "基本情報",
            cardBody: "公開メニューへの依頼時に使用します。会社説明以外は必須です。",
            companyName: "会社名",
            companyNamePlaceholder: "例：株式会社〇〇 / 〇〇合同会社",
            contactEmail: "連絡先メール",
            contactEmailPlaceholder: "example@company.jp",
            websiteUrl: "会社HP URL または ECサイト URL",
            websiteUrlPlaceholder: "https://example.com",
            websiteHelp:
              "会社・ブランド・店舗・商品内容が分かるURLを入力してください。",
            phoneNumber: "電話番号",
            phoneNumberPlaceholder: "例：03-1234-5678",
            usagePurpose: "利用目的",
            usagePurposeHelp: "おすすめの案内や利用状況の確認に使用します。",
            selectPlease: "選択してください",
            description: "会社説明",
            descriptionPlaceholder:
              "例：自社サービス、取扱い商材、依頼したい内容など",
            save: "保存する",
            saving: "保存中...",
            saved: "保存しました。",
            loginRequired: "ログインしてください",
            fetchFailed: "企業情報の取得に失敗しました。",
            saveFailed: "企業情報の保存に失敗しました。",
            companyNameRequired: "会社名を入力してください。",
            emailRequired: "連絡先メールを入力してください。",
            emailInvalid: "メールアドレスの形式が正しくありません。",
            websiteRequired: "会社HP URL または ECサイト URL を入力してください。",
            invalidWebsite: "URLは http:// または https:// から入力してください。",
            phoneRequired: "電話番号を入力してください。",
            usageRequired: "利用目的を選択してください。",
            ready: "入力済み",
          }
        : {
            loading: "Loading...",
            title: "Company information",
            eyebrow: "COMPANY PROFILE",
            subtitle:
              "Keep the information used for requests, payment, and delivery communication up to date.",
            cardTitle: "Basic information",
            cardBody: "Used when requesting from public menus. Company description is optional.",
            companyName: "Company name",
            companyNamePlaceholder: "Example Inc. / Example LLC",
            contactEmail: "Contact email",
            contactEmailPlaceholder: "example@company.com",
            websiteUrl: "Company website or store URL",
            websiteUrlPlaceholder: "https://example.com",
            websiteHelp:
              "Please enter a URL that shows your company, brand, store, or product overview.",
            phoneNumber: "Phone number",
            phoneNumberPlaceholder: "Example: +81-3-1234-5678",
            usagePurpose: "Usage purpose",
            usagePurposeHelp: "Used for guidance and account review if needed.",
            selectPlease: "Please select",
            description: "Company description",
            descriptionPlaceholder:
              "Describe your services, products, and request details.",
            save: "Save",
            saving: "Saving...",
            saved: "Saved.",
            loginRequired: "Please log in.",
            fetchFailed: "Failed to load company information.",
            saveFailed: "Failed to save company information.",
            companyNameRequired: "Please enter your company name.",
            emailRequired: "Please enter your contact email.",
            emailInvalid: "Please enter a valid email address.",
            websiteRequired: "Please enter your company website or store URL.",
            invalidWebsite: "The URL must start with http:// or https://.",
            phoneRequired: "Please enter your phone number.",
            usageRequired: "Please select a usage purpose.",
            ready: "Ready",
          },
    [safeLocale]
  );

  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<FormState>({
    company_name: "",
    description: "",
    contact_email: "",
    website_url: "",
    phone_number: "",
    usage_purpose: "",
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
          "id, user_id, company_name, description, contact_email, website_url, phone_number, usage_purpose, approval_status, created_at"
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
          website_url: row.website_url || "",
          phone_number: row.phone_number || "",
          usage_purpose: row.usage_purpose || "",
        });
      } else {
        setCompany(null);
        setForm({
          company_name: "",
          description: "",
          contact_email: user.email || "",
          website_url: "",
          phone_number: "",
          usage_purpose: "",
        });
      }

      setLoading(false);
    };

    void loadData();
  }, [copy.fetchFailed, copy.loginRequired, router, supabase]);

  const validate = () => {
    const companyName = form.company_name.trim();
    const email = form.contact_email.trim();
    const website = form.website_url.trim();
    const phone = form.phone_number.trim();

    if (!companyName) return copy.companyNameRequired;
    if (!email) return copy.emailRequired;

    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailLike) return copy.emailInvalid;

    if (!website) return copy.websiteRequired;
    if (!/^https?:\/\/.+/i.test(website)) return copy.invalidWebsite;

    if (!phone) return copy.phoneRequired;
    if (!form.usage_purpose) return copy.usageRequired;

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
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
      website_url: form.website_url.trim(),
      phone_number: form.phone_number.trim(),
      usage_purpose: form.usage_purpose,
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
            "id, user_id, company_name, description, contact_email, website_url, phone_number, usage_purpose, approval_status, created_at"
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
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="h-36 animate-pulse rounded-[30px] bg-white shadow-sm" />
          <div className="h-[520px] animate-pulse rounded-[30px] bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/25 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[80px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-5xl px-4 py-6 pb-10 md:px-6 md:py-8">
        <section className="rounded-[30px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-8 md:py-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#ff5f67]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[30px] font-black tracking-[-0.055em] text-slate-950 md:text-[42px]">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {copy.subtitle}
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
              {copy.ready}
            </div>
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

        <section className="mt-5 rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] md:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
              {copy.cardTitle}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              {copy.cardBody}
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
                autoComplete="organization"
              />
            </div>

            <div>
              <FieldLabel>{copy.websiteUrl}</FieldLabel>
              <TextInput
                type="url"
                name="website_url"
                value={form.website_url}
                onChange={handleChange}
                placeholder={copy.websiteUrlPlaceholder}
                autoComplete="url"
              />
              <p className="mt-2 px-1 text-xs font-semibold leading-5 text-slate-400">
                {copy.websiteHelp}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>{copy.contactEmail}</FieldLabel>
                <TextInput
                  type="email"
                  name="contact_email"
                  value={form.contact_email}
                  onChange={handleChange}
                  placeholder={copy.contactEmailPlaceholder}
                  autoComplete="email"
                />
              </div>

              <div>
                <FieldLabel>{copy.phoneNumber}</FieldLabel>
                <TextInput
                  type="tel"
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                  placeholder={copy.phoneNumberPlaceholder}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div>
              <FieldLabel>{copy.usagePurpose}</FieldLabel>
              <SelectInput
                name="usage_purpose"
                value={form.usage_purpose}
                onChange={handleChange}
              >
                <option value="">{copy.selectPlease}</option>
                {USAGE_PURPOSE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {safeLocale === "ja" ? item.ja : item.en}
                  </option>
                ))}
              </SelectInput>
              <p className="mt-2 px-1 text-xs font-semibold leading-5 text-slate-400">
                {copy.usagePurposeHelp}
              </p>
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
            className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-8 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? copy.saving : copy.save}
          </button>
        </section>
      </div>
    </div>
  );
}
