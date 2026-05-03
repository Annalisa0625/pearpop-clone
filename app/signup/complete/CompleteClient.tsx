// app/signup/complete/CompleteClient.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

export default function CompleteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale, setLocale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Signup Verification",
            title: "登録リンクを確認しています",
            subtitle:
              "トークンを確認し、登録フォームへ移動しています。しばらくお待ちください。",
            invalidUrl: "無効なURLです",
            invalidOrExpired: "このURLは無効または期限切れです",
            invalidRole: "不正な登録種別です",
            genericError: "エラーが発生しました",
            checking: "確認中です...",
          }
        : {
            badge: "Signup Verification",
            title: "Verifying your sign-up link",
            subtitle:
              "We are verifying your token and redirecting you to the correct sign-up form.",
            invalidUrl: "Invalid URL",
            invalidOrExpired: "This URL is invalid or expired",
            invalidRole: "Invalid registration type",
            genericError: "An error occurred",
            checking: "Checking...",
          },
    [locale]
  );

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      window.alert(copy.invalidUrl);
      router.replace("/login");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/signup/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          window.alert(copy.invalidOrExpired);
          router.replace("/login");
          return;
        }

        const { role } = await res.json();

        if (role === "creator") {
          router.replace(`/signup/creator?token=${token}`);
        } else if (role === "company") {
          router.replace(`/signup/company?token=${token}`);
        } else {
          window.alert(copy.invalidRole);
          router.replace("/login");
        }
      } catch (error) {
        console.error("Token verification error:", error);
        window.alert(copy.genericError);
        router.replace("/login");
      }
    };

    verifyToken();
  }, [searchParams, router, copy]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex justify-end">
          <LocaleTabs locale={locale} setLocale={setLocale} />
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-blue-600">{copy.badge}</p>
            <h1 className="text-2xl font-bold">{copy.title}</h1>
            <p className="text-sm leading-6 text-gray-600">{copy.subtitle}</p>
          </div>

          <p className="mt-6 text-sm text-gray-500">{copy.checking}</p>
        </div>
      </div>
    </div>
  );
}