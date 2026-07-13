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
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const encodedNext = encodeURIComponent(nextPath || "/b/creators");

  const copy =
    locale === "ja"
      ? {
          badge: "企業アカウントが必要です",
          title: "このインフルエンサーに依頼するには企業アカウントが必要です",
          body:
            "無料登録すると、表示価格の確認、依頼、支払い、納品確認までTrend Mart上で進められます。",
          primary: "無料で企業登録",
          secondary: "ログイン",
          close: "あとで見る",
          point1: "表示価格を確認して依頼",
          point2: "支払いはStripeで安全に管理",
          point3: "納品確認までオンラインで完結",
          smallNote:
            "登録後、このページに戻って依頼を続けられます。",
        }
      : {
          badge: "Brand account required",
          title: "Create a brand account to request this influencer",
          body:
            "Create a free account to review pricing, send requests, manage payment, and confirm delivery on Trendre.",
          primary: "Create brand account",
          secondary: "Log in",
          close: "Maybe later",
          point1: "Review pricing and request",
          point2: "Payment managed by Stripe",
          point3: "Confirm delivery online",
          smallNote:
            "After signing up, you can return to this page and continue your request.",
        };

  const modal = (
    <div
      className="fixed inset-0 z-[2147483647] overflow-hidden bg-[#f8fafc]"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-160px] top-[-140px] h-[340px] w-[340px] rounded-full bg-rose-100/70 blur-3xl" />
        <div className="absolute right-[-160px] top-[12%] h-[460px] w-[460px] rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute bottom-[-160px] left-[25%] h-[360px] w-[360px] rounded-full bg-slate-200/60 blur-3xl" />
      </div>

      <div className="relative flex h-[100dvh] items-center justify-center px-4 py-5">
        <div className="w-full max-w-[520px]">
          <div className="mb-5 flex items-center justify-center">
            <img
              src="/brand/trend-mart-logo.png"
              alt="Trendre"
              className="h-8 w-auto object-contain md:h-9"
            />
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.13)] md:p-6">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-rose-50 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-50 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex rounded-full border border-rose-100 bg-rose-50 px-3.5 py-1.5 text-[11px] font-black text-[#ff5f67]">
                  {copy.badge}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>

              <h2 className="mt-6 text-[24px] font-black leading-[1.25] tracking-[-0.04em] text-slate-950 md:text-[30px]">
                {copy.title}
              </h2>

              <p className="mt-4 text-[14px] font-medium leading-7 text-slate-600">
                {copy.body}
              </p>

              <div className="mt-5 grid gap-2">
                {[copy.point1, copy.point2, copy.point3].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-2.5 shadow-sm"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#7bae6c]">
                      <CheckIcon />
                    </span>
                    <span className="text-[13px] font-bold text-slate-800">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Link
                  href={`/signup/company?next=${encodedNext}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,95,103,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {copy.primary}
                </Link>

                <Link
                  href={`/login?next=${encodedNext}`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
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