//app/b/onboarding/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
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

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Company Onboarding",
            title: "企業向けご案内",
            loginCheckError: "ログイン状態を確認できませんでした。",
            saveError: "案内の完了処理に失敗しました。",
            skip: "スキップ",
            back: "戻る",
            next: "次へ",
            finish: "ダッシュボードへ進む",
            processing: "処理中...",
          }
        : {
            badge: "Company Onboarding",
            title: "Company Guide",
            loginCheckError: "We could not confirm your login status.",
            saveError: "Failed to complete onboarding.",
            skip: "Skip",
            back: "Back",
            next: "Next",
            finish: "Go to Dashboard",
            processing: "Processing...",
          },
    [locale]
  );

  const slides = useMemo(
    () =>
      locale === "ja"
        ? [
            {
              title: "ようこそ",
              body: "このサービスでは、企業がクリエイター一覧や参考条件カードを見て、直接依頼を送ることができます。",
            },
            {
              title: "まずやること",
              body: "まずはクリエイター一覧を見て、気になるクリエイターの詳細ページを確認してください。媒体、主な視聴者国、参考条件カードを見ながら依頼先を選べます。",
            },
            {
              title: "案件の流れ",
              body: "依頼を送信すると、クリエイターが承認または拒否します。承認後は案件詳細ページ内でチャットし、納品URLの確認と完了処理を行います。",
            },
            {
              title: "料金プラン",
              body: "料金ページでは Free / Standard / GlobalPro を確認できます。日本向けのみか、海外向けクリエイターにも依頼したいかでプランを選んでください。",
            },
          ]
        : [
            {
              title: "Welcome",
              body: "This service allows companies to browse creators and rate cards, then send requests directly to creators.",
            },
            {
              title: "What to do first",
              body: "Start by browsing the creator list and opening creator detail pages. You can choose who to contact based on platforms, audience countries, and rate cards.",
            },
            {
              title: "How projects work",
              body: "After you send a request, the creator can approve or reject it. Once approved, communication happens inside the request detail page, and you can review the delivery URL before marking the job complete.",
            },
            {
              title: "Billing plans",
              body: "On the billing page, you can review Free, Standard, and GlobalPro. Choose your plan based on whether you only need Japan-focused creators or also want access to creators with global audiences.",
            },
          ],
    [locale]
  );

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = slides[step];
  const isLast = step === slides.length - 1;

  const completeOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(copy.loginCheckError);
        setLoading(false);
        return;
      }

      const { data: existingState, error: stateFetchError } = await supabase
        .from("user_states")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (stateFetchError) {
        setError(stateFetchError.message);
        setLoading(false);
        return;
      }

      if (existingState) {
        const { error: updateError } = await supabase
          .from("user_states")
          .update({
            company_profile_completed: true,
            onboarding_completed: true,
          })
          .eq("user_id", user.id);

        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("user_states")
          .insert({
            user_id: user.id,
            company_profile_completed: true,
            creator_profile_completed: false,
            onboarding_completed: true,
          });

        if (insertError) {
          setError(insertError.message);
          setLoading(false);
          return;
        }
      }

      router.replace("/b/dashboard");
    } catch (e) {
      console.error(e);
      setError(copy.saveError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex justify-end">
          <LocaleTabs locale={locale} setLocale={setLocale} />
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">{copy.badge}</p>
              <h1 className="text-2xl font-bold">{copy.title}</h1>
            </div>

            <span className="text-sm text-gray-500">
              {step + 1} / {slides.length}
            </span>
          </div>

          <div className="rounded-2xl bg-gray-50 p-6">
            <h2 className="text-xl font-semibold">{current.title}</h2>
            <p className="mt-3 whitespace-pre-line text-gray-700">
              {current.body}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={completeOnboarding}
              disabled={loading}
              className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {loading ? copy.processing : copy.skip}
            </button>

            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => prev - 1)}
                  disabled={loading}
                  className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {copy.back}
                </button>
              )}

              {!isLast ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => prev + 1)}
                  disabled={loading}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {copy.next}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={completeOnboarding}
                  disabled={loading}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? copy.processing : copy.finish}
                </button>
              )}
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}