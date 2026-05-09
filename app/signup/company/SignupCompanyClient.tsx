// app/signup/company/SignupCompanyClient.tsx
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
  { value: "新規顧客の獲得", ja: "新規顧客の獲得", en: "Acquire New Customers" },
  { value: "認知拡大", ja: "認知拡大", en: "Increase Brand Awareness" },
  { value: "商品PR", ja: "商品PR", en: "Product Promotion" },
  { value: "SNS運用強化", ja: "SNS運用強化", en: "Strengthen Social Media Marketing" },
  { value: "海外向けPR", ja: "海外向けPR", en: "Global Promotion" },
  { value: "その他", ja: "その他", en: "Other" },
];

function LocaleTabs({
  locale,
  setLocale,
}: {
  locale: "ja" | "en";
  setLocale: (locale: "ja" | "en") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLocale("ja")}
        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
          locale === "ja"
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        JA
      </button>

      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
          locale === "en"
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        EN
      </button>
    </div>
  );
}

function getOAuthRedirectUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/signup/company?oauth=1`;
}

export default function SignupCompanyClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const token = searchParams.get("token");
  const hasOAuthReturn = searchParams.get("oauth") === "1";
  const { locale, setLocale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Company Signup",
            title: "企業登録",
            subtitle:
              "Googleまたはメールアドレスで企業アカウントを作成します。登録後、審査が完了すると注文機能を利用できます。",
            companyName: "会社名",
            companyNamePlaceholder: "例：株式会社〇〇 / 〇〇合同会社",
            websiteUrl: "会社HP URL または ECサイト URL",
            websiteUrlPlaceholder: "https://example.com",
            websiteHelp:
              "会社やブランド、事業内容が分かるURLを入力してください。",
            phoneNumber: "電話番号",
            phoneNumberPlaceholder: "例：03-1234-5678",
            usagePurpose: "利用目的",
            usagePurposeHelp: "審査や今後の案内に使用します。",
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
            google: "Googleで企業登録",
            oauthConnected: "Googleアカウント連携済み",
            submit: "企業アカウントを作成する",
            submitting: "登録中...",
            selectPlease: "選択してください",
            invalidUrl: "無効なURLです",
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
            pendingRedirect:
              "登録申請を受け付けました。審査完了までお待ちください。",
          }
        : {
            badge: "Company Signup",
            title: "Company Registration",
            subtitle:
              "Create a company account with Google or email. After registration, ordering becomes available once your account is approved.",
            companyName: "Company Name",
            companyNamePlaceholder: "Example: Example Inc. / Example LLC",
            websiteUrl: "Company Website or Store URL",
            websiteUrlPlaceholder: "https://example.com",
            websiteHelp:
              "Please enter a URL that shows your company, brand, or business overview.",
            phoneNumber: "Phone Number",
            phoneNumberPlaceholder: "Example: +81-3-1234-5678",
            usagePurpose: "Usage Purpose",
            usagePurposeHelp:
              "This will be used for review and future guidance.",
            email: "Email",
            emailPlaceholder: "company@example.com",
            password: "Password",
            passwordPlaceholder: "12 characters or more",
            confirmPassword: "Confirm Password",
            confirmPasswordPlaceholder: "Enter again",
            agree: "I agree to the Terms of Service and Privacy Policy",
            agreementNotePrefix: "Please review the",
            terms: "Terms of Service",
            privacy: "Privacy Policy",
            agreementNoteSuffix: "before registering.",
            google: "Sign up with Google",
            oauthConnected: "Google account connected",
            submit: "Create Company Account",
            submitting: "Creating...",
            selectPlease: "Please select",
            invalidUrl: "Invalid URL",
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
            pendingRedirect:
              "Your registration request has been received. Please wait for approval.",
          },
    [locale]
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
        router.replace(
          existingCompany.approval_status === "approved"
            ? "/b/dashboard"
            : "/signup/pending"
        );
      }
    };

    if (hasOAuthReturn) {
      void hydrateSession();
    } else {
      void hydrateSession();
    }
  }, [hasOAuthReturn, router, supabase]);

  const handleGoogleSignup = async () => {
    setError(null);
    setOauthLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getOAuthRedirectUrl(),
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
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      }

      router.replace("/signup/pending");
    } catch {
      setError(copy.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex justify-end">
          <LocaleTabs locale={locale} setLocale={setLocale} />
        </div>

        <div className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-blue-600">{copy.badge}</p>
            <h1 className="text-2xl font-bold">{copy.title}</h1>
            <p className="mt-2 text-sm text-gray-600">{copy.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading || oauthLoading}
            className="w-full rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-900 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {oauthLoading ? copy.submitting : copy.google}
          </button>

          {isOAuthMode ? (
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
              <p className="font-semibold">{copy.oauthConnected}</p>
              <p className="mt-1">{oauthEmail}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">{copy.email}</label>
                <input
                  type="email"
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder={copy.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{copy.password}</label>
                  <input
                    type="password"
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder={copy.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {copy.confirmPassword}
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder={copy.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{copy.companyName}</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              placeholder={copy.companyNamePlaceholder}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{copy.websiteUrl}</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              placeholder={copy.websiteUrlPlaceholder}
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500">{copy.websiteHelp}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{copy.phoneNumber}</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              placeholder={copy.phoneNumberPlaceholder}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{copy.usagePurpose}</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={usagePurpose}
              onChange={(e) => setUsagePurpose(e.target.value)}
            >
              <option value="">{copy.selectPlease}</option>
              {USAGE_PURPOSE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {locale === "ja" ? item.ja : item.en}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">{copy.usagePurposeHelp}</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>{copy.agree}</span>
            </label>

            <p className="pl-6 text-xs text-gray-500">
              {copy.agreementNotePrefix}{" "}
              <Link
                href="/terms"
                target="_blank"
                className="underline underline-offset-4"
              >
                {copy.terms}
              </Link>{" "}
              /{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="underline underline-offset-4"
              >
                {copy.privacy}
              </Link>{" "}
              {copy.agreementNoteSuffix}
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || oauthLoading}
            className="w-full rounded-lg bg-black py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? copy.submitting : copy.submit}
          </button>
        </div>
      </div>
    </div>
  );
}