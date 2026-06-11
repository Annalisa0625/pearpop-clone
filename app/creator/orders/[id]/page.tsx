// File: app/creator/orders/[id]/page.tsx
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type FulfillmentType = "material_provided" | "product_shipping" | "visit";

type PreparationStatus =
  | "not_started"
  | "waiting_materials"
  | "materials_provided"
  | "materials_confirmed"
  | "waiting_shipping_address"
  | "waiting_shipment"
  | "shipped"
  | "received"
  | "waiting_schedule"
  | "schedule_confirmed"
  | "ready_to_start";

type ShippingAddressForm = {
  recipient_name: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2: string;
  phone_number: string;
  notes: string;
};

type OrderDetail = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string | null;

  fulfillment_type: FulfillmentType | string | null;
  preparation_status: PreparationStatus | string | null;
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

  pr_account: string | null;
  pr_hashtags: string[] | null;
  pr_copy_text: string | null;
  post_notes: string | null;

  menu_title_snapshot: string | null;
  menu_platform_snapshot: string | null;
  menu_type_snapshot: string | null;
  menu_category_snapshot: string | null;
  menu_deliverables_snapshot: string | null;
  menu_delivery_days_snapshot: number | null;

  currency: string | null;
  menu_price_amount: number | null;
  creator_payout_amount: number | null;
  creator_accept_deadline: string | null;

  delivered_post_url: string | null;
  revision_note: string | null;
  transfer_status: string | null;
};

type ReferenceAsset = {
  id: string;
  order_id: string;
  file_name: string;
  file_type: "image" | "pdf";
  mime_type: string;
  size_bytes: number;
  sort_order: number;
  created_at: string;
  signed_url: string | null;
};

type ActionLoading =
  | "accept"
  | "decline"
  | "deliver"
  | "shipping_address"
  | "received"
  | "materials_confirmed"
  | null;

const AUTH_TIMEOUT_MS = 8000;
const ORDER_TIMEOUT_MS = 10000;
const REFERENCE_ASSET_TIMEOUT_MS = 8000;
const ACTION_TIMEOUT_MS = 30000;

const EMPTY_SHIPPING_ADDRESS: ShippingAddressForm = {
  recipient_name: "",
  postal_code: "",
  prefecture: "",
  city: "",
  address_line1: "",
  address_line2: "",
  phone_number: "",
  notes: "",
};

function withTimeout<T = any>(
  promiseLike: PromiseLike<T> | T,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = Promise.resolve(promiseLike);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
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
    const isAbort =
      error instanceof DOMException && error.name === "AbortError";

    if (isAbort) {
      throw new Error(timeoutMessage);
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: "ja" | "en"
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

function isTerminalStatus(status: string) {
  return [
    "completed",
    "declined_canceled",
    "expired_canceled",
    "canceled",
    "cancelled",
  ].includes(status);
}

function isCheckoutPending(order: OrderDetail) {
  return (
    order.status === "checkout_pending" ||
    order.payment_status === "checkout_pending"
  );
}

function isWaitingForCreator(order: OrderDetail) {
  if (isCheckoutPending(order)) return false;
  if (order.status === "authorized_pending_creator") return true;

  return (
    order.payment_status === "authorized" &&
    !isTerminalStatus(order.status) &&
    order.status !== "delivered" &&
    order.status !== "revision_requested" &&
    order.status !== "completed"
  );
}

function isInProgress(order: OrderDetail) {
  return (
    order.status === "accepted_captured" ||
    order.status === "in_progress" ||
    (order.payment_status === "captured" &&
      !["delivered", "revision_requested", "completed"].includes(order.status))
  );
}

function canOpenChat(order: OrderDetail) {
  if (isCheckoutPending(order)) return false;
  if (isWaitingForCreator(order)) return false;
  if (isTerminalStatus(order.status)) return false;

  return (
    order.payment_status === "captured" ||
    order.status === "accepted_captured" ||
    order.status === "in_progress" ||
    order.status === "delivered" ||
    order.status === "revision_requested"
  );
}

function normalizeFulfillmentType(
  value: string | null | undefined
): FulfillmentType {
  if (value === "product_shipping") return "product_shipping";
  if (value === "visit") return "visit";
  return "material_provided";
}

function normalizePreparationStatus(
  value: string | null | undefined
): PreparationStatus {
  const allowed: PreparationStatus[] = [
    "not_started",
    "waiting_materials",
    "materials_provided",
    "materials_confirmed",
    "waiting_shipping_address",
    "waiting_shipment",
    "shipped",
    "received",
    "waiting_schedule",
    "schedule_confirmed",
    "ready_to_start",
  ];

  return allowed.includes(value as PreparationStatus)
    ? (value as PreparationStatus)
    : "ready_to_start";
}

function isPreparationReady(order: OrderDetail) {
  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);
  const preparationStatus = normalizePreparationStatus(order.preparation_status);

  if (preparationStatus === "ready_to_start") return true;

  if (fulfillmentType === "material_provided") {
    return preparationStatus === "materials_confirmed";
  }

  if (fulfillmentType === "product_shipping") {
    return preparationStatus === "received";
  }

  if (fulfillmentType === "visit") {
    // 来店型は日時をDBで固定登録せず、チャットで調整する前提。
    // 受注後は実施完了後に納品へ進める。
    return true;
  }

  return true;
}

function canConfirmMaterials(order: OrderDetail) {
  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);

  if (fulfillmentType !== "material_provided") return false;
  if (order.payment_status !== "captured") return false;
  if (order.materials_confirmed_at) return false;

  return order.status === "accepted_captured" || order.status === "in_progress";
}

function canShareShippingAddress(order: OrderDetail) {
  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);

  if (fulfillmentType !== "product_shipping") return false;
  if (order.payment_status !== "captured") return false;

  return order.status === "accepted_captured" || order.status === "in_progress";
}

function canMarkProductReceived(order: OrderDetail) {
  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);

  if (fulfillmentType !== "product_shipping") return false;
  if (order.payment_status !== "captured") return false;
  if (!order.shipping_address_shared_at) return false;
  if (order.received_at) return false;

  return order.status === "accepted_captured" || order.status === "in_progress";
}

function getInitialShippingAddress(order: OrderDetail | null): ShippingAddressForm {
  const raw = order?.preparation_data?.shipping_address;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return EMPTY_SHIPPING_ADDRESS;
  }

  return {
    recipient_name:
      typeof raw.recipient_name === "string" ? raw.recipient_name : "",
    postal_code: typeof raw.postal_code === "string" ? raw.postal_code : "",
    prefecture: typeof raw.prefecture === "string" ? raw.prefecture : "",
    city: typeof raw.city === "string" ? raw.city : "",
    address_line1:
      typeof raw.address_line1 === "string" ? raw.address_line1 : "",
    address_line2:
      typeof raw.address_line2 === "string" ? raw.address_line2 : "",
    phone_number:
      typeof raw.phone_number === "string" ? raw.phone_number : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
  };
}

function fulfillmentLabel(
  value: string | null | undefined,
  locale: "ja" | "en"
) {
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

function transferLabel(value: string | null, locale: "ja" | "en") {
  const status = value || "not_started";

  if (locale === "ja") {
    if (status === "transferred") return "反映済み";
    if (status === "pending") return "確認中";
    if (status === "failed") return "運営が確認中";
    return "完了後に反映";
  }

  if (status === "transferred") return "Reflected";
  if (status === "pending") return "Checking";
  if (status === "failed") return "Support is checking";
  return "After completion";
}

function normalizePrAccountInput(value: string | null | undefined) {
  return (value ?? "").replace(/^[@＠]+/g, "").replace(/\s+/g, "").trim();
}

function normalizeHashtagInput(value: string) {
  return value.replace(/^[#＃]+/g, "").replace(/\s+/g, "").trim();
}

function getCleanHashtags(values: string[] | null | undefined) {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeHashtagInput(String(value ?? ""));
    if (!normalized) continue;

    const key = normalized.toLowerCase();

    if (key === "pr" || key === "ad" || key === "sponsored") continue;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function buildPrCopyText(order: OrderDetail) {
  const mainCopy = order.pr_copy_text?.trim();

  if (mainCopy) {
    return mainCopy;
  }

  const account = normalizePrAccountInput(order.pr_account);
  const hashtags = getCleanHashtags(order.pr_hashtags);

  const lines: string[] = [];

  if (account) {
    lines.push(`PR@${account}`);
  }

  if (hashtags.length > 0) {
    lines.push(hashtags.map((tag) => `#${tag}`).join(" "));
  }

  return lines.join("\n").trim();
}

function extractRequirementSection(
  requirements: string | null | undefined,
  sectionTitle: string
) {
  const text = requirements?.trim();

  if (!text) return "";

  const marker = `【${sectionTitle}】`;
  const start = text.indexOf(marker);

  if (start < 0) return "";

  const rest = text.slice(start + marker.length).trim();
  const nextSection = rest.search(/\n\n【.+?】/);

  return (nextSection >= 0 ? rest.slice(0, nextSection) : rest).trim();
}

function firstLine(value: string | null | undefined) {
  return (
    (value ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)[0] ?? ""
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-5 w-5 text-slate-400 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M7 7.5A2.5 2.5 0 0 1 9.5 5h5A2.5 2.5 0 0 1 17 7.5v5A2.5 2.5 0 0 1 14.5 15h-5A2.5 2.5 0 0 1 7 12.5v-5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.5 12H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M8 12a3 3 0 0 1 0-4l2-2a3 3 0 1 1 4 4l-1 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8a3 3 0 0 1 0 4l-2 2a3 3 0 1 1-4-4l1-1"
        stroke="currentColor"
        strokeWidth="1.8"
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

function PackageIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 7.2 10 4l6 3.2v5.7L10 16l-6-3.1V7.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 7.5 10 10.5l5.5-3M10 10.5V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M5 4v2M15 4v2M4 8h12M5.5 5h9A2.5 2.5 0 0 1 17 7.5v7A2.5 2.5 0 0 1 14.5 17h-9A2.5 2.5 0 0 1 3 14.5v-7A2.5 2.5 0 0 1 5.5 5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] bg-white shadow-[0_12px_34px_rgba(15,23,42,0.045)] ring-1 ring-slate-100 ${className}`}
    >
      {children}
    </section>
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
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-[11px] font-black text-slate-400">
        {label}
      </span>
      <div
        className={`min-w-0 text-right text-sm ${
          strong ? "font-black text-slate-950" : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PlainTextBox({
  value,
  emptyLabel,
}: {
  value: string | null | undefined;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-slate-50/65 p-4">
      <p className="whitespace-pre-line break-words text-sm font-semibold leading-7 text-slate-700">
        {value?.trim() || emptyLabel}
      </p>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = "solid",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "solid" | "soft";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        variant === "soft"
          ? "w-full rounded-full bg-white px-5 py-3.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          : "w-full rounded-full bg-[#ff5f67] px-5 py-3.5 text-sm font-black text-white shadow-[0_14px_28px_rgba(255,95,103,0.2)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {children}
    </button>
  );
}

function ShippingInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-500">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className="mt-2 w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[16px] font-semibold leading-7 text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-50"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[16px] font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-50"
        />
      )}
    </label>
  );
}

function AccordionItem({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left"
      >
        <div className="min-w-0">
          <p className="text-[15px] font-black text-slate-950">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold leading-6 text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>

        <ChevronIcon open={open} />
      </button>

      {open ? <div className="px-5 pb-4">{children}</div> : null}
    </div>
  );
}

function ReferenceGallery({
  assets,
  loading,
  selectedIndex,
  onSelect,
  openLabel,
  fileLabel,
}: {
  assets: ReferenceAsset[];
  loading: boolean;
  selectedIndex: number;
  onSelect: (index: number) => void;
  openLabel: string;
  fileLabel: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (loading && assets.length === 0) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50">
        <div className="h-[210px] animate-pulse bg-gradient-to-br from-slate-100 via-white to-slate-100" />
      </div>
    );
  }

  if (assets.length === 0) return null;

  const safeIndex = Math.min(selectedIndex, Math.max(assets.length - 1, 0));

  const scrollToIndex = (index: number) => {
    onSelect(index);

    const container = scrollRef.current;
    const target = container?.children[index] as HTMLElement | undefined;

    target?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  const handleScroll = () => {
    const container = scrollRef.current;

    if (!container) return;

    const width = container.clientWidth;
    if (!width) return;

    const index = Math.round(container.scrollLeft / width);
    const safeNextIndex = Math.min(Math.max(index, 0), assets.length - 1);

    if (safeNextIndex !== safeIndex) {
      onSelect(safeNextIndex);
    }
  };

  return (
    <div className="space-y-2.5">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="trendre-scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth"
      >
        {assets.map((asset) => {
          const isImage = asset.file_type === "image";

          return (
            <div
              key={asset.id}
              className="relative h-[210px] min-w-full snap-center overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50"
            >
              {isImage && asset.signed_url ? (
                <img
                  src={asset.signed_url}
                  alt={asset.file_name}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-slate-100 px-6 text-center">
                  <div className="rounded-[18px] bg-white px-4 py-2 text-sm font-black text-[#ff5f67] ring-1 ring-slate-200">
                    {isImage ? "IMAGE" : "PDF"}
                  </div>
                  <p className="max-w-[260px] break-words text-sm font-semibold leading-6 text-slate-500">
                    {asset.file_name || fileLabel}
                  </p>
                </div>
              )}

              {asset.signed_url ? (
                <a
                  href={asset.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur"
                >
                  <LinkIcon />
                  {openLabel}
                </a>
              ) : null}
            </div>
          );
        })}
      </div>

      {assets.length > 1 ? (
        <div className="flex justify-center gap-1.5">
          {assets.map((asset, index) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => scrollToIndex(index)}
              aria-label={`image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                index === safeIndex ? "w-5 bg-[#ff5f67]" : "w-2 bg-slate-200"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OrderSummaryBox({
  order,
  locale,
  copy,
}: {
  order: OrderDetail;
  locale: "ja" | "en";
  copy: {
    productName: string;
    summaryMenu: string;
    summaryPayout: string;
    summaryDeadline: string;
    notSet: string;
  };
}) {
  const deadline = order.creator_accept_deadline || order.deadline;

  return (
    <div className="rounded-[22px] bg-slate-50/85 p-4 ring-1 ring-slate-100">
      {order.product_name ? (
        <div className="mb-3">
          <p className="text-[11px] font-black text-slate-400">
            {copy.productName}
          </p>
          <p className="mt-1 break-words text-[15px] font-black text-slate-950">
            {order.product_name}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-black text-slate-400">
            {copy.summaryPayout}
          </p>
          <p className="mt-1 text-[15px] font-black text-slate-950">
            {formatPrice(order.creator_payout_amount, order.currency, locale)}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-black text-slate-400">
            {copy.summaryDeadline}
          </p>
          <p className="mt-1 text-[15px] font-black text-slate-950">
            {deadline ? formatDateTime(deadline, locale) : copy.notSet}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-[11px] font-black text-slate-400">
          {copy.summaryMenu}
        </p>
        <p className="mt-1 break-words text-sm font-black text-slate-900">
          {order.menu_title_snapshot || copy.notSet}
        </p>
      </div>
    </div>
  );
}

function ResponseActionBox({
  order,
  copy,
  actionLoading,
  onAccept,
  onDecline,
}: {
  order: OrderDetail;
  copy: {
    responseTitle: string;
    responseBody: string;
    accept: string;
    decline: string;
    accepting: string;
    declining: string;
  };
  actionLoading: ActionLoading;
  onAccept: () => void;
  onDecline: () => void;
}) {
  if (!isWaitingForCreator(order)) return null;

  return (
    <Surface className="overflow-hidden">
      <div className="bg-gradient-to-br from-rose-50 via-white to-white p-4 ring-1 ring-rose-50 sm:p-5">
        <p className="text-[19px] font-black tracking-[-0.05em] text-slate-950">
          {copy.responseTitle}
        </p>
        <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
          {copy.responseBody}
        </p>

        <div className="mt-4 grid gap-3">
          <PrimaryButton onClick={onAccept} disabled={actionLoading !== null}>
            {actionLoading === "accept" ? copy.accepting : copy.accept}
          </PrimaryButton>

          <PrimaryButton
            onClick={onDecline}
            disabled={actionLoading !== null}
            variant="soft"
          >
            {actionLoading === "decline" ? copy.declining : copy.decline}
          </PrimaryButton>
        </div>
      </div>
    </Surface>
  );
}

function ChatCtaBox({
  href,
  title,
  body,
  buttonLabel,
}: {
  href: string;
  title: string;
  body: string;
  buttonLabel: string;
}) {
  return (
    <Surface className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-slate-50 text-slate-700 ring-1 ring-slate-100">
          <MessageIcon />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-black tracking-[-0.04em] text-slate-950">
            {title}
          </p>
          <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
            {body}
          </p>

          <Link
            href={href}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition active:scale-[0.98]"
          >
            <MessageIcon />
            {buttonLabel}
          </Link>
        </div>
      </div>
    </Surface>
  );
}

function MaterialsConfirmActionBox({
  order,
  actionLoading,
  onConfirm,
  copy,
}: {
  order: OrderDetail;
  actionLoading: ActionLoading;
  onConfirm: () => void;
  copy: {
    materialsConfirmTitle: string;
    materialsConfirmBody: string;
    materialsConfirmButton: string;
    materialsConfirmLoading: string;
    materialsConfirmedTitle: string;
    materialsConfirmedBody: string;
  };
}) {
  if (normalizeFulfillmentType(order.fulfillment_type) !== "material_provided") {
    return null;
  }

  if (order.materials_confirmed_at) {
    return (
      <Surface className="overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-4 ring-1 ring-emerald-50 sm:p-5">
          <p className="text-[18px] font-black tracking-[-0.05em] text-slate-950">
            {copy.materialsConfirmedTitle}
          </p>
          <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
            {copy.materialsConfirmedBody}
          </p>
        </div>
      </Surface>
    );
  }

  if (!canConfirmMaterials(order)) {
    return null;
  }

  return (
    <Surface className="overflow-hidden">
      <div className="bg-gradient-to-br from-amber-50 via-white to-white p-4 ring-1 ring-amber-50 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
            <LinkIcon />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-black tracking-[-0.05em] text-slate-950">
              {copy.materialsConfirmTitle}
            </p>
            <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
              {copy.materialsConfirmBody}
            </p>

            <div className="mt-4">
              <PrimaryButton
                onClick={onConfirm}
                disabled={actionLoading !== null}
              >
                {actionLoading === "materials_confirmed"
                  ? copy.materialsConfirmLoading
                  : copy.materialsConfirmButton}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function ProductShippingActionBox({
  order,
  shippingAddress,
  setShippingAddress,
  actionLoading,
  onShareAddress,
  onReceived,
  copy,
}: {
  order: OrderDetail;
  shippingAddress: ShippingAddressForm;
  setShippingAddress: (value: ShippingAddressForm) => void;
  actionLoading: ActionLoading;
  onShareAddress: () => void;
  onReceived: () => void;
  copy: any;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const preparationStatus = normalizePreparationStatus(order.preparation_status);
  const addressShared = Boolean(order.shipping_address_shared_at);
  const canShareAddress = canShareShippingAddress(order);
  const canReceive = canMarkProductReceived(order);

  if (normalizeFulfillmentType(order.fulfillment_type) !== "product_shipping") {
    return null;
  }

  if (!canShareAddress && !addressShared) {
    return null;
  }

  const buttonLabel = addressShared
    ? copy.shippingUpdateAddress
    : copy.shippingShareAddress;

  return (
    <>
      <Surface className="overflow-hidden">
        <div className="bg-gradient-to-br from-amber-50 via-white to-white p-4 ring-1 ring-amber-50 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
              <PackageIcon />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[19px] font-black tracking-[-0.05em] text-slate-950">
                {copy.shippingAddressTitle}
              </p>
              <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
                {addressShared
                  ? copy.shippingStatusShared
                  : copy.shippingAddressBody}
              </p>

              <div className="mt-4">
                <PrimaryButton
                  onClick={() => setModalOpen(true)}
                  disabled={actionLoading !== null || !canShareAddress}
                  variant={addressShared ? "soft" : "solid"}
                >
                  {buttonLabel}
                </PrimaryButton>
              </div>
            </div>
          </div>

          {addressShared ? (
            <div className="mt-4 rounded-[20px] bg-white/80 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">
                {copy.shippingStatusShared}
              </p>

              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-slate-400">
                    {preparationStatus === "received"
                      ? copy.shippingStatusReceived
                      : preparationStatus === "shipped"
                        ? copy.shippingStatusShipped
                        : copy.shippingStatusWaitingShipment}
                  </span>
                </div>

                {order.shipping_carrier ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-400">
                      {copy.shippingCarrier}
                    </span>
                    <span className="min-w-0 truncate text-right text-xs font-black text-slate-700">
                      {order.shipping_carrier}
                    </span>
                  </div>
                ) : null}

                {order.shipping_tracking_number ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-400">
                      {copy.shippingTrackingNumber}
                    </span>
                    <span className="min-w-0 truncate text-right text-xs font-black text-slate-700">
                      {order.shipping_tracking_number}
                    </span>
                  </div>
                ) : null}

                {order.shipped_at ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-400">
                      {copy.shippedAt}
                    </span>
                    <span className="text-right text-xs font-black text-slate-700">
                      {formatDateTime(order.shipped_at, "ja")}
                    </span>
                  </div>
                ) : null}

                {order.received_at ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-400">
                      {copy.receivedAt}
                    </span>
                    <span className="text-right text-xs font-black text-slate-700">
                      {formatDateTime(order.received_at, "ja")}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {addressShared && !order.received_at ? (
            <div className="mt-4 rounded-[20px] bg-white/80 p-4 ring-1 ring-slate-100">
              <p className="text-[16px] font-black text-slate-950">
                {copy.productReceivedTitle}
              </p>
              <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
                {copy.productReceivedBody}
              </p>

              <div className="mt-3">
                <PrimaryButton
                  onClick={onReceived}
                  disabled={actionLoading !== null || !canReceive}
                >
                  {actionLoading === "received"
                    ? copy.productReceivedLoading
                    : copy.productReceivedButton}
                </PrimaryButton>
              </div>
            </div>
          ) : null}
        </div>
      </Surface>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-[520px] overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.28)] ring-1 ring-white/60 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-black tracking-[-0.05em] text-slate-950">
                  {copy.shippingAddressTitle}
                </p>
                <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
                  {copy.shippingAddressBody}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-500 transition hover:bg-slate-200"
                aria-label="close"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <ShippingInput
                label={copy.shippingRecipientName}
                value={shippingAddress.recipient_name}
                onChange={(value) =>
                  setShippingAddress({
                    ...shippingAddress,
                    recipient_name: value,
                  })
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <ShippingInput
                  label={copy.shippingPostalCode}
                  value={shippingAddress.postal_code}
                  onChange={(value) =>
                    setShippingAddress({
                      ...shippingAddress,
                      postal_code: value,
                    })
                  }
                />

                <ShippingInput
                  label={copy.shippingPrefecture}
                  value={shippingAddress.prefecture}
                  onChange={(value) =>
                    setShippingAddress({
                      ...shippingAddress,
                      prefecture: value,
                    })
                  }
                />
              </div>

              <ShippingInput
                label={copy.shippingCity}
                value={shippingAddress.city}
                onChange={(value) =>
                  setShippingAddress({
                    ...shippingAddress,
                    city: value,
                  })
                }
              />

              <ShippingInput
                label={copy.shippingAddressLine1}
                value={shippingAddress.address_line1}
                onChange={(value) =>
                  setShippingAddress({
                    ...shippingAddress,
                    address_line1: value,
                  })
                }
              />

              <ShippingInput
                label={copy.shippingAddressLine2}
                value={shippingAddress.address_line2}
                onChange={(value) =>
                  setShippingAddress({
                    ...shippingAddress,
                    address_line2: value,
                  })
                }
              />

              <ShippingInput
                label={copy.shippingPhoneNumber}
                value={shippingAddress.phone_number}
                onChange={(value) =>
                  setShippingAddress({
                    ...shippingAddress,
                    phone_number: value,
                  })
                }
              />

              <ShippingInput
                label={copy.shippingNotes}
                value={shippingAddress.notes}
                onChange={(value) =>
                  setShippingAddress({
                    ...shippingAddress,
                    notes: value,
                  })
                }
                multiline
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <PrimaryButton
                  onClick={() => setModalOpen(false)}
                  disabled={actionLoading !== null}
                  variant="soft"
                >
                  {copy.back}
                </PrimaryButton>

                <PrimaryButton
                  onClick={onShareAddress}
                  disabled={actionLoading !== null || !canShareAddress}
                >
                  {actionLoading === "shipping_address"
                    ? copy.shippingSharingAddress
                    : buttonLabel}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PreparationGuidanceBox({
  order,
  locale,
  chatHref,
  canChat,
  copy,
}: {
  order: OrderDetail;
  locale: "ja" | "en";
  chatHref: string;
  canChat: boolean;
  copy: any;
}) {
  if (isCheckoutPending(order) || isTerminalStatus(order.status)) {
    return null;
  }

  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);
  const preparationStatus = normalizePreparationStatus(order.preparation_status);
  const ready = isPreparationReady(order);
  const beforeAccept = isWaitingForCreator(order);

  let icon: ReactNode = <LinkIcon />;
  let title = "";
  let body = "";
  let detail: ReactNode = null;

  if (locale === "ja") {
    if (fulfillmentType === "material_provided") {
      icon = <LinkIcon />;
      title = beforeAccept
        ? "素材・投稿情報を確認して進める案件です"
        : ready
          ? "素材・投稿情報を確認済みです"
          : "素材・投稿情報を確認してください";
      body = beforeAccept
        ? "注文を受ける前に、参考資料・投稿条件・PR表記などを確認してください。"
        : ready
          ? "素材・投稿情報の確認が完了しています。制作と納品に進めます。"
          : "企業から届いた画像・動画・商品情報・投稿条件を確認し、問題なければ確認ボタンを押してください。";
      detail = order.materials_confirmed_at ? (
        <p className="mt-2 text-xs font-black text-slate-400">
          確認日時：{formatDateTime(order.materials_confirmed_at, locale)}
        </p>
      ) : null;
    }

    if (fulfillmentType === "product_shipping") {
      icon = <PackageIcon />;

      if (preparationStatus === "waiting_shipping_address") {
        title = beforeAccept
          ? "商品を受け取って進める案件です"
          : "配送先の共有が必要です";
        body = beforeAccept
          ? "注文を受けた後、企業と配送先・発送方法を確認してから制作を進めます。"
          : "商品を受け取るために、「配送先を入力する」ボタンから配送先を共有してください。";
      } else if (preparationStatus === "waiting_shipment") {
        title = "企業の発送を待っています";
        body = "配送先は共有済みです。企業が商品を発送するまでお待ちください。";
      } else if (preparationStatus === "shipped") {
        title = "商品の到着を待っています";
        body = "商品が届いたら内容を確認して、「商品を受け取りました」を押してください。";
      } else {
        title = ready ? "商品を確認できました" : "商品を受け取ってください";
        body = ready
          ? "商品を確認できているため、制作を進められます。"
          : "商品が届いたら、内容を確認してから制作を進めてください。";
      }
    }

    if (fulfillmentType === "visit") {
      icon = <CalendarIcon />;

      if (preparationStatus === "schedule_confirmed") {
        title = "来店日が決まっています";
        body = "来店日・場所・注意事項を確認して、当日に向けて準備してください。";
      } else {
        title = beforeAccept
          ? "チャットで来店日程を調整する案件です"
          : "チャットで来店日程を調整してください";
        body = beforeAccept
          ? "注文を受けた後、企業とチャットで来店日・場所・撮影ルールを調整して進めます。"
          : "企業とチャットで来店日・場所・撮影ルールを調整してください。";
      }

      detail = (
        <div className="mt-3 grid gap-2 rounded-[18px] bg-white/70 p-3 ring-1 ring-slate-100">
          {order.visit_scheduled_at ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-slate-400">来店日</span>
              <span className="text-right text-xs font-black text-slate-700">
                {formatDateTime(order.visit_scheduled_at, locale)}
              </span>
            </div>
          ) : null}

          {order.visit_location ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-slate-400">場所</span>
              <span className="min-w-0 truncate text-right text-xs font-black text-slate-700">
                {order.visit_location}
              </span>
            </div>
          ) : null}

          {order.visit_notes ? (
            <p className="whitespace-pre-line text-xs font-semibold leading-6 text-slate-500">
              {order.visit_notes}
            </p>
          ) : null}
        </div>
      );
    }
  } else {
    if (fulfillmentType === "material_provided") {
      icon = <LinkIcon />;
      title = beforeAccept
        ? "This order uses brand-provided materials"
        : ready
          ? "Materials confirmed"
          : "Review the brand materials";
      body = beforeAccept
        ? "Before accepting, review the reference assets, posting rules, and PR text."
        : ready
          ? "The materials have been confirmed. You can continue with the work."
          : "Review the images, videos, product information, and posting instructions, then confirm them.";
    }

    if (fulfillmentType === "product_shipping") {
      icon = <PackageIcon />;

      if (preparationStatus === "waiting_shipping_address") {
        title = beforeAccept
          ? "This order requires product shipping"
          : "Share delivery details";
        body = beforeAccept
          ? "After accepting, coordinate delivery details with the brand before starting."
          : "Use the address button to share your delivery address with the brand.";
      } else if (preparationStatus === "waiting_shipment") {
        title = "Waiting for shipment";
        body = "Your delivery address has been shared. Please wait for the brand to ship the product.";
      } else if (preparationStatus === "shipped") {
        title = "Waiting for the product";
        body = "Once the product arrives, review it and mark it as received.";
      } else {
        title = ready ? "Product received" : "Receive the product";
        body = ready
          ? "The product has been received. You can continue with the work."
          : "Review the product after it arrives, then continue with the work.";
      }
    }

    if (fulfillmentType === "visit") {
      icon = <CalendarIcon />;

      if (preparationStatus === "schedule_confirmed") {
        title = "Visit date confirmed";
        body = "Check the date, place, and notes before the visit.";
      } else {
        title = beforeAccept
          ? "This order requires visit coordination in chat"
          : "Coordinate the visit in chat";
        body = beforeAccept
          ? "After accepting, coordinate the visit date, place, and shooting rules with the brand in chat."
          : "Coordinate the visit date, place, and shooting rules with the brand in chat.";
      }
    }
  }

  return (
    <Surface className="overflow-hidden">
      <div
        className={`p-4 sm:p-5 ${
          ready
            ? "bg-gradient-to-br from-emerald-50 via-white to-white ring-1 ring-emerald-50"
            : "bg-gradient-to-br from-amber-50 via-white to-white ring-1 ring-amber-50"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white shadow-sm ring-1 ${
              ready
                ? "text-emerald-700 ring-emerald-100"
                : "text-amber-700 ring-amber-100"
            }`}
          >
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-black text-slate-400">
                {beforeAccept
                  ? copy.preparationBeforeAcceptTitle
                  : copy.preparationTitle}
              </p>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                  ready
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {ready ? copy.preparationReadyLabel : copy.preparationWaitingLabel}
              </span>
            </div>

            <p className="text-[18px] font-black tracking-[-0.05em] text-slate-950">
              {title}
            </p>
            <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
              {body}
            </p>

            {detail}

            {canChat ? (
              <Link
                href={chatHref}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition active:scale-[0.98]"
              >
                <MessageIcon />
                {copy.preparationChatButton}
              </Link>
            ) : (
              <p className="mt-3 rounded-[16px] bg-white/70 px-4 py-3 text-xs font-bold leading-6 text-slate-500 ring-1 ring-slate-100">
                {copy.preparationChatDisabled}
              </p>
            )}
          </div>
        </div>
      </div>
    </Surface>
  );
}

function DeliveryActionBox({
  order,
  copy,
  deliveryUrl,
  setDeliveryUrl,
  actionLoading,
  onDeliver,
  isRevisionRequested,
}: {
  order: OrderDetail;
  copy: any;
  deliveryUrl: string;
  setDeliveryUrl: (value: string) => void;
  actionLoading: ActionLoading;
  onDeliver: () => void;
  isRevisionRequested: boolean;
}) {
  return (
    <Surface className="overflow-hidden">
      <div className="bg-gradient-to-br from-rose-50 via-white to-white p-4 ring-1 ring-rose-50 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white text-[#ff5f67] shadow-sm ring-1 ring-rose-100">
            <LinkIcon />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-black tracking-[-0.05em] text-slate-950">
              {isRevisionRequested ? copy.redeliveryTitle : copy.deliveryTitle}
            </p>
            <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
              {copy.deliveryBody}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="url"
            value={deliveryUrl}
            onChange={(e) => setDeliveryUrl(e.target.value)}
            placeholder={copy.deliveredPostUrlPlaceholder}
            className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-50"
          />

          {order.delivered_post_url ? (
            <a
              href={order.delivered_post_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100"
            >
              <LinkIcon />
              <span className="truncate">{copy.openDeliveredUrl}</span>
            </a>
          ) : null}

          <PrimaryButton onClick={onDeliver} disabled={actionLoading !== null}>
            {actionLoading === "deliver"
              ? copy.delivering
              : isRevisionRequested
                ? copy.redeliver
                : order.delivered_post_url
                  ? copy.updateDelivery
                  : copy.deliver}
          </PrimaryButton>
        </div>
      </div>
    </Surface>
  );
}

function getPassiveNoticeCopy(order: OrderDetail, locale: "ja" | "en") {
  if (locale === "ja") {
    if (isCheckoutPending(order)) {
      return {
        title: "注文の準備中です",
        body: "企業側の確認が完了すると、対応するか選べるようになります。",
      };
    }

    if (order.status === "delivered") {
      return {
        title: "企業の確認を待っています",
        body: "送信したURLの確認が完了するまでお待ちください。",
      };
    }

    if (order.status === "completed") {
      return {
        title: "注文が完了しました",
        body: "お疲れさまでした。報酬の状況は報酬ページで確認できます。",
      };
    }

    return {
      title: "注文を確認しています",
      body: "少し時間をおいて再度ご確認ください。",
    };
  }

  if (isCheckoutPending(order)) {
    return {
      title: "Preparing this order",
      body: "You will be able to respond once the brand confirmation is complete.",
    };
  }

  if (order.status === "delivered") {
    return {
      title: "Waiting for brand review",
      body: "Please wait while the brand reviews your submitted URL.",
    };
  }

  if (order.status === "completed") {
    return {
      title: "This order is complete",
      body: "Great work. You can check payout status from your payouts page.",
    };
  }

  return {
    title: "Checking this order",
    body: "Please check again in a moment.",
  };
}

function PassiveNoticeBox({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Surface className="p-4 sm:p-5">
      <p className="text-[17px] font-black tracking-[-0.04em] text-slate-950">
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
        {body}
      </p>
    </Surface>
  );
}

export default function CreatorOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const mountedRef = useRef(true);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            notFound: "注文が見つかりませんでした。",
            back: "戻る",

            orderContent: "注文内容",

            preparationTitle: "開始前に必要なこと",
            preparationBeforeAcceptTitle: "受ける前に確認",
            preparationChatButton: "企業と相談する",
            preparationChatDisabled:
              "注文を受けると、企業とチャットで相談できるようになります。",
            preparationReadyLabel: "進められます",
            preparationWaitingLabel: "準備が必要",

            materialsConfirmTitle: "素材・投稿情報を確認してください",
            materialsConfirmBody:
              "企業から届いた素材、投稿条件、PR表記、注意事項を確認し、問題なければ確認完了にしてください。",
            materialsConfirmButton: "素材・投稿情報を確認しました",
            materialsConfirmLoading: "更新中...",
            materialsConfirmConfirm:
              "素材・投稿情報を確認済みにしますか？確認後、納品に進めるようになります。",
            materialsConfirmFailed:
              "素材確認の更新に失敗しました。時間を置いて再度お試しください。",
            materialsConfirmedTitle: "素材・投稿情報を確認済みです",
            materialsConfirmedBody:
              "この注文は制作・納品に進める状態です。",

            shippingAddressTitle: "配送先を共有する",
            shippingAddressBody:
              "商品を受け取るための配送先を入力してください。企業側に共有されます。",
            shippingRecipientName: "宛名",
            shippingPostalCode: "郵便番号",
            shippingPrefecture: "都道府県",
            shippingCity: "市区町村",
            shippingAddressLine1: "番地・建物名",
            shippingAddressLine2: "部屋番号など",
            shippingPhoneNumber: "電話番号",
            shippingNotes: "配送メモ",
            shippingShareAddress: "配送先を共有する",
            shippingUpdateAddress: "配送先を更新する",
            shippingSharingAddress: "共有中...",
            shippingAddressRequired: "配送先を入力してください。",
            shippingAddressConfirm:
              "この配送先を企業に共有しますか？企業が商品を発送するために使用します。",
            shippingAddressFailed:
              "配送先を共有できませんでした。入力内容を確認してください。",
            productReceivedTitle: "商品を受け取ったら",
            productReceivedBody:
              "商品が手元に届き、内容を確認できたら押してください。押すと制作を進められる状態になります。",
            productReceivedButton: "商品を受け取りました",
            productReceivedLoading: "更新中...",
            productReceivedConfirm:
              "商品を受け取り済みにしますか？この操作後、納品に進めるようになります。",
            productReceivedFailed:
              "商品受取の更新に失敗しました。時間を置いて再度お試しください。",
            shippingStatusShared: "配送先は共有済みです",
            shippingStatusWaitingShipment: "企業の発送待ち",
            shippingStatusShipped: "発送済み",
            shippingStatusReceived: "受取済み",
            shippingCarrier: "配送会社",
            shippingTrackingNumber: "追跡番号",
            shippedAt: "発送日時",
            receivedAt: "受取日時",

            deliveryTitle: "納品する",
            redeliveryTitle: "修正版を送る",
            deliveryBody:
              "投稿URL、成果物URL、Google Driveなど、企業が確認できるURLを入力してください。",
            deliveredPostUrlPlaceholder: "https://...",
            openDeliveredUrl: "提出済みURLを開く",
            deliver: "このURLを送る",
            redeliver: "修正版を送る",
            updateDelivery: "URLを更新する",
            delivering: "送信中...",
            deliveryRequired: "確認できるURLを入力してください。",
            deliveryFailed:
              "送信できませんでした。URLを確認してもう一度お試しください。",

            accept: "注文を受ける",
            decline: "今回は辞退する",
            accepting: "承認中...",
            declining: "辞退中...",
            confirmAccept:
              "この注文を受けますか？受けると企業と準備を進められます。",
            confirmDecline:
              "この注文を辞退しますか？辞退すると、この注文は開始されません。",
            confirmDeliver: "このURLを企業に送りますか？",
            confirmRedeliver: "このURLを修正版として送りますか？",
            acceptFailed:
              "注文を受けられませんでした。時間を置いて再度お試しください。",
            declineFailed:
              "辞退できませんでした。時間を置いて再度お試しください。",
            authFailed: "ログイン情報を取得できませんでした。",

            productName: "商品・案件",
            productUrl: "商品URL",
            projectType: "進め方",
            timing: "実施タイミング",
            freeOffer: "商品提供",
            secondaryUse: "二次利用",
            yes: "あり",
            no: "なし",
            requestNote: "依頼内容",

            postInstructionTitle: "投稿に貼り付ける内容",
            postInstructionBody:
              "投稿の最後に貼り付けるアカウント表記とハッシュタグです。",
            copyPostText: "コピーする",
            copied: "コピーしました",
            postNotes: "投稿で触れてほしいこと・注意事項",

            menuAndPayout: "メニュー・報酬",
            menuTitle: "メニュー",
            deliverables: "納品物",
            price: "メニュー価格",
            payout: "受取予定",
            transfer: "報酬の反映",
            payoutPage: "報酬ページを見る",
            revisionTitle: "修正依頼",

            notSet: "未設定",
            noPostInstruction: "指定された投稿用テキストはありません。",
            referenceLoadFailed:
              "参考画像の読み込みに時間がかかっています。後でもう一度開いてください。",
            referenceOpen: "開く",
            referenceFile: "参考ファイル",

            summaryMenu: "メニュー",
            summaryPayout: "受取予定",
            summaryDeadline: "期限",

            detailSheetTitle: "注文の詳細",
            detailSheetBody: "必要な情報だけ確認できるようにまとめています。",

            responseTitle: "この注文に対応しますか？",
            responseBody:
              "内容・報酬・期限・進め方を確認して、対応できる場合は注文を受けてください。",

            chatCtaTitle: "企業に相談する",
            chatCtaBody:
              "不明点や進行中の相談がある場合は、チャットで確認できます。",
            chatCtaButton: "チャットを開く",
          }
        : {
            loading: "Loading...",
            notFound: "Order was not found.",
            back: "Back",

            orderContent: "Order details",

            preparationTitle: "Before you start",
            preparationBeforeAcceptTitle: "Before accepting",
            preparationChatButton: "Ask the brand",
            preparationChatDisabled:
              "After accepting, you can coordinate with the brand in chat.",
            preparationReadyLabel: "Ready",
            preparationWaitingLabel: "Needs setup",

            materialsConfirmTitle: "Review the provided materials",
            materialsConfirmBody:
              "Review the assets, posting conditions, PR text, and notes from the brand. Confirm them if everything is okay.",
            materialsConfirmButton: "I reviewed the materials",
            materialsConfirmLoading: "Updating...",
            materialsConfirmConfirm:
              "Mark the materials as confirmed? You will be able to continue to delivery.",
            materialsConfirmFailed:
              "Could not update material confirmation. Please try again later.",
            materialsConfirmedTitle: "Materials confirmed",
            materialsConfirmedBody:
              "This order is ready for content creation and delivery.",

            shippingAddressTitle: "Share delivery address",
            shippingAddressBody:
              "Enter the address where the brand should ship the product.",
            shippingRecipientName: "Recipient name",
            shippingPostalCode: "Postal code",
            shippingPrefecture: "Prefecture / State",
            shippingCity: "City",
            shippingAddressLine1: "Address line 1",
            shippingAddressLine2: "Address line 2",
            shippingPhoneNumber: "Phone number",
            shippingNotes: "Delivery notes",
            shippingShareAddress: "Share address",
            shippingUpdateAddress: "Update address",
            shippingSharingAddress: "Sharing...",
            shippingAddressRequired: "Please enter the delivery address.",
            shippingAddressConfirm:
              "Share this delivery address with the brand?",
            shippingAddressFailed:
              "Could not share the delivery address. Please check the details.",
            productReceivedTitle: "After receiving the product",
            productReceivedBody:
              "Tap this after the product arrives and you have checked it.",
            productReceivedButton: "I received the product",
            productReceivedLoading: "Updating...",
            productReceivedConfirm:
              "Mark this product as received? You will be able to proceed to delivery.",
            productReceivedFailed:
              "Could not update product receipt. Please try again later.",
            shippingStatusShared: "Delivery address shared",
            shippingStatusWaitingShipment: "Waiting for shipment",
            shippingStatusShipped: "Shipped",
            shippingStatusReceived: "Received",
            shippingCarrier: "Carrier",
            shippingTrackingNumber: "Tracking number",
            shippedAt: "Shipped at",
            receivedAt: "Received at",

            deliveryTitle: "Send your delivery",
            redeliveryTitle: "Send the revised URL",
            deliveryBody:
              "Enter a post URL, asset URL, Google Drive link, or another URL the brand can review.",
            deliveredPostUrlPlaceholder: "https://...",
            openDeliveredUrl: "Open submitted URL",
            deliver: "Send this URL",
            redeliver: "Send revised URL",
            updateDelivery: "Update URL",
            delivering: "Sending...",
            deliveryRequired: "Please enter a URL the brand can review.",
            deliveryFailed:
              "Could not send the URL. Please check it and try again.",

            accept: "Accept order",
            decline: "Decline this time",
            accepting: "Accepting...",
            declining: "Declining...",
            confirmAccept:
              "Accept this order? You will be able to coordinate with the brand.",
            confirmDecline:
              "Decline this order? This order will not start.",
            confirmDeliver: "Send this URL to the brand?",
            confirmRedeliver: "Send this URL as the revised delivery?",
            acceptFailed: "Could not accept this order. Please try again later.",
            declineFailed:
              "Could not decline this order. Please try again later.",
            authFailed: "Could not retrieve your login session.",

            productName: "Product",
            productUrl: "Product URL",
            projectType: "Flow",
            timing: "Timing",
            freeOffer: "Free product",
            secondaryUse: "Secondary use",
            yes: "Yes",
            no: "No",
            requestNote: "Request note",

            postInstructionTitle: "Text to paste in the post",
            postInstructionBody:
              "Account mention and hashtags to paste at the end of the post.",
            copyPostText: "Copy",
            copied: "Copied",
            postNotes: "Points and notes",

            menuAndPayout: "Menu & payout",
            menuTitle: "Menu",
            deliverables: "Deliverable",
            price: "Menu price",
            payout: "Expected",
            transfer: "Payout status",
            payoutPage: "View payouts",
            revisionTitle: "Revision request",

            notSet: "Not set",
            noPostInstruction: "No post text was specified.",
            referenceLoadFailed:
              "Reference images are taking too long to load. Please try again later.",
            referenceOpen: "Open",
            referenceFile: "Reference file",

            summaryMenu: "Menu",
            summaryPayout: "Expected",
            summaryDeadline: "Due",

            detailSheetTitle: "Order details",
            detailSheetBody:
              "Everything important is organized in one place.",

            responseTitle: "Can you take this order?",
            responseBody:
              "Review the details, payout, deadline, and workflow before accepting this order.",

            chatCtaTitle: "Ask the brand",
            chatCtaBody:
              "If anything is unclear, you can message the brand from the chat.",
            chatCtaButton: "Open chat",
          },
    [safeLocale]
  );

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAsset[]>([]);
  const [referenceAssetsLoading, setReferenceAssetsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [shippingAddress, setShippingAddress] =
    useState<ShippingAddressForm>(EMPTY_SHIPPING_ADDRESS);
  const [copied, setCopied] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
  const [openPanels, setOpenPanels] = useState({
    postText: false,
    notes: false,
    revision: false,
    order: false,
    payout: false,
  });

  const loadReferenceAssets = useCallback(
    async (targetOrderId: string, token: string) => {
      setReferenceAssetsLoading(true);

      try {
        const res = await fetchWithTimeout(
          `/api/orders/${targetOrderId}/reference-assets`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          REFERENCE_ASSET_TIMEOUT_MS,
          copy.referenceLoadFailed
        );

        const json = await res.json().catch(() => ({}));

        if (!mountedRef.current) return;

        if (!res.ok) {
          console.error("reference assets load error:", json);
          setReferenceAssets([]);
          return;
        }

        const assets = Array.isArray(json?.assets) ? json.assets : [];
        setReferenceAssets(assets);
        setSelectedAssetIndex(0);
      } catch (error) {
        console.error("reference assets load error:", error);

        if (!mountedRef.current) return;

        setReferenceAssets([]);
      } finally {
        if (mountedRef.current) {
          setReferenceAssetsLoading(false);
        }
      }
    },
    [copy.referenceLoadFailed]
  );

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const authResult: any = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        copy.authFailed
      );

      const session = authResult?.data?.session ?? null;
      const user = session?.user ?? null;
      const token = session?.access_token ?? null;

      if (authResult?.error || !user || !token) {
        setError(copy.authFailed);
        setOrder(null);
        setReferenceAssets([]);
        setLoading(false);
        return;
      }

      setAccessToken(token);

      const orderResult: any = await withTimeout(
        supabase
          .from("orders")
          .select(
            `
            id,
            status,
            payment_status,
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
            pr_account,
            pr_hashtags,
            pr_copy_text,
            post_notes,
            menu_title_snapshot,
            menu_platform_snapshot,
            menu_type_snapshot,
            menu_category_snapshot,
            menu_deliverables_snapshot,
            menu_delivery_days_snapshot,
            currency,
            menu_price_amount,
            creator_payout_amount,
            creator_accept_deadline,
            delivered_post_url,
            revision_note,
            transfer_status
          `
          )
          .eq("id", orderId)
          .eq("creator_user_id", user.id)
          .maybeSingle(),
        ORDER_TIMEOUT_MS,
        copy.notFound
      );

      if (orderResult?.error) {
        console.error("creator order detail load error:", orderResult.error);
        setError(copy.notFound);
        setOrder(null);
        setReferenceAssets([]);
        setLoading(false);
        return;
      }

      const nextOrder = (orderResult?.data as OrderDetail | null) ?? null;

      setOrder(nextOrder);
      setShippingAddress(getInitialShippingAddress(nextOrder));
      setDeliveryUrl(nextOrder?.delivered_post_url ?? "");
      setLoading(false);

      if (nextOrder?.id) {
        void loadReferenceAssets(nextOrder.id, token);
      } else {
        setReferenceAssets([]);
      }
    } catch (error) {
      console.error("creator order detail load error:", error);

      setError(error instanceof Error ? error.message : copy.notFound);
      setOrder(null);
      setReferenceAssets([]);
      setLoading(false);
    }
  }, [
    copy.authFailed,
    copy.notFound,
    loadReferenceAssets,
    orderId,
    supabase,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    void loadOrder();

    return () => {
      mountedRef.current = false;
    };
  }, [loadOrder]);

  useEffect(() => {
    if (!order) return;

    setOpenPanels({
      postText: isInProgress(order) || order.status === "revision_requested",
      notes: isInProgress(order) || order.status === "revision_requested",
      revision: order.status === "revision_requested",
      order: isWaitingForCreator(order),
      payout: order.status === "completed",
    });
  }, [order?.id, order?.status]);

  const getActionToken = async () => {
    const token =
      accessToken ??
      (await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        copy.authFailed
      ))?.data?.session?.access_token ??
      null;

    return token;
  };

  const runAction = async (type: "accept" | "decline") => {
    if (!order) return;

    const confirmMessage =
      type === "accept" ? copy.confirmAccept : copy.confirmDecline;

    if (!window.confirm(confirmMessage)) return;

    setActionLoading(type);
    setError(null);

    try {
      const token = await getActionToken();

      if (!token) {
        setError(copy.authFailed);
        setActionLoading(null);
        return;
      }

      const res = await fetchWithTimeout(
        `/api/creator/orders/${order.id}/${type}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        ACTION_TIMEOUT_MS,
        type === "accept" ? copy.acceptFailed : copy.declineFailed
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          json?.error ??
            (type === "accept" ? copy.acceptFailed : copy.declineFailed)
        );
        setActionLoading(null);
        return;
      }

      if (type === "accept") {
        router.push(`/creator/orders/${order.id}/chat`);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: any) {
      setError(
        e?.message ??
          (type === "accept" ? copy.acceptFailed : copy.declineFailed)
      );
      setActionLoading(null);
    }
  };

  const runConfirmMaterials = async () => {
    if (!order) return;

    if (!window.confirm(copy.materialsConfirmConfirm)) return;

    setActionLoading("materials_confirmed");
    setError(null);

    try {
      const token = await getActionToken();

      if (!token) {
        setError(copy.authFailed);
        setActionLoading(null);
        return;
      }

      const res = await fetchWithTimeout(
        `/api/creator/orders/${order.id}/materials-confirmed`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        ACTION_TIMEOUT_MS,
        copy.materialsConfirmFailed
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.materialsConfirmFailed);
        setActionLoading(null);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: any) {
      setError(e?.message ?? copy.materialsConfirmFailed);
      setActionLoading(null);
    }
  };

  const runShareShippingAddress = async () => {
    if (!order) return;

    if (
      !shippingAddress.recipient_name.trim() ||
      !shippingAddress.postal_code.trim() ||
      !shippingAddress.prefecture.trim() ||
      !shippingAddress.city.trim() ||
      !shippingAddress.address_line1.trim() ||
      !shippingAddress.phone_number.trim()
    ) {
      setError(copy.shippingAddressRequired);
      return;
    }

    if (!window.confirm(copy.shippingAddressConfirm)) return;

    setActionLoading("shipping_address");
    setError(null);

    try {
      const token = await getActionToken();

      if (!token) {
        setError(copy.authFailed);
        setActionLoading(null);
        return;
      }

      const res = await fetchWithTimeout(
        `/api/creator/orders/${order.id}/shipping-address`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(shippingAddress),
        },
        ACTION_TIMEOUT_MS,
        copy.shippingAddressFailed
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.shippingAddressFailed);
        setActionLoading(null);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: any) {
      setError(e?.message ?? copy.shippingAddressFailed);
      setActionLoading(null);
    }
  };

  const runMarkProductReceived = async () => {
    if (!order) return;

    if (!window.confirm(copy.productReceivedConfirm)) return;

    setActionLoading("received");
    setError(null);

    try {
      const token = await getActionToken();

      if (!token) {
        setError(copy.authFailed);
        setActionLoading(null);
        return;
      }

      const res = await fetchWithTimeout(
        `/api/creator/orders/${order.id}/received`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        ACTION_TIMEOUT_MS,
        copy.productReceivedFailed
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.productReceivedFailed);
        setActionLoading(null);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: any) {
      setError(e?.message ?? copy.productReceivedFailed);
      setActionLoading(null);
    }
  };

  const runDeliver = async () => {
    if (!order) return;

    const cleanUrl = deliveryUrl.trim();

    if (!cleanUrl) {
      setError(copy.deliveryRequired);
      return;
    }

    const confirmMessage =
      order.status === "revision_requested"
        ? copy.confirmRedeliver
        : copy.confirmDeliver;

    if (!window.confirm(confirmMessage)) return;

    setActionLoading("deliver");
    setError(null);

    try {
      const token = await getActionToken();

      if (!token) {
        setError(copy.authFailed);
        setActionLoading(null);
        return;
      }

      const res = await fetchWithTimeout(
        `/api/creator/orders/${order.id}/deliver`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            delivered_post_url: cleanUrl,
          }),
        },
        ACTION_TIMEOUT_MS,
        copy.deliveryFailed
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.deliveryFailed);
        setActionLoading(null);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: any) {
      setError(e?.message ?? copy.deliveryFailed);
      setActionLoading(null);
    }
  };

  const handleCopyPostText = async () => {
    if (!order) return;

    const text = buildPrCopyText(order);

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 overflow-x-hidden pb-28">
        <div className="h-[280px] animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
        <div className="h-[210px] animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
        <div className="h-[220px] animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="overflow-x-hidden pb-28">
        <Surface className="p-5">
          <p className="text-sm font-semibold leading-7 text-slate-600">
            {error || copy.notFound}
          </p>

          <Link
            href="/creator/requests"
            className="mt-4 inline-flex rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white"
          >
            {copy.back}
          </Link>
        </Surface>
      </div>
    );
  }

  const baseCanDeliver =
    [
      "accepted_captured",
      "in_progress",
      "delivered",
      "revision_requested",
    ].includes(order.status) && order.payment_status === "captured";

  const canDeliver = baseCanDeliver && isPreparationReady(order);
  const isRevisionRequested = order.status === "revision_requested";

  const backHref = isWaitingForCreator(order)
    ? "/creator/requests"
    : "/creator/jobs";

  const prCopyText = buildPrCopyText(order);

  const postNotes =
    order.post_notes?.trim() ||
    extractRequirementSection(order.requirements, "投稿で触れてほしいこと・注意事項");

  const projectTypeText = firstLine(
    extractRequirementSection(order.requirements, "案件タイプ")
  );

  const timingText = extractRequirementSection(order.requirements, "実施タイミング");
  const requestNote = extractRequirementSection(order.requirements, "依頼内容");

  const mediaAssets = referenceAssets;

  const safeSelectedIndex = Math.min(
    selectedAssetIndex,
    Math.max(mediaAssets.length - 1, 0)
  );

  const passiveNotice = getPassiveNoticeCopy(order, safeLocale);
  const canChat = canOpenChat(order);
  const fulfillmentType = normalizeFulfillmentType(order.fulfillment_type);
  const shouldShowPreparation =
    !isCheckoutPending(order) &&
    !isTerminalStatus(order.status) &&
    order.status !== "delivered";

  return (
    <div className="max-w-full touch-pan-y space-y-3 overflow-x-hidden overscroll-y-contain pb-28">
      <Surface className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-end">
            <Link
              href={backHref}
              className="shrink-0 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100"
            >
              {copy.back}
            </Link>
          </div>

          {referenceAssetsLoading || mediaAssets.length > 0 ? (
            <ReferenceGallery
              assets={mediaAssets}
              loading={referenceAssetsLoading}
              selectedIndex={safeSelectedIndex}
              onSelect={setSelectedAssetIndex}
              openLabel={copy.referenceOpen}
              fileLabel={copy.referenceFile}
            />
          ) : null}

          <div
            className={
              referenceAssetsLoading || mediaAssets.length > 0 ? "mt-3" : ""
            }
          >
            <OrderSummaryBox order={order} locale={safeLocale} copy={copy} />
          </div>
        </div>
      </Surface>

      {error ? (
        <Surface className="p-4">
          <p className="text-sm font-semibold leading-7 text-rose-600">
            {error}
          </p>
        </Surface>
      ) : null}

      <ResponseActionBox
        order={order}
        copy={copy}
        actionLoading={actionLoading}
        onAccept={() => void runAction("accept")}
        onDecline={() => void runAction("decline")}
      />

      {shouldShowPreparation ? (
        <PreparationGuidanceBox
          order={order}
          locale={safeLocale}
          canChat={canChat}
          chatHref={`/creator/orders/${order.id}/chat`}
          copy={copy}
        />
      ) : null}

      {fulfillmentType === "material_provided" &&
      !isWaitingForCreator(order) &&
      !isCheckoutPending(order) &&
      !isTerminalStatus(order.status) &&
      order.status !== "delivered" ? (
        <MaterialsConfirmActionBox
          order={order}
          actionLoading={actionLoading}
          onConfirm={() => void runConfirmMaterials()}
          copy={copy}
        />
      ) : null}

      {fulfillmentType === "product_shipping" &&
      !isWaitingForCreator(order) &&
      !isCheckoutPending(order) &&
      !isTerminalStatus(order.status) &&
      order.status !== "delivered" ? (
        <ProductShippingActionBox
          order={order}
          shippingAddress={shippingAddress}
          setShippingAddress={setShippingAddress}
          actionLoading={actionLoading}
          onShareAddress={() => void runShareShippingAddress()}
          onReceived={() => void runMarkProductReceived()}
          copy={copy}
        />
      ) : null}

      {canDeliver ? (
        <DeliveryActionBox
          order={order}
          copy={copy}
          deliveryUrl={deliveryUrl}
          setDeliveryUrl={setDeliveryUrl}
          actionLoading={actionLoading}
          onDeliver={() => void runDeliver()}
          isRevisionRequested={isRevisionRequested}
        />
      ) : null}

      {!isWaitingForCreator(order) && !canDeliver && !shouldShowPreparation ? (
        <PassiveNoticeBox title={passiveNotice.title} body={passiveNotice.body} />
      ) : null}

      <Surface className="overflow-hidden">
        <div className="px-5 pt-5">
          <p className="text-[19px] font-black tracking-[-0.04em] text-slate-950">
            {copy.detailSheetTitle}
          </p>
          <p className="mt-1 text-sm font-semibold leading-7 text-slate-500">
            {copy.detailSheetBody}
          </p>
        </div>

        <div className="mt-3">
          <AccordionItem
            title={copy.postInstructionTitle}
            subtitle={
              prCopyText ? prCopyText.split("\n")[0] : copy.noPostInstruction
            }
            open={openPanels.postText}
            onToggle={() =>
              setOpenPanels((prev) => ({
                ...prev,
                postText: !prev.postText,
              }))
            }
          >
            <p className="mb-3 text-sm font-semibold leading-7 text-slate-500">
              {copy.postInstructionBody}
            </p>

            <PlainTextBox
              value={prCopyText || copy.noPostInstruction}
              emptyLabel={copy.notSet}
            />

            {prCopyText ? (
              <button
                type="button"
                onClick={() => void handleCopyPostText()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition active:scale-[0.98]"
              >
                <CopyIcon />
                {copied ? copy.copied : copy.copyPostText}
              </button>
            ) : null}
          </AccordionItem>

          <AccordionItem
            title={copy.postNotes}
            subtitle={postNotes ? firstLine(postNotes) : copy.notSet}
            open={openPanels.notes}
            onToggle={() =>
              setOpenPanels((prev) => ({
                ...prev,
                notes: !prev.notes,
              }))
            }
          >
            <PlainTextBox value={postNotes} emptyLabel={copy.notSet} />
          </AccordionItem>

          {isRevisionRequested && order.revision_note ? (
            <AccordionItem
              title={copy.revisionTitle}
              subtitle={firstLine(order.revision_note) || copy.notSet}
              open={openPanels.revision}
              onToggle={() =>
                setOpenPanels((prev) => ({
                  ...prev,
                  revision: !prev.revision,
                }))
              }
            >
              <PlainTextBox value={order.revision_note} emptyLabel={copy.notSet} />
            </AccordionItem>
          ) : null}

          <AccordionItem
            title={copy.orderContent}
            subtitle={order.product_name || copy.notSet}
            open={openPanels.order}
            onToggle={() =>
              setOpenPanels((prev) => ({
                ...prev,
                order: !prev.order,
              }))
            }
          >
            <div className="divide-y divide-slate-100 rounded-[18px] border border-slate-100 bg-slate-50/55 px-4">
              <DetailRow
                label={copy.productName}
                value={order.product_name || copy.notSet}
                strong
              />

              <DetailRow
                label={copy.projectType}
                value={fulfillmentLabel(order.fulfillment_type, safeLocale)}
              />

              <DetailRow
                label={copy.productUrl}
                value={
                  order.product_url ? (
                    <a
                      href={order.product_url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-blue-600 underline underline-offset-4"
                    >
                      {order.product_url}
                    </a>
                  ) : (
                    copy.notSet
                  )
                }
              />

              <DetailRow
                label={copy.timing}
                value={timingText || copy.notSet}
              />

              <DetailRow
                label={copy.freeOffer}
                value={order.has_free_offer ? copy.yes : copy.no}
              />

              <DetailRow
                label={copy.secondaryUse}
                value={order.wants_secondary_use ? copy.yes : copy.no}
              />
            </div>

            {projectTypeText ? (
              <div className="mt-3">
                <p className="mb-2 text-xs font-black text-slate-400">
                  {safeLocale === "ja" ? "案件タイプ" : "Project type"}
                </p>
                <PlainTextBox value={projectTypeText} emptyLabel={copy.notSet} />
              </div>
            ) : null}

            {requestNote ? (
              <div className="mt-3">
                <p className="mb-2 text-xs font-black text-slate-400">
                  {copy.requestNote}
                </p>
                <PlainTextBox value={requestNote} emptyLabel={copy.notSet} />
              </div>
            ) : null}
          </AccordionItem>

          <AccordionItem
            title={copy.menuAndPayout}
            subtitle={`${order.menu_title_snapshot || copy.notSet} / ${formatPrice(
              order.creator_payout_amount,
              order.currency,
              safeLocale
            )}`}
            open={openPanels.payout}
            onToggle={() =>
              setOpenPanels((prev) => ({
                ...prev,
                payout: !prev.payout,
              }))
            }
          >
            <div className="divide-y divide-slate-100 rounded-[18px] border border-slate-100 bg-slate-50/55 px-4">
              <DetailRow
                label={copy.menuTitle}
                value={order.menu_title_snapshot || copy.notSet}
                strong
              />

              <DetailRow
                label={copy.deliverables}
                value={order.menu_deliverables_snapshot || copy.notSet}
              />

              <DetailRow
                label={copy.price}
                value={formatPrice(
                  order.menu_price_amount,
                  order.currency,
                  safeLocale
                )}
              />

              <DetailRow
                label={copy.payout}
                value={formatPrice(
                  order.creator_payout_amount,
                  order.currency,
                  safeLocale
                )}
                strong
              />

              <DetailRow
                label={copy.transfer}
                value={transferLabel(order.transfer_status, safeLocale)}
              />
            </div>

            <Link
              href="/creator/payouts"
              className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white"
            >
              {copy.payoutPage}
            </Link>
          </AccordionItem>
        </div>
      </Surface>
    </div>
  );
}