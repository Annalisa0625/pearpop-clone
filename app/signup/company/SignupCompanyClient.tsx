// File: app/signup/company/SignupCompanyClient.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  {
    value: "SNS運用強化",
    ja: "SNS運用強化",
    en: "Strengthen social media marketing",
  },
  { value: "海外向けPR", ja: "海外向けPR", en: "Global promotion" },
  { value: "その他", ja: "その他", en: "Other" },
];

function normalizeNextPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function getOAuthRedirectUrl(nextPath: string | null) {
  if (typeof window === "undefined") return "";

  const url = new URL("/signup/company", window.location.origin);
  url.searchParams.set("oauth", "1");

  const safeNext = normalizeNextPath(nextPath);
  if (safeNext) {
    url.searchParams.set("next", safeNext);
  }

  return url.toString();
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.09-1.93 3.27-4.78 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.84 0-5.25-1.92-6.12-4.5H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.88 14.13A6.6 6.6 0 0 1 5.53 12c0-.74.13-1.45.35-2.13V7.03H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.97l3.7-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.7 2.84c.87-2.58 3.28-4.49 6.12-4.49Z"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 10h10.5M10.5 5.5 15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-black text-slate-800">{label}</label>
      <input
        type={type}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
    </div>
  );
}

export default function SignupCompanyClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const token = searchParams.get("token");
  const nextParam = searchParams.get("next");
  const hasOAuthReturn = searchParams.get("oauth") === "1";
  const { locale } = useAppLocale();

  const safeLocale = locale === "en" ? "en" : "ja";
  const safeNextPath = normalizeNextPath(nextParam);
  const afterSignupPath = safeNextPath || "/b/dashboard";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "企業アカウントを作成",
            subtitle:
              "月額料金なしで、公開メニューからすぐにインフルエンサーへ依頼できます。",
            returnNote:
              "登録後、元のインフルエンサー詳細ページに戻って依頼を続けられます。",
            noMonthlyFee: "月額料金は発生しません。案件成立時のみ手数料が発生します。",
            trustPoint1: "公開メニューから依頼",
            trustPoint2: "Stripe決済",
            trustPoint3: "納品確認まで管理",
            companyName: "会社名",
            companyNamePlaceholder: "例：株式会社〇〇 / 〇〇合同会社",
            websiteUrl: "会社HP URL または ECサイト URL",
            websiteUrlPlaceholder: "https://example.com",
            websiteHelp:
              "会社・ブランド・店舗・商品内容が分かるURLを入力してください。",
            phoneNumber: "電話番号",
            phoneNumberPlaceholder: "例：03-1234-5678",
            usagePurpose: "利用目的",
            usagePurposeHelp: "おすすめの案内や利用状況の確認に使用します。",
            email: "メールアドレス",
            emailPlaceholder: "company@example.com",
            password: "パスワード",
            passwordPlaceholder: "12文字以上",
            confirmPassword: "パスワード（確認）",
            confirmPasswordPlaceholder: "再入力してください",
            agree: "利用規約とプライバシーポリシーに同意します",
            agreementNotePrefix: "登録前に",
            terms: "利用規約",
            privacy: "プライバシーポリシー",
            agreementNoteSuffix: "をご確認ください。",
            google: "Googleで続ける",
            oauthConnected: "Googleアカウント連携済み",
            submit: "登録して続ける",
            submitting: "登録中...",
            selectPlease: "目的を選択",
            login: "すでにアカウントをお持ちの方はログイン",
            companyNameRequired: "会社名を入力してください",
            websiteRequired:
              "会社HP URL または ECサイト URL を入力してください",
            invalidWebsite:
              "URLは http:// または https:// から入力してください",
            phoneRequired: "電話番号を入力してください",
            usageRequired: "利用目的を選択してください",
            emailRequired: "メールアドレスを入力してください",
            emailInvalid: "メールアドレスの形式が正しくありません",
            passwordTooShort: "パスワードは12文字以上必要です",
            passwordMismatch: "パスワードが一致しません",
            agreeRequired:
              "利用規約とプライバシーポリシーへの同意が必要です",
            signupFailed: "登録に失敗しました",
            networkError: "通信エラーが発生しました",
            googleFailed: "Google登録を開始できませんでした",
          }
        : {
            title: "Create company account",
            subtitle: "Request influencers from public menus with no monthly fee.",
            returnNote:
              "After registration, you can return to the influencer page and continue your request.",
            noMonthlyFee: "No monthly fee. Service fees apply only when a project is confirmed.",
            trustPoint1: "Request from menus",
            trustPoint2: "Stripe payment",
            trustPoint3: "Manage delivery",
            companyName: "Company name",
            companyNamePlaceholder: "Example Inc. / Example LLC",
            websiteUrl: "Company website or store URL",
            websiteUrlPlaceholder: "https://example.com",
            websiteHelp:
              "Please enter a URL that shows your company, brand, store, or product overview.",
            phoneNumber: "Phone number",
            phoneNumberPlaceholder: "Example: +81-3-1234-5678",
            usagePurpose: "Usage purpose",
            usagePurposeHelp:
              "Used for guidance and account review if needed.",
            email: "Email",
            emailPlaceholder: "company@example.com",
            password: "Password",
            passwordPlaceholder: "12 characters or more",
            confirmPassword: "Confirm password",
            confirmPasswordPlaceholder: "Enter again",
            agree: "I agree to the Terms of Service and Privacy Policy",
            agreementNotePrefix: "Please review the",
            terms: "Terms of Service",
            privacy: "Privacy Policy",
            agreementNoteSuffix: "before registering.",
            google: "Continue with Google",
            oauthConnected: "Google account connected",
            submit: "Sign up and continue",
            submitting: "Creating...",
            selectPlease: "Select purpose",
            login: "Already have an account? Log in",
            companyNameRequired: "Please enter your company name",
            websiteRequired:
              "Please enter your company website or store URL",
            invalidWebsite:
              "The URL must start with http:// or https://",
            phoneRequired: "Please enter your phone number",
            usageRequired: "Please select a usage purpose",
            emailRequired: "Please enter your email address",
            emailInvalid: "Please enter a valid email address",
            passwordTooShort: "Password must be at least 12 characters",
            passwordMismatch: "Passwords do not match",
            agreeRequired:
              "You must agree to the Terms of Service and Privacy Policy",
            signupFailed: "Failed to complete registration",
            networkError: "A network error occurred",
            googleFailed: "Failed to start Google signup",
          },
    [safeLocale]
  );

  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [usagePurpose, setUsagePurpose] = useState("");
  const [email, setEmail] = useState("");
  const [oauthEmail, setOauthEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const isOAuthMode = Boolean(oauthEmail);

  useEffect(() => {
    const hydrateSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const userEmail = session.user.email ?? "";

      if (userEmail) {
        setOauthEmail(userEmail);
        setEmail((prev) => prev || userEmail);
      }

      const { data: existingCompany } = await supabase
        .from("companies")
        .select("id, approval_status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (existingCompany) {
        router.replace(afterSignupPath);
      }
    };

    void hydrateSession();
  }, [afterSignupPath, hasOAuthReturn, router, supabase]);

  const handleGoogleSignup = async () => {
    setError(null);
    setOauthLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getOAuthRedirectUrl(nextParam),
        },
      });

      if (oauthError) {
        setError(oauthError.message || copy.googleFailed);
        setOauthLoading(false);
      }
    } catch {
      setError(copy.googleFailed);
      setOauthLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!companyName.trim()) {
      setError(copy.companyNameRequired);
      return;
    }

    if (!websiteUrl.trim()) {
      setError(copy.websiteRequired);
      return;
    }

    if (!/^https?:\/\/.+/i.test(websiteUrl.trim())) {
      setError(copy.invalidWebsite);
      return;
    }

    if (!phoneNumber.trim()) {
      setError(copy.phoneRequired);
      return;
    }

    if (!usagePurpose) {
      setError(copy.usageRequired);
      return;
    }

    if (!isOAuthMode) {
      if (!email.trim()) {
        setError(copy.emailRequired);
        return;
      }

      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

      if (!emailValid) {
        setError(copy.emailInvalid);
        return;
      }

      if (password.length < 12) {
        setError(copy.passwordTooShort);
        return;
      }

      if (password !== confirmPassword) {
        setError(copy.passwordMismatch);
        return;
      }
    }

    if (!agree) {
      setError(copy.agreeRequired);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token ?? null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/signup/complete-company", {
        method: "POST",
        headers,
        body: JSON.stringify({
          token: token || undefined,
          email: isOAuthMode ? oauthEmail : email.trim(),
          company_name: companyName.trim(),
          website_url: websiteUrl.trim(),
          phone_number: phoneNumber.trim(),
          usage_purpose: usagePurpose,
          password: isOAuthMode ? undefined : password,
          agreed_to_terms: true,
          agreed_to_privacy: true,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? copy.signupFailed);
        return;
      }

      if (!isOAuthMode) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(signInError.message || copy.signupFailed);
          return;
        }
      }

      router.replace(afterSignupPath);
    } catch {
      setError(copy.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f9fb]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-180px] top-[-160px] h-[420px] w-[420px] rounded-full bg-rose-100/70 blur-3xl" />
        <div className="absolute right-[-180px] top-[14%] h-[520px] w-[520px] rounded-full bg-emerald-100/65 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[22%] h-[460px] w-[460px] rounded-full bg-slate-200/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-6 md:py-8">
        <div className="mb-5 flex items-center justify-center">
          <Link href="/home" className="inline-flex items-center">
            <img
              src="/brand/trendre-logo-full.png"
              alt="Trendre"
              className="h-9 w-auto object-contain"
            />
          </Link>
        </div>

        <section className="mx-auto w-full max-w-4xl">
          <div className="mb-6 text-center">
            <h1 className="text-[30px] font-black leading-tight tracking-[-0.055em] text-slate-950 md:text-[42px]">
              {copy.title}
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600 md:text-[15px]">
              {copy.subtitle}
            </p>

            {safeNextPath ? (
              <p className="mx-auto mt-2 max-w-2xl text-xs font-bold leading-6 text-slate-400">
                {copy.returnNote}
              </p>
            ) : null}

            <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-100">
                {copy.noMonthlyFee}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                {copy.trustPoint1}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                {copy.trustPoint2}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                {copy.trustPoint3}
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/95 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.10)] md:p-7">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-50 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-50 blur-3xl" />

            <div className="relative">
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading || oauthLoading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                <GoogleIcon />
                {oauthLoading ? copy.submitting : copy.google}
              </button>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-bold text-slate-300">{safeLocale === "ja" ? "または" : "or"}</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {isOAuthMode ? (
                <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-black">{copy.oauthConnected}</p>
                  <p className="mt-1 font-medium">{oauthEmail}</p>
                </div>
              ) : (
                <div className="mb-5 space-y-5">
                  <InputField
                    label={copy.email}
                    placeholder={copy.emailPlaceholder}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    autoComplete="email"
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <InputField
                      label={copy.password}
                      placeholder={copy.passwordPlaceholder}
                      value={password}
                      onChange={setPassword}
                      type="password"
                      autoComplete="new-password"
                    />

                    <InputField
                      label={copy.confirmPassword}
                      placeholder={copy.confirmPasswordPlaceholder}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                <InputField
                  label={copy.companyName}
                  placeholder={copy.companyNamePlaceholder}
                  value={companyName}
                  onChange={setCompanyName}
                  autoComplete="organization"
                />

                <div className="space-y-2">
                  <InputField
                    label={copy.websiteUrl}
                    placeholder={copy.websiteUrlPlaceholder}
                    value={websiteUrl}
                    onChange={setWebsiteUrl}
                    autoComplete="url"
                  />
                  <p className="px-1 text-xs font-medium leading-5 text-slate-400">
                    {copy.websiteHelp}
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <InputField
                    label={copy.phoneNumber}
                    placeholder={copy.phoneNumberPlaceholder}
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    autoComplete="tel"
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-800">
                      {copy.usagePurpose}
                    </label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100"
                      value={usagePurpose}
                      onChange={(e) => setUsagePurpose(e.target.value)}
                    >
                      <option value="">{copy.selectPlease}</option>
                      {USAGE_PURPOSE_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {safeLocale === "ja" ? item.ja : item.en}
                        </option>
                      ))}
                    </select>
                    <p className="px-1 text-xs font-medium leading-5 text-slate-400">
                      {copy.usagePurposeHelp}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <label className="flex items-start gap-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5f67] focus:ring-[#ff5f67]"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                    />
                    <span>{copy.agree}</span>
                  </label>

                  <p className="mt-3 pl-7 text-xs font-medium leading-6 text-slate-400">
                    {copy.agreementNotePrefix}{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="font-bold text-slate-600 underline underline-offset-4"
                    >
                      {copy.terms}
                    </Link>{" "}
                    /{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="font-bold text-slate-600 underline underline-offset-4"
                    >
                      {copy.privacy}
                    </Link>{" "}
                    {copy.agreementNoteSuffix}
                  </p>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || oauthLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff5f67] px-7 py-4 text-sm font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55] disabled:opacity-60"
                >
                  {loading ? copy.submitting : copy.submit}
                  {!loading ? <ArrowIcon /> : null}
                </button>

                <div className="text-center">
                  <Link
                    href={`/login${
                      safeNextPath
                        ? `?next=${encodeURIComponent(safeNextPath)}`
                        : ""
                    }`}
                    className="text-sm font-bold text-slate-400 underline underline-offset-4 transition hover:text-slate-700"
                  >
                    {copy.login}
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-xs font-medium text-slate-400">
          © 2026 Trendre
        </p>
      </div>
    </main>
  );
}
