"use client";

import Image from "next/image";
import { useId } from "react";
import type { AppLocale } from "@/lib/i18n/types";
import { getLocaleOption, LOCALE_OPTIONS } from "@/lib/i18n/options";

export function LocaleFlag({ locale }: { locale: AppLocale }) {
  const option = getLocaleOption(locale);
  if (option.flagCode) {
    return (
      <span className="relative block h-5 w-[30px] shrink-0 overflow-hidden rounded-[4px] bg-white shadow-sm ring-1 ring-black/10">
        <Image
          src={`/flags/${option.flagCode}.svg`}
          alt=""
          fill
          unoptimized
          sizes="30px"
          className="object-cover"
          aria-hidden="true"
        />
      </span>
    );
  }

  return <span className="flex h-5 w-[30px] shrink-0 items-center justify-center text-xl leading-none" aria-hidden="true">{option.flagEmoji}</span>;
}

export default function LocaleSelector({
  value,
  onChange,
  ariaLabel = "UI language",
  disabled = false,
  variant = "cards",
  className = "",
}: {
  value: AppLocale;
  onChange: (locale: AppLocale) => void;
  ariaLabel?: string;
  disabled?: boolean;
  variant?: "cards" | "select";
  className?: string;
}) {
  const name = useId();

  if (variant === "select") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as AppLocale)}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`min-h-11 max-w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none transition focus-visible:border-rose-400 focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm ${className}`}
      >
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.flagEmoji ?? (option.flagCode === "jp" ? "🇯🇵" : option.flagCode === "kr" ? "🇰🇷" : "🇹🇼")} {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <fieldset disabled={disabled} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <legend className="sr-only">{ariaLabel}</legend>
      {LOCALE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-3 text-left ring-1 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-rose-100 ${selected ? "bg-slate-950 text-white ring-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.14)]" : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"} has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <LocaleFlag locale={option.value} />
            <span className="min-w-0 flex-1 text-sm font-black">{option.label}</span>
            <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${selected ? "border-white bg-white text-slate-950" : "border-slate-300 text-transparent"}`}>✓</span>
          </label>
        );
      })}
    </fieldset>
  );
}
