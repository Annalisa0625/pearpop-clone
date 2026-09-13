"use client";

import Image from "next/image";
import { useId } from "react";
import {
  CREATOR_COUNTRY_OPTIONS,
  type CreatorCountry,
} from "@/lib/creator/country";

export function CountryFlagIcon({
  flagCode,
}: {
  flagCode: "jp" | "kr" | "tw";
}) {
  return (
    <span className="relative block h-5 w-[30px] shrink-0 overflow-hidden rounded-[4px] bg-white shadow-sm ring-1 ring-black/10">
      <Image
        src={`/flags/${flagCode}.svg`}
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

export default function CountrySelector({
  value,
  onChange,
  ariaLabel = "Creator country",
}: {
  value: CreatorCountry;
  onChange: (country: CreatorCountry) => void;
  ariaLabel?: string;
}) {
  const name = useId();

  return (
    <fieldset className="grid gap-2 sm:grid-cols-3">
      <legend className="sr-only">{ariaLabel}</legend>
      {CREATOR_COUNTRY_OPTIONS.map((option) => {
        const selected = value === option.value;

        return (
          <label
            key={option.value}
            className={`relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition ring-1 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-rose-100 ${
              selected
                ? "bg-slate-950 text-white ring-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
                : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              aria-label={option.label}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <CountryFlagIcon flagCode={option.flagCode} />
            <span className="min-w-0 flex-1 text-sm font-black">
              {option.label}
            </span>
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${
                selected
                  ? "border-white bg-white text-slate-950"
                  : "border-slate-300 text-transparent"
              }`}
            >
              ✓
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
