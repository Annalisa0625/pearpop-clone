// app/signup/creator/SignupCreatorSessionGuard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import CreatorPricePickerCollapseBehavior from "./CreatorPricePickerCollapseBehavior";
import SignupCreatorClient from "./SignupCreatorClient";

const SIGNUP_DRAFT_KEY = "trendre_creator_signup_draft_v8_compact";

function hasGoogleAuthProvider(user: {
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }> | null;
}) {
  const appMetadata = user.app_metadata ?? {};
  const providers = Array.isArray(appMetadata.providers)
    ? appMetadata.providers
    : [];

  return (
    appMetadata.provider === "google" ||
    providers.some((provider) => provider === "google") ||
    user.identities?.some((identity) => identity.provider === "google") === true
  );
}

function syncDraftEmail(email: string) {
  const raw = window.localStorage.getItem(SIGNUP_DRAFT_KEY);
  if (!raw) return;

  try {
    const draft = JSON.parse(raw) as Record<string, unknown>;
    window.localStorage.setItem(
      SIGNUP_DRAFT_KEY,
      JSON.stringify({ ...draft, email })
    );
  } catch {
    window.localStorage.removeItem(SIGNUP_DRAFT_KEY);
  }
}

export default function SignupCreatorSessionGuard({
  isCreatorOnly,
}: {
  isCreatorOnly: boolean;
}) {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [ready, setReady] = useState(false);
  const [guardError, setGuardError] = useState<string | null>(null);
  const hasOAuthReturn = searchParams.get("oauth") === "1";

  useEffect(() => {
    let active = true;

    const prepareSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!active || !session?.user) return;

        const { data: userState, error: userStateError } = await supabase
          .from("user_states")
          .select("creator_profile_completed")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (userStateError) throw userStateError;
        if (!active) return;

        if (userState?.creator_profile_completed) {
          return;
        }

        if (hasOAuthReturn) {
          if (!hasGoogleAuthProvider(session.user)) {
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) throw signOutError;
            return;
          }

          const oauthEmail = session.user.email?.trim() ?? "";
          if (oauthEmail) syncDraftEmail(oauthEmail);
          return;
        }

        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
      } catch (error) {
        console.error("Creator signup session guard failed", error);
        if (active) {
          setGuardError(
            "ログイン状態を確認できませんでした。ページを再読み込みして、もう一度お試しください。"
          );
        }
      } finally {
        if (active) setReady(true);
      }
    };

    void prepareSession();

    return () => {
      active = false;
    };
  }, [hasOAuthReturn, supabase]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (guardError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="max-w-md text-center text-sm font-bold leading-6 text-rose-700">
          {guardError}
        </p>
      </div>
    );
  }

  return (
    <>
      <CreatorPricePickerCollapseBehavior />
      <SignupCreatorClient isCreatorOnly={isCreatorOnly} />
    </>
  );
}
