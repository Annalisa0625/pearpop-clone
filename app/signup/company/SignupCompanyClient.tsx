"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { normalizeNextPath } from "@/lib/auth/next-path";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

const USAGE_PURPOSE_OPTIONS = ["新規顧客の獲得", "認知拡大", "商品PR", "SNS運用強化", "海外向けPR", "その他"];

function callbackUrl(nextPath: string | null) {
  const url = new URL("/auth/callback", window.location.origin);
  // Keep a query delimiter in every Magic Link redirect so the Auth email
  // template can safely append token_hash and type with `&`.
  url.searchParams.set("next", nextPath || "/b/dashboard");
  return url.toString();
}

function googleRedirectUrl(nextPath: string | null) {
  const url = new URL("/signup/company", window.location.origin);
  url.searchParams.set("oauth", "1");
  if (nextPath) url.searchParams.set("next", nextPath);
  return url.toString();
}

function InputField({ label, value, onChange, type = "text", autoComplete, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; placeholder?: string;
}) {
  return <div className="space-y-2">
    <label className="text-sm font-black text-slate-800">{label}</label>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder={placeholder}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-100" />
  </div>;
}

export default function SignupCompanyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const ja = locale !== "en";
  const safeNextPath = normalizeNextPath(searchParams.get("next"));
  const afterSignupPath = safeNextPath || "/b/dashboard";

  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [usagePurpose, setUsagePurpose] = useState("");
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const hydrateSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session?.user) {
        setSessionReady(true);
        return;
      }

      const { data: existingCompany } = await supabase.from("companies").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!active) return;
      if (existingCompany) {
        router.replace(afterSignupPath);
        return;
      }
      setEmail(session.user.email ?? "");
      setIsAuthenticated(true);
      setSessionReady(true);
    };
    void hydrateSession();
    return () => { active = false; };
  }, [afterSignupPath, router, supabase]);

  const sendMagicLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setSent(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(ja ? "メールアドレスの形式が正しくありません" : "Please enter a valid email address.");
      return;
    }
    setSending(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: callbackUrl(safeNextPath) },
    });
    if (otpError) setError(otpError.message || (ja ? "認証メールを送信できませんでした" : "Could not send the verification email."));
    else setSent(true);
    setSending(false);
  };

  const signUpWithGoogle = async () => {
    setError(null);
    // OAuth remains browser-handled. The token-hash callback is only for the
    // Supabase Auth Magic Link template and must not receive OAuth codes.
    const redirectTo = googleRedirectUrl(safeNextPath);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (oauthError) setError(oauthError.message || (ja ? "Google認証を開始できませんでした" : "Could not start Google authentication."));
  };

  const submitCompany = async () => {
    setError(null);
    if (!companyName.trim() || !websiteUrl.trim() || !phoneNumber.trim() || !usagePurpose || !agree) {
      setError(ja ? "すべての必須項目を入力し、利用規約とプライバシーポリシーに同意してください" : "Complete all required fields and agree to the Terms and Privacy Policy.");
      return;
    }
    if (!/^https?:\/\/.+/i.test(websiteUrl.trim())) {
      setError(ja ? "URLは http:// または https:// から入力してください" : "The URL must start with http:// or https://.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError(ja ? "認証セッションが見つかりません。認証メールをもう一度送信してください" : "Your session has expired. Please request another verification email.");
        return;
      }
      const response = await fetch("/api/signup/complete-company", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          company_name: companyName.trim(), website_url: websiteUrl.trim(), phone_number: phoneNumber.trim(), usage_purpose: usagePurpose,
          agreed_to_terms: true, agreed_to_privacy: true,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? (ja ? "登録に失敗しました" : "Could not complete registration."));
        return;
      }
      router.replace(afterSignupPath);
    } catch {
      setError(ja ? "通信エラーが発生しました" : "A network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const authError = searchParams.get("auth_error");
  if (!sessionReady) return <main className="p-6 text-center text-sm font-bold text-slate-500">{ja ? "確認中です..." : "Checking..."}</main>;

  return <main className="min-h-screen bg-[#f8f9fb] px-4 py-8 text-slate-950">
    <section className="mx-auto w-full max-w-xl rounded-[32px] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.10)] md:p-8">
      <Link href="/home" className="text-sm font-black text-[#ff5f67]">Trendre</Link>
      <h1 className="mt-5 text-3xl font-black tracking-[-0.055em]">{ja ? "企業アカウントを作成" : "Create company account"}</h1>
      {!isAuthenticated ? <div className="mt-6 space-y-5">
        <p className="text-sm font-semibold leading-6 text-slate-500">{ja ? "まずメールアドレスを認証してください。認証後に会社情報を入力します。" : "Verify your email first, then enter your company information."}</p>
        {authError ? <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{ja ? "認証リンクが無効または期限切れです。もう一度送信してください。" : "This verification link is invalid or expired. Please request another one."}</p> : null}
        <InputField label={ja ? "メールアドレス" : "Email"} value={email} onChange={setEmail} type="email" autoComplete="email" placeholder="company@example.com" />
        <button type="button" onClick={() => void sendMagicLink()} disabled={sending} className="w-full rounded-full bg-[#ff5f67] px-6 py-4 text-sm font-black text-white disabled:opacity-60">{sending ? (ja ? "送信中..." : "Sending...") : (ja ? "認証メールを送信" : "Send verification email")}</button>
        {sent ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{ja ? "認証メールを送信しました。メール内のリンクを開いてください。" : "Verification email sent. Open the link in the email."}</p> : null}
        <div className="flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-xs text-slate-400">or</span><span className="h-px flex-1 bg-slate-200" /></div>
        <button type="button" onClick={() => void signUpWithGoogle()} className="w-full rounded-full border border-slate-200 px-6 py-4 text-sm font-black text-slate-800">{ja ? "Googleで続ける" : "Continue with Google"}</button>
      </div> : <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); void submitCompany(); }}>
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{ja ? "認証済みメールアドレス" : "Verified email"}: {email}</p>
        <InputField label={ja ? "会社名" : "Company name"} value={companyName} onChange={setCompanyName} autoComplete="organization" />
        <InputField label={ja ? "会社HP URL または ECサイト URL" : "Company or store URL"} value={websiteUrl} onChange={setWebsiteUrl} autoComplete="url" placeholder="https://example.com" />
        <InputField label={ja ? "電話番号" : "Phone number"} value={phoneNumber} onChange={setPhoneNumber} autoComplete="tel" />
        <div className="space-y-2"><label className="text-sm font-black text-slate-800">{ja ? "利用目的" : "Usage purpose"}</label><select value={usagePurpose} onChange={(event) => setUsagePurpose(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-semibold"><option value="">{ja ? "選択してください" : "Select one"}</option>{USAGE_PURPOSE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
        <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700"><input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} /><span>{ja ? "利用規約とプライバシーポリシーに同意します" : "I agree to the Terms of Service and Privacy Policy"} <Link href="/terms" target="_blank" className="underline">Terms</Link> / <Link href="/privacy" target="_blank" className="underline">Privacy</Link></span></label>
        <button type="submit" disabled={submitting} className="w-full rounded-full bg-[#ff5f67] px-6 py-4 text-sm font-black text-white disabled:opacity-60">{submitting ? (ja ? "登録中..." : "Creating...") : (ja ? "登録して続ける" : "Complete registration")}</button>
      </form>}
      {error ? <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p> : null}
      <p className="mt-6 text-center text-sm font-bold text-slate-500"><Link href={`/login${safeNextPath ? `?next=${encodeURIComponent(safeNextPath)}` : ""}`} className="underline">{ja ? "すでにアカウントをお持ちの方はログイン" : "Already have an account? Log in"}</Link></p>
    </section>
  </main>;
}
