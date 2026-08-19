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
  "trendre-safe-page trendre-creator-page-bottom mx-auto max-w-4xl touch-pan-y space-y-6 overflow-x-hidden pb-3 text-slate-950",

  surface:
    "rounded-[24px] bg-white",

  card:
    "rounded-[20px] bg-white",

  softCard: "rounded-[16px] bg-[#F3F2EF]",

  input:
    "min-h-[52px] w-full rounded-[14px] border border-transparent bg-[#F3F2EF] px-4 py-3 text-[15px] font-medium text-slate-950 outline-none transition duration-150 placeholder:text-slate-400 hover:bg-[#efede9] focus:border-[#FF3B5C]/45 focus:bg-white focus:ring-4 focus:ring-rose-100 motion-reduce:transition-none",

  textarea:
    "min-h-[132px] w-full resize-none rounded-[14px] border border-transparent bg-[#F3F2EF] px-4 py-3 text-[15px] font-medium leading-7 text-slate-950 outline-none transition duration-150 placeholder:text-slate-400 hover:bg-[#efede9] focus:border-[#FF3B5C]/45 focus:bg-white focus:ring-4 focus:ring-rose-100 motion-reduce:transition-none",
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

export function CreatorPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={joinClass(creatorTheme.page, className)}>
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
        "creator-appear relative overflow-hidden px-1 pb-3 pt-2 sm:px-2 sm:pb-4",
        creatorTheme.surface,
        className
      )}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF3B5C]">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.055em] text-slate-950 sm:text-[34px]">
            {title}
          </h1>

          {description ? (
            <p className="mt-2.5 max-w-xl text-[14px] font-normal leading-7 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {children ? <div className="relative mt-6">{children}</div> : null}
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
    <section className={joinClass("creator-appear p-5 sm:p-6", toneClass, className)}>
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
        "creator-appear border-t border-slate-200/80 px-0 py-7 sm:py-9",
        creatorTheme.surface,
        className
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[21px] font-semibold tracking-[-0.04em] text-slate-950">
            {title}
          </h2>

          {description ? (
            <p className="mt-1.5 max-w-xl text-[14px] font-normal leading-6 text-slate-600">
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
        "inline-flex min-h-7 items-center rounded-full px-3 py-1 text-[11px] font-semibold ring-1",
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
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-[26px] font-semibold tracking-[-0.05em] text-slate-950">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
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
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p
        className={joinClass(
          "mt-1 truncate text-sm",
          strong
            ? "font-semibold tracking-[-0.02em] text-slate-950"
            : "font-medium text-slate-700"
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
    "creator-appear block rounded-[18px] bg-white p-5 text-left outline-none transition duration-150 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-rose-100 active:scale-[0.99] motion-reduce:transition-none",
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
    <div className="rounded-[18px] bg-[#F3F2EF] px-5 py-9 text-center">
      {icon ? (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] border border-slate-200/70 bg-white text-slate-400">
          {icon}
        </div>
      ) : null}

      <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-slate-950">
        {title}
      </h3>

      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-slate-500">
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
        "creator-appear rounded-[16px] p-4 ring-1",
        toneClass
      )}
    >
      <p className="text-sm font-semibold tracking-[-0.02em]">{title}</p>

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
      ? "bg-slate-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
      : variant === "secondary"
        ? "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
        : variant === "soft"
          ? "bg-slate-100 text-slate-700"
          : "bg-transparent text-slate-500";

  return (
    <button
      {...props}
      className={joinClass(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-semibold outline-none transition duration-150 focus-visible:ring-4 focus-visible:ring-rose-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
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
      ? "bg-slate-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
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
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-semibold outline-none transition duration-150 focus-visible:ring-4 focus-visible:ring-rose-100 active:scale-[0.98] motion-reduce:transition-none",
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
        "flex min-h-11 gap-6 overflow-x-auto border-b border-slate-200/70 creator-scrollbar-none",
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
      aria-pressed={active}
      className={
        active
          ? "relative shrink-0 px-1 py-3 text-[13px] font-semibold text-slate-950 outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#FF3B5C] focus-visible:ring-2 focus-visible:ring-rose-200"
          : "shrink-0 px-1 py-3 text-[13px] font-medium text-slate-500 outline-none transition duration-150 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-rose-200 motion-reduce:transition-none"
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
      <label className="block text-[13px] font-semibold text-slate-800">{label}</label>
      <div className="mt-2">{children}</div>
      {help ? (
        <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
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
    <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 -mx-2 rounded-[18px] bg-white/96 p-2 shadow-[0_12px_36px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:mx-0">
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
