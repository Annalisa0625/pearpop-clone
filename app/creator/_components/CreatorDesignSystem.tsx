// File: app/creator/_components/CreatorDesignSystem.tsx
"use client";

import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type Tone = "red" | "green" | "blue" | "amber" | "slate";
type ButtonVariant = "primary" | "secondary" | "soft" | "ghost";
type CardTone = "default" | "soft" | "accent";

export const creatorTheme = {
  color: {
    primary: "#FF3B5C",
    primarySoft: "#FFF1F4",
    page: "#F8F9FA",
    ink: "#020617",
    muted: "#64748B",
    line: "#E2E8F0",
  },

  page:
  "trendre-safe-page trendre-creator-page-bottom max-w-full touch-pan-y space-y-3 overflow-x-hidden text-slate-950",

  surface:
    "rounded-[28px] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100",

  card:
    "rounded-[26px] bg-white shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100",

  softCard: "rounded-[24px] bg-[#F8F9FA] ring-1 ring-slate-100",

  input:
    "w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#FF3B5C] focus:ring-4 focus:ring-rose-100",

  textarea:
    "min-h-[132px] w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-semibold leading-7 text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#FF3B5C] focus:ring-4 focus:ring-rose-100",
};

function joinClass(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function CreatorMotionStyle() {
  return (
    <style jsx global>{`
      @keyframes creatorFadeUp {
        from {
          opacity: 0;
          transform: translate3d(0, 10px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }

      @keyframes creatorPressPulse {
        0% {
          transform: scale(1);
        }
        100% {
          transform: scale(0.985);
        }
      }

      .creator-appear {
        animation: creatorFadeUp 380ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }

      .creator-appear-delay-1 {
        animation-delay: 45ms;
      }

      .creator-appear-delay-2 {
        animation-delay: 90ms;
      }

      .creator-appear-delay-3 {
        animation-delay: 135ms;
      }

      .creator-scrollbar-none {
        scrollbar-width: none;
      }

      .creator-scrollbar-none::-webkit-scrollbar {
        display: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .creator-appear,
        .creator-appear-delay-1,
        .creator-appear-delay-2,
        .creator-appear-delay-3 {
          animation: none;
        }
      }
    `}</style>
  );
}

export function CreatorPage({ children }: { children: ReactNode }) {
  return (
    <div className={creatorTheme.page}>
      <CreatorMotionStyle />
      {children}
    </div>
  );
}

export function CreatorHero({
  title,
  description,
  eyebrow,
  right,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={joinClass(
        "creator-appear relative overflow-hidden p-5",
        creatorTheme.surface,
        className
      )}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-rose-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-44 w-44 rounded-full bg-emerald-100/35 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#FF3B5C]">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="text-[28px] font-black leading-tight tracking-[-0.06em] text-slate-950">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 text-[15px] font-semibold leading-7 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {children ? <div className="relative mt-5">{children}</div> : null}
    </section>
  );
}

export function CreatorCard({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: CardTone;
  className?: string;
}) {
  const toneClass =
    tone === "soft"
      ? creatorTheme.softCard
      : tone === "accent"
        ? "rounded-[26px] bg-rose-50/70 shadow-sm ring-1 ring-rose-100"
        : creatorTheme.card;

  return (
    <section className={joinClass("creator-appear p-4", toneClass, className)}>
      {children}
    </section>
  );
}

export function CreatorSection({
  id,
  title,
  description,
  right,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={joinClass(
        "creator-appear p-5",
        creatorTheme.surface,
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[21px] font-black tracking-[-0.055em] text-slate-950">
            {title}
          </h2>

          {description ? (
            <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {children}
    </section>
  );
}

export function CreatorBadge({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const toneClass =
    tone === "red"
      ? "bg-rose-50 text-[#FF3B5C] ring-rose-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 ring-blue-100"
          : tone === "amber"
            ? "bg-amber-50 text-amber-800 ring-amber-100"
            : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={joinClass(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ring-1",
        toneClass,
        className
      )}
    >
      {children}
    </span>
  );
}

export function CreatorMetric({
  label,
  value,
  helper,
  className = "",
}: {
  label: string;
  value: string;
  helper?: string;
  className?: string;
}) {
  return (
    <div
      className={joinClass(
        "creator-appear p-4",
        creatorTheme.surface,
        className
      )}
    >
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-[26px] font-black tracking-[-0.06em] text-slate-950">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p>
      ) : null}
    </div>
  );
}

export function CreatorMiniInfo({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p
        className={joinClass(
          "mt-1 truncate text-sm",
          strong
            ? "font-black tracking-[-0.03em] text-slate-950"
            : "font-bold text-slate-700"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function CreatorChevron() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m8 5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CreatorArrowRight() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 10h10.5M10.5 5.5 15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CreatorIconCircle({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const toneClass =
    tone === "red"
      ? "bg-rose-50 text-[#FF3B5C] ring-rose-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 ring-blue-100"
          : tone === "amber"
            ? "bg-amber-50 text-amber-800 ring-amber-100"
            : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={joinClass(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1",
        toneClass
      )}
    >
      {children}
    </span>
  );
}

export function CreatorListItem({
  title,
  description,
  href,
  badge,
  meta,
  icon,
  onClick,
  className = "",
}: {
  title: string;
  description?: string;
  href?: string;
  badge?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start gap-3">
        {icon ? <div className="shrink-0">{icon}</div> : null}

        <div className="min-w-0 flex-1">
          {badge ? (
            <div className="mb-2 flex flex-wrap gap-2">{badge}</div>
          ) : null}

          <p className="truncate text-[16px] font-black tracking-[-0.04em] text-slate-950">
            {title}
          </p>

          {description ? (
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              {description}
            </p>
          ) : null}

          {meta ? <div className="mt-3">{meta}</div> : null}
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100">
          <CreatorChevron />
        </span>
      </div>
    </>
  );

  const itemClass = joinClass(
    "creator-appear block rounded-[24px] bg-white p-4 text-left shadow-[0_14px_40px_rgba(15,23,42,0.035)] ring-1 ring-slate-100 transition active:scale-[0.98]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={itemClass}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={joinClass("w-full", itemClass)}
    >
      {content}
    </button>
  );
}

export function CreatorEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] bg-[#F8F9FA] px-5 py-8 text-center ring-1 ring-slate-100">
      {icon ? (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
          {icon}
        </div>
      ) : null}

      <h3 className="mt-5 text-lg font-black tracking-[-0.04em] text-slate-950">
        {title}
      </h3>

      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-7 text-slate-500">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function CreatorNotice({
  tone = "slate",
  title,
  description,
  action,
}: {
  tone?: Tone;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const toneClass =
    tone === "red"
      ? "bg-rose-50 text-rose-950 ring-rose-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-950 ring-emerald-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-950 ring-blue-100"
          : tone === "amber"
            ? "bg-amber-50 text-amber-950 ring-amber-100"
            : "bg-white text-slate-950 ring-slate-100";

  return (
    <section
      className={joinClass(
        "creator-appear rounded-[24px] p-4 ring-1",
        toneClass
      )}
    >
      <p className="text-sm font-black tracking-[-0.03em]">{title}</p>

      {description ? (
        <p className="mt-1.5 text-xs font-semibold leading-6 opacity-75">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-3">{action}</div> : null}
    </section>
  );
}

export function CreatorButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  const variantClass =
    variant === "primary"
      ? "bg-[#FF3B5C] text-white shadow-[0_18px_35px_rgba(255,59,92,0.22)]"
      : variant === "secondary"
        ? "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
        : variant === "soft"
          ? "bg-slate-100 text-slate-700"
          : "bg-transparent text-slate-500";

  return (
    <button
      {...props}
      className={joinClass(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        variantClass,
        className
      )}
    >
      {children}
    </button>
  );
}

export function CreatorLinkButton({
  href,
  children,
  variant = "primary",
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  const variantClass =
    variant === "primary"
      ? "bg-[#FF3B5C] text-white shadow-[0_18px_35px_rgba(255,59,92,0.22)]"
      : variant === "secondary"
        ? "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
        : variant === "soft"
          ? "bg-slate-100 text-slate-700"
          : "bg-transparent text-slate-500";

  return (
    <Link
      {...props}
      href={href}
      className={joinClass(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black transition active:scale-[0.98]",
        variantClass,
        className
      )}
    >
      {children}
    </Link>
  );
}

export function CreatorTabs({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClass(
        "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 creator-scrollbar-none",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CreatorTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition active:scale-95"
          : "shrink-0 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200 transition active:scale-95"
      }
    >
      {children}
    </button>
  );
}

export function CreatorField({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-black text-slate-800">{label}</label>
      <div className="mt-2">{children}</div>
      {help ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export function CreatorInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={joinClass(creatorTheme.input, className)} />;
}

export function CreatorTextarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={joinClass(creatorTheme.textarea, className)}
    />
  );
}

export function CreatorSelect({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={joinClass(creatorTheme.input, className)}>
      {children}
    </select>
  );
}

export function CreatorStickyFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-24 z-20 rounded-[28px] bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.14)] ring-1 ring-slate-100 backdrop-blur">
      {children}
    </div>
  );
}

export function CreatorSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={joinClass(
        "animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100",
        className
      )}
    />
  );
}