// File: app/creator/requests/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getRequestStatusBadgeClass,
  getRequestStatusMeta,
} from "@/lib/i18n/requestStatus";
import { useAppLocale } from "@/lib/i18n/locale";
import DeadlineBadge from "@/app/components/DeadlineBadge";

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
  requirements: string;
  menu_title_snapshot: string | null;
  menu_price_amount: number | null;
  creator_transaction_fee_rate_bps: number | null;
  creator_transaction_fee_amount: number | null;
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
      amount: number | null;
      creator_transaction_fee_rate_bps: number | null;
      creator_transaction_fee_amount: number | null;
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
      amount: null;
      creator_transaction_fee_rate_bps: null;
      creator_transaction_fee_amount: null;
      creator_payout_amount: null;
      currency: "JPY";
      creator_accept_deadline: null;
      chat: ChatRow | null;
    };

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

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
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
    if (safeCurrency === "USD") {
      return `$${value.toLocaleString()}`;
    }

    return `¥${value.toLocaleString()}`;
  }
}

function formatRateBps(value: number | null | undefined) {
  if (value == null) return "-";
  return `${value / 100}%`;
}

function formatNegativePrice(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: "ja" | "en"
) {
  if (value == null) return locale === "ja" ? "未設定" : "Not set";
  return `-${formatPrice(value, currency, locale)}`;
}

function getOrderStatusLabel(
  status: string,
  paymentStatus: string,
  locale: "ja" | "en"
) {
  if (status === "authorized_pending_creator") {
    return locale === "ja" ? "承認待ち注文" : "Pending order approval";
  }

  if (status === "checkout_pending") {
    return locale === "ja" ? "Checkout未完了" : "Checkout pending";
  }

  if (paymentStatus === "authorized") {
    return locale === "ja" ? "支払い方法確認済み" : "Payment authorized";
  }

  return status;
}

function getOrderBadgeClass(status: string) {
  if (status === "authorized_pending_creator") {
    return "bg-slate-950 text-white ring-slate-950";
  }

  if (status === "checkout_pending") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function getDeadlineTime(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  return time;
}

function getUrgencyScore(item: PendingItem) {
  if (item.kind !== "order") return 9999999999999;

  const deadlineTime = getDeadlineTime(item.creator_accept_deadline);

  if (!deadlineTime) return 9999999999999;

  return deadlineTime;
}

function isWithinHours(value: string | null | undefined, hours: number) {
  const time = getDeadlineTime(value);
  if (!time) return false;

  const diff = time - Date.now();
  return diff > 0 && diff <= hours * 60 * 60 * 1000;
}

function HeaderStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "urgent" | "dark";
}) {
  const styles = {
    default: "bg-white text-slate-950",
    urgent: "bg-amber-50 text-slate-950",
    dark: "bg-slate-950 text-white",
  };

  return (
    <div
      className={`rounded-[24px] border border-slate-100 p-4 shadow-sm ${styles[tone]}`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.18em] ${
          tone === "dark" ? "text-white/60" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function MoneyRow({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className={`text-right ${
          strong
            ? "text-lg font-black text-emerald-700"
            : danger
            ? "text-sm font-black text-rose-600"
            : "text-sm font-bold text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function CreatorRequestsPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "承認待ち",
            subtitle:
              "新しく届いた注文・依頼を確認し、期限内に承認または辞退します。",
            fetchError: "取得に失敗しました",
            unnamedProduct: "商品名未入力",
            deadline: "希望納期",
            detail: "内容を確認する",
            empty: "承認待ちの注文・依頼はありません。",
            emptyBody:
              "新しい注文が届くとここに表示されます。通知や未読メッセージもこの画面で確認できます。",
            viewActiveJobs: "進行中案件を見る",
            editProfile: "プロフィール編集",
            order: "注文",
            legacyRequest: "旧依頼",
            paymentAuthorized: "支払い方法確認済み",
            menu: "メニュー",
            price: "価格",
            creatorFeeRate: "C側手数料率",
            transactionFee: "Trendre手数料",
            creatorPayout: "受取予定額",
            creatorDeadline: "承認期限",
            creatorDeadlineExpired: "承認期限切れ",
            notSet: "未設定",
            newMessage: "新着メッセージ",
            lastMessage: "最終メッセージ",
            urgentNotice:
              "期限が近い注文と新着メッセージがある注文を優先表示しています。",
            total: "すべて",
            urgent: "期限間近",
            unread: "未読",
            received: "受信",
            check: "確認",
            close: "閉じる",
          }
        : {
            loading: "Loading...",
            title: "Pending",
            subtitle:
              "Review new incoming orders and requests, then accept or decline before the deadline.",
            fetchError: "Failed to load requests.",
            unnamedProduct: "No product name",
            deadline: "Preferred deadline",
            detail: "View details",
            empty: "There are no pending orders or requests.",
            emptyBody:
              "New orders will appear here. Unread messages and deadlines are also shown on this screen.",
            viewActiveJobs: "View Active Jobs",
            editProfile: "Edit Profile",
            order: "Order",
            legacyRequest: "Legacy Request",
            paymentAuthorized: "Payment authorized",
            menu: "Menu",
            price: "Price",
            creatorFeeRate: "Creator fee rate",
            transactionFee: "Trendre fee",
            creatorPayout: "Expected payout",
            creatorDeadline: "Approval deadline",
            creatorDeadlineExpired: "Approval expired",
            notSet: "Not set",
            newMessage: "New messages",
            lastMessage: "Last message",
            urgentNotice:
              "Orders close to the deadline and orders with unread messages are shown first.",
            total: "Total",
            urgent: "Urgent",
            unread: "Unread",
            received: "Received",
            check: "Check",
            close: "Close",
          },
    [safeLocale]
  );

  const [items, setItems] = useState<PendingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const hasUnread = useCallback(
    (chat: ChatRow | null) => {
      if (!currentUserId) return false;
      if (!chat?.last_message_at) return false;

      const readRow =
        chat.chat_reads?.find((row) => row.user_id === currentUserId) ?? null;

      if (!readRow?.last_read_at) return true;

      return (
        new Date(chat.last_message_at).getTime() >
        new Date(readRow.last_read_at).getTime()
      );
    },
    [currentUserId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(copy.fetchError);
      setItems([]);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const [legacyRes, orderRes] = await Promise.all([
      fetch("/api/creator/requests", {
        credentials: "include",
      }),

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
          requirements,
          menu_title_snapshot,
          menu_price_amount,
          creator_transaction_fee_rate_bps,
          creator_transaction_fee_amount,
          creator_payout_amount,
          currency,
          creator_accept_deadline
        `
        )
        .eq("creator_user_id", user.id)
        .in("status", ["authorized_pending_creator", "checkout_pending"])
        .order("created_at", { ascending: false }),
    ]);

    const legacyJson = await legacyRes.json().catch(() => null);

    if (!legacyRes.ok) {
      console.error("legacy creator requests load error:", legacyJson);
    }

    if (orderRes.error) {
      console.error("creator order list load error:", orderRes.error);
    }

    const legacyAllItems = legacyRes.ok
      ? ((legacyJson?.requests ?? []) as LegacyRequestRow[])
      : [];

    const legacyPendingRows = legacyAllItems.filter(
      (request) => (request.status ?? "pending") === "pending"
    );

    const orders = (orderRes.data ?? []) as unknown as OrderRow[];

    const orderIds = orders.map((order) => order.id);
    const legacyRequestIds = legacyPendingRows.map((request) => request.id);

    let orderChatMap = new Map<string, ChatRow>();
    let legacyChatMap = new Map<string, ChatRow>();

    if (orderIds.length > 0) {
      const { data: chatRows, error: chatError } = await supabase
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
        .in("order_id", orderIds);

      if (chatError) {
        console.error("creator pending order chat load error:", chatError);
      } else {
        orderChatMap = new Map(
          ((chatRows ?? []) as ChatRow[])
            .filter((chat) => !!chat.order_id)
            .map((chat) => [chat.order_id as string, chat])
        );
      }
    }

    if (legacyRequestIds.length > 0) {
      const { data: chatRows, error: chatError } = await supabase
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
        .in("request_id", legacyRequestIds);

      if (chatError) {
        console.error("creator pending legacy chat load error:", chatError);
      } else {
        legacyChatMap = new Map(
          ((chatRows ?? []) as ChatRow[])
            .filter((chat) => !!chat.request_id)
            .map((chat) => [chat.request_id as string, chat])
        );
      }
    }

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
        amount: null,
        creator_transaction_fee_rate_bps: null,
        creator_transaction_fee_amount: null,
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
        amount: order.menu_price_amount,
        creator_transaction_fee_rate_bps:
          order.creator_transaction_fee_rate_bps,
        creator_transaction_fee_amount:
          order.creator_transaction_fee_amount,
        creator_payout_amount: order.creator_payout_amount,
        currency: order.currency,
        creator_accept_deadline: order.creator_accept_deadline,
        chat: orderChatMap.get(order.id) ?? null,
      })
    );

    const nextItems = [...orderItems, ...legacyPendingItems].sort((a, b) => {
      const aUnread = hasUnread(a.chat) ? 1 : 0;
      const bUnread = hasUnread(b.chat) ? 1 : 0;

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

    if (!legacyRes.ok && orderRes.error) {
      setError(copy.fetchError);
    }

    setLoading(false);
  }, [copy.fetchError, hasUnread, supabase]);

  useEffect(() => {
    void load();
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

  const urgentCount = items.filter(
    (item) =>
      item.kind === "order" && isWithinHours(item.creator_accept_deadline, 24)
  ).length;

  const unreadCount = items.filter((item) => hasUnread(item.chat)).length;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-32 animate-pulse rounded-[32px] bg-slate-100" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-[28px] bg-slate-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          Creator Requests
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              {copy.subtitle}
            </p>
          </div>

          <div className="text-right">
            <p className="text-5xl font-black">{items.length}</p>
            <p className="text-xs font-bold text-white/50">{copy.total}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <HeaderStat label={copy.total} value={items.length} tone="dark" />
        <HeaderStat label={copy.urgent} value={urgentCount} tone="urgent" />
        <HeaderStat label={copy.unread} value={unreadCount} />
      </section>

      {items.length > 0 ? (
        <section className="rounded-[24px] border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
          {copy.urgentNotice}
        </section>
      ) : null}

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        {items.map((item) => {
          const isOrder = item.kind === "order";
          const unread = hasUnread(item.chat);
          const isUrgent =
            item.kind === "order" &&
            isWithinHours(item.creator_accept_deadline, 24);

          const legacyMeta =
            item.kind === "legacy_request"
              ? getRequestStatusMeta(item.status ?? "pending", safeLocale)
              : null;

          const href = isOrder
            ? `/creator/orders/${item.id}`
            : `/creator/requests/${item.id}`;

          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={href}
              className={`block rounded-[30px] border bg-white p-5 shadow-sm transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md ${
                isUrgent
                  ? "border-amber-200 ring-2 ring-amber-100"
                  : unread
                  ? "border-blue-200 ring-2 ring-blue-100"
                  : "border-slate-100"
              }`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Pill
                  className={
                    isOrder
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-slate-100 text-slate-700 ring-slate-200"
                  }
                >
                  {isOrder ? copy.order : copy.legacyRequest}
                </Pill>

                {isOrder ? (
                  <Pill className={getOrderBadgeClass(item.status)}>
                    {getOrderStatusLabel(
                      item.status,
                      item.payment_status ?? "",
                      safeLocale
                    )}
                  </Pill>
                ) : legacyMeta ? (
                  <Pill className={getRequestStatusBadgeClass(legacyMeta.tone)}>
                    {legacyMeta.shortLabel}
                  </Pill>
                ) : null}

                {isOrder ? (
                  <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                    {copy.paymentAuthorized}
                  </Pill>
                ) : null}

                {unread ? (
                  <Pill className="bg-blue-50 text-blue-700 ring-blue-200">
                    {copy.newMessage}
                  </Pill>
                ) : null}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-xl font-black text-slate-950">
                    {item.product_name ?? copy.unnamedProduct}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    {copy.received}: {formatDateTime(item.created_at, safeLocale)}
                  </p>
                </div>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  ›
                </span>
              </div>

              {isOrder ? (
                <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                  <div className="grid gap-3">
                    <MoneyRow
                      label={copy.menu}
                      value={item.menu_title || copy.notSet}
                    />
                    <MoneyRow
                      label={copy.price}
                      value={formatPrice(item.amount, item.currency, safeLocale)}
                    />
                    <MoneyRow
                      label={copy.transactionFee}
                      value={formatNegativePrice(
                        item.creator_transaction_fee_amount,
                        item.currency,
                        safeLocale
                      )}
                      danger
                    />
                    <MoneyRow
                      label={copy.creatorPayout}
                      value={formatPrice(
                        item.creator_payout_amount,
                        item.currency,
                        safeLocale
                      )}
                      strong
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {isOrder ? (
                  <DeadlineBadge
                    deadline={item.creator_accept_deadline}
                    label={copy.creatorDeadline}
                    expiredLabel={copy.creatorDeadlineExpired}
                    locale={safeLocale}
                    urgentHours={12}
                    warningHours={24}
                  />
                ) : null}

                {item.deadline ? (
                  <Pill className="bg-slate-50 text-slate-700 ring-slate-200">
                    {copy.deadline}: {formatDate(item.deadline, safeLocale)}
                  </Pill>
                ) : null}

                {item.chat?.last_message_at ? (
                  <Pill className="bg-slate-50 text-slate-500 ring-slate-200">
                    {copy.lastMessage}:{" "}
                    {formatDateTime(item.chat.last_message_at, safeLocale)}
                  </Pill>
                ) : null}
              </div>

              <div className="mt-5 rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
                {copy.detail}
              </div>
            </Link>
          );
        })}

        {items.length === 0 && !error ? (
          <div className="rounded-[32px] border border-slate-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl">
              ◎
            </div>
            <h2 className="mt-5 text-xl font-black text-slate-950">
              {copy.empty}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
              {copy.emptyBody}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/creator/jobs"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
              >
                {copy.viewActiveJobs}
              </Link>
              <Link
                href="/creator/profile"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition active:scale-[0.98]"
              >
                {copy.editProfile}
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}