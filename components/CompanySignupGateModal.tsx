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
          title: "このインフルエンサーに依頼するには、企業登録が必要です。",
          body:
            "無料で企業アカウントを作成すると、インフルエンサーのメニュー確認、依頼、支払い、納品確認までオンラインで進められます。",
          primary: "企業登録して続ける",
          secondary: "ログインはこちら",
          close: "あとで見る",
          point1: "表示価格を見てその場で依頼",
          point2: "支払いはStripeで安全に管理",
          point3: "納品確認までオンラインで完結",
          smallNote:
            "登録後、このインフルエンサー詳細ページに戻って依頼を続けられます。",
        }
      : {
          badge: "Brand account required",
          title: "Create a brand account to request this influencer.",
          body:
            "Create a free brand account to review menus, send requests, pay securely, and manage delivery online.",
          primary: "Continue with brand signup",
          secondary: "Log in instead",
          close: "Maybe later",
          point1: "Request instantly with visible pricing",
          point2: "Payments are managed securely with Stripe",
          point3: "Delivery confirmation is completed online",
          smallNote:
            "After signup, you can return to this influencer page and continue your request.",
        };

  const modal = (
    <div
      className="fixed inset-0 z-[2147483647] overflow-hidden bg-[#f8fafc]"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-140px] top-[-120px] h-[320px] w-[320px] rounded-full bg-rose-100/80 blur-3xl" />
        <div className="absolute right-[-140px] top-[10%] h-[420px] w-[420px] rounded-full bg-emerald-100/75 blur-3xl" />
        <div className="absolute bottom-[-140px] left-[20%] h-[320px] w-[320px] rounded-full bg-slate-200/60 blur-3xl" />
      </div>

      <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-6 md:py-8">
        <div className="w-full max-w-[700px]">
          <div className="mb-4 flex items-center justify-center">
            <img
              src="/brand/trendre-logo-full.png"
              alt="Trendre"
              className="h-8 w-auto object-contain md:h-10"
            />
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.14)] md:p-8">
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
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>

              <h2 className="mt-6 text-[34px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 md:text-[54px]">
                {copy.title}
              </h2>

              <p className="mt-4 text-[15px] font-medium leading-8 text-slate-600">
                {copy.body}
              </p>

              <div className="mt-6 grid gap-3">
                {[copy.point1, copy.point2, copy.point3].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#7bae6c]">
                      <CheckIcon />
                    </span>
                    <span className="text-[15px] font-bold text-slate-800">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Link
                  href={`/signup/company?next=${encodedNext}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-7 py-4 text-base font-black text-white shadow-[0_18px_35px_rgba(255,95,103,0.30)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {copy.primary}
                </Link>

                <Link
                  href={`/login?next=${encodedNext}`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-4 text-base font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >
                  {copy.secondary}
                </Link>
              </div>

              <p className="mt-4 text-center text-[12px] font-medium leading-5 text-slate-400">
                {copy.smallNote}
              </p>

              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-bold text-slate-400 underline underline-offset-4 transition hover:text-slate-700"
                >
                  {copy.close}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] font-medium text-slate-400">
            © 2026 Trendre
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}