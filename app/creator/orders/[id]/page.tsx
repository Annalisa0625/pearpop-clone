// File: app/creator/orders/[id]/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import ChatEmbed from "@/app/components/ChatEmbed";

type OrderDetail = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string | null;

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

const AUTH_TIMEOUT_MS = 8000;
const ORDER_TIMEOUT_MS = 10000;
const REFERENCE_ASSET_TIMEOUT_MS = 8000;
const ACTION_TIMEOUT_MS = 30000;

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

function formatDateOnly(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
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

function canUseChat(order: OrderDetail) {
  if (isCheckoutPending(order)) return false;
  return !isTerminalStatus(order.status);
}

function statusLabel(order: OrderDetail, locale: "ja" | "en") {
  const status = order.status;

  if (locale === "ja") {
    if (isCheckoutPending(order)) return "支払い確認中";
    if (isWaitingForCreator(order)) return "返答待ち";
    if (isInProgress(order)) return "進行中";
    if (status === "revision_requested") return "修正対応";
    if (status === "delivered") return "確認待ち";
    if (status === "completed") return "完了";
    if (status === "declined_canceled") return "辞退済み";
    if (status === "expired_canceled") return "期限切れ";
    return "確認中";
  }

  if (isCheckoutPending(order)) return "Checking payment";
  if (isWaitingForCreator(order)) return "Pending";
  if (isInProgress(order)) return "In progress";
  if (status === "revision_requested") return "Revision";
  if (status === "delivered") return "Review";
  if (status === "completed") return "Done";
  if (status === "declined_canceled") return "Declined";
  if (status === "expired_canceled") return "Expired";
  return "Checking";
}

function statusTone(
  order: OrderDetail
): "rose" | "blue" | "amber" | "green" | "slate" {
  if (isCheckoutPending(order)) return "slate";
  if (isWaitingForCreator(order)) return "amber";
  if (order.status === "revision_requested") return "rose";
  if (isInProgress(order)) return "blue";
  if (order.status === "completed") return "green";
  return "slate";
}

function transferLabel(value: string | null, locale: "ja" | "en") {
  const status = value || "not_started";

  if (locale === "ja") {
    if (status === "transferred") return "送金済み";
    if (status === "pending") return "送金処理中";
    if (status === "failed") return "確認中";
    return "完了後に反映";
  }

  if (status === "transferred") return "Transferred";
  if (status === "pending") return "Processing";
  if (status === "failed") return "Checking";
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
  const account = normalizePrAccountInput(order.pr_account);
  const hashtags = getCleanHashtags(order.pr_hashtags);

  const lines: string[] = [];

  if (account) {
    lines.push(`PR@${account}`);
  }

  if (hashtags.length > 0) {
    lines.push(hashtags.map((tag) => `#${tag}`).join(" "));
  }

  return lines.join("\n");
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

function SoftPill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "rose" | "blue" | "amber" | "green" | "slate";
}) {
  const className =
    tone === "rose"
      ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : tone === "amber"
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : tone === "green"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : "bg-slate-50 text-slate-600 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function Surface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[30px] bg-white shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 ${className}`}
    >
      {children}
    </section>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-slate-100 bg-slate-50/75 px-4 py-3">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="shrink-0 text-xs font-black text-slate-400">
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
    <div className="rounded-[20px] border border-slate-100 bg-slate-50/65 p-4">
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
  children: React.ReactNode;
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
          ? "w-full rounded-full bg-rose-50 px-5 py-4 text-sm font-black text-[#ff5f67] ring-1 ring-rose-100 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          : "w-full rounded-full bg-[#ff5f67] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,95,103,0.22)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {children}
    </button>
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
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-[15px] font-black text-slate-950">{title}</p>
          {subtitle ? (
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-6 text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>

        <ChevronIcon open={open} />
      </button>

      {open ? <div className="px-5 pb-5">{children}</div> : null}
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
  if (loading) {
    return (
      <div className="overflow-hidden rounded-[26px] border border-slate-100 bg-slate-50">
        <div className="aspect-[4/3] animate-pulse bg-slate-100" />
      </div>
    );
  }

  if (assets.length === 0) return null;

  const safeIndex = Math.min(selectedIndex, Math.max(assets.length - 1, 0));
  const selected = assets[safeIndex];
  const isImage = selected?.file_type === "image";

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[26px] border border-slate-100 bg-slate-50">
        {selected ? (
          isImage ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
              <img
                src={selected.signed_url ?? ""}
                alt=""
                className="h-full w-full object-cover"
              />

              {selected.signed_url ? (
                <a
                  href={selected.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur"
                >
                  <LinkIcon />
                  {openLabel}
                </a>
              ) : null}
            </div>
          ) : (
            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-slate-100 px-6 text-center">
              <div className="rounded-[18px] bg-white px-4 py-2 text-sm font-black text-[#ff5f67] ring-1 ring-slate-200">
                PDF
              </div>
              <p className="max-w-[260px] text-sm font-semibold leading-6 text-slate-500">
                {fileLabel}
              </p>
              {selected.signed_url ? (
                <a
                  href={selected.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
                >
                  <LinkIcon />
                  {openLabel}
                </a>
              ) : null}
            </div>
          )
        ) : null}
      </div>

      {assets.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {assets.map((asset, index) => {
            const active = index === safeIndex;
            const thumbIsImage = asset.file_type === "image";

            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onSelect(index)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border transition ${
                  active
                    ? "border-[#ff5f67] ring-2 ring-rose-100"
                    : "border-slate-100"
                }`}
              >
                {thumbIsImage ? (
                  <img
                    src={asset.signed_url ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[11px] font-black text-[#ff5f67]">
                    PDF
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function getNextActionCopy(order: OrderDetail, locale: "ja" | "en") {
  if (locale === "ja") {
    if (isCheckoutPending(order)) {
      return {
        title: "支払い確認中です",
        body: "注文情報の確認が完了すると、返答できる状態になります。",
      };
    }

    if (isWaitingForCreator(order)) {
      return {
        title: "注文内容を確認してください",
        body: "内容を確認して、対応できる場合は注文を受けてください。",
      };
    }

    if (order.status === "revision_requested") {
      return {
        title: "修正対応が必要です",
        body: "修正内容を確認して、再度納品URLを提出してください。",
      };
    }

    if (order.status === "delivered") {
      return {
        title: "確認待ちです",
        body: "納品URLは提出済みです。確認完了までお待ちください。",
      };
    }

    if (order.status === "completed") {
      return {
        title: "この注文は完了しました",
        body: "報酬の状況は報酬ページから確認できます。",
      };
    }

    if (isInProgress(order)) {
      return {
        title: "納品を進めましょう",
        body: "制作・投稿が完了したら、納品URLを提出してください。",
      };
    }

    return {
      title: "確認中です",
      body: "注文の状態を確認しています。",
    };
  }

  if (isCheckoutPending(order)) {
    return {
      title: "Checking payment",
      body: "You will be able to respond once the order is confirmed.",
    };
  }

  if (isWaitingForCreator(order)) {
    return {
      title: "Review this order",
      body: "Review the details and accept it if you can handle it.",
    };
  }

  if (order.status === "revision_requested") {
    return {
      title: "Revision needed",
      body: "Check the revision request and submit the updated delivery URL.",
    };
  }

  if (order.status === "delivered") {
    return {
      title: "Waiting for review",
      body: "Your delivery URL has been submitted.",
    };
  }

  if (order.status === "completed") {
    return {
      title: "This order is complete",
      body: "You can check payout status from the payouts page.",
    };
  }

  if (isInProgress(order)) {
    return {
      title: "Continue delivery",
      body: "Submit the delivery URL when the work is ready.",
    };
  }

  return {
    title: "Checking",
    body: "Checking the order status.",
  };
}

export default function CreatorOrderDetailPage() {
  const params = useParams();
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
            back: "一覧へ戻る",
            chatTitle: "注文チャット",
            nextAction: "対応",
            orderContent: "注文内容",
            orderContentBody: "商品・URL・実施タイミングを確認できます。",
            deliveryTitle: "納品URLを提出",
            redeliveryTitle: "修正版の納品URLを提出",
            deliveryBody:
              "投稿URL、成果物URL、Google Drive URLなど、確認できるURLを入力してください。",
            deliveredPostUrlPlaceholder: "https://...",
            openDeliveredUrl: "提出済みURLを開く",
            deliver: "納品URLを提出する",
            redeliver: "修正版を提出する",
            updateDelivery: "納品URLを更新する",
            delivering: "送信中...",
            deliveryRequired: "納品URLを入力してください。",
            deliveryFailed: "納品処理に失敗しました。",
            accept: "注文を受ける",
            decline: "辞退する",
            accepting: "承認中...",
            declining: "辞退中...",
            confirmAccept:
              "この注文を受けますか？受けると決済が確定し、注文が開始されます。",
            confirmDecline:
              "この注文を辞退しますか？辞退すると請求は確定しません。",
            confirmDeliver: "このURLで納品しますか？",
            confirmRedeliver: "このURLで修正版を提出しますか？",
            acceptFailed: "承認処理に失敗しました。",
            declineFailed: "辞退処理に失敗しました。",
            authFailed: "ログイン情報を取得できませんでした。",
            productName: "商品・案件",
            productUrl: "商品URL",
            projectType: "案件タイプ",
            timing: "実施タイミング",
            freeOffer: "商品提供",
            secondaryUse: "二次利用",
            yes: "あり",
            no: "なし",
            requestNote: "依頼内容",
            postInstructionTitle: "投稿の最後に貼り付ける内容",
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
            transfer: "送金",
            payoutPage: "報酬ページを見る",
            revisionTitle: "修正依頼",
            notSet: "未設定",
            noPostInstruction: "指定された投稿用テキストはありません。",
            chatUnavailableTitle: "チャットは支払い確認後に使えます",
            chatUnavailableBody:
              "支払い確認が完了すると、注文チャットで詳細を相談できます。",
            referenceLoadFailed:
              "参考画像の読み込みに時間がかかっています。後でもう一度開いてください。",
            referenceOpen: "開く",
            referenceFile: "参考ファイル",
            summaryDate: "注文日",
            summaryMenu: "メニュー",
            summaryPayout: "受取予定",
            summaryStatus: "状態",
            detailSheetTitle: "注文の詳細",
            detailSheetBody: "必要な情報だけ確認できるようにまとめています。",
            openExternal: "リンクを開く",
          }
        : {
            loading: "Loading...",
            notFound: "Order was not found.",
            back: "Back",
            chatTitle: "Order chat",
            nextAction: "Action",
            orderContent: "Order details",
            orderContentBody:
              "Review the product, URL, and preferred timing.",
            deliveryTitle: "Submit delivery URL",
            redeliveryTitle: "Submit revised delivery URL",
            deliveryBody:
              "Enter a URL such as a post URL, asset URL, or Google Drive URL.",
            deliveredPostUrlPlaceholder: "https://...",
            openDeliveredUrl: "Open submitted URL",
            deliver: "Submit delivery URL",
            redeliver: "Submit revised URL",
            updateDelivery: "Update delivery URL",
            delivering: "Submitting...",
            deliveryRequired: "Please enter a delivery URL.",
            deliveryFailed: "Failed to submit delivery.",
            accept: "Accept order",
            decline: "Decline",
            accepting: "Accepting...",
            declining: "Declining...",
            confirmAccept:
              "Accept this order? Payment will be captured and the order will start.",
            confirmDecline:
              "Decline this order? The charge will not be finalized.",
            confirmDeliver: "Submit this URL as delivery?",
            confirmRedeliver: "Submit this revised URL?",
            acceptFailed: "Failed to accept this order.",
            declineFailed: "Failed to decline this order.",
            authFailed: "Could not retrieve your login session.",
            productName: "Product",
            productUrl: "Product URL",
            projectType: "Project type",
            timing: "Timing",
            freeOffer: "Free product",
            secondaryUse: "Secondary use",
            yes: "Yes",
            no: "No",
            requestNote: "Request note",
            postInstructionTitle: "Text to paste at the end",
            postInstructionBody:
              "Account mention and hashtags to paste at the end of the post.",
            copyPostText: "Copy",
            copied: "Copied",
            postNotes: "Points and notes",
            menuAndPayout: "Menu & payout",
            menuTitle: "Menu",
            deliverables: "Deliverable",
            price: "Menu price",
            payout: "Expected payout",
            transfer: "Transfer",
            payoutPage: "View payouts",
            revisionTitle: "Revision request",
            notSet: "Not set",
            noPostInstruction: "No post text was specified.",
            chatUnavailableTitle:
              "Chat will be available after payment confirmation",
            chatUnavailableBody:
              "Once payment is confirmed, you can discuss details in order chat.",
            referenceLoadFailed:
              "Reference images are taking too long to load. Please try again later.",
            referenceOpen: "Open",
            referenceFile: "Reference file",
            summaryDate: "Ordered",
            summaryMenu: "Menu",
            summaryPayout: "Payout",
            summaryStatus: "Status",
            detailSheetTitle: "Order details",
            detailSheetBody:
              "Everything important is organized in one place.",
            openExternal: "Open link",
          },
    [safeLocale]
  );

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAsset[]>([]);
  const [referenceAssetsLoading, setReferenceAssetsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    "accept" | "decline" | "deliver" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
  const [openPanels, setOpenPanels] = useState({
    postText: false,
    notes: false,
    revision: true,
    order: true,
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

  const runAction = async (type: "accept" | "decline") => {
    if (!order) return;

    const confirmMessage =
      type === "accept" ? copy.confirmAccept : copy.confirmDecline;

    if (!window.confirm(confirmMessage)) return;

    setActionLoading(type);
    setError(null);

    try {
      const token =
        accessToken ??
        (await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          copy.authFailed
        ))?.data?.session?.access_token ??
        null;

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
      const token =
        accessToken ??
        (await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          copy.authFailed
        ))?.data?.session?.access_token ??
        null;

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
        <div className="h-[420px] animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="h-[340px] animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="h-[280px] animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
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

  const canAct = isWaitingForCreator(order);
  const canDeliver =
    [
      "accepted_captured",
      "in_progress",
      "delivered",
      "revision_requested",
    ].includes(order.status) && order.payment_status === "captured";

  const isRevisionRequested = order.status === "revision_requested";
  const nextAction = getNextActionCopy(order, safeLocale);

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

  const mediaAssets = referenceAssets.filter((asset) => Boolean(asset.signed_url));
  const safeSelectedIndex = Math.min(
    selectedAssetIndex,
    Math.max(mediaAssets.length - 1, 0)
  );

  return (
    <div className="max-w-full touch-pan-y space-y-4 overflow-x-hidden overscroll-y-contain pb-28">
      <Surface className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SoftPill tone={statusTone(order)}>
                {statusLabel(order, safeLocale)}
              </SoftPill>

              {order.creator_accept_deadline && isWaitingForCreator(order) ? (
                <SoftPill tone="amber">
                  {formatDateTime(order.creator_accept_deadline, safeLocale)}
                </SoftPill>
              ) : null}
            </div>

            <Link
              href={backHref}
              className="shrink-0 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100"
            >
              {copy.back}
            </Link>
          </div>

          <div className="space-y-4">
            {mediaAssets.length > 0 ? (
              <ReferenceGallery
                assets={mediaAssets}
                loading={referenceAssetsLoading}
                selectedIndex={safeSelectedIndex}
                onSelect={setSelectedAssetIndex}
                openLabel={copy.referenceOpen}
                fileLabel={copy.referenceFile}
              />
            ) : null}

            <div>
              <h1 className="break-words text-[26px] font-black leading-tight tracking-[-0.055em] text-slate-950">
                {order.product_name || nextAction.title}
              </h1>

              <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                {nextAction.body}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat
                label={copy.summaryDate}
                value={formatDateOnly(order.created_at, safeLocale)}
              />
              <MiniStat
                label={copy.summaryMenu}
                value={order.menu_title_snapshot || copy.notSet}
              />
              <MiniStat
                label={copy.summaryPayout}
                value={formatPrice(
                  order.creator_payout_amount,
                  order.currency,
                  safeLocale
                )}
              />
              <MiniStat
                label={copy.summaryStatus}
                value={statusLabel(order, safeLocale)}
              />
            </div>
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

      {canAct ? (
        <Surface className="p-4 sm:p-5">
          <p className="text-[18px] font-black tracking-[-0.04em] text-slate-950">
            {copy.nextAction}
          </p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            {nextAction.body}
          </p>

          <div className="mt-4 grid gap-3">
            <PrimaryButton
              onClick={() => void runAction("accept")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "accept" ? copy.accepting : copy.accept}
            </PrimaryButton>

            <PrimaryButton
              onClick={() => void runAction("decline")}
              disabled={actionLoading !== null}
              variant="soft"
            >
              {actionLoading === "decline" ? copy.declining : copy.decline}
            </PrimaryButton>
          </div>
        </Surface>
      ) : null}

      {canUseChat(order) ? (
        <Surface className="overflow-hidden p-0 [&>div>div:nth-child(2)]:!h-[280px] md:[&>div>div:nth-child(2)]:!h-[340px]">
          <ChatEmbed orderId={order.id} title={copy.chatTitle} />
        </Surface>
      ) : (
        <Surface className="p-4 sm:p-5">
          <p className="text-[18px] font-black tracking-[-0.04em] text-slate-950">
            {copy.chatUnavailableTitle}
          </p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            {copy.chatUnavailableBody}
          </p>
        </Surface>
      )}

      {canDeliver ? (
        <Surface className="p-4 sm:p-5">
          <p className="text-[18px] font-black tracking-[-0.04em] text-slate-950">
            {isRevisionRequested ? copy.redeliveryTitle : copy.deliveryTitle}
          </p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            {copy.deliveryBody}
          </p>

          <div className="mt-4 space-y-3">
            <input
              type="url"
              value={deliveryUrl}
              onChange={(e) => setDeliveryUrl(e.target.value)}
              placeholder={copy.deliveredPostUrlPlaceholder}
              className="w-full rounded-[20px] border border-slate-200 px-4 py-4 text-base outline-none transition focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-50"
            />

            {order.delivered_post_url ? (
              <a
                href={order.delivered_post_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100"
              >
                <LinkIcon />
                {copy.openDeliveredUrl}
              </a>
            ) : null}

            <PrimaryButton
              onClick={() => void runDeliver()}
              disabled={actionLoading !== null}
            >
              {actionLoading === "deliver"
                ? copy.delivering
                : isRevisionRequested
                  ? copy.redeliver
                  : order.delivered_post_url
                    ? copy.updateDelivery
                    : copy.deliver}
            </PrimaryButton>
          </div>
        </Surface>
      ) : null}

      <Surface className="overflow-hidden">
        <div className="px-5 pt-5">
          <p className="text-[20px] font-black tracking-[-0.04em] text-slate-950">
            {copy.detailSheetTitle}
          </p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            {copy.detailSheetBody}
          </p>
        </div>

        <div className="mt-4">
          <AccordionItem
            title={copy.postInstructionTitle}
            subtitle={
              prCopyText
                ? prCopyText.split("\n")[0]
                : copy.noPostInstruction
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
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)] transition active:scale-[0.98]"
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
            <div className="divide-y divide-slate-100 rounded-[20px] border border-slate-100 bg-slate-50/55 px-4">
              <DetailRow
                label={copy.productName}
                value={order.product_name || copy.notSet}
                strong
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
                label={copy.projectType}
                value={projectTypeText || copy.notSet}
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

            {requestNote ? (
              <div className="mt-4">
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
            <div className="divide-y divide-slate-100 rounded-[20px] border border-slate-100 bg-slate-50/55 px-4">
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
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white"
            >
              {copy.payoutPage}
            </Link>
          </AccordionItem>
        </div>
      </Surface>
    </div>
  );
}