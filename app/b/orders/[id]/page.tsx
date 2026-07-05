// File: app/b/orders/[id]/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import DeadlineBadge from "@/app/components/DeadlineBadge";
import ChatEmbed from "@/app/components/ChatEmbed";

type FulfillmentType = "material_provided" | "product_shipping" | "visit";
type Locale = "ja" | "en";

type ShippingAddress = {
  recipient_name?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  address_line1?: string;
  address_line2?: string | null;
  phone_number?: string;
  notes?: string | null;
};

type ShipmentForm = {
  shipping_carrier: string;
  shipping_tracking_number: string;
};

type OrderDetail = {
  id: string;
  b_user_id: string;
  creator_id: string;
  creator_user_id: string;

  status: string;
  payment_status: string;
  stripe_payment_status: string | null;
  created_at: string;
  updated_at: string | null;

  fulfillment_type: FulfillmentType | string | null;
  preparation_status: string | null;
  preparation_data: Record<string, any> | null;
  preparation_started_at: string | null;
  preparation_ready_at: string | null;
  work_started_at: string | null;

  visit_location: string | null;
  visit_candidate_note: string | null;
  visit_scheduled_at: string | null;
  visit_notes: string | null;

  shipping_address_shared_at: string | null;
  shipping_carrier: string | null;
  shipping_tracking_number: string | null;
  shipped_at: string | null;
  received_at: string | null;

  materials_provided_at: string | null;
  materials_confirmed_at: string | null;

  product_name: string | null;
  product_url: string | null;
  requirements: string | null;
  deadline: string | null;
  has_free_offer: boolean | null;
  wants_secondary_use: boolean | null;

  menu_title_snapshot: string | null;
  menu_description_snapshot: string | null;
  menu_platform_snapshot: string | null;
  menu_type_snapshot: string | null;
  menu_category_snapshot: string | null;
  menu_deliverables_snapshot: string | null;
  menu_delivery_days_snapshot: number | null;
  menu_allow_secondary_use_snapshot: boolean | null;

  currency: string | null;
  menu_price_amount: number | null;
  stripe_amount: number | null;
  platform_fee_amount: number | null;
  creator_payout_amount: number | null;

  buyer_plan_code_snapshot: string | null;
  buyer_plan_public_name_snapshot: string | null;
  buyer_marketplace_fee_rate_bps: number | null;
  buyer_marketplace_fee_amount: number | null;
  buyer_total_amount: number | null;
  creator_transaction_fee_rate_bps: number | null;
  creator_transaction_fee_amount: number | null;
  platform_gross_revenue_amount: number | null;

  creator_accept_deadline: string | null;
  authorized_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  expired_at: string | null;
  captured_at: string | null;
  canceled_at: string | null;

  delivered_at: string | null;
  delivered_post_url: string | null;
  completed_at: string | null;
  disputed_at: string | null;

  revision_requested_at: string | null;
  revision_note: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
  auto_complete_at: string | null;
  completed_reason: string | null;
};

type CreatorLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  category: string | null;
};

type ActionLoading = "complete" | "revision" | "shipment" | null;

const AUTH_TIMEOUT_MS = 8000;
const DB_TIMEOUT_MS = 12000;
const ACTION_TIMEOUT_MS = 30000;

const cardClass =
  "bg-white border border-slate-100 rounded-3xl shadow-[0_10px_35px_rgb(0,0,0,0.03)]";

function withTimeout<T>(
  promiseLike: PromiseLike<T> | T,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = Promise.resolve(promiseLike);
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  ms: number,
  timeoutMessage: string
) {
  const controller = new AbortController();

  const timer = window.setTimeout(() => {
    controller.abort();
  }, ms);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function formatDateTime(value: string | null | undefined, locale: Locale) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPrice(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: Locale
) {
  if (value == null) return locale === "ja" ? "未設定" : "Not set";

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    return safeCurrency === "USD"
      ? `$${value.toLocaleString()}`
      : `¥${value.toLocaleString()}`;
  }
}

function formatFeeRateBps(value: number | null | undefined) {
  if (value == null) return "-";

  return `${Number(value / 100).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
}

function formatPlanName(value: string | null | undefined) {
  if (!value) return "-";

  const normalized = value.toLowerCase();

  if (normalized === "basic" || normalized === "free") return "Basic";
  if (normalized === "pro" || normalized === "standard") return "Pro";
  if (normalized === "premium" || normalized === "global_pro") return "Premium";

  return value;
}

function isWaitingStatus(status: string) {
  return status === "checkout_pending" || status === "authorized_pending_creator";
}

function isDeliveredStatus(status: string) {
  return status === "delivered";
}

function isCompletedStatus(status: string) {
  return status === "completed";
}

function isCanceledStatus(status: string) {
  return [
    "declined_canceled",
    "expired_canceled",
    "canceled",
    "cancelled",
  ].includes(status);
}

function isTerminalStatus(status: string) {
  return isCompletedStatus(status) || isCanceledStatus(status);
}

function canOpenChat(order: OrderDetail) {
  if (order.status === "checkout_pending") return false;
  if (order.status === "authorized_pending_creator") return false;
  if (isCanceledStatus(order.status)) return false;

  return (
    order.payment_status === "captured" ||
    order.status === "accepted_captured" ||
    order.status === "in_progress" ||
    order.status === "delivered" ||
    order.status === "revision_requested" ||
    order.status === "completed"
  );
}

function getBackHref(status: string) {
  if (isWaitingStatus(status)) return "/b/orders?tab=waiting";
  if (isDeliveredStatus(status)) return "/b/orders?tab=review";
  if (isCompletedStatus(status)) return "/b/orders?tab=completed";
  return "/b/orders";
}

function normalizeFulfillmentType(
  value: string | null | undefined
): FulfillmentType {
  if (value === "product_shipping") return "product_shipping";
  if (value === "visit") return "visit";
  return "material_provided";
}

function fulfillmentLabel(value: string | null | undefined, locale: Locale) {
  const type = normalizeFulfillmentType(value);

  if (locale === "ja") {
    if (type === "product_shipping") return "商品提供型";
    if (type === "visit") return "来店型";
    return "素材提供型";
  }

  if (type === "product_shipping") return "Product shipping";
  if (type === "visit") return "Visit";
  return "Material provided";
}

function getMenuTypeLabel(
  value: string | null | undefined,
  locale: Locale,
  fallback: string
) {
  const labels: Record<string, { ja: string; en: string }> = {
    post: { ja: "投稿", en: "Post" },
    short_video: { ja: "ショート動画", en: "Short video" },
    story: { ja: "ストーリー", en: "Story" },
    video: { ja: "動画", en: "Video" },
    ugc: { ja: "UGC制作", en: "UGC creation" },
    package: { ja: "セットメニュー", en: "Package" },
    other: { ja: "その他", en: "Other" },
  };

  return labels[value || ""]?.[locale] || fallback;
}

function formatDeliveryDays(
  value: number | null | undefined,
  locale: Locale,
  fallback: string
) {
  if (value == null) return fallback;
  return locale === "ja" ? `${value}日` : `${value} days`;
}

function getPlatformIcon(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized.includes("instagram")) {
    return (
      <img
        src="/brand/social/instagram.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("tiktok")) {
    return (
      <img
        src="/brand/social/tiktok.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("youtube")) {
    return (
      <img
        src="/brand/social/youtube.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  return null;
}

function getShippingAddress(order: OrderDetail): ShippingAddress | null {
  const raw = order.preparation_data?.shipping_address;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  return raw as ShippingAddress;
}

function canRegisterShipment(order: OrderDetail) {
  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);

  if (fulfillmentType !== "product_shipping") return false;
  if (order.payment_status !== "captured") return false;
  if (!order.shipping_address_shared_at) return false;
  if (order.received_at) return false;
  if (isTerminalStatus(order.status)) return false;
  if (isDeliveredStatus(order.status)) return false;

  return order.status === "accepted_captured" || order.status === "in_progress";
}

function getCancellationDate(order: OrderDetail) {
  return order.canceled_at || order.declined_at || order.expired_at;
}

function getStatusMeta(status: string, locale: Locale) {
  const ja: Record<
    string,
    {
      label: string;
      title: string;
      body: string;
      tone: "slate" | "amber" | "rose" | "emerald" | "blue";
    }
  > = {
    checkout_pending: {
      label: "支払い確認中",
      title: "支払い確認中",
      body: "決済確認後、インフルエンサーの返答待ちに進みます。",
      tone: "slate",
    },
    authorized_pending_creator: {
      label: "返答待ち",
      title: "返答待ち",
      body: "インフルエンサーが依頼内容を確認しています。返答があると注文が開始されます。",
      tone: "amber",
    },
    accepted_captured: {
      label: "進行中",
      title: "進行中",
      body: "チャット、進捗、配送、支払い情報をまとめて確認できます。",
      tone: "blue",
    },
    in_progress: {
      label: "進行中",
      title: "進行中",
      body: "チャット、進捗、配送、支払い情報をまとめて確認できます。",
      tone: "blue",
    },
    delivered: {
      label: "納品確認",
      title: "納品確認",
      body: "納品内容を確認し、問題なければ完了してください。",
      tone: "rose",
    },
    revision_requested: {
      label: "修正依頼中",
      title: "修正依頼中",
      body: "修正依頼を送信済みです。再納品をお待ちください。",
      tone: "amber",
    },
    completed: {
      label: "完了",
      title: "完了",
      body: "この注文は完了しています。支払い・納品・案件内容は引き続き確認できます。",
      tone: "emerald",
    },
    declined_canceled: {
      label: "終了",
      title: "終了",
      body: "この注文は終了しています。",
      tone: "slate",
    },
    expired_canceled: {
      label: "期限切れ",
      title: "期限切れ",
      body: "返答期限を過ぎたため終了しました。",
      tone: "slate",
    },
  };

  const en: typeof ja = {
    checkout_pending: {
      label: "Payment pending",
      title: "Payment pending",
      body: "The order will move to waiting after payment confirmation.",
      tone: "slate",
    },
    authorized_pending_creator: {
      label: "Waiting",
      title: "Waiting",
      body: "The influencer is reviewing your request. The order starts when they accept it.",
      tone: "amber",
    },
    accepted_captured: {
      label: "In progress",
      title: "In progress",
      body: "Chat, progress, shipment, and payment details are available here.",
      tone: "blue",
    },
    in_progress: {
      label: "In progress",
      title: "In progress",
      body: "Chat, progress, shipment, and payment details are available here.",
      tone: "blue",
    },
    delivered: {
      label: "Review",
      title: "Review delivery",
      body: "Review the delivery and complete the order if everything looks good.",
      tone: "rose",
    },
    revision_requested: {
      label: "Revision requested",
      title: "Revision requested",
      body: "Waiting for the updated delivery.",
      tone: "amber",
    },
    completed: {
      label: "Completed",
      title: "Completed",
      body: "This order is complete. Details remain available here.",
      tone: "emerald",
    },
    declined_canceled: {
      label: "Ended",
      title: "Ended",
      body: "This order has ended.",
      tone: "slate",
    },
    expired_canceled: {
      label: "Expired",
      title: "Expired",
      body: "The reply deadline has passed.",
      tone: "slate",
    },
  };

  return (
    (locale === "ja" ? ja[status] : en[status]) ?? {
      label: status,
      title: locale === "ja" ? "注文状況" : "Order status",
      body:
        locale === "ja"
          ? "注文内容と現在の進捗を確認できます。"
          : "You can review the order and current progress.",
      tone: "slate" as const,
    }
  );
}

function getHeroSubtitle(status: string, locale: Locale) {
  if (status === "checkout_pending") {
    return locale === "ja"
      ? "支払い方法を確認しています。確認後、返答待ちに進みます。"
      : "Payment is being confirmed. The order will move to waiting once confirmed.";
  }

  if (isWaitingStatus(status)) {
    return locale === "ja"
      ? "インフルエンサーの返答を待っています。承認されると注文が開始されます。"
      : "Waiting for the influencer to reply. The order starts when they accept it.";
  }

  if (status === "accepted_captured" || status === "in_progress") {
    return locale === "ja"
      ? "注文は進行中です。チャット、進捗、配送、支払い情報をまとめて確認できます。"
      : "This order is in progress. Chat, progress, shipment, and payment details are available here.";
  }

  if (isDeliveredStatus(status)) {
    return locale === "ja"
      ? "納品内容を確認し、問題なければ完了してください。"
      : "Review the delivery and complete the order if everything looks good.";
  }

  if (status === "revision_requested") {
    return locale === "ja"
      ? "修正依頼を送信済みです。再納品をお待ちください。"
      : "A revision request has been sent. Please wait for the updated delivery.";
  }

  if (isCompletedStatus(status)) {
    return locale === "ja"
      ? "この注文は完了しています。必要な情報を確認できます。"
      : "This order is complete. Details remain available here.";
  }

  return locale === "ja"
    ? "現在の状況と、次に必要な対応を確認できます。"
    : "Check the current status and next required action here.";
}

function toneClasses(tone: "slate" | "amber" | "rose" | "emerald" | "blue") {
  if (tone === "amber") {
    return {
      pill: "bg-amber-50 text-amber-800 border-amber-100",
      dot: "bg-amber-500",
      soft: "bg-amber-50 text-amber-800 border-amber-100",
    };
  }

  if (tone === "rose") {
    return {
      pill: "bg-rose-50 text-rose-600 border-rose-100",
      dot: "bg-rose-500",
      soft: "bg-rose-50 text-rose-700 border-rose-100",
    };
  }

  if (tone === "emerald") {
    return {
      pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
      dot: "bg-emerald-500",
      soft: "bg-emerald-50 text-emerald-800 border-emerald-100",
    };
  }

  if (tone === "blue") {
    return {
      pill: "bg-blue-50 text-blue-700 border-blue-100",
      dot: "bg-blue-500",
      soft: "bg-blue-50 text-blue-800 border-blue-100",
    };
  }

  return {
    pill: "bg-slate-50 text-slate-700 border-slate-100",
    dot: "bg-slate-400",
    soft: "bg-slate-50 text-slate-700 border-slate-100",
  };
}

function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`${cardClass} ${className}`}>{children}</section>;
}

function SectionHeader({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-500">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>

        {body ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {body}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span
        className={`max-w-[68%] break-words text-right text-sm ${
          strong ? "font-bold text-slate-900" : "font-medium text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TextBlock({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value: string | null | undefined;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
        {value?.trim() || emptyLabel}
      </p>
    </div>
  );
}

function AccordionItem({
  eyebrow,
  title,
  body,
  children,
  defaultOpen = false,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white shadow-[0_10px_35px_rgb(0,0,0,0.03)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 p-6 text-left md:p-8"
      >
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-500">
              {eyebrow}
            </p>
          ) : null}

          <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h3>

          {body ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {body}
            </p>
          ) : null}
        </div>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-lg font-bold text-slate-500 transition ${
            open ? "rotate-45 bg-rose-50 text-rose-500" : ""
          }`}
        >
          +
        </span>
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-6 pb-6 pt-0 md:px-8 md:pb-8">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5v4A2.5 2.5 0 0 1 13.5 12H10l-4 3v-3.1A2.5 2.5 0 0 1 4 9.5v-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m4.5 10 3.6 3.6L15.8 6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M8 5H5.8A2.8 2.8 0 0 0 3 7.8v6.4A2.8 2.8 0 0 0 5.8 17h6.4a2.8 2.8 0 0 0 2.8-2.8V12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M11 3h6v6M10 10l6.5-6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreatorAvatar({ creator }: { creator: CreatorLite | null }) {
  if (creator?.avatar_url) {
    return (
      <img
        src={creator.avatar_url}
        alt={creator.display_name ?? "creator"}
        className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-100"
      />
    );
  }

  const initial = (creator?.display_name?.trim()?.[0] ?? "C").toUpperCase();

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-50 text-base font-bold text-rose-600 ring-1 ring-rose-100">
      {initial}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_24px_rgb(0,0,0,0.025)]">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <div className="mt-2 text-lg font-bold tracking-tight text-slate-900">
        {value}
      </div>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function ProgressItem({
  done,
  active,
  label,
  body,
  last,
}: {
  done: boolean;
  active: boolean;
  label: string;
  body?: string;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold ${
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : active
                ? "border-rose-500 bg-rose-500 text-white"
                : "border-slate-200 bg-white text-slate-300"
          }`}
        >
          {done ? <CheckIcon /> : active ? "!" : ""}
        </div>

        {!last ? <div className="mt-2 h-full w-px bg-slate-100" /> : null}
      </div>

      <div className="min-w-0 pb-7">
        <p
          className={`text-sm font-bold ${
            done || active ? "text-slate-900" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        {body ? <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p> : null}
      </div>
    </div>
  );
}

function ProgressCard({
  order,
  copy,
  locale,
}: {
  order: OrderDetail;
  copy: Record<string, string>;
  locale: Locale;
}) {
  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);
  const delivered = Boolean(order.delivered_at || order.delivered_post_url);
  const completed = isCompletedStatus(order.status);

  let steps: Array<{
    label: string;
    body?: string;
    done: boolean;
    active: boolean;
  }> = [];

  if (isWaitingStatus(order.status)) {
    steps = [
      {
        label: copy.waitingProgressStepPayment,
        body: copy.waitingProgressPaymentBody,
        done: true,
        active: false,
      },
      {
        label: copy.waitingProgressStepReply,
        body: copy.waitingProgressReplyBody,
        done: false,
        active: true,
      },
      {
        label: copy.waitingProgressStepStart,
        body: copy.waitingProgressStartBody,
        done: false,
        active: false,
      },
    ];
  } else if (fulfillmentType === "product_shipping") {
    const addressDone = Boolean(
      getShippingAddress(order) && order.shipping_address_shared_at
    );
    const shippedDone = Boolean(order.shipped_at || order.shipping_tracking_number);
    const receivedDone = Boolean(order.received_at);

    steps = [
      {
        label: copy.stepAddressTitle,
        body: copy.stepAddressBody,
        done: addressDone,
        active: !addressDone,
      },
      {
        label: copy.stepShipmentTitle,
        body: copy.stepShipmentBody,
        done: shippedDone,
        active: addressDone && !shippedDone,
      },
      {
        label: copy.stepReceiveTitle,
        body: copy.stepReceiveBody,
        done: receivedDone,
        active: shippedDone && !receivedDone,
      },
      {
        label: copy.stepDeliveryTitle,
        body: copy.stepDeliveryBody,
        done: delivered,
        active: receivedDone && !delivered,
      },
      {
        label: copy.stepReviewTitle,
        body: copy.stepReviewBody,
        done: completed,
        active: delivered && !completed,
      },
    ];
  } else if (fulfillmentType === "visit") {
    const deliveredDone = Boolean(order.delivered_at || order.delivered_post_url);

    steps = [
      {
        label: copy.stepChatScheduleTitle,
        body: copy.stepChatScheduleBody,
        done: deliveredDone,
        active: !deliveredDone,
      },
      {
        label: copy.stepDeliveryTitle,
        body: copy.stepDeliveryBody,
        done: deliveredDone,
        active: !deliveredDone,
      },
      {
        label: copy.stepReviewTitle,
        body: copy.stepReviewBody,
        done: completed,
        active: deliveredDone && !completed,
      },
    ];
  } else {
    const materialsConfirmed = Boolean(order.materials_confirmed_at);
    const deliveredDone = Boolean(order.delivered_at || order.delivered_post_url);

    steps = [
      {
        label: copy.stepMaterialTitle,
        body: copy.stepMaterialBody,
        done: materialsConfirmed,
        active: !materialsConfirmed && !deliveredDone,
      },
      {
        label: copy.stepDeliveryTitle,
        body: copy.stepDeliveryBody,
        done: deliveredDone,
        active: materialsConfirmed && !deliveredDone,
      },
      {
        label: copy.stepReviewTitle,
        body: copy.stepReviewBody,
        done: completed,
        active: deliveredDone && !completed,
      },
    ];
  }

  return (
    <Card className="p-6 md:p-8">
      <SectionHeader
        eyebrow="Progress"
        title={copy.progressTitle}
        body={copy.progressBody}
      />

      <div className="mt-8">
        {steps.map((step, index) => (
          <ProgressItem
            key={`${step.label}-${index}`}
            label={step.label}
            body={step.body}
            done={step.done}
            active={step.active}
            last={index === steps.length - 1}
          />
        ))}
      </div>
    </Card>
  );
}

function PaymentCard({
  order,
  buyerTotal,
  buyerFee,
  planName,
  locale,
  copy,
}: {
  order: OrderDetail;
  buyerTotal: number | null | undefined;
  buyerFee: number | null | undefined;
  planName: string;
  locale: Locale;
  copy: Record<string, string>;
}) {
  const totalAmount = buyerTotal ?? order.menu_price_amount ?? 0;
  const serviceFeeAmount = buyerFee ?? 0;
  const currency = order.currency || "JPY";
  const cancellationDate = getCancellationDate(order);
  const isPaid = order.payment_status === "captured" || Boolean(order.captured_at);

  return (
    <Card className="p-6 md:p-8">
      <SectionHeader
        eyebrow="Payment"
        title={copy.paymentTitle}
        body={copy.paymentBody}
        action={
          <Pill
            className={
              isPaid
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-amber-100 bg-amber-50 text-amber-800"
            }
          >
            {isPaid ? copy.paymentPaid : copy.paymentAuthorized}
          </Pill>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard
          label={copy.total}
          value={formatPrice(totalAmount, currency, locale)}
          helper={copy.totalHelper}
        />
        <MetricCard
          label={copy.menuPrice}
          value={formatPrice(order.menu_price_amount, currency, locale)}
        />
        <MetricCard
          label={copy.serviceFee}
          value={formatPrice(serviceFeeAmount, currency, locale)}
          helper={
            order.buyer_marketplace_fee_rate_bps != null
              ? formatFeeRateBps(order.buyer_marketplace_fee_rate_bps)
              : undefined
          }
        />
      </div>

      <div className="mt-6">
        <AccordionItem
          eyebrow="Details"
          title={copy.paymentDetailTitle}
          body={copy.paymentDetailBody}
        >
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3">
            <DetailRow label={copy.plan} value={planName || "-"} />
            <DetailRow
              label={copy.orderDate}
              value={formatDateTime(order.created_at, locale)}
            />
            <DetailRow
              label={copy.paymentAuthorizedAt}
              value={formatDateTime(order.authorized_at, locale)}
            />
            <DetailRow
              label={copy.paymentCapturedAt}
              value={formatDateTime(order.captured_at, locale)}
            />
            <DetailRow
              label={copy.completedAt}
              value={formatDateTime(order.completed_at, locale)}
            />
            {cancellationDate ? (
              <DetailRow
                label={copy.endedAt}
                value={formatDateTime(cancellationDate, locale)}
              />
            ) : null}
          </div>
        </AccordionItem>
      </div>
    </Card>
  );
}

function ShipmentInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-50"
      />
    </label>
  );
}

function ShippingAccordion({
  order,
  shipmentForm,
  setShipmentForm,
  actionLoading,
  onSubmit,
  locale,
  copy,
}: {
  order: OrderDetail;
  shipmentForm: ShipmentForm;
  setShipmentForm: (value: ShipmentForm) => void;
  actionLoading: ActionLoading;
  onSubmit: () => void;
  locale: Locale;
  copy: Record<string, string>;
}) {
  const address = getShippingAddress(order);
  const canSubmit = canRegisterShipment(order);

  if (normalizeFulfillmentType(order.fulfillment_type) !== "product_shipping") {
    return null;
  }

  return (
    <AccordionItem
      eyebrow="Shipping"
      title={copy.productShippingTitle}
      body={copy.productShippingBody}
    >
      {!address ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
          {copy.shippingAddressWaiting}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {copy.shippingAddressTitle}
                </p>
                <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                  {address.recipient_name || copy.notSet}
                </p>
              </div>

              {order.shipping_address_shared_at ? (
                <Pill className="border-slate-100 bg-white text-slate-600">
                  {formatDate(order.shipping_address_shared_at, locale)}
                </Pill>
              ) : null}
            </div>

            <div className="mt-5 space-y-2 text-sm leading-7 text-slate-700">
              <p>
                <span className="font-medium text-slate-500">
                  {copy.shippingPostalCode}：
                </span>
                {address.postal_code || copy.notSet}
              </p>
              <p>
                <span className="font-medium text-slate-500">
                  {copy.shippingAddress}：
                </span>
                {[
                  address.prefecture,
                  address.city,
                  address.address_line1,
                  address.address_line2,
                ]
                  .filter(Boolean)
                  .join(" ") || copy.notSet}
              </p>
              <p>
                <span className="font-medium text-slate-500">
                  {copy.shippingPhoneNumber}：
                </span>
                {address.phone_number || copy.notSet}
              </p>
              {address.notes ? (
                <p>
                  <span className="font-medium text-slate-500">
                    {copy.shippingNotes}：
                  </span>
                  {address.notes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-3">
            <DetailRow
              label={copy.shippingCarrier}
              value={order.shipping_carrier || copy.notSet}
            />
            <DetailRow
              label={copy.shippingTrackingNumber}
              value={order.shipping_tracking_number || copy.notSet}
            />
            <DetailRow
              label={copy.shippedAt}
              value={
                order.shipped_at
                  ? formatDateTime(order.shipped_at, locale)
                  : copy.notSet
              }
            />
            <DetailRow
              label={copy.receivedAt}
              value={
                order.received_at
                  ? formatDateTime(order.received_at, locale)
                  : copy.notSet
              }
            />
          </div>

          {order.received_at ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
              {copy.shipmentLockedReceived}
            </div>
          ) : canSubmit ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-base font-bold tracking-tight text-slate-900">
                {copy.shipmentFormTitle}
              </h3>

              <div className="mt-5 grid gap-4">
                <ShipmentInput
                  label={copy.shippingCarrier}
                  value={shipmentForm.shipping_carrier}
                  onChange={(value) =>
                    setShipmentForm({
                      ...shipmentForm,
                      shipping_carrier: value,
                    })
                  }
                  placeholder={copy.shipmentCarrierPlaceholder}
                />

                <ShipmentInput
                  label={copy.shippingTrackingNumber}
                  value={shipmentForm.shipping_tracking_number}
                  onChange={(value) =>
                    setShipmentForm({
                      ...shipmentForm,
                      shipping_tracking_number: value,
                    })
                  }
                  placeholder={copy.shipmentTrackingPlaceholder}
                />

                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center justify-center rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(244,63,94,0.22)] transition hover:-translate-y-0.5 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "shipment"
                    ? copy.registeringShipment
                    : order.shipped_at
                      ? copy.updateShipment
                      : copy.registerShipment}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm leading-7 text-slate-500">
              {copy.shipmentCannotEdit}
            </div>
          )}
        </div>
      )}
    </AccordionItem>
  );
}

function DeliveryReviewCard({
  order,
  canReviewDelivery,
  canRequestRevision,
  revisionLimitReached,
  actionLoading,
  revisionNote,
  setRevisionNote,
  onComplete,
  onRequestRevision,
  copy,
}: {
  order: OrderDetail;
  canReviewDelivery: boolean;
  canRequestRevision: boolean;
  revisionLimitReached: boolean;
  actionLoading: ActionLoading;
  revisionNote: string;
  setRevisionNote: (value: string) => void;
  onComplete: () => void;
  onRequestRevision: () => void;
  copy: Record<string, string>;
}) {
  return (
    <Card className="p-6 md:p-8">
      <SectionHeader
        eyebrow="Review"
        title={copy.completeTitle}
        body={copy.completeBody}
      />

      <div className="mt-8 grid gap-4">
        {order.delivered_post_url ? (
          <a
            href={order.delivered_post_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <ExternalIcon />
            {copy.openDelivery}
          </a>
        ) : (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
            {copy.deliveryMissing}
          </div>
        )}

        {canReviewDelivery ? (
          <>
            <button
              type="button"
              onClick={onComplete}
              disabled={actionLoading !== null}
              className="inline-flex w-full items-center justify-center rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(244,63,94,0.22)] transition hover:-translate-y-0.5 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "complete" ? copy.completing : copy.complete}
            </button>

            {canRequestRevision ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h3 className="text-base font-bold tracking-tight text-slate-900">
                  {copy.revisionTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {copy.revisionBody}
                </p>

                <textarea
                  value={revisionNote}
                  onChange={(event) => setRevisionNote(event.target.value)}
                  placeholder={copy.revisionPlaceholder}
                  rows={4}
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-50"
                />

                <button
                  type="button"
                  onClick={onRequestRevision}
                  disabled={actionLoading !== null}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "revision"
                    ? copy.requestingRevision
                    : copy.requestRevision}
                </button>
              </div>
            ) : revisionLimitReached ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm leading-7 text-slate-500">
                {copy.revisionLimitReached}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Card>
  );
}

function ChatPanel({
  order,
  creator,
  copy,
  locale,
}: {
  order: OrderDetail;
  creator: CreatorLite | null;
  copy: Record<string, string>;
  locale: Locale;
}) {
  const title = creator?.display_name || copy.influencer;
  const subtitle = locale === "ja" ? "Trendre内チャット" : "Trendre chat";

  return (
    <Card className="overflow-hidden p-0 lg:sticky lg:top-24">
      <div className="border-b border-slate-100 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <CreatorAvatar creator={creator} />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-tight text-slate-900">
                {title}
              </p>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <MessageIcon />
          </div>
        </div>
      </div>

      <div className="h-[620px] min-h-0 bg-white lg:h-[calc(100vh-230px)]">
        <ChatEmbed
          orderId={order.id}
          title={title}
          subtitle={subtitle}
          variant="page"
          showHeader={false}
        />
      </div>
    </Card>
  );
}

function ChatLockedCard({
  order,
  creator,
  copy,
  locale,
}: {
  order: OrderDetail;
  creator: CreatorLite | null;
  copy: Record<string, string>;
  locale: Locale;
}) {
  const meta = getStatusMeta(order.status, locale);
  const tone = toneClasses(meta.tone);

  return (
    <Card className="p-6 md:p-8 lg:sticky lg:top-24">
      <div className="flex items-center gap-4">
        <CreatorAvatar creator={creator} />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold tracking-tight text-slate-900">
            {creator?.display_name || copy.influencer}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {creator?.category || copy.notSet}
          </p>
        </div>
      </div>

      <div className={`mt-8 rounded-2xl border p-5 ${tone.soft}`}>
        <p className="text-sm font-bold">{copy.chatLockedTitle}</p>
        <p className="mt-2 text-sm leading-7">{copy.chatLockedBody}</p>
      </div>

      {creator?.id ? (
        <Link
          href={`/b/creators/${creator.id}`}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          {copy.influencerProfile}
        </Link>
      ) : null}
    </Card>
  );
}

function OrderDetailsAccordion({
  order,
  copy,
  locale,
}: {
  order: OrderDetail;
  copy: Record<string, string>;
  locale: Locale;
}) {
  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);

  return (
    <AccordionItem
      eyebrow="Brief"
      title={copy.orderContent}
      body={copy.orderContentSub}
    >
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3">
        <DetailRow
          label={copy.productName}
          value={order.product_name || copy.notSet}
          strong
        />
        <DetailRow
          label={copy.projectType}
          value={fulfillmentLabel(order.fulfillment_type, locale)}
        />
        <DetailRow
          label={copy.productUrl}
          value={
            order.product_url ? (
              <a
                href={order.product_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-rose-600 underline underline-offset-4"
              >
                {order.product_url}
              </a>
            ) : (
              copy.notSet
            )
          }
        />
        <DetailRow
          label={copy.deadline}
          value={
            order.deadline
              ? formatDateTime(order.deadline, locale)
              : copy.notSet
          }
        />
        <DetailRow
          label={copy.freeOffer}
          value={order.has_free_offer ? copy.yes : copy.no}
        />
        <DetailRow
          label={copy.secondaryUse}
          value={order.wants_secondary_use ? copy.yes : copy.no}
        />

        {fulfillmentType === "visit" ? (
          <>
            <DetailRow
              label={copy.visitLocation}
              value={order.visit_location || copy.notSet}
            />
            <DetailRow
              label={copy.visitSchedule}
              value={
                order.visit_scheduled_at
                  ? formatDateTime(order.visit_scheduled_at, locale)
                  : copy.notSet
              }
            />
          </>
        ) : null}
      </div>

      <div className="mt-5">
        <TextBlock
          label={copy.requirements}
          value={order.requirements}
          emptyLabel={copy.notSet}
        />
      </div>
    </AccordionItem>
  );
}

function MenuDetailsAccordion({
  order,
  copy,
  locale,
}: {
  order: OrderDetail;
  copy: Record<string, string>;
  locale: Locale;
}) {
  return (
    <AccordionItem
      eyebrow="Menu"
      title={copy.menuContent}
      body={copy.menuContentSub}
    >
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3">
        <DetailRow
          label={copy.menuTitle}
          value={order.menu_title_snapshot || copy.notSet}
          strong
        />
        <DetailRow
          label={copy.platform}
          value={
            <span className="inline-flex items-center justify-end gap-2">
              {getPlatformIcon(order.menu_platform_snapshot)}
              {order.menu_platform_snapshot || copy.notSet}
            </span>
          }
        />
        <DetailRow
          label={copy.menuType}
          value={getMenuTypeLabel(
            order.menu_type_snapshot,
            locale,
            copy.notSet
          )}
        />
        <DetailRow
          label={copy.category}
          value={order.menu_category_snapshot || copy.notSet}
        />
        <DetailRow
          label={copy.deliveryDays}
          value={formatDeliveryDays(
            order.menu_delivery_days_snapshot,
            locale,
            copy.notSet
          )}
        />
        <DetailRow
          label={copy.secondaryUseAllowed}
          value={
            order.menu_allow_secondary_use_snapshot
              ? copy.allowed
              : copy.notAllowed
          }
        />
      </div>

      <div className="mt-5 grid gap-4">
        <TextBlock
          label={copy.deliverables}
          value={order.menu_deliverables_snapshot}
          emptyLabel={copy.notSet}
        />
        <TextBlock
          label={copy.menuDescription}
          value={order.menu_description_snapshot}
          emptyLabel={copy.notSet}
        />
      </div>
    </AccordionItem>
  );
}

export default function CompanyOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = String(params.id ?? "");

  const { locale } = useAppLocale();
  const safeLocale: Locale = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo<Record<string, string>>(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            notFound: "注文が見つかりませんでした。",
            authFailed: "ログイン情報を取得できませんでした。",
            backOrders: "注文一覧へ戻る",
            titleFallback: "注文詳細",
            influencer: "インフルエンサー",
            influencerProfile: "プロフィールを見る",
            notSet: "未設定",

            statusLabel: "ステータス",
            flowLabel: "進め方",
            total: "合計",
            totalHelper: "手数料込み",
            acceptDeadline: "返答期限",
            autoComplete: "自動完了",
            autoCompleteExpired: "自動完了期限超過",

            chatLockedTitle: "チャットはまだ利用できません",
            chatLockedBody:
              "返答待ち・支払い確認中の注文では、承認されるまでチャットは表示されません。",

            progressTitle: "進捗",
            progressBody:
              "案件の進行状況と、次に必要な対応を確認できます。",
            waitingProgressStepPayment: "支払い方法を確認",
            waitingProgressPaymentBody:
              "決済は確認済みです。承認されるまで確定されません。",
            waitingProgressStepReply: "インフルエンサーの返答待ち",
            waitingProgressReplyBody:
              "依頼内容を確認中です。返答があると注文が開始されます。",
            waitingProgressStepStart: "注文開始",
            waitingProgressStartBody:
              "承認後にチャットや進行状況が表示されます。",

            stepAddressTitle: "配送先共有",
            stepAddressBody:
              "インフルエンサーが商品の配送先を共有します。",
            stepShipmentTitle: "商品発送",
            stepShipmentBody:
              "配送会社と追跡番号を登録すると、相手に発送済みとして表示されます。",
            stepReceiveTitle: "商品受取",
            stepReceiveBody:
              "インフルエンサーが商品を受け取ると次へ進みます。",
            stepDeliveryTitle: "納品",
            stepDeliveryBody:
              "投稿URLまたは納品URLが登録されると確認できます。",
            stepReviewTitle: "確認・完了",
            stepReviewBody:
              "内容に問題がなければ注文を完了してください。",
            stepChatScheduleTitle: "チャットで日程調整",
            stepChatScheduleBody:
              "来店日時や撮影条件はチャットで調整してください。",
            stepMaterialTitle: "素材・投稿情報確認",
            stepMaterialBody:
              "提供素材と投稿条件を確認してから制作が進みます。",

            paymentTitle: "支払い情報",
            paymentBody:
              "お支払いはTrendreが管理します。案件完了後、報酬がインフルエンサーへ支払われます。",
            paymentPaid: "支払い済み",
            paymentAuthorized: "支払い方法確認済み",
            paymentDetailTitle: "支払い日付・明細",
            paymentDetailBody:
              "注文日、支払い確認日、支払い確定日などの詳細情報です。",
            plan: "プラン",
            menuPrice: "メニュー価格",
            serviceFee: "サービス手数料",
            orderDate: "注文日",
            paymentAuthorizedAt: "支払い確認日",
            paymentCapturedAt: "支払い確定日",
            completedAt: "完了日",
            endedAt: "終了日",

            productShippingTitle: "発送情報",
            productShippingBody:
              "配送先・追跡番号・発送日時などの業務情報です。必要な時だけ開いて確認できます。",
            shippingAddressWaiting:
              "インフルエンサーの配送先共有を待っています。",
            shippingAddressTitle: "配送先",
            shippingPostalCode: "郵便番号",
            shippingAddress: "住所",
            shippingPhoneNumber: "電話番号",
            shippingNotes: "配送メモ",
            shippingCarrier: "配送会社",
            shippingTrackingNumber: "追跡番号",
            shippedAt: "発送日時",
            receivedAt: "受取日時",
            shipmentFormTitle: "発送情報を登録",
            shipmentCarrierPlaceholder: "例：ヤマト運輸 / 佐川急便",
            shipmentTrackingPlaceholder: "例：1234-5678-9012",
            registerShipment: "発送情報を登録する",
            updateShipment: "発送情報を更新する",
            registeringShipment: "登録中...",
            shipmentRequired:
              "配送会社と追跡番号を入力してください。",
            shipmentConfirm:
              "発送情報を登録しますか？インフルエンサー側に発送済みとして表示されます。",
            shipmentFailed: "発送情報の登録に失敗しました。",
            shipmentLockedReceived:
              "インフルエンサーが商品を受け取り済みです。",
            shipmentCannotEdit:
              "現在この注文では発送情報を編集できません。",

            completeTitle: "納品確認",
            completeBody:
              "納品内容を確認し、問題がなければ注文を完了してください。",
            openDelivery: "納品URLを開く",
            complete: "承認して完了する",
            completing: "完了処理中...",
            confirmComplete:
              "この注文を完了しますか？納品内容を確認済みの場合のみ実行してください。",
            completeFailed: "完了処理に失敗しました。",
            deliveryMissing: "納品URLがまだ登録されていません。",

            revisionTitle: "修正依頼",
            revisionBody:
              "元の注文内容に沿う範囲で修正依頼を送信できます。",
            revisionPlaceholder:
              "例：依頼内容の〇〇が反映されていないため修正してください。",
            requestRevision: "修正依頼を送信",
            requestingRevision: "送信中...",
            confirmRevision:
              "修正依頼を送信しますか？元の注文内容に沿う範囲の場合のみ送信してください。",
            revisionFailed: "修正依頼の送信に失敗しました。",
            revisionNoteRequired:
              "修正依頼内容は10文字以上で入力してください。",
            revisionLimitReached:
              "修正依頼の上限回数に達しています。必要な場合はチャットで相談してください。",
            currentRevisionNote: "現在の修正依頼",
            revisionNoteLabel: "修正依頼内容",

            orderContent: "注文内容",
            orderContentSub:
              "依頼時に入力した詳細情報です。普段は閉じたまま必要な時だけ確認できます。",
            productName: "商品名・案件名",
            projectType: "進め方",
            productUrl: "商品URL",
            deadline: "希望日",
            freeOffer: "無償提供",
            secondaryUse: "二次利用",
            yes: "あり",
            no: "なし",
            requirements: "依頼内容",
            visitLocation: "来店場所",
            visitSchedule: "来店予定",

            menuContent: "メニュー詳細",
            menuContentSub:
              "注文時点のメニュー情報です。納品物や利用条件を確認できます。",
            menuTitle: "メニュー名",
            platform: "SNS",
            menuType: "形式",
            category: "カテゴリー",
            deliveryDays: "目安",
            deliverables: "納品物",
            menuDescription: "説明",
            secondaryUseAllowed: "二次利用",
            allowed: "可",
            notAllowed: "不可",
          }
        : {
            loading: "Loading...",
            notFound: "Order was not found.",
            authFailed: "Could not retrieve your login session.",
            backOrders: "Back to orders",
            titleFallback: "Order details",
            influencer: "Influencer",
            influencerProfile: "View profile",
            notSet: "Not set",

            statusLabel: "Status",
            flowLabel: "Flow",
            total: "Total",
            totalHelper: "Including fees",
            acceptDeadline: "Reply deadline",
            autoComplete: "Auto complete",
            autoCompleteExpired: "Auto-complete overdue",

            chatLockedTitle: "Chat is not available yet",
            chatLockedBody:
              "Chat appears after the influencer accepts the order.",

            progressTitle: "Progress",
            progressBody:
              "Track the current stage and the next required action.",
            waitingProgressStepPayment: "Payment method checked",
            waitingProgressPaymentBody:
              "Payment is authorized and will be captured only after approval.",
            waitingProgressStepReply: "Waiting for influencer reply",
            waitingProgressReplyBody:
              "The influencer is reviewing your request.",
            waitingProgressStepStart: "Order starts",
            waitingProgressStartBody:
              "Chat and progress details appear after approval.",

            stepAddressTitle: "Address shared",
            stepAddressBody:
              "The influencer shares the delivery address.",
            stepShipmentTitle: "Product shipped",
            stepShipmentBody:
              "Register the carrier and tracking number.",
            stepReceiveTitle: "Product received",
            stepReceiveBody:
              "The influencer confirms product receipt.",
            stepDeliveryTitle: "Delivery",
            stepDeliveryBody:
              "The delivery URL will appear once submitted.",
            stepReviewTitle: "Review and complete",
            stepReviewBody:
              "Complete the order if the delivery looks good.",
            stepChatScheduleTitle: "Schedule in chat",
            stepChatScheduleBody:
              "Coordinate visit timing and shooting details in chat.",
            stepMaterialTitle: "Material check",
            stepMaterialBody:
              "Confirm provided assets and posting conditions.",

            paymentTitle: "Payment details",
            paymentBody:
              "Trendre manages the payment and releases payout after completion.",
            paymentPaid: "Paid",
            paymentAuthorized: "Authorized",
            paymentDetailTitle: "Payment dates and details",
            paymentDetailBody:
              "Order date, authorization date, capture date, and completion details.",
            plan: "Plan",
            menuPrice: "Menu price",
            serviceFee: "Service fee",
            orderDate: "Order date",
            paymentAuthorizedAt: "Payment authorized",
            paymentCapturedAt: "Payment captured",
            completedAt: "Completed",
            endedAt: "Ended",

            productShippingTitle: "Shipment",
            productShippingBody:
              "Business details such as address, tracking number, and shipment date.",
            shippingAddressWaiting:
              "Waiting for the influencer to share a delivery address.",
            shippingAddressTitle: "Delivery address",
            shippingPostalCode: "Postal code",
            shippingAddress: "Address",
            shippingPhoneNumber: "Phone",
            shippingNotes: "Delivery notes",
            shippingCarrier: "Carrier",
            shippingTrackingNumber: "Tracking number",
            shippedAt: "Shipped at",
            receivedAt: "Received at",
            shipmentFormTitle: "Register shipment",
            shipmentCarrierPlaceholder: "Example: Yamato / Sagawa",
            shipmentTrackingPlaceholder: "Example: 1234-5678-9012",
            registerShipment: "Register shipment",
            updateShipment: "Update shipment",
            registeringShipment: "Registering...",
            shipmentRequired:
              "Please enter the carrier and tracking number.",
            shipmentConfirm:
              "Register this shipment? It will be shown to the influencer as shipped.",
            shipmentFailed: "Failed to register shipment.",
            shipmentLockedReceived:
              "The influencer has received the product.",
            shipmentCannotEdit:
              "Shipment details cannot be edited right now.",

            completeTitle: "Review delivery",
            completeBody:
              "Review the delivery and complete the order if everything looks good.",
            openDelivery: "Open delivery URL",
            complete: "Approve and complete",
            completing: "Completing...",
            confirmComplete:
              "Complete this order? Please do this only after reviewing the delivery.",
            completeFailed: "Failed to complete this order.",
            deliveryMissing: "The delivery URL has not been registered yet.",

            revisionTitle: "Request revision",
            revisionBody:
              "Send a revision request within the original order requirements.",
            revisionPlaceholder:
              "Example: Please revise the missing point from the original requirements.",
            requestRevision: "Send revision request",
            requestingRevision: "Sending...",
            confirmRevision:
              "Send this revision request? Please make sure it is within the original requirements.",
            revisionFailed: "Failed to send revision request.",
            revisionNoteRequired:
              "Please enter at least 10 characters for the revision request.",
            revisionLimitReached:
              "The revision request limit has been reached. Please use chat if needed.",
            currentRevisionNote: "Current revision request",
            revisionNoteLabel: "Revision request",

            orderContent: "Order details",
            orderContentSub:
              "Detailed information entered at request time.",
            productName: "Product / Campaign",
            projectType: "Flow",
            productUrl: "Product URL",
            deadline: "Preferred date",
            freeOffer: "Free offer",
            secondaryUse: "Secondary use",
            yes: "Yes",
            no: "No",
            requirements: "Requirements",
            visitLocation: "Visit location",
            visitSchedule: "Visit schedule",

            menuContent: "Menu details",
            menuContentSub:
              "Menu information at purchase, including deliverables and usage terms.",
            menuTitle: "Menu title",
            platform: "Platform",
            menuType: "Format",
            category: "Category",
            deliveryDays: "Timeline",
            deliverables: "Deliverables",
            menuDescription: "Description",
            secondaryUseAllowed: "Secondary use",
            allowed: "Allowed",
            notAllowed: "Not allowed",
          },
    [safeLocale]
  );

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [creator, setCreator] = useState<CreatorLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);
  const [error, setError] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [shipmentForm, setShipmentForm] = useState<ShipmentForm>({
    shipping_carrier: "",
    shipping_tracking_number: "",
  });

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const authResult: any = await withTimeout(
        supabase.auth.getUser(),
        AUTH_TIMEOUT_MS,
        copy.authFailed
      );

      const user = authResult?.data?.user ?? null;
      const userError = authResult?.error ?? null;

      if (userError || !user) {
        const nextPath = `/b/orders/${orderId}`;
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const orderResult: any = await withTimeout(
        supabase
          .from("orders")
          .select(
            `
            id,
            b_user_id,
            creator_id,
            creator_user_id,
            status,
            payment_status,
            stripe_payment_status,
            created_at,
            updated_at,
            fulfillment_type,
            preparation_status,
            preparation_data,
            preparation_started_at,
            preparation_ready_at,
            work_started_at,
            visit_location,
            visit_candidate_note,
            visit_scheduled_at,
            visit_notes,
            shipping_address_shared_at,
            shipping_carrier,
            shipping_tracking_number,
            shipped_at,
            received_at,
            materials_provided_at,
            materials_confirmed_at,
            product_name,
            product_url,
            requirements,
            deadline,
            has_free_offer,
            wants_secondary_use,
            menu_title_snapshot,
            menu_description_snapshot,
            menu_platform_snapshot,
            menu_type_snapshot,
            menu_category_snapshot,
            menu_deliverables_snapshot,
            menu_delivery_days_snapshot,
            menu_allow_secondary_use_snapshot,
            currency,
            menu_price_amount,
            stripe_amount,
            platform_fee_amount,
            creator_payout_amount,
            buyer_plan_code_snapshot,
            buyer_plan_public_name_snapshot,
            buyer_marketplace_fee_rate_bps,
            buyer_marketplace_fee_amount,
            buyer_total_amount,
            creator_transaction_fee_rate_bps,
            creator_transaction_fee_amount,
            platform_gross_revenue_amount,
            creator_accept_deadline,
            authorized_at,
            accepted_at,
            declined_at,
            expired_at,
            captured_at,
            canceled_at,
            delivered_at,
            delivered_post_url,
            completed_at,
            disputed_at,
            revision_requested_at,
            revision_note,
            revision_count,
            max_revision_count,
            auto_complete_at,
            completed_reason
          `
          )
          .eq("id", orderId)
          .eq("b_user_id", user.id)
          .maybeSingle(),
        DB_TIMEOUT_MS,
        copy.notFound
      );

      if (orderResult?.error) {
        console.error("company order detail load error:", orderResult.error);
        setError(copy.notFound);
        setOrder(null);
        setCreator(null);
        setLoading(false);
        return;
      }

      const nextOrder = (orderResult?.data as OrderDetail | null) ?? null;

      setOrder(nextOrder);
      setShipmentForm({
        shipping_carrier: nextOrder?.shipping_carrier ?? "",
        shipping_tracking_number: nextOrder?.shipping_tracking_number ?? "",
      });

      if (!nextOrder) {
        setCreator(null);
        setLoading(false);
        return;
      }

      const creatorResult: any = await withTimeout(
        supabase
          .from("creators")
          .select("id, display_name, avatar_url, category")
          .eq("id", nextOrder.creator_id)
          .maybeSingle(),
        DB_TIMEOUT_MS,
        copy.notFound
      );

      if (creatorResult?.error) {
        console.error("company order creator load error:", creatorResult.error);
        setCreator(null);
      } else {
        setCreator((creatorResult?.data as CreatorLite | null) ?? null);
      }

      setLoading(false);
    } catch (e: unknown) {
      console.error("company order detail load error:", e);
      setError(e instanceof Error ? e.message : copy.notFound);
      setOrder(null);
      setCreator(null);
      setLoading(false);
    }
  }, [copy.authFailed, copy.notFound, orderId, router, supabase]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const getActionToken = async () => {
    const sessionResult: any = await withTimeout(
      supabase.auth.getSession(),
      AUTH_TIMEOUT_MS,
      copy.authFailed
    );

    return sessionResult?.data?.session?.access_token ?? null;
  };

  const runComplete = async () => {
    if (!order) return;

    if (!window.confirm(copy.confirmComplete)) return;

    setActionLoading("complete");
    setError(null);

    try {
      const accessToken = await getActionToken();

      if (!accessToken) {
        setError(copy.authFailed);
        setActionLoading(null);
        return;
      }

      const res = await fetchWithTimeout(
        `/api/b/orders/${order.id}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        ACTION_TIMEOUT_MS,
        copy.completeFailed
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.completeFailed);
        setActionLoading(null);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.completeFailed);
      setActionLoading(null);
    }
  };

  const runRequestRevision = async () => {
    if (!order) return;

    const note = revisionNote.trim();

    if (note.length < 10) {
      setError(copy.revisionNoteRequired);
      return;
    }

    if (!window.confirm(copy.confirmRevision)) return;

    setActionLoading("revision");
    setError(null);

    try {
      const accessToken = await getActionToken();

      if (!accessToken) {
        setError(copy.authFailed);
        setActionLoading(null);
        return;
      }

      const res = await fetchWithTimeout(
        `/api/b/orders/${order.id}/request-revision`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            revision_note: note,
          }),
        },
        ACTION_TIMEOUT_MS,
        copy.revisionFailed
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.revisionFailed);
        setActionLoading(null);
        return;
      }

      setRevisionNote("");
      await loadOrder();
      setActionLoading(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.revisionFailed);
      setActionLoading(null);
    }
  };

  const runRegisterShipment = async () => {
    if (!order) return;

    if (
      !shipmentForm.shipping_carrier.trim() ||
      !shipmentForm.shipping_tracking_number.trim()
    ) {
      setError(copy.shipmentRequired);
      return;
    }

    if (!window.confirm(copy.shipmentConfirm)) return;

    setActionLoading("shipment");
    setError(null);

    try {
      const accessToken = await getActionToken();

      if (!accessToken) {
        setError(copy.authFailed);
        setActionLoading(null);
        return;
      }

      const res = await fetchWithTimeout(
        `/api/company/orders/${order.id}/shipment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shipmentForm),
        },
        ACTION_TIMEOUT_MS,
        copy.shipmentFailed
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.shipmentFailed);
        setActionLoading(null);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.shipmentFailed);
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="h-44 animate-pulse rounded-3xl border border-slate-100 bg-white shadow-[0_10px_35px_rgb(0,0,0,0.03)]" />
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="h-[620px] animate-pulse rounded-3xl border border-slate-100 bg-white lg:col-span-5" />
            <div className="h-[760px] animate-pulse rounded-3xl border border-slate-100 bg-white lg:col-span-7" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_10px_35px_rgb(0,0,0,0.03)]">
          <p className="text-sm leading-7 text-slate-700">
            {error ?? copy.notFound}
          </p>

          <Link
            href="/b/orders"
            className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {copy.backOrders}
          </Link>
        </div>
      </div>
    );
  }

  const meta = getStatusMeta(order.status, safeLocale);
  const tone = toneClasses(meta.tone);
  const backHref = getBackHref(order.status);
  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);

  const buyerTotal =
    order.buyer_total_amount ?? order.stripe_amount ?? order.menu_price_amount;

  const buyerFee =
    order.buyer_marketplace_fee_amount ??
    Math.max(0, (buyerTotal ?? 0) - (order.menu_price_amount ?? 0));

  const planName =
    order.buyer_plan_public_name_snapshot ||
    formatPlanName(order.buyer_plan_code_snapshot);

  const canReviewDelivery =
    isDeliveredStatus(order.status) && order.payment_status === "captured";

  const revisionLimitReached =
    (order.revision_count ?? 0) >= (order.max_revision_count ?? 1);

  const canRequestRevision = canReviewDelivery && !revisionLimitReached;
  const canChat = canOpenChat(order);

  const showShipmentAccordion =
    fulfillmentType === "product_shipping" &&
    !isWaitingStatus(order.status) &&
    !isCanceledStatus(order.status);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-10">
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_10px_35px_rgb(0,0,0,0.03)] md:p-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-rose-100/70 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-20 h-64 w-64 rounded-full bg-slate-100 blur-3xl" />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className={tone.pill}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {meta.label}
                  </Pill>

                  <Pill className="border-slate-100 bg-white text-slate-700">
                    {fulfillmentLabel(order.fulfillment_type, safeLocale)}
                  </Pill>

                  {order.creator_accept_deadline &&
                  isWaitingStatus(order.status) ? (
                    <DeadlineBadge
                      deadline={order.creator_accept_deadline}
                      label={copy.acceptDeadline}
                      expiredLabel={copy.acceptDeadline}
                      locale={safeLocale}
                      urgentHours={12}
                      warningHours={24}
                    />
                  ) : null}

                  {order.auto_complete_at && isDeliveredStatus(order.status) ? (
                    <DeadlineBadge
                      deadline={order.auto_complete_at}
                      label={copy.autoComplete}
                      expiredLabel={copy.autoCompleteExpired}
                      locale={safeLocale}
                      urgentHours={12}
                      warningHours={24}
                    />
                  ) : null}
                </div>

                <h1 className="mt-5 max-w-4xl text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  {order.product_name ||
                    order.menu_title_snapshot ||
                    copy.titleFallback}
                </h1>

                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-500">
                  {getHeroSubtitle(order.status, safeLocale)}
                </p>
              </div>

              <Link
                href={backHref}
                className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_8px_20px_rgb(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                <BackIcon />
                {copy.backOrders}
              </Link>
            </div>
          </section>

          {error ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            <aside className="lg:col-span-5">
              {canChat ? (
                <ChatPanel
                  order={order}
                  creator={creator}
                  copy={copy}
                  locale={safeLocale}
                />
              ) : (
                <ChatLockedCard
                  order={order}
                  creator={creator}
                  copy={copy}
                  locale={safeLocale}
                />
              )}
            </aside>

            <main className="space-y-8 lg:col-span-7">
              <Card className="p-6 md:p-8">
                <SectionHeader
                  eyebrow="Overview"
                  title={meta.title}
                  body={meta.body}
                />

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <MetricCard label={copy.statusLabel} value={meta.label} />
                  <MetricCard
                    label={copy.flowLabel}
                    value={fulfillmentLabel(order.fulfillment_type, safeLocale)}
                  />
                  <MetricCard
                    label={copy.total}
                    value={formatPrice(buyerTotal, order.currency, safeLocale)}
                  />
                </div>
              </Card>

              <ProgressCard order={order} copy={copy} locale={safeLocale} />

              <PaymentCard
                order={order}
                buyerTotal={buyerTotal}
                buyerFee={buyerFee}
                planName={planName}
                locale={safeLocale}
                copy={copy}
              />

              <div className="space-y-5">
                {showShipmentAccordion ? (
                  <ShippingAccordion
                    order={order}
                    shipmentForm={shipmentForm}
                    setShipmentForm={setShipmentForm}
                    actionLoading={actionLoading}
                    onSubmit={() => void runRegisterShipment()}
                    locale={safeLocale}
                    copy={copy}
                  />
                ) : null}

                <OrderDetailsAccordion
                  order={order}
                  copy={copy}
                  locale={safeLocale}
                />

                <MenuDetailsAccordion
                  order={order}
                  copy={copy}
                  locale={safeLocale}
                />
              </div>

              {isDeliveredStatus(order.status) ? (
                <DeliveryReviewCard
                  order={order}
                  canReviewDelivery={canReviewDelivery}
                  canRequestRevision={canRequestRevision}
                  revisionLimitReached={revisionLimitReached}
                  actionLoading={actionLoading}
                  revisionNote={revisionNote}
                  setRevisionNote={setRevisionNote}
                  onComplete={() => void runComplete()}
                  onRequestRevision={() => void runRequestRevision()}
                  copy={copy}
                />
              ) : null}

              {order.revision_note ? (
                <Card className="p-6 md:p-8">
                  <SectionHeader
                    eyebrow="Revision"
                    title={copy.currentRevisionNote}
                  />
                  <div className="mt-6">
                    <TextBlock
                      label={copy.revisionNoteLabel}
                      value={order.revision_note}
                      emptyLabel={copy.notSet}
                    />
                  </div>
                </Card>
              ) : null}

              {isCompletedStatus(order.status) || isCanceledStatus(order.status) ? (
                <Card className="p-6 md:p-8">
                  <SectionHeader title={meta.title} body={meta.body} />
                  {order.delivered_post_url ? (
                    <a
                      href={order.delivered_post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                    >
                      <ExternalIcon />
                      {copy.openDelivery}
                    </a>
                  ) : null}
                </Card>
              ) : null}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}