"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";

type Props = {
  open: boolean;
  busy?: boolean;
  emailSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onGoogle: () => void;
  onEmail: (email: string, password: string) => void;
};

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.19-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" /><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.62A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.64.39 3.19 1.05 4.55l3.34-2.62Z" /><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.34 2.62C7.18 7.7 9.39 5.94 12 5.94Z" /></svg>;
}

export default function DeferredLinkAuthSheet({ open, busy = false, emailSubmitting = false, error, onClose, onGoogle, onEmail }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailLoading, setShowEmailLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!emailSubmitting) { setShowEmailLoading(false); return; }
    const timer = window.setTimeout(() => setShowEmailLoading(true), 180);
    return () => window.clearTimeout(timer);
  }, [emailSubmitting]);

  if (!open) return null;
  const submit = (event: FormEvent) => { event.preventDefault(); if (!busy) onEmail(email, password); };

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[2px] sm:p-4" role="dialog" aria-modal="true" aria-labelledby="link-auth-title">
    <button type="button" className="absolute inset-0 cursor-default" onClick={() => { if (!busy) onClose(); }} aria-label="認証画面の背景を閉じる" />
    <section aria-busy={busy} className="trendre-auth-sheet relative z-[1] flex max-h-[min(90dvh,720px)] w-full max-w-[456px] flex-col overflow-hidden rounded-t-[30px] bg-[#fbfaf8] text-[#242326] shadow-[0_-18px_70px_rgba(0,0,0,.28)] sm:rounded-[30px]">
      <div className="shrink-0 px-5 pt-3 sm:px-7"><span aria-hidden="true" className="mx-auto block h-1.5 w-11 rounded-full bg-black/15" /><button ref={closeRef} type="button" onClick={onClose} disabled={busy} className="onboarding-press absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 outline-none hover:bg-black/[.05] focus-visible:ring-4 focus-visible:ring-rose-100 disabled:opacity-40" aria-label="閉じる"><X className="h-5 w-5" /></button></div>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7">
        <div className="pr-10"><p className="text-[12px] font-bold text-[#df5360]">あと少しで公開できます</p><h2 id="link-auth-title" className="mt-2 text-[30px] font-bold leading-[1.12] tracking-[-0.05em]">作ったLinkを<br />保存しましょう</h2><p className="mt-3 max-w-[360px] text-[14px] leading-6 text-[#716c67]">無料アカウントを作成すると、この内容をそのまま公開できます。</p></div>
        <button type="button" onClick={onGoogle} disabled={busy} className="link-onboarding-press mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-[#dcd8d4] bg-white px-5 text-[15px] font-semibold text-[#242326] outline-none hover:border-[#aaa49e] focus-visible:ring-4 focus-visible:ring-rose-100 disabled:opacity-55"><GoogleIcon />{busy ? "準備しています…" : "Googleで続ける"}</button>
        <div className="my-4 flex items-center gap-3 text-xs text-[#9a948e]"><span className="h-px flex-1 bg-[#e3dfdb]" />または<span className="h-px flex-1 bg-[#e3dfdb]" /></div>
        <form onSubmit={submit} className="space-y-3"><label className="sr-only" htmlFor="deferred-email">メールアドレス</label><input id="deferred-email" required type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} placeholder="メールアドレス" className="h-14 w-full rounded-2xl border border-[#dcd8d4] bg-white px-4 text-base outline-none placeholder:text-[#aaa49e] focus:border-[#242326] focus:ring-4 focus:ring-black/[.05]" /><label className="sr-only" htmlFor="deferred-password">パスワード</label><input id="deferred-password" required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} placeholder="パスワード（8文字以上）" className="h-14 w-full rounded-2xl border border-[#dcd8d4] bg-white px-4 text-base outline-none placeholder:text-[#aaa49e] focus:border-[#242326] focus:ring-4 focus:ring-black/[.05]" />{error ? <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">{error}</p> : null}<button type="submit" disabled={busy} className="link-onboarding-press flex min-h-14 w-full items-center justify-center rounded-full bg-[#242326] px-5 text-[15px] font-semibold text-white outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:opacity-55">{busy ? "メールを送信しています…" : "メールアドレスで続ける"}</button></form>
        <p className="mt-4 text-center text-[13px] text-[#77716b]">すでにアカウントをお持ちの方 <Link href="/login?next=%2Fsignup%2Flink%3Foauth%3D1%26draft%3D1" className="inline-flex min-h-11 items-center font-semibold text-[#242326] underline decoration-[#bbb5af] underline-offset-4">ログイン</Link></p>
      </div>
      {showEmailLoading ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#fbfaf8]/95 px-6 text-center backdrop-blur-sm" role="status" aria-live="polite"><div className="w-full max-w-[280px] rounded-[28px] border border-black/[0.06] bg-white/90 px-6 py-8 shadow-[0_18px_50px_rgba(36,35,38,.12)]"><p className="text-[12px] font-bold tracking-[0.18em] text-[#df5360]">Trendre</p><LoaderCircle className="mx-auto mt-5 h-8 w-8 animate-spin text-[#df5360] motion-reduce:animate-none" aria-hidden="true" /><p className="mt-5 text-[17px] font-bold tracking-[-0.025em] text-[#242326]">アカウントを作成しています…</p><p className="mt-2 text-[13px] leading-5 text-[#716c67]">登録情報を確認しています</p></div></div> : null}
    </section>
  </div>;
}
