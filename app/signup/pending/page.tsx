// app/signup/pending/page.tsx
"use client";

import { useMemo } from "react";
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

export default function SignupPendingPage() {
  const { locale, setLocale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Signup Pending",
            title: "審査中です",
            body:
              "登録ありがとうございます。\n内容を確認後、承認され次第ご連絡いたします。",
          }
        : {
            badge: "Signup Pending",
            title: "Your application is under review",
            body:
              "Thank you for registering.\nWe will review your application and contact you once it has been approved.",
          },
    [locale]
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex justify-end">
          <LocaleTabs locale={locale} setLocale={setLocale} />
        </div>

        <div className="rounded-3xl border bg-white p-6 text-center shadow-sm md:p-8">
          <p className="mb-2 text-sm font-semibold text-blue-600">
            {copy.badge}
          </p>
          <h1 className="mb-4 text-2xl font-bold">{copy.title}</h1>
          <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
            {copy.body}
          </p>
        </div>
      </div>
    </div>
  );
}