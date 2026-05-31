// File: app/creator/requests/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

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

function isExpired(value: string | null | undefined) {
  const time = getDeadlineTime(value);

  if (!time) return false;

  return time <= Date.now();
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

  if (isWithinHours(value, 12)) {
    return locale === "ja"
      ? `まもなく期限 ${formatDateTime(value, locale)}`
      : `Due soon ${formatDateTime(value, locale)}`;
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

function LoadingView() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100"
        />
      ))}
    </div>
  );
}

function SoftPill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "rose" | "blue" | "amber" | "green";
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
      : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
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
    received: string;
    menu: string;
    payout: string;
    deadline: string;
    detail: string;
    newMessage: string;
    paymentReady: string;
    oldRequest: string;
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
    <Link
      href={href}
      className="block rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100 transition active:scale-[0.98]"
    >
      <div className="flex flex-wrap items-center gap-2">
        {unread ? <SoftPill tone="blue">{copy.newMessage}</SoftPill> : null}
        {urgent ? <SoftPill tone="amber">{acceptDeadline}</SoftPill> : null}
        {!urgent && acceptDeadline ? (
          <SoftPill tone="slate">{acceptDeadline}</SoftPill>
        ) : null}
        {item.kind === "order" ? (
          <SoftPill tone="green">{copy.paymentReady}</SoftPill>
        ) : (
          <SoftPill tone="slate">{copy.oldRequest}</SoftPill>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[20px] font-black leading-tight tracking-[-0.04em] text-slate-950">
            {item.product_name || copy.unnamedProduct}
          </h2>

          <p className="mt-2 text-xs font-bold text-slate-400">
            {copy.received}: {formatDateTime(item.created_at, locale)}
          </p>
        </div>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-lg font-black text-slate-400">
          ›
        </span>
      </div>

      {item.kind === "order" ? (
        <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-black text-slate-400">
                {copy.menu}
              </span>
              <span className="max-w-[62%] truncate text-right text-sm font-black text-slate-900">
                {item.menu_title || "-"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-black text-slate-400">
                {copy.payout}
              </span>
              <span className="text-right text-lg font-black tracking-[-0.03em] text-slate-950">
                {formatPrice(
                  item.creator_payout_amount,
                  item.currency,
                  locale
                )}
              </span>
            </div>
          </div>
        </div>
      ) : item.deadline ? (
        <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-black text-slate-400">
              {copy.deadline}
            </span>
            <span className="text-right text-sm font-black text-slate-900">
              {formatDate(item.deadline, locale)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white">
        {copy.detail}
      </div>
    </Link>
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
            title: "注文",
            subtitle: "届いた注文を確認して、受けるか辞退できます。",
            fetchError: "注文の取得に失敗しました。",
            unnamedProduct: "商品名未設定",
            received: "受信",
            menu: "メニュー",
            payout: "受取予定",
            deadline: "希望日",
            detail: "内容を確認する",
            empty: "届いている注文はありません",
            emptyBody: "新しい注文が届くとここに表示されます。",
            profileCta: "プロフィールを確認する",
            newMessage: "新着あり",
            paymentReady: "支払い確認済み",
            oldRequest: "依頼",
            total: "件",
            errorTitle: "エラー",
          }
        : {
            title: "Orders",
            subtitle: "Review incoming orders and accept or decline.",
            fetchError: "Failed to load orders.",
            unnamedProduct: "No product name",
            received: "Received",
            menu: "Menu",
            payout: "Expected",
            deadline: "Preferred date",
            detail: "View details",
            empty: "No incoming orders",
            emptyBody: "New orders will appear here.",
            profileCta: "Check profile",
            newMessage: "New message",
            paymentReady: "Payment ready",
            oldRequest: "Request",
            total: "",
            errorTitle: "Error",
          },
    [safeLocale]
  );

  const [items, setItems] = useState<PendingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

    if (!legacyRes.ok && orderRes.error) {
      setError(copy.fetchError);
    }

    setLoading(false);
  }, [copy.fetchError, supabase]);

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

  if (loading) {
    return <LoadingView />;
  }

  const unreadCount = items.filter((item) =>
    isUnreadForUser(item.chat, currentUserId)
  ).length;

  return (
    <div className="space-y-4 pb-4">
      <section className="relative overflow-hidden rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-rose-100/45 blur-3xl" />

        <div className="relative flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] font-black leading-tight tracking-[-0.055em] text-slate-950">
              {copy.title}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {copy.subtitle}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[30px] font-black leading-none tracking-[-0.05em] text-slate-950">
              {items.length}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {copy.total}
            </p>
          </div>
        </div>

        {unreadCount > 0 ? (
          <div className="relative mt-4">
            <SoftPill tone="blue">
              {copy.newMessage} {unreadCount}
            </SoftPill>
          </div>
        ) : null}
      </section>

      {error ? (
        <section className="rounded-[26px] bg-rose-50 p-5 text-rose-900 ring-1 ring-rose-100">
          <p className="text-sm font-black">{copy.errorTitle}</p>
          <p className="mt-2 text-sm font-semibold leading-7 opacity-75">
            {error}
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
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
          <section className="rounded-[30px] bg-white p-8 text-center shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 text-2xl">
              ◎
            </div>

            <h2 className="mt-5 text-xl font-black tracking-[-0.04em] text-slate-950">
              {copy.empty}
            </h2>

            <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-7 text-slate-500">
              {copy.emptyBody}
            </p>

            <Link
              href="/creator/profile"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
            >
              {copy.profileCta}
            </Link>
          </section>
        ) : null}
      </section>
    </div>
  );
}