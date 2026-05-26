// File: components/CompanySignupGateModal.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

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
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
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
    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
      <span className="absolute left-4 top-4 h-3 w-3 rounded-full bg-[#ff5f67]" />
      <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-[#ffb3b8]" />
      <span className="absolute bottom-4 left-4 h-2 w-7 rounded-full bg-[#ff5f67]/20" />
    </div>
  );
}

export default function CompanySignupGateModal({
  open,
  nextPath,
  locale,
  onClose,
}: CompanySignupGateModalProps) {
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

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
          visualTitle: "Direct Request",
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
          visualTitle: "Direct Request",
          visualSubtitle: "Check the price and request directly",
        };

  return (
    <div className="fixed inset-0 z-[9999] min-h-screen overflow-y-auto bg-[#f8fafc]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-rose-100/80 blur-3xl" />
        <div className="absolute right-[-120px] top-[20%] h-[420px] w-[420px] rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute bottom-[-160px] left-[25%] h-[420px] w-[420px] rounded-full bg-slate-200/60 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="mb-6 flex items-center justify-center">
            <img
              src="/brand/trendre-logo-full.png"
              alt="Trendre"
              className="h-11 w-auto object-contain"
            />
          </div>

          <div className="relative overflow-hidden rounded-[34px] border border-white/80 bg-white p-6 shadow-[0_40px_120px_rgba(15,23,42,0.16)] md:p-9">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-50 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-50 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex rounded-full border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-black text-[#ff5f67]">
                  {copy.badge}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="mt-8 flex items-center gap-4 rounded-[26px] border border-slate-100 bg-white/80 p-4 shadow-sm">
                <MiniLogoMark />

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    {copy.visualTitle}
                  </p>
                  <p className="mt-1 text-base font-black text-slate-950">
                    {copy.visualSubtitle}
                  </p>
                </div>
              </div>

              <h2 className="mt-8 text-[32px] font-black leading-[1.18] tracking-[-0.045em] text-slate-950 md:text-[46px]">
                {copy.title}
              </h2>

              <p className="mt-5 text-[15px] font-medium leading-8 text-slate-600 md:text-base">
                {copy.body}
              </p>

              <div className="mt-8 grid gap-3">
                {[copy.point1, copy.point2, copy.point3].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#7bae6c]">
                      <CheckIcon />
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-9 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Link
                  href={`/signup/company?next=${encodedNext}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-8 py-4 text-sm font-black text-white shadow-xl shadow-rose-500/25 transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
                >
                  {copy.primary}
                </Link>

                <Link
                  href={`/login?next=${encodedNext}`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >
                  {copy.secondary}
                </Link>
              </div>

              <p className="mt-5 text-center text-xs font-medium leading-6 text-slate-400">
                {copy.smallNote}
              </p>

              <div className="mt-5 text-center">
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

          <p className="mt-6 text-center text-xs font-medium text-slate-400">
            © 2026 Trendre
          </p>
        </div>
      </div>
    </div>
  );
}