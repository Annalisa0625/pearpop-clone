"use client";

import { useEffect, useRef, type ReactNode } from "react";

function CloseIcon() { return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }

export default function EditorBottomSheet({ title, description, closeLabel, onClose, children }: { title: string; description?: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => { const previousOverflow = document.body.style.overflow; const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; document.body.style.overflow = "hidden"; closeRef.current?.focus({ preventScroll: true }); const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); }; document.addEventListener("keydown", onKeyDown); return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); returnFocus?.focus({ preventScroll: true }); }; }, []);
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/30 backdrop-blur-[3px] md:items-center md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#fffdfa] shadow-[0_-10px_36px_rgba(15,23,42,0.12)] md:max-w-[760px] md:rounded-3xl"><header className="shrink-0 border-b border-slate-200/70 bg-[#fffdfa]/95 px-5 pb-3 pt-3 backdrop-blur-xl"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 md:hidden" /><div className="flex min-h-10 items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-lg font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>{description ? <p className="mt-0.5 text-sm leading-5 text-slate-500">{description}</p> : null}</div><button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"><CloseIcon /></button></div></header><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div></section></div>;
}
