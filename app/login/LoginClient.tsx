// app/login/LoginClient.tsx
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";

function normalizeNextPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function normalizeAuthError(message: string, locale: "ja" | "en") {
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    return locale === "ja"
      ? "メールアドレスまたはパスワードが正しくありません。"
      : "The email address or password is incorrect.";
  }

  if (lower.includes("email not confirmed")) {
    return locale === "ja"
      ? "メール認証が完了していません。"
      : "Your email address has not been confirmed.";
  }

  if (lower.includes("too many requests")) {
    return locale === "ja"
      ? "試行回数が多すぎます。少し時間を置いてから再度お試しください。"
      : "Too many attempts. Please wait a moment and try again.";
  }

  return locale === "ja"
    ? "ログインに失敗しました。入力内容をご確認ください。"
    : "Login failed. Please check your input and try again.";
}

function getOAuthRedirectUrl(nextPath: string | null) {
  if (typeof window === "undefined") return undefined;

  const url = new URL("/login", window.location.origin);
  url.searchParams.set("oauth", "1");

  const safeNext = normalizeNextPath(nextPath);
  if (safeNext) {
    url.searchParams.set("next", safeNext);
  }

  return url.toString();
}

function blurActiveElement() {
  if (typeof document === "undefined") return;

  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

function resetWindowPosition() {
  if (typeof window === "undefined") return;

  window.scrollTo(0, 0);
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

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useAppLocale();

  const safeLocale = locale === "en" ? "en" : "ja";
  const nextParam = searchParams.get("next");
  const hasOAuthReturn = searchParams.get("oauth") === "1";

  const safeNextPath = normalizeNextPath(nextParam);
  const afterLoginPath = safeNextPath || "/";

  const companySignupHref = safeNextPath
    ? `/signup/company?next=${encodeURIComponent(safeNextPath)}`
    : "/signup/company";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "ログイン",
            subtitle:
              "登録済みのアカウントでログインしてください。注文途中の場合は、ログイン後に元のページへ戻れます。",
            email: "メールアドレス",
            password: "パスワード",
            emailPlaceholder: "company@example.com",
            passwordPlaceholder: "パスワード",
            emailRequired: "メールアドレスを入力してください",
            passwordRequired: "パスワードを入力してください",
            login: "ログイン",
            loggingIn: "ログイン中...",
            googleLogin: "Googleで続ける",
            googleLoggingIn: "Googleに移動中...",
            orText: "or",
            oauthFailed:
              "Googleログインに失敗しました。時間を置いて再度お試しください。",
            signup: "アカウントをお持ちでない方は新規登録",
            copyright: "© 2026 Trendre",
          }
        : {
            title: "Log in",
            subtitle:
              "Sign in with your existing account. If you started an order, you can return to the previous page after logging in.",
            email: "Email",
            password: "Password",
            emailPlaceholder: "company@example.com",
            passwordPlaceholder: "Password",
            emailRequired: "Please enter your email address",
            passwordRequired: "Please enter your password",
            login: "Log in",
            loggingIn: "Logging in...",
            googleLogin: "Continue with Google",
            googleLoggingIn: "Redirecting to Google...",
            orText: "or",
            oauthFailed:
              "Google login failed. Please wait a moment and try again.",
            signup: "New to Trendre? Create an account",
            copyright: "© 2026 Trendre",
          },
    [safeLocale]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasOAuthReturn) return;

    const redirectSignedInUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        blurActiveElement();
        resetWindowPosition();
        router.replace(afterLoginPath);
      }
    };

    void redirectSignedInUser();
  }, [afterLoginPath, hasOAuthReturn, router]);

  const handleGoogleLogin = async () => {
    blurActiveElement();
    resetWindowPosition();

    setError("");
    setOauthLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectUrl(safeNextPath),
      },
    });

    if (oauthError) {
      console.error(oauthError);
      setError(copy.oauthFailed);
      setOauthLoading(false);
    }
  };

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    setLoading(true);
    setError("");

    if (!email.trim()) {
      setError(copy.emailRequired);
      setLoading(false);
      return;
    }

    if (!password) {
      setError(copy.passwordRequired);
      setLoading(false);
      return;
    }

    blurActiveElement();

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError(normalizeAuthError(loginError.message, safeLocale));
      setLoading(false);
      return;
    }

    blurActiveElement();
    resetWindowPosition();
    setLoading(false);

    window.setTimeout(() => {
      router.replace(afterLoginPath);
    }, 80);
  };

  const isSubmitting = loading || oauthLoading;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f9fb]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-rose-100/55 blur-3xl" />
        <div className="absolute right-0 top-16 h-[620px] w-[620px] rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8">
        <div className="flex justify-center">
          <Link href="/home" className="inline-flex items-center">
            <img
              src="/brand/trendre-logo-full.png"
              alt="Trendre"
              className="h-11 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <section className="w-full max-w-[620px] rounded-[34px] border border-white/80 bg-white/88 p-6 shadow-[0_32px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl md:p-9">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                  {copy.title}
                </h1>

                <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-slate-500">
                  {copy.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                <span>
                  {oauthLoading ? copy.googleLoggingIn : copy.googleLogin}
                </span>
              </button>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-black text-slate-300">
                  {copy.orText}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-800">
                    {copy.email}
                  </label>
                  <input
                    type="email"
                    placeholder={copy.emailPlaceholder}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100"
                    autoComplete="email"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-800">
                    {copy.password}
                  </label>
                  <input
                    type="password"
                    placeholder={copy.passwordPlaceholder}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff5f67] px-5 py-4 text-sm font-black text-white shadow-xl shadow-rose-500/20 transition hover:-translate-y-0.5 hover:bg-[#ff4b55] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{loading ? copy.loggingIn : copy.login}</span>
                {!loading ? <ArrowIcon /> : null}
              </button>

              <div className="pt-1 text-center">
                <Link
                  href={companySignupHref}
                  className="inline-flex text-sm font-black text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline"
                >
                  {copy.signup}
                </Link>
              </div>
            </form>
          </section>
        </div>

        <p className="pb-6 text-center text-xs font-bold text-slate-400">
          {copy.copyright}
        </p>
      </div>
    </main>
  );
}