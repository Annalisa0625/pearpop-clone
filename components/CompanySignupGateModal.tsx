// File: components/CompanySignupGateModal.tsx
"use client";

import Link from "next/link";

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

export default function CompanySignupGateModal({
  open,
  nextPath,
  locale,
  onClose,
}: CompanySignupGateModalProps) {
  if (!open) return null;

  const encodedNext = encodeURIComponent(nextPath || "/b/creators");

  const copy =
    locale === "ja"
      ? {
          badge: "企業アカウントが必要です",
          title: "このインフルエンサーに依頼するには、企業登録が必要です。",
          body:
            "無料で企業アカウントを作成すると、価格確認・依頼・支払い・進行管理までオンラインで利用できます。",
          primary: "企業登録して続ける",
          secondary: "ログインはこちら",
          close: "あとで見る",
          point1: "表示価格を見て依頼",
          point2: "支払いはStripeで保護",
          point3: "納品確認までオンライン管理",
          miniTitle: "Trendreでできること",
          sideTitle: "依頼まで最短1分",
          sideBody:
            "インフルエンサーのSNS・価格・メニュー内容を確認して、そのまま依頼できます。",
        }
      : {
          badge: "Brand account required",
          title: "Create a brand account to request this influencer.",
          body:
            "Sign up for a free brand account to view pricing, place orders, manage payment, and track delivery online.",
          primary: "Sign up as a brand",
          secondary: "Log in instead",
          close: "Maybe later",
          point1: "Order with visible pricing",
          point2: "Payment protected by Stripe",
          point3: "Manage delivery online",
          miniTitle: "What you can do",
          sideTitle: "Start in minutes",
          sideBody:
            "Review the influencer's social accounts, price, and menu details, then send a request directly.",
        };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close signup modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
      />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-[34px] bg-white shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rose-100/80 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-emerald-100/80 blur-3xl" />

        <div className="relative grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-7 md:p-10 lg:p-12">
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex rounded-full border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-black text-[#ff5f67]">
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

            <h2 className="mt-7 max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] text-slate-950 md:text-5xl">
              {copy.title}
            </h2>

            <p className="mt-5 max-w-xl text-[15px] font-medium leading-8 text-slate-600 md:text-base">
              {copy.body}
            </p>

            <div className="mt-8 grid gap-3">
              {[copy.point1, copy.point2, copy.point3].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm"
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

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/signup/company?next=${encodedNext}`}
                className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-8 py-4 text-sm font-black text-white shadow-xl shadow-rose-500/25 transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
              >
                {copy.primary}
              </Link>

              <Link
                href={`/login?next=${encodedNext}`}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                {copy.secondary}
              </Link>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 text-sm font-bold text-slate-400 underline underline-offset-4 transition hover:text-slate-700"
            >
              {copy.close}
            </button>
          </div>

          <div className="relative hidden border-l border-slate-100 bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-10 lg:block">
            <div className="flex h-full min-h-[520px] flex-col justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                  {copy.miniTitle}
                </p>

                <div className="mt-8 rounded-[30px] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-lg font-black text-[#ff5f67]">
                      PR
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        Direct Order
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-950">
                        Influencer Request
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <p className="text-lg font-black text-slate-950">SNS</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        Check
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <p className="text-lg font-black text-slate-950">¥</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        Price
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <p className="text-lg font-black text-slate-950">✓</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        Delivery
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-950/20">
                <p className="text-2xl font-black leading-tight">
                  {copy.sideTitle}
                </p>
                <p className="mt-4 text-sm font-medium leading-7 text-white/60">
                  {copy.sideBody}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}