// app/login/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

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

function getOAuthRedirectUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/`;
}

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            badge: "Login",
            title: "ログイン",
            subtitle:
              "登録済みのメールアドレスとパスワード、またはGoogleアカウントでログインしてください。",
            emailPlaceholder: "メールアドレス",
            passwordPlaceholder: "パスワード",
            emailRequired: "メールアドレスを入力してください",
            passwordRequired: "パスワードを入力してください",
            login: "ログイン",
            loggingIn: "ログイン中…",
            googleLogin: "Googleでログイン",
            googleLoggingIn: "Googleに移動中…",
            orText: "または",
            oauthFailed:
              "Googleログインに失敗しました。時間を置いて再度お試しください。",
            creatorEntry: "クリエイター登録はこちら",
            companyEntry: "企業登録はこちら",
            heroBadge: "Welcome back",
            heroTitle: "企業もクリエイターも、ここから再開。",
            heroBody:
              "Trendre では、企業がクリエイターを探して直接依頼でき、承認後は案件ページ内でチャット・納品・完了承認まで進められます。",
            point1: "企業は条件を見ながら直接依頼",
            point2: "クリエイターは商品メニューを公開",
            point3: "案件ごとに進行管理を一元化",
          }
        : {
            badge: "Login",
            title: "Login",
            subtitle:
              "Sign in with your registered email and password, or continue with Google.",
            emailPlaceholder: "Email Address",
            passwordPlaceholder: "Password",
            emailRequired: "Please enter your email address",
            passwordRequired: "Please enter your password",
            login: "Login",
            loggingIn: "Logging in...",
            googleLogin: "Continue with Google",
            googleLoggingIn: "Redirecting to Google...",
            orText: "or",
            oauthFailed:
              "Google login failed. Please wait a moment and try again.",
            creatorEntry: "Creator sign up",
            companyEntry: "Company sign up",
            heroBadge: "Welcome back",
            heroTitle: "For companies and creators, pick up where you left off.",
            heroBody:
              "With Trendre, companies can discover creators and send direct requests, while both sides can manage chat, delivery, and completion inside each project page.",
            point1: "Companies can send direct requests",
            point2: "Creators can publish product menus",
            point3: "Projects can be managed in one place",
          },
    [locale]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setError("");
    setOauthLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });

    if (error) {
      console.error(error);
      setError(copy.oauthFailed);
      setOauthLoading(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(normalizeAuthError(error.message, locale));
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace("/");
  };

  const isSubmitting = loading || oauthLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="rounded-3xl border bg-white p-8 shadow-sm md:p-10">
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {copy.heroBadge}
            </p>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              {copy.heroTitle}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-gray-600">
              {copy.heroBody}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-gray-50 p-5 text-sm font-semibold text-gray-800">
                {copy.point1}
              </div>
              <div className="rounded-2xl border bg-gray-50 p-5 text-sm font-semibold text-gray-800">
                {copy.point2}
              </div>
              <div className="rounded-2xl border bg-gray-50 p-5 text-sm font-semibold text-gray-800">
                {copy.point3}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-blue-600">
                  {copy.badge}
                </p>
                <h2 className="text-3xl font-bold tracking-tight">
                  {copy.title}
                </h2>
                <p className="text-sm leading-7 text-gray-600">
                  {copy.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-xl border bg-white px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {oauthLoading ? copy.googleLoggingIn : copy.googleLogin}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400">
                  {copy.orText}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  placeholder={copy.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  autoComplete="email"
                  disabled={isSubmitting}
                />

                <input
                  type="password"
                  placeholder={copy.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <p className="whitespace-pre-wrap text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? copy.loggingIn : copy.login}
              </button>

              <div className="flex flex-col gap-2 pt-2 text-center text-sm">
                <Link
                  href="/signup/creator-entry"
                  className="text-blue-600 hover:underline"
                >
                  {copy.creatorEntry}
                </Link>
                <Link
                  href="/signup/company-entry"
                  className="text-blue-600 hover:underline"
                >
                  {copy.companyEntry}
                </Link>
              </div>
            </form>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}