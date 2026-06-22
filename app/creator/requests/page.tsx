// File: app/creator/requests/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorCard,
  CreatorEmptyState,
  CreatorLinkButton,
  CreatorNotice,
  CreatorPage,
  CreatorSkeleton,
} from "@/app/creator/_components/CreatorDesignSystem";

type ChatReadRow = {
  user_id: string;
  last_read_at: string | null;
};

type ChatRow = {
  id: string;
  request_id?: string | null;
  order_id?: string | null;
  last_message_at: string | null;
  chat_reads?: ChatReadRow[] | null;
};

type LegacyRequestRow = {
  id: string;
  created_at: string;
  status: string | null;
  product_name: string | null;
  deadline: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  product_name: string | null;
  deadline: string | null;
  menu_title_snapshot: string | null;
  creator_payout_amount: number | null;
  currency: string | null;
  creator_accept_deadline: string | null;
};

type PendingItem =
  | {
      kind: "order";
      id: string;
      created_at: string;
      status: string;
      payment_status: string;
      product_name: string | null;
      deadline: string | null;
      menu_title: string | null;
      creator_payout_amount: number | null;
      currency: string | null;
      creator_accept_deadline: string | null;
      chat: ChatRow | null;
    }
  | {
      kind: "legacy_request";
      id: string;
      created_at: string;
      status: string | null;
      payment_status: null;
      product_name: string | null;
      deadline: string | null;
      menu_title: null;
      creator_payout_amount: null;
      currency: "JPY";
      creator_accept_deadline: null;
      chat: ChatRow | null;
    };

const AUTH_TIMEOUT_MS = 8000;
const ORDER_TIMEOUT_MS = 10000;
const LEGACY_TIMEOUT_MS = 5000;
const CHAT_TIMEOUT_MS = 5000;

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

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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
  if (value == null) {
    return locale === "ja" ? "未設定" : "Not set";
  }

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    return `¥${value.toLocaleString()}`;
  }
}

function getDeadlineTime(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  return time;
}

function isWithinHours(value: string | null | undefined, hours: number) {
  const time = getDeadlineTime(value);

  if (!time) return false;

  const diff = time - Date.now();

  return diff > 0 && diff <= hours * 60 * 60 * 1000;
}

function isExpired(value: string | null | undefined) {
  const time = getDeadlineTime(value);

  if (!time) return false;

  return time <= Date.now();
}

function getUrgencyScore(item: PendingItem) {
  if (item.kind !== "order") return 9999999999999;

  const deadlineTime = getDeadlineTime(item.creator_accept_deadline);

  if (!deadlineTime) return 9999999999999;

  return deadlineTime;
}

function isUnreadForUser(chat: ChatRow | null, userId: string | null) {
  if (!userId) return false;
  if (!chat?.last_message_at) return false;

  const readRow =
    chat.chat_reads?.find((row) => row.user_id === userId) ?? null;

  if (!readRow?.last_read_at) return true;

  return (
    new Date(chat.last_message_at).getTime() >
    new Date(readRow.last_read_at).getTime()
  );
}

function getAcceptDeadlineLabel(
  value: string | null | undefined,
  locale: "ja" | "en"
) {
  if (!value) return null;

  if (isExpired(value)) {
    return locale === "ja" ? "返答期限切れ" : "Expired";
  }

  return locale === "ja"
    ? `返答期限 ${formatDateTime(value, locale)}`
    : `Reply by ${formatDateTime(value, locale)}`;
}

function getItemHref(item: PendingItem) {
  return item.kind === "order"
    ? `/creator/orders/${item.id}`
    : `/creator/requests/${item.id}`;
}

function OrderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoadingView() {
  return (
    <CreatorPage>
      <CreatorSkeleton className="h-9" />
      <CreatorSkeleton className="h-28" />
      <CreatorSkeleton className="h-24" />
      <CreatorSkeleton className="h-24" />
      <CreatorSkeleton className="h-24" />
    </CreatorPage>
  );
}

function RequestStyle() {
  return (
    <style jsx global>{`
      @keyframes trendreRequestBubbleFloat {
        0%,
        100% {
          transform: translate3d(0, 0, 0);
        }
        50% {
          transform: translate3d(0, -3px, 0);
        }
      }

      .trendre-request-bubble {
        animation: trendreRequestBubbleFloat 2.4s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .trendre-request-bubble {
          animation: none;
        }
      }
    `}</style>
  );
}

function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <span className="trendre-request-bubble relative inline-flex items-center rounded-full bg-rose-50 px-3.5 py-2 text-[13px] font-semibold text-[#ff3860] ring-1 ring-rose-100">
      <span className="absolute -left-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-r-[8px] border-y-transparent border-r-rose-50" />
      {children}
    </span>
  );
}

function IconBubble({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-[17px] ring-1 ${
        active
          ? "bg-rose-50 text-[#ff3860] ring-rose-100"
          : "bg-slate-50 text-slate-500 ring-slate-100"
      }`}
    >
      {children}
    </span>
  );
}

function StatusPill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "rose" | "amber" | "blue" | "slate";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-[#ff3860] ring-rose-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 ring-blue-100"
          : "bg-slate-50 text-slate-600 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${toneClass}`}
    >
      {children}
    </span>
  );
}

function CompactLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-2 text-[12px] leading-5 first:border-t-0">
      <span className="shrink-0 font-semibold text-slate-500">{label}</span>
      <span
        className={`min-w-0 truncate text-right ${
          strong ? "font-semibold text-slate-950" : "font-medium text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function HeaderSummary({
  count,
  unreadCount,
  copy,
  locale,
}: {
  count: number;
  unreadCount: number;
  copy: {
    title: string;
    subtitle: string;
    actionBubble: string;
    actionBody: string;
    unreadLabel: string;
    unreadSuffix: string;
    noOrdersShort: string;
  };
  locale: "ja" | "en";
}) {
  const hasOrders = count > 0;

  return (
    <section className="px-1 pt-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-[-0.045em] text-slate-950">
            {copy.title}
          </h1>
          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            {copy.subtitle}
          </p>
        </div>

        {unreadCount > 0 ? (
          <StatusPill tone="blue">
            {copy.unreadLabel} {unreadCount}
            {locale === "ja" ? copy.unreadSuffix : ""}
          </StatusPill>
        ) : null}
      </div>

      {hasOrders ? (
        <div className="mt-4 rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-100">
          <div className="flex items-start gap-3">
            <IconBubble active>
              <OrderIcon />
            </IconBubble>

            <div className="min-w-0 flex-1">
              <SpeechBubble>{copy.actionBubble}</SpeechBubble>
              <p className="mt-3 text-[13px] font-medium leading-6 text-slate-600">
                {copy.actionBody}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-[18px] bg-white px-4 py-3 text-[12px] font-medium leading-5 text-slate-500 ring-1 ring-slate-100">
          {copy.noOrdersShort}
        </p>
      )}
    </section>
  );
}

function OrderCard({
  item,
  locale,
  copy,
  unread,
  urgent,
}: {
  item: PendingItem;
  locale: "ja" | "en";
  copy: {
    unnamedProduct: string;
    orderDate: string;
    menu: string;
    payout: string;
    newMessage: string;
    checkDetail: string;
    replyLimit: string;
  };
  unread: boolean;
  urgent: boolean;
}) {
  const href = getItemHref(item);
  const acceptDeadline =
    item.kind === "order"
      ? getAcceptDeadlineLabel(item.creator_accept_deadline, locale)
      : null;

  return (
    <Link href={href} className="block">
      <article className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-100 transition active:scale-[0.99]">
        <div className="flex items-start gap-3">
          <IconBubble active={unread || urgent}>
            <OrderIcon />
          </IconBubble>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {unread ? <StatusPill tone="blue">{copy.newMessage}</StatusPill> : null}
              {urgent && acceptDeadline ? (
                <StatusPill tone="amber">{acceptDeadline}</StatusPill>
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[16px] font-semibold leading-tight tracking-[-0.035em] text-slate-950">
                  {item.product_name || copy.unnamedProduct}
                </h2>
                <p className="mt-1 text-[12px] font-medium text-slate-500">
                  {copy.orderDate}：{formatDate(item.created_at, locale)}
                </p>
              </div>

              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                <ChevronIcon />
              </span>
            </div>

            {item.kind === "order" ? (
              <div className="mt-3">
                <CompactLine label={copy.menu} value={item.menu_title || "-"} />
                <CompactLine
                  label={copy.payout}
                  value={formatPrice(
                    item.creator_payout_amount,
                    item.currency,
                    locale
                  )}
                  strong
                />
                {acceptDeadline ? (
                  <CompactLine label={copy.replyLimit} value={acceptDeadline} />
                ) : null}
              </div>
            ) : (
              <p className="mt-3 border-t border-slate-100 pt-3 text-[13px] font-medium leading-6 text-slate-600">
                {copy.checkDetail}
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function CreatorRequestsPage() {
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const mountedRef = useRef(true);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "注文",
            subtitle: "受ける前の注文を確認できます。",
            actionBubble: "注文を確認しましょう",
            actionBody:
              "内容・報酬・実施条件を確認して、受けるか判断できます。",
            noOrdersShort: "新しい注文が届くと、ここに表示されます。",
            fetchError: "注文の取得に失敗しました。",
            partialFetchError:
              "一部の情報を取得できませんでした。注文自体は表示できる範囲で表示しています。",
            authTimeout:
              "ログイン情報の取得に時間がかかっています。ページを再読み込みしてください。",
            unnamedProduct: "商品名未設定",
            orderDate: "注文日",
            menu: "メニュー",
            payout: "受取予定",
            replyLimit: "返答期限",
            empty: "届いている注文はありません",
            emptyBody: "新しい注文が届くとここに表示されます。",
            profileCta: "プロフィールを整える",
            newMessage: "新着メッセージ",
            checkDetail: "内容を確認してください",
            errorTitle: "エラー",
            noticeTitle: "一部読み込みに失敗しました",
            unreadLabel: "新着",
            unreadSuffix: "件",
          }
        : {
            title: "Orders",
            subtitle: "Review orders before accepting.",
            actionBubble: "Review your order",
            actionBody:
              "Check the details, payout, and requirements before deciding.",
            noOrdersShort: "New orders will appear here.",
            fetchError: "Failed to load orders.",
            partialFetchError:
              "Some information could not be loaded. Showing available orders.",
            authTimeout:
              "Loading your login session is taking too long. Please reload the page.",
            unnamedProduct: "No product name",
            orderDate: "Order date",
            menu: "Menu",
            payout: "Expected",
            replyLimit: "Reply by",
            empty: "No incoming orders",
            emptyBody: "New orders will appear here.",
            profileCta: "Update profile",
            newMessage: "New message",
            checkDetail: "Check details",
            errorTitle: "Error",
            noticeTitle: "Partial loading issue",
            unreadLabel: "New",
            unreadSuffix: "",
          },
    [safeLocale]
  );

  const [items, setItems] = useState<PendingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadLegacyRequests = useCallback(async () => {
    try {
      const legacyRes = await fetchWithTimeout(
        "/api/creator/requests",
        {
          credentials: "include",
          cache: "no-store",
        },
        LEGACY_TIMEOUT_MS,
        "legacy creator requests timeout"
      );

      const legacyJson = await legacyRes.json().catch(() => null);

      if (!legacyRes.ok) {
        console.warn("legacy creator requests load skipped:", legacyJson);
        return [];
      }

      const legacyAllItems = (legacyJson?.requests ?? []) as LegacyRequestRow[];

      return legacyAllItems.filter(
        (request) => (request.status ?? "pending") === "pending"
      );
    } catch (error) {
      console.warn("legacy creator requests load skipped:", error);
      return [];
    }
  }, []);

  const loadOrders = useCallback(
    async (userId: string) => {
      const result: any = await withTimeout(
        supabase
          .from("orders")
          .select(
            `
            id,
            status,
            payment_status,
            created_at,
            product_name,
            deadline,
            menu_title_snapshot,
            creator_payout_amount,
            currency,
            creator_accept_deadline
          `
          )
          .eq("creator_user_id", userId)
          .eq("status", "authorized_pending_creator")
          .order("created_at", { ascending: false }),
        ORDER_TIMEOUT_MS,
        "creator pending orders timeout"
      );

      if (result?.error) {
        throw result.error;
      }

      return (result?.data ?? []) as unknown as OrderRow[];
    },
    [supabase]
  );

  const loadOrderChats = useCallback(
    async (orderIds: string[]) => {
      if (orderIds.length === 0) return new Map<string, ChatRow>();

      try {
        const result: any = await withTimeout(
          supabase
            .from("chats")
            .select(
              `
              id,
              order_id,
              last_message_at,
              chat_reads (
                user_id,
                last_read_at
              )
            `
            )
            .in("order_id", orderIds),
          CHAT_TIMEOUT_MS,
          "creator pending order chats timeout"
        );

        if (result?.error) {
          throw result.error;
        }

        return new Map(
          ((result?.data ?? []) as ChatRow[])
            .filter((chat) => !!chat.order_id)
            .map((chat) => [chat.order_id as string, chat])
        );
      } catch (error) {
        console.warn("creator pending order chat load skipped:", error);
        return new Map<string, ChatRow>();
      }
    },
    [supabase]
  );

  const loadLegacyChats = useCallback(
    async (legacyRequestIds: string[]) => {
      if (legacyRequestIds.length === 0) return new Map<string, ChatRow>();

      try {
        const result: any = await withTimeout(
          supabase
            .from("chats")
            .select(
              `
              id,
              request_id,
              last_message_at,
              chat_reads (
                user_id,
                last_read_at
              )
            `
            )
            .in("request_id", legacyRequestIds),
          CHAT_TIMEOUT_MS,
          "creator pending legacy chats timeout"
        );

        if (result?.error) {
          throw result.error;
        }

        return new Map(
          ((result?.data ?? []) as ChatRow[])
            .filter((chat) => !!chat.request_id)
            .map((chat) => [chat.request_id as string, chat])
        );
      } catch (error) {
        console.warn("creator pending legacy chat load skipped:", error);
        return new Map<string, ChatRow>();
      }
    },
    [supabase]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const authResult: any = await withTimeout(
        supabase.auth.getUser(),
        AUTH_TIMEOUT_MS,
        copy.authTimeout
      );

      const user = authResult?.data?.user ?? null;
      const userError = authResult?.error ?? null;

      if (userError || !user) {
        setError(copy.fetchError);
        setItems([]);
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(user.id);

      const [ordersSettled, legacySettled] = await Promise.allSettled([
        loadOrders(user.id),
        loadLegacyRequests(),
      ]);

      let orders: OrderRow[] = [];
      let legacyPendingRows: LegacyRequestRow[] = [];

      if (ordersSettled.status === "fulfilled") {
        orders = ordersSettled.value;
      } else {
        console.error("creator order list load error:", ordersSettled.reason);
        setError(copy.fetchError);
      }

      if (legacySettled.status === "fulfilled") {
        legacyPendingRows = legacySettled.value;
      } else {
        console.warn("legacy requests skipped:", legacySettled.reason);
        setNotice(copy.partialFetchError);
      }

      const orderIds = orders.map((order) => order.id);
      const legacyRequestIds = legacyPendingRows.map((request) => request.id);

      const [orderChatMap, legacyChatMap] = await Promise.all([
        loadOrderChats(orderIds),
        loadLegacyChats(legacyRequestIds),
      ]);

      const legacyPendingItems: PendingItem[] = legacyPendingRows.map(
        (request): PendingItem => ({
          kind: "legacy_request",
          id: request.id,
          created_at: request.created_at,
          status: request.status ?? "pending",
          payment_status: null,
          product_name: request.product_name,
          deadline: request.deadline,
          menu_title: null,
          creator_payout_amount: null,
          currency: "JPY",
          creator_accept_deadline: null,
          chat: legacyChatMap.get(request.id) ?? null,
        })
      );

      const orderItems: PendingItem[] = orders.map(
        (order): PendingItem => ({
          kind: "order",
          id: order.id,
          created_at: order.created_at,
          status: order.status,
          payment_status: order.payment_status,
          product_name: order.product_name,
          deadline: order.deadline,
          menu_title: order.menu_title_snapshot,
          creator_payout_amount: order.creator_payout_amount,
          currency: order.currency,
          creator_accept_deadline: order.creator_accept_deadline,
          chat: orderChatMap.get(order.id) ?? null,
        })
      );

      const nextItems = [...orderItems, ...legacyPendingItems].sort((a, b) => {
        const aUnread = isUnreadForUser(a.chat, user.id) ? 1 : 0;
        const bUnread = isUnreadForUser(b.chat, user.id) ? 1 : 0;

        if (aUnread !== bUnread) return bUnread - aUnread;

        const aUrgency = getUrgencyScore(a);
        const bUrgency = getUrgencyScore(b);

        if (aUrgency !== bUrgency) return aUrgency - bUrgency;

        const aLastMessage = a.chat?.last_message_at
          ? new Date(a.chat.last_message_at).getTime()
          : 0;
        const bLastMessage = b.chat?.last_message_at
          ? new Date(b.chat.last_message_at).getTime()
          : 0;

        if (aLastMessage !== bLastMessage) {
          return bLastMessage - aLastMessage;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setItems(nextItems);
    } catch (error) {
      console.error("creator requests load error:", error);
      setError(error instanceof Error ? error.message : copy.fetchError);
      setItems([]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    copy.authTimeout,
    copy.fetchError,
    copy.partialFetchError,
    loadLegacyChats,
    loadLegacyRequests,
    loadOrderChats,
    loadOrders,
    supabase,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    void load();

    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("creator-requests-list-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          void load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_reads",
        },
        () => {
          void load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chats",
        },
        () => {
          void load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          void load();
        }
      )
      .subscribe();

    const onFocus = () => {
      void load();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, supabase]);

  if (loading) {
    return <LoadingView />;
  }

  const unreadCount = items.filter((item) =>
    isUnreadForUser(item.chat, currentUserId)
  ).length;

  return (
    <CreatorPage>
      <RequestStyle />

      <HeaderSummary
        count={items.length}
        unreadCount={unreadCount}
        copy={copy}
        locale={safeLocale}
      />

      {error ? (
        <CreatorNotice
          tone="red"
          title={copy.errorTitle}
          description={error}
        />
      ) : null}

      {notice && !error ? (
        <CreatorNotice
          tone="amber"
          title={copy.noticeTitle}
          description={notice}
        />
      ) : null}

      <section className="space-y-2.5">
        {items.map((item) => {
          const unread = isUnreadForUser(item.chat, currentUserId);
          const urgent =
            item.kind === "order" &&
            isWithinHours(item.creator_accept_deadline, 24);

          return (
            <OrderCard
              key={`${item.kind}-${item.id}`}
              item={item}
              locale={safeLocale}
              copy={copy}
              unread={unread}
              urgent={urgent}
            />
          );
        })}

        {items.length === 0 && !error ? (
          <CreatorCard className="p-0 shadow-none">
            <CreatorEmptyState
              icon={<EmptyIcon />}
              title={copy.empty}
              description={copy.emptyBody}
              action={
                <CreatorLinkButton href="/creator/profile" variant="secondary">
                  {copy.profileCta}
                </CreatorLinkButton>
              }
            />
          </CreatorCard>
        ) : null}
      </section>
    </CreatorPage>
  );
}
