// File: app/components/DeadlineBadge.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type DeadlineBadgeProps = {
  deadline: string | null | undefined;
  label?: string;
  expiredLabel?: string;
  locale?: "ja" | "en";
  urgentHours?: number;
  warningHours?: number;
};

function getRemainingMs(deadline: string | null | undefined) {
  if (!deadline) return null;

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime() - Date.now();
}

function formatRemaining(ms: number, locale: "ja" | "en") {
  const totalMinutes = Math.max(0, Math.floor(ms / 1000 / 60));
  const days = Math.floor(totalMinutes / 60 / 24);
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes % 60;

  if (locale === "ja") {
    if (days > 0) {
      return `残り ${days}日 ${hours}時間`;
    }

    if (hours > 0) {
      return `残り ${hours}時間 ${minutes}分`;
    }

    return `残り ${minutes}分`;
  }

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
}

function getBadgeClass(
  remainingMs: number | null,
  urgentHours: number,
  warningHours: number
) {
  if (remainingMs == null) {
    return "border-gray-200 bg-gray-50 text-gray-600";
  }

  if (remainingMs <= 0) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  const remainingHours = remainingMs / 1000 / 60 / 60;

  if (remainingHours <= urgentHours) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (remainingHours <= warningHours) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function DeadlineBadge({
  deadline,
  label,
  expiredLabel,
  locale = "ja",
  urgentHours = 12,
  warningHours = 24,
}: DeadlineBadgeProps) {
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick((value) => value + 1);
    }, 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const remainingMs = useMemo(() => {
    void nowTick;
    return getRemainingMs(deadline);
  }, [deadline, nowTick]);

  if (!deadline || remainingMs == null) {
    return null;
  }

  const isExpired = remainingMs <= 0;

  const text = isExpired
    ? expiredLabel ?? (locale === "ja" ? "期限切れ" : "Expired")
    : formatRemaining(remainingMs, locale);

  const prefix =
    label ??
    (locale === "ja" ? "期限" : "Deadline");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getBadgeClass(
        remainingMs,
        urgentHours,
        warningHours
      )}`}
      title={new Date(deadline).toLocaleString(
        locale === "ja" ? "ja-JP" : "en-US"
      )}
    >
      {prefix}: {text}
    </span>
  );
}