// lib/i18n/requestStatus.ts

import type { AppLocale } from "./types";

export type RequestStatus =
  | "pending"
  | "accepted"
  | "delivered"
  | "completed"
  | "rejected";

type StatusTone = "gray" | "yellow" | "blue" | "green" | "red";

type RequestStatusMeta = {
  label: string;
  shortLabel: string;
  tone: StatusTone;
};

const requestStatusDictionary: Record<
  RequestStatus,
  Record<AppLocale, RequestStatusMeta>
> = {
  pending: {
    ja: {
      label: "承認待ち",
      shortLabel: "承認待ち",
      tone: "yellow",
    },
    en: {
      label: "Pending Approval",
      shortLabel: "Pending",
      tone: "yellow",
    },
    ko: { label: "승인 대기", shortLabel: "승인 대기", tone: "yellow" },
    "zh-TW": { label: "等待核准", shortLabel: "待核准", tone: "yellow" },
  },
  accepted: {
    ja: {
      label: "進行中",
      shortLabel: "進行中",
      tone: "blue",
    },
    en: {
      label: "In Progress",
      shortLabel: "In Progress",
      tone: "blue",
    },
    ko: { label: "진행 중", shortLabel: "진행 중", tone: "blue" },
    "zh-TW": { label: "進行中", shortLabel: "進行中", tone: "blue" },
  },
  delivered: {
    ja: {
      label: "納品済み",
      shortLabel: "納品済み",
      tone: "green",
    },
    en: {
      label: "Delivered",
      shortLabel: "Delivered",
      tone: "green",
    },
    ko: { label: "납품 완료", shortLabel: "납품 완료", tone: "green" },
    "zh-TW": { label: "已交付", shortLabel: "已交付", tone: "green" },
  },
  completed: {
    ja: {
      label: "完了",
      shortLabel: "完了",
      tone: "green",
    },
    en: {
      label: "Completed",
      shortLabel: "Completed",
      tone: "green",
    },
    ko: { label: "완료", shortLabel: "완료", tone: "green" },
    "zh-TW": { label: "已完成", shortLabel: "已完成", tone: "green" },
  },
  rejected: {
    ja: {
      label: "拒否",
      shortLabel: "拒否",
      tone: "red",
    },
    en: {
      label: "Rejected",
      shortLabel: "Rejected",
      tone: "red",
    },
    ko: { label: "거절", shortLabel: "거절", tone: "red" },
    "zh-TW": { label: "已拒絕", shortLabel: "已拒絕", tone: "red" },
  },
};

export function isRequestStatus(value: string): value is RequestStatus {
  return value in requestStatusDictionary;
}

export function getRequestStatusMeta(
  status: string | null | undefined,
  locale: AppLocale
): RequestStatusMeta {
  if (!status || !isRequestStatus(status)) {
    const unknown: Record<AppLocale, RequestStatusMeta> = {
      ja: { label: "不明", shortLabel: "不明", tone: "gray" },
      en: { label: "Unknown", shortLabel: "Unknown", tone: "gray" },
      ko: { label: "알 수 없음", shortLabel: "알 수 없음", tone: "gray" },
      "zh-TW": { label: "未知", shortLabel: "未知", tone: "gray" },
    };
    return unknown[locale];
  }

  return requestStatusDictionary[status][locale];
}

export function getRequestStatusBadgeClass(tone: StatusTone): string {
  switch (tone) {
    case "yellow":
      return "bg-yellow-50 text-yellow-700 ring-yellow-200";
    case "blue":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "green":
      return "bg-green-50 text-green-700 ring-green-200";
    case "red":
      return "bg-red-50 text-red-700 ring-red-200";
    case "gray":
    default:
      return "bg-gray-50 text-gray-700 ring-gray-200";
  }
}
