//app/creator/onboarding/page.tsx
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

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Creator Onboarding",
            title: "クリエイター向けご案内",
            checkingError: "ログイン状態を確認できませんでした。",
            completeError: "案内の完了処理に失敗しました。",
            processing: "処理中...",
            skipping: "処理中...",
            finishing: "完了中...",
            skip: "スキップ",
            back: "戻る",
            next: "次へ",
            start: "開始する",
          }
        : {
            badge: "Creator Onboarding",
            title: "Creator Guide",
            checkingError: "We could not confirm your login status.",
            completeError: "Failed to complete onboarding.",
            processing: "Processing...",
            skipping: "Processing...",
            finishing: "Finishing...",
            skip: "Skip",
            back: "Back",
            next: "Next",
            start: "Get Started",
          },
    [locale]
  );

  const slides = useMemo(
    () =>
      locale === "ja"
        ? [
            {
              title: "ようこそ",
              body: "このサービスは、企業があなたの参考条件やSNS情報を見て直接依頼できる仕組みです。",
            },
            {
              title: "まずやること",
              body: "承認後は、ダッシュボードから参考条件カードを追加してください。媒体や参考価格、二次利用可否などを登録できます。",
            },
            {
              title: "案件の流れ",
              body: "企業から依頼が届いたら、承認または拒否できます。承認後は案件詳細ページ内でチャットし、納品URLを提出します。",
            },
            {
              title: "今後の設定",
              body: "今後、報酬受け取り設定や支払い関連の設定を追加予定です。現時点ではダッシュボードと参考条件カードの整備を優先してください。",
            },
          ]
        : [
            {
              title: "Welcome",
              body: "This service lets companies review your rate cards and social account information, then send requests to you directly.",
            },
            {
              title: "What to do first",
              body: "After approval, add your rate cards from the dashboard. You can register platforms, reference pricing, and whether secondary use is allowed.",
            },
            {
              title: "How projects work",
              body: "When a company sends a request, you can approve or reject it. After approval, you will chat inside the request detail page and later submit your delivery URL.",
            },
            {
              title: "What comes next",
              body: "Payout settings and payment-related setup will be added later. For now, please focus on preparing your dashboard and rate cards.",
            },
          ],
    [locale]
  );

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLast = step === slides.length - 1;
  const current = slides[step];

  const completeOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(copy.checkingError);
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("user_states")
        .update({
          onboarding_completed: true,
        })
        .eq("user_id", user.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      router.replace("/creator/dashboard");
    } catch (e) {
      console.error(e);
      setError(copy.completeError);
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const handleFinish = async () => {
    await completeOnboarding();
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
              onClick={handleSkip}
              disabled={loading}
              className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {loading ? copy.skipping : copy.skip}
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
                  onClick={handleFinish}
                  disabled={loading}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? copy.finishing : copy.start}
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