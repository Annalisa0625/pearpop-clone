//app/signup/company-entry/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useAppLocale } from "@/lib/i18n/locale";

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

export default function CompanySignupEntryPage() {
  const { locale, setLocale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Company Entry",
            title: "企業登録",
            subtitle:
              "まずはメールアドレスを入力してください。登録用リンクを送信します。",
            emailLabel: "メールアドレス",
            emailPlaceholder: "company@example.com",
            submit: "登録メールを送信",
            submitting: "送信中...",
            emailRequired: "メールアドレスを入力してください",
            requestFailed: "登録処理に失敗しました",
            networkError: "通信エラーが発生しました",
            note:
              "開発環境では、登録リンクがそのまま開く場合があります。",
          }
        : {
            badge: "Company Entry",
            title: "Company Sign Up",
            subtitle:
              "Enter your email address first. We will send you a sign-up link.",
            emailLabel: "Email Address",
            emailPlaceholder: "company@example.com",
            submit: "Send Sign-up Email",
            submitting: "Sending...",
            emailRequired: "Please enter your email address",
            requestFailed: "Failed to process the sign-up request",
            networkError: "A network error occurred",
            note:
              "In development mode, the sign-up link may open directly.",
          },
    [locale]
  );

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(copy.emailRequired);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/signup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: "company",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? copy.requestFailed);
        return;
      }

      if (data?.devSignupUrl) {
        window.location.href = data.devSignupUrl;
        return;
      }
    } catch {
      setError(copy.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex justify-end">
          <LocaleTabs locale={locale} setLocale={setLocale} />
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-6 rounded-3xl border bg-white p-6 shadow-sm md:p-8"
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold text-blue-600">{copy.badge}</p>
            <h1 className="text-2xl font-bold">{copy.title}</h1>
            <p className="text-sm leading-6 text-gray-600">{copy.subtitle}</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              {copy.emailLabel}
            </label>
            <input
              type="email"
              className="w-full rounded-xl border px-4 py-3 outline-none transition focus:border-gray-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
              autoComplete="email"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? copy.submitting : copy.submit}
          </button>

          <p className="text-xs leading-5 text-gray-500">{copy.note}</p>
        </form>
      </div>
    </div>
  );
}