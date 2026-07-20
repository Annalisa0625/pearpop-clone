"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { signInWithGoogle } from "@/lib/auth/google-oauth";
import { useAppLocale } from "@/lib/i18n/locale";

type ViewState =
  | "checkingSession"
  | "idle"
  | "submittingEmail"
  | "startingGoogle"
  | "preparingLink"
  | "error";

const LOGIN_HREF = "/login?next=%2Fcreator%2Flink";
const SIGNUP_COPY = {
  ja: {
    title: "あなたのリンクを、すぐに作れます", description: "SNS、リンク、仕事の相談窓口をひとつにまとめられます。", google: "Googleで続ける", googleLoading: "Googleに移動中…", or: "または", email: "メールアドレス", password: "パスワード", passwordHint: "8文字以上", emailSubmit: "メールアドレスで登録", emailSubmitting: "登録しています…", free: "無料で利用できます", startNow: "登録後すぐに編集を始められます", existingLead: "すでにアカウントをお持ちの方", login: "ログイン", consentStart: "続行することで、", terms: "利用規約", consentAnd: "と", privacy: "プライバシーポリシー", consentEnd: "に同意したものとみなします。",
    preparing: "リンクを準備しています…", preparingHelp: "数秒で編集を始められます", retryTitle: "もう一度お試しください", retry: "もう一度試す", missingSession: "ログインを完了できませんでした。\nもう一度お試しください。", prepareError: "リンクを準備できませんでした。時間を置いてもう一度お試しください。", googleError: "Googleログインを開始できませんでした。\n時間を置いてもう一度お試しください。", invalidEmail: "メールアドレスを確認してください。", shortPassword: "パスワードは8文字以上で入力してください。", existingAccount: "このメールアドレスはすでに登録されています。ログインしてください。", rateLimit: "試行回数が多すぎます。少し時間を置いてもう一度お試しください。", genericSignup: "登録を完了できませんでした。時間を置いてもう一度お試しください。", authConfiguration: "登録を完了できませんでした。\n現在の認証設定を確認して、もう一度お試しください。",
  },
  en: {
    title: "Create your link in minutes", description: "Bring your social profiles, links, and work inquiries together in one place.", google: "Continue with Google", googleLoading: "Redirecting to Google…", or: "or", email: "Email address", password: "Password", passwordHint: "At least 8 characters", emailSubmit: "Sign up with email", emailSubmitting: "Creating your account…", free: "Free to use", startNow: "Start editing right after signup", existingLead: "Already have an account?", login: "Log in", consentStart: "By continuing, you agree to the ", terms: "Terms of Service", consentAnd: " and ", privacy: "Privacy Policy", consentEnd: ".",
    preparing: "Preparing your link…", preparingHelp: "You can start editing in a few seconds", retryTitle: "Please try again", retry: "Try again", missingSession: "We could not complete your login.\nPlease try again.", prepareError: "We could not prepare your link. Please wait a moment and try again.", googleError: "We could not start Google login.\nPlease wait a moment and try again.", invalidEmail: "Please check your email address.", shortPassword: "Enter a password with at least 8 characters.", existingAccount: "This email address is already registered. Please log in.", rateLimit: "Too many attempts. Please wait a moment and try again.", genericSignup: "We could not complete signup. Please wait a moment and try again.", authConfiguration: "We could not complete signup.\nPlease check the current authentication settings and try again.",
  },
} as const;

type SignupCopy = (typeof SIGNUP_COPY)[keyof typeof SIGNUP_COPY];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.09-1.93 3.27-4.78 3.27-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.84 0-5.25-1.92-6.12-4.5H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
      <path fill="#FBBC05" d="M5.88 14.13A6.6 6.6 0 0 1 5.53 12c0-.74.13-1.45.35-2.13V7.03H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.97l3.7-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.7 2.84c.87-2.58 3.28-4.49 6.12-4.49Z" />
    </svg>
  );
}

function blurAndResetViewport() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();
  window.scrollTo(0, 0);
}

function signupErrorMessage(message: string, copy: SignupCopy) {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered") || lower.includes("user already exists")) {
    return copy.existingAccount;
  }
  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("over_email_send_rate_limit")) {
    return copy.rateLimit;
  }
  if (lower.includes("invalid email") || lower.includes("email address") && lower.includes("invalid")) {
    return copy.invalidEmail;
  }
  if (lower.includes("password") && (lower.includes("short") || lower.includes("least") || lower.includes("weak"))) {
    return copy.shortPassword;
  }
  return copy.genericSignup;
}

function PreparingView({ copy, error, onRetry }: { copy: SignupCopy; error?: string; onRetry?: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbfaf8] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-sm text-center" aria-busy={!error}>
        {!error ? <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#ed5964]" /> : null}
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
          {error ? copy.retryTitle : copy.preparing}
        </h1>
        <p className={`mt-2 whitespace-pre-line text-sm leading-6 ${error ? "text-rose-700" : "text-slate-500"}`} role={error ? "alert" : undefined}>
          {error ?? copy.preparingHelp}
        </p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="mt-6 min-h-12 w-full rounded-2xl bg-[#29272a] px-5 text-sm font-semibold text-white outline-none transition hover:bg-black focus-visible:ring-4 focus-visible:ring-rose-200">
            {copy.retry}
          </button>
        ) : null}
      </div>
    </main>
  );
}

export default function SignupLinkClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, isLocaleReady } = useAppLocale();
  const copy = SIGNUP_COPY[locale === "en" ? "en" : "ja"];
  const oauthReturn = searchParams.get("oauth") === "1";
  const [view, setView] = useState<ViewState>("checkingSession");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showLoginAction, setShowLoginAction] = useState(false);
  const preparingRef = useRef(false);
  const initialCheckRef = useRef(false);

  const prepareLink = async () => {
    if (preparingRef.current) return;
    preparingRef.current = true;
    setError("");
    setShowLoginAction(false);
    setView("preparingLink");

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.user) {
        throw new Error("missing_session");
      }

      const response = await fetch("/api/creator/link/bootstrap", {
        method: "POST",
        credentials: "include",
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("ok" in result) ||
        result.ok !== true ||
        !("isNewLink" in result) ||
        typeof result.isNewLink !== "boolean"
      ) {
        throw new Error("bootstrap_failed");
      }

      router.replace(result.isNewLink ? "/creator/link?firstRun=1" : "/creator/link");
    } catch (prepareError) {
      const message = prepareError instanceof Error && prepareError.message === "missing_session"
        ? copy.missingSession
        : copy.prepareError;
      preparingRef.current = false;
      setError(message);
      setView("error");
    }
  };

  useEffect(() => {
    if (!isLocaleReady) return;
    if (initialCheckRef.current) return;
    initialCheckRef.current = true;

    const checkSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (oauthReturn) {
          setError(copy.missingSession);
          setView("error");
        } else {
          setView("idle");
        }
        return;
      }
      if (data.session?.user) {
        void prepareLink();
        return;
      }
      if (oauthReturn) {
        setError(copy.missingSession);
        setView("error");
        return;
      }
      setView("idle");
    };

    void checkSession();
  }, [isLocaleReady, oauthReturn]);

  const handleEmailSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (view !== "idle") return;

    const normalizedEmail = email.trim().toLowerCase();
    setError("");
    setShowLoginAction(false);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(copy.invalidEmail);
      return;
    }
    if (password.length < 8) {
      setError(copy.shortPassword);
      return;
    }

    blurAndResetViewport();
    setView("submittingEmail");
    const { data, error: signupError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (signupError) {
      const message = signupErrorMessage(signupError.message, copy);
      setError(message);
      setShowLoginAction(message === copy.existingAccount);
      setView("idle");
      return;
    }

    if (!data.session) {
      const isExistingAccount = Array.isArray(data.user?.identities) && data.user.identities.length === 0;
      setError(isExistingAccount
        ? copy.existingAccount
        : copy.authConfiguration);
      setShowLoginAction(isExistingAccount);
      setView("idle");
      return;
    }

    void prepareLink();
  };

  const handleGoogleSignup = async () => {
    if (view !== "idle") return;
    blurAndResetViewport();
    setError("");
    setShowLoginAction(false);
    setView("startingGoogle");

    const redirectTo = `${window.location.origin}/signup/link?oauth=1`;
    const { error: oauthError } = await signInWithGoogle(redirectTo);

    if (oauthError) {
      setError(copy.googleError);
      setView("idle");
    }
  };

  const retry = () => {
    preparingRef.current = false;
    setError("");
    setShowLoginAction(false);
    setView("idle");
    router.replace("/signup/link");
  };

  if (view === "checkingSession" || view === "preparingLink") return <PreparingView copy={copy} />;
  if (view === "error") return <PreparingView copy={copy} error={error} onRetry={retry} />;

  const submitting = view === "submittingEmail" || view === "startingGoogle";

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#fbfaf8] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md items-center sm:min-h-[calc(100dvh-4rem)]">
        <section className="w-full rounded-[28px] bg-white px-5 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:px-8 sm:py-8" aria-busy={submitting}>
          <div className="text-center">
            <Link href="/for-creators/work-link" className="inline-flex min-h-11 items-center rounded-full px-2 text-lg font-semibold tracking-[-0.04em] text-slate-900 outline-none focus-visible:ring-4 focus-visible:ring-rose-200">
              Trendre <span className="ml-1 text-[#ed5964]">Link</span>
            </Link>
            <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.045em]">{copy.title}</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">{copy.description}</p>
          </div>

          <button type="button" onClick={handleGoogleSignup} disabled={submitting} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
            <GoogleIcon />
            <span>{view === "startingGoogle" ? copy.googleLoading : copy.google}</span>
          </button>

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">{copy.or}</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label htmlFor="link-signup-email" className="mb-1.5 block text-sm font-medium text-slate-700">{copy.email}</label>
              <input id="link-signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={submitting} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-[#ed5964] focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50" />
            </div>
            <div>
              <label htmlFor="link-signup-password" className="mb-1.5 block text-sm font-medium text-slate-700">{copy.password}</label>
              <input id="link-signup-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" disabled={submitting} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-[#ed5964] focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50" />
              <p className="mt-1.5 text-xs text-slate-400">{copy.passwordHint}</p>
            </div>

            {error ? (
              <div role="alert" className="whitespace-pre-line rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">
                <p>{error}</p>
                {showLoginAction ? <Link href={LOGIN_HREF} className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{copy.login}</Link> : null}
              </div>
            ) : null}

            <button type="submit" disabled={submitting} className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#ed5964] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(237,89,100,0.22)] outline-none transition hover:bg-[#e34f5b] focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60">
              {view === "submittingEmail" ? copy.emailSubmitting : copy.emailSubmit}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{copy.free}</span>
            <span>{copy.startNow}</span>
          </div>
          <p className="mt-5 text-center text-sm text-slate-500">{copy.existingLead} <Link href={LOGIN_HREF} className="inline-flex min-h-11 items-center font-semibold text-slate-900 underline underline-offset-4">{copy.login}</Link></p>
          <p className="mt-2 text-center text-[11px] leading-5 text-slate-400">{copy.consentStart}<Link href="/terms" className="underline underline-offset-2">{copy.terms}</Link>{copy.consentAnd}<Link href="/privacy" className="underline underline-offset-2">{copy.privacy}</Link>{copy.consentEnd}</p>
        </section>
      </div>
    </main>
  );
}
