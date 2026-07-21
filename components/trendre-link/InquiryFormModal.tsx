"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CreatorLinkInquiryFormKind } from "@/lib/trendre-link/inquiry-forms";
import type { CreatorLinkPublicInquiryResponse } from "@/lib/trendre-link/types";

type Fields = { contactName: string; contactEmail: string; subject: string; message: string; companyName: string; requestContent: string; productName: string; requestedPlatforms: string[]; desiredTiming: string; budget: string; offerType: string; details: string; website: string };
const EMPTY_FIELDS: Fields = { contactName: "", contactEmail: "", subject: "", message: "", companyName: "", requestContent: "", productName: "", requestedPlatforms: [], desiredTiming: "", budget: "", offerType: "", details: "", website: "" };
const PLATFORM_OPTIONS = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["x", "X"], ["youtube", "YouTube"], ["other", "その他"]] as const;

function CloseIcon() { return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }

export default function InquiryFormModal({ kind, title, slug, mode, locale, onClose }: { kind: CreatorLinkInquiryFormKind; title: string; slug: string; mode: "preview" | "public"; locale: "ja" | "en"; onClose: () => void }) {
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => { const previous = document.body.style.overflow; const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; document.body.style.overflow = "hidden"; closeRef.current?.focus({ preventScroll: true }); const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); }; document.addEventListener("keydown", keydown); return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", keydown); returnFocus?.focus({ preventScroll: true }); }; }, []);
  const update = (key: keyof Omit<Fields, "requestedPlatforms">, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const togglePlatform = (platform: string) => setFields((current) => ({ ...current, requestedPlatforms: current.requestedPlatforms.includes(platform) ? current.requestedPlatforms.filter((value) => value !== platform) : [...current.requestedPlatforms, platform] }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== "public" || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const response = await fetch("/api/public/creator-link/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ slug, formKind: kind, ...fields }) });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof data !== "object" || data === null || !("ok" in data) || (data as CreatorLinkPublicInquiryResponse).ok !== true) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "送信できませんでした。もう一度お試しください。";
        throw new Error(message);
      }
      setSent(true);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "送信できませんでした。もう一度お試しください。"); }
    finally { setSubmitting(false); }
  };

  const inputClass = "mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
  const textareaClass = "mt-1.5 h-[120px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
  const labelClass = "block text-sm font-medium text-slate-700";
  const required = <span className="ml-1 text-rose-500">*</span>;

  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/35 backdrop-blur-[3px] md:items-center md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#fffdfa] text-slate-900 shadow-[0_-10px_36px_rgba(15,23,42,0.14)] md:max-w-xl md:rounded-3xl">
      <header className="shrink-0 border-b border-slate-200/70 bg-[#fffdfa]/96 px-5 pb-3 pt-3 backdrop-blur"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 md:hidden" /><div className="flex min-h-10 items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2><p className="mt-0.5 text-sm leading-5 text-slate-500">{kind === "simple" ? (locale === "ja" ? "自由な内容で仕事の相談を送れます" : "Send a general work inquiry") : (locale === "ja" ? "PR案件に必要な情報をまとめて送れます" : "Send the details of a PR request")}</p></div><button ref={closeRef} type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label={locale === "ja" ? "閉じる" : "Close"}><CloseIcon /></button></div>{mode === "preview" ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">プレビューのため送信されません</p> : null}</header>
      {sent ? <div className="overflow-y-auto px-5 py-14 text-center text-slate-900"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600">✓</div><h3 className="mt-4 text-xl font-semibold text-slate-900">送信しました</h3><p className="mt-2 text-sm text-slate-600">内容を確認後、クリエイターから連絡があります</p><button type="button" onClick={onClose} className="mt-6 h-12 rounded-xl bg-[#29272A] px-6 text-sm font-medium text-white">閉じる</button></div> : <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
          {kind === "pr" ? <label className={labelClass}>会社名・ブランド名<input value={fields.companyName} maxLength={120} placeholder="例：Trendre株式会社" onChange={(e) => update("companyName", e.target.value)} className={inputClass} /></label> : null}
          <label className={labelClass}>{kind === "pr" ? "担当者名" : "お名前"}{required}<input required value={fields.contactName} maxLength={80} placeholder={kind === "pr" ? "担当者名" : "お名前"} onChange={(e) => update("contactName", e.target.value)} className={inputClass} /></label>
          <label className={labelClass}>メールアドレス{required}<input required type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={fields.contactEmail} maxLength={254} placeholder="name@example.com" onChange={(e) => update("contactEmail", e.target.value)} className={inputClass} /></label>
          {kind === "simple" ? <><label className={labelClass}>件名<input value={fields.subject} maxLength={120} placeholder="ご相談の件名" onChange={(e) => update("subject", e.target.value)} className={inputClass} /></label><label className={labelClass}>お問い合わせ内容{required}<textarea required value={fields.message} maxLength={3000} placeholder="相談内容をご入力ください" onChange={(e) => update("message", e.target.value)} className={textareaClass} /></label></> : <>
            <label className={labelClass}>商品・サービス名<input value={fields.productName} maxLength={200} placeholder="商品・サービス名" onChange={(e) => update("productName", e.target.value)} className={inputClass} /></label>
            <label className={labelClass}>依頼内容{required}<select required value={fields.requestContent} onChange={(e) => update("requestContent", e.target.value)} className={inputClass}><option value="">選択してください</option><option value="pr_post">PR投稿</option><option value="ugc">UGC制作</option><option value="product_review">商品レビュー</option><option value="visit_event">来店・体験</option><option value="other">その他</option></select></label>
            <fieldset><legend className="text-sm font-medium text-slate-700">希望するSNS</legend><div className="mt-2 flex flex-wrap gap-2">{PLATFORM_OPTIONS.map(([value, label]) => { const checked = fields.requestedPlatforms.includes(value); return <label key={value} className={`flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-sm ${checked ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600"}`}><input type="checkbox" checked={checked} onChange={() => togglePlatform(value)} className="sr-only" />{label}</label>; })}</div></fieldset>
            <label className={labelClass}>希望時期<input value={fields.desiredTiming} maxLength={120} placeholder="例：2026年9月頃" onChange={(e) => update("desiredTiming", e.target.value)} className={inputClass} /></label>
            <label className={labelClass}>予算<input value={fields.budget} maxLength={120} placeholder="例：10万円〜" onChange={(e) => update("budget", e.target.value)} className={inputClass} /></label>
            <label className={labelClass}>商品提供<select value={fields.offerType} onChange={(e) => update("offerType", e.target.value)} className={inputClass}><option value="">選択してください</option><option value="provided">あり</option><option value="not_provided">なし</option><option value="consult">相談したい</option></select></label>
            <label className={labelClass}>詳細<textarea value={fields.details} maxLength={3000} placeholder="補足事項をご入力ください" onChange={(e) => update("details", e.target.value)} className={textareaClass} /></label>
          </>}
          <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={fields.website} onChange={(e) => update("website", e.target.value)} /></label>
          {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>
        <footer className="shrink-0 border-t border-slate-200/70 bg-[#fffdfa]/96 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">{mode === "preview" ? <button type="button" disabled className="h-12 w-full rounded-xl bg-slate-200 text-sm font-medium text-slate-500">プレビューのため送信されません</button> : <button type="submit" disabled={submitting} className="h-12 w-full rounded-xl bg-[#29272A] text-sm font-semibold text-white disabled:opacity-50">{submitting ? "送信中…" : "送信する"}</button>}</footer>
      </form>}
    </section>
  </div>;
}
