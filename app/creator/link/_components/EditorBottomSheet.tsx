"use client";

import { useEffect, useRef, type ReactNode } from "react";

function CloseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

type Props = {
  title: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  inline?: boolean;
};

export default function EditorBottomSheet({ title, description, closeLabel, onClose, children, inline = false }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    if (!inline) document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 30);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      if (!inline) document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus({ preventScroll: true });
    };
  }, [inline]);

  const panel = (
    <section role="dialog" aria-modal={inline ? undefined : "true"} aria-label={title} className={`${inline ? "trendre-inline-editor-panel h-full rounded-t-[28px]" : "max-h-[min(88dvh,760px)] rounded-t-[28px] md:max-w-[760px] md:rounded-[28px]"} flex w-full flex-col overflow-hidden bg-[#fffdfa] shadow-[0_-12px_44px_rgba(15,23,42,0.13)]`}>
      <header className="shrink-0 border-b border-black/[0.055] bg-[#fffdfa]/96 px-4 pb-2.5 pt-2 backdrop-blur-xl">
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-slate-300" />
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold tracking-[-0.025em] text-slate-950">{title}</h2>
            {description ? <p className="mt-0.5 line-clamp-1 text-[12px] leading-4 text-slate-500">{description}</p> : null}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel} className="onboarding-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 outline-none transition hover:bg-slate-200 focus-visible:ring-4 focus-visible:ring-rose-200"><CloseIcon /></button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [scrollbar-width:thin]">{children}</div>
    </section>
  );

  if (inline) return panel;
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] md:items-center md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>{panel}</div>;
}
