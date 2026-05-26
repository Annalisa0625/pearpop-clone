// File: components/CompanySignupGateModal.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CompanySignupGateModalProps = {
  open: boolean;
  nextPath: string;
  locale: "ja" | "en";
  onClose: () => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m4.5 10.4 3.4 3.4 7.6-8.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniLogoMark() {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50">
      <span className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full bg-[#ff5f67]" />
      <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#ffb3b8]" />
      <span className="absolute bottom-3 left-3 h-1.5 w-6 rounded-full bg-[#ff5f67]/20" />
    </div>
  );
}

export default function CompanySignupGateModal({
  open,
  nextPath,
  locale,
  onClose,
}: CompanySignupGateModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const encodedNext = encodeURIComponent(nextPath || "/b/creators");

  const copy =
    locale === "ja"
      ? {
          badge: "企業アカウントが必要です",
          title: "このインフルエンサーに依頼するには、企業登録が必要です。",
          body:
            "無料で企業アカウントを作成すると、メニュー確認・依頼・支払い・納品確認までオンラインで進められます。",
          primary: "企業登録して続ける",
          secondary: "ログインはこちら",
          close: "あとで見る",
          point1: "表示価格を見てその場で依頼",
          point2: "支払いはStripeで安全に管理",
          point3: "納品確認までオンラインで完結",
          smallNote:
            "登録後、このインフルエンサー詳細ページに戻って依頼を続けられます。",
          visualTitle: "DIRECT REQUEST",
          visualSubtitle: "価格を確認して、そのまま依頼",
        }
      : {
          badge: "Brand account required",
          title: "Create a brand account to request this influencer.",
          body:
            "Sign up for a free brand account to view menus, place requests, manage payment, and review delivery online.",
          primary: "Sign up as a brand",
          secondary: "Log in instead",
          close: "Maybe later",
          point1: "Order with visible pricing",
          point2: "Payment protected by Stripe",
          point3: "Manage delivery online",
          smallNote:
            "After signing up, you can return to this influencer page and continue your request.",
          visualTitle: "DIRECT REQUEST",
          visualSubtitle: "Check the price and request directly",
        };

  const modal = (
    <div
      className="fixed inset-0 z-[2147483647] overflow-hidden bg-[#f8fafc]"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 -z-10 overflow-hidden bg-[#f8fafc]">
        <div className="absolute left-[-160px] top-[-160px] h-[380px] w-[380px] rounded-full bg-rose-100/90 blur-3xl" />
        <div className="absolute right-[-160px] top-[15%] h-[520px] w-[520px] rounded-full bg-emerald-100/80 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[25%] h-[420px] w-[420px] rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <div className="flex h-[100dvh] items-center justify-center px-4 py-4">
        <div className="w-full max-w-[600px]">
          <div className="mb-3 flex items-center justify-center">
            <img
              src="/brand/trendre-logo-full.png"
              alt="Trendre"
              className="h-9 w-auto object-contain"
            />
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_34px_100px_rgba(15,23,42,0.16)] md:p-7">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-rose-50 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-emerald-50 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex rounded-full border border-rose-100 bg-rose-50 px-3.5 py-1.5 text-[11px] font-black text-[#ff5f67]">
                  {copy.badge}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-[22px] border border-slate-100 bg-white/80 p-3.5 shadow-sm">
                <MiniLogoMark />

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {copy.visualTitle}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {copy.visualSubtitle}
                  </p>
                </div>
              </div>

              <h2 className="mt-6 text-[28px] font-black leading-[1.18] tracking-[-0.045em] text-slate-950 md:text-[38px]">
                {copy.title}
              </h2>

              <p className="mt-4 text-[14px] font-medium leading-7 text-slate-600">
                {copy.body}
              </p>

              <div className="mt-5 grid gap-2.5">
                {[copy.point1, copy.point2, copy.point3].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#7bae6c]">
                      <CheckIcon />
                    </span>
                    <span className="text-[13px] font-black text-slate-800">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Link
                  href={`/signup/company?next=${encodedNext}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-7 py-3.5 text-sm font-black text-white shadow-xl shadow-rose-500/25 transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {copy.primary}
                </Link>

                <Link
                  href={`/login?next=${encodedNext}`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >
                  {copy.secondary}
                </Link>
              </div>

              <p className="mt-3 text-center text-[11px] font-medium leading-5 text-slate-400">
                {copy.smallNote}
              </p>

              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-slate-400 underline underline-offset-4 transition hover:text-slate-700"
                >
                  {copy.close}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-[11px] font-medium text-slate-400">
            © 2026 Trendre
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}