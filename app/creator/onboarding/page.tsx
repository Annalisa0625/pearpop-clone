//app/creator/onboarding/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import LocaleSelector from "@/components/i18n/LocaleSelector";
import { creatorOnboardingDictionary } from "@/lib/i18n/creatorOnboarding";
import { isCreatorPaidMarketplaceEnabled } from "@/lib/creator/marketplaceAvailability";

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale, setLocale } = useAppLocale({ allLocales: true });
  const copy = creatorOnboardingDictionary[locale];
  const [paidMarketplaceEnabled, setPaidMarketplaceEnabled] = useState<boolean | null>(null);
  const slides = paidMarketplaceEnabled ? copy.slides : copy.nonPaidSlides;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLast = step === slides.length - 1;
  const current = slides[step];

  useEffect(() => {
    let cancelled = false;

    const loadAvailability = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setPaidMarketplaceEnabled(false);
        return;
      }

      const { data: creator } = await supabase
        .from("creators")
        .select("country")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setPaidMarketplaceEnabled(
          isCreatorPaidMarketplaceEnabled(creator?.country),
        );
      }
    };

    void loadAvailability();
    return () => { cancelled = true; };
  }, [supabase]);

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
          <LocaleSelector
            value={locale}
            onChange={setLocale}
            ariaLabel={copy.languageLabel}
            variant="select"
          />
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
