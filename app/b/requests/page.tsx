// File: app/b/requests/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  getRequestStatusBadgeClass,
  getRequestStatusMeta,
} from "@/lib/i18n/requestStatus";
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
  status: string;
  created_at: string;
  product_name: string | null;
  creator_user_id: string | null;
  creators: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type OrderRow = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  product_name: string | null;
  creator_id: string;
  creator_user_id: string;
  menu_title_snapshot: string | null;
  menu_price_amount: number | null;
  buyer_marketplace_fee_rate_bps: number | null;
  buyer_marketplace_fee_amount: number | null;
  buyer_total_amount: number | null;
  stripe_amount: number | null;
  currency: string | null;
  creator_accept_deadline: string | null;
};

type CreatorLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type PendingItem =
  | {
      kind: "order";
      id: string;
      created_at: string;
      product_name: string | null;
      creator_name: string;
      creator_avatar_url: string | null;
      status: string;
      payment_status: string;
      menu_title: string | null;
      amount: number | null;
      buyer_marketplace_fee_rate_bps: number | null;
      buyer_marketplace_fee_amount: number | null;
      buyer_total_amount: number | null;
      stripe_amount: number | null;
      currency: string | null;
      creator_accept_deadline: string | null;
      chat: ChatRow | null;
    }
  | {
      kind: "legacy_request";
      id: string;
      created_at: string;
      product_name: string | null;
      creator_name: string;
      creator_avatar_url: string | null;
      status: string;
      payment_status: null;
      menu_title: null;
      amount: null;
      buyer_marketplace_fee_rate_bps: null;
      buyer_marketplace_fee_amount: null;
      buyer_total_amount: null;
      stripe_amount: null;
      currency: "JPY";
      creator_accept_deadline: null;
      chat: ChatRow | null;
    };

function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-14 w-14 rounded-2xl object-cover"
      />
    );
  }

  const initial = (name?.trim()?.[0] ?? "C").toUpperCase();

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-lg font-black text-white">
      {initial}
    </div>
  );
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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
    if (safeCurrency === "USD") return `$${value.toLocaleString()}`;
    return `¥${value.toLocaleString()}`;
  }
}

function getOrderStatusLabel(
  status: string,
  paymentStatus: string,
  locale: "ja" | "en"
) {
  if (status === "authorized_pending_creator") {
    return locale === "ja"
      ? "クリエイター承認待ち"
      : "Waiting for creator approval";
  }

  if (status === "checkout_pending") {
    return locale === "ja" ? "Checkout未完了" : "Checkout pending";
  }

  if (paymentStatus === "authorized") {
    return locale === "ja" ? "支払い方法確認済み" : "Payment authorized";
  }

  return status;
}

function getPaymentStatusLabel(
  paymentStatus: string | null | undefined,
  locale: "ja" | "en"
) {
  if (paymentStatus === "authorized") {
    return locale === "ja" ? "支払い方法確認済み" : "Payment authorized";
  }

  if (paymentStatus === "captured") {
    return locale === "ja" ? "決済確定済み" : "Captured";
  }

  if (paymentStatus === "canceled") {
    return locale === "ja" ? "キャンセル済み" : "Canceled";
  }

  return paymentStatus || "-";
}

function getOrderBadgeClass(status: string) {
  if (status === "authorized_pending_creator") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  if (status === "checkout_pending") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getPaymentBadgeClass(paymentStatus: string | null | undefined) {
  if (paymentStatus === "authorized") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (paymentStatus === "captured") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (paymentStatus === "canceled") {
    return "bg-slate-100 text-slate-500 ring-slate-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
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

function isUnreadChat(chat: ChatRow | null, userId: string | null) {
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

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "dark" | "amber" | "blue";
}) {
  const styles = {
    default: "border-slate-100 bg-white text-slate-950",
    dark: "border-slate-950 bg-slate-950 text-white",
    amber: "border-amber-100 bg-amber-50 text-slate-950",
    blue: "border-blue-100 bg-blue-50 text-slate-950",
  };

  return (
    <div className={`rounded-[26px] border p-5 shadow-sm ${styles[tone]}`}>
      <p
        className={`text-xs font-black uppercase tracking-[0.2em] ${
          tone === "dark" ? "text-white/60" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-3 text-3xl font-black ${
          tone === "dark" ? "text-white" : "text-slate-950"
        }`}
      >
        {value}
      </p>
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
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
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
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className={`text-right text-sm ${
          strong ? "font-black text-slate-950" : "font-bold text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function RequestsListPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "承認待ち",
            subtitle:
              "クリエイターの承認待ち注文を確認できます。承認されると決済が確定し、案件が開始されます。",
            viewJobs: "進行中案件を見る",
            empty: "現在、承認待ちの注文はありません。",
            emptyBody:
              "新しく注文した案件や、クリエイターの承認待ち案件がここに表示されます。",
            unnamedCreator: "unknown",
            unnamedProduct: "未入力",
            sentAt: "送信日",
            menu: "メニュー",
            menuPrice: "メニュー価格",
            marketplaceFee: "Trendre手数料",
            buyerTotal: "お支払い合計",
            creatorDeadline: "承認期限",
            creatorDeadlineExpired: "承認期限切れ",
            detail: "詳細を見る",
            legacyRequest: "旧リクエスト",
            order: "注文",
            newMessage: "新着メッセージあり",
            lastMessage: "最終メッセージ",
            urgentNotice:
              "承認期限が近い注文と新着メッセージがある注文を優先表示しています。",
            total: "すべて",
            urgent: "期限間近",
            unread: "未読",
            paymentStatus: "支払い状態",
          }
        : {
            loading: "Loading...",
            title: "Pending",
            subtitle:
              "Review orders waiting for creator approval. Once accepted, the payment is captured and the job begins.",
            viewJobs: "View Active Jobs",
            empty: "There are no pending orders.",
            emptyBody:
              "Newly placed orders waiting for creator approval will appear here.",
            unnamedCreator: "unknown",
            unnamedProduct: "Not entered",
            sentAt: "Sent At",
            menu: "Menu",
            menuPrice: "Menu price",
            marketplaceFee: "Trendre fee",
            buyerTotal: "Payment total",
            creatorDeadline: "Approval deadline",
            creatorDeadlineExpired: "Approval expired",
            detail: "View Details",
            legacyRequest: "Legacy Request",
            order: "Order",
            newMessage: "New messages",
            lastMessage: "Last message",
            urgentNotice:
              "Orders close to the creator approval deadline and orders with unread messages are shown first.",
            total: "Total",
            urgent: "Urgent",
            unread: "Unread",
            paymentStatus: "Payment",
          },
    [safeLocale]
  );

  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("user load error:", userError);
      setItems([]);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const [
      { data: legacyRows, error: legacyError },
      { data: orderRows, error: orderError },
    ] = await Promise.all([
      supabase
        .from("requests")
        .select(
          `
          id,
          status,
          created_at,
          product_name,
          creator_user_id,
          creators:creators!requests_creator_user_id_fkey (
            display_name,
            avatar_url
          )
        `
        )
        .eq("b_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),

      supabase
        .from("orders")
        .select(
          `
          id,
          status,
          payment_status,
          created_at,
          product_name,
          creator_id,
          creator_user_id,
          menu_title_snapshot,
          menu_price_amount,
          buyer_marketplace_fee_rate_bps,
          buyer_marketplace_fee_amount,
          buyer_total_amount,
          stripe_amount,
          currency,
          creator_accept_deadline
        `
        )
        .eq("b_user_id", user.id)
        .in("status", ["authorized_pending_creator", "checkout_pending"])
        .order("created_at", { ascending: false }),
    ]);

    if (legacyError) {
      console.error("legacy request list load error:", legacyError);
    }

    if (orderError) {
      console.error("order list load error:", orderError);
    }

    const orders = (orderRows ?? []) as OrderRow[];
    const legacyRequests = (legacyRows ?? []) as LegacyRequestRow[];

    const orderIds = orders.map((order) => order.id);
    const legacyRequestIds = legacyRequests.map((request) => request.id);

    const creatorIds = Array.from(
      new Set(
        orders
          .map((order) => order.creator_id)
          .filter((value): value is string => !!value)
      )
    );

    let creatorMap = new Map<string, CreatorLite>();
    let orderChatMap = new Map<string, ChatRow>();
    let legacyChatMap = new Map<string, ChatRow>();

    if (creatorIds.length > 0) {
      const { data: creators, error: creatorsError } = await supabase
        .from("creators")
        .select("id, display_name, avatar_url")
        .in("id", creatorIds);

      if (creatorsError) {
        console.error("order creator load error:", creatorsError);
      } else {
        creatorMap = new Map(
          ((creators ?? []) as CreatorLite[]).map((creator) => [
            creator.id,
            creator,
          ])
        );
      }
    }

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
        console.error("order pending chat load error:", chatError);
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
        console.error("legacy pending chat load error:", chatError);
      } else {
        legacyChatMap = new Map(
          ((chatRows ?? []) as ChatRow[])
            .filter((chat) => !!chat.request_id)
            .map((chat) => [chat.request_id as string, chat])
        );
      }
    }

    const orderItems: PendingItem[] = orders.map((order) => {
      const creator = creatorMap.get(order.creator_id);

      return {
        kind: "order",
        id: order.id,
        created_at: order.created_at,
        product_name: order.product_name,
        creator_name: creator?.display_name ?? copy.unnamedCreator,
        creator_avatar_url: creator?.avatar_url ?? null,
        status: order.status,
        payment_status: order.payment_status,
        menu_title: order.menu_title_snapshot,
        amount: order.menu_price_amount,
        buyer_marketplace_fee_rate_bps: order.buyer_marketplace_fee_rate_bps,
        buyer_marketplace_fee_amount: order.buyer_marketplace_fee_amount,
        buyer_total_amount: order.buyer_total_amount,
        stripe_amount: order.stripe_amount,
        currency: order.currency,
        creator_accept_deadline: order.creator_accept_deadline,
        chat: orderChatMap.get(order.id) ?? null,
      };
    });

    const legacyItems: PendingItem[] = legacyRequests.map((request) => ({
      kind: "legacy_request",
      id: request.id,
      created_at: request.created_at,
      product_name: request.product_name,
      creator_name: request.creators?.display_name ?? copy.unnamedCreator,
      creator_avatar_url: request.creators?.avatar_url ?? null,
      status: request.status,
      payment_status: null,
      menu_title: null,
      amount: null,
      currency: "JPY",
      buyer_marketplace_fee_rate_bps: null,
      buyer_marketplace_fee_amount: null,
      buyer_total_amount: null,
      stripe_amount: null,
      creator_accept_deadline: null,
      chat: legacyChatMap.get(request.id) ?? null,
    }));

    const nextItems = [...orderItems, ...legacyItems].sort((a, b) => {
      const aUnread = isUnreadChat(a.chat, user.id) ? 1 : 0;
      const bUnread = isUnreadChat(b.chat, user.id) ? 1 : 0;

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
    setLoading(false);
  }, [copy.unnamedCreator]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("b-requests-list-realtime")
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
    window.addEventListener("trendre:chat-read-changed", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("trendre:chat-read-changed", onFocus);
    };
  }, [load]);

  const urgentCount = items.filter(
    (item) =>
      item.kind === "order" &&
      item.creator_accept_deadline &&
      isWithinHours(item.creator_accept_deadline, 24)
  ).length;

  const unreadCount = items.filter((item) =>
    isUnreadChat(item.chat, currentUserId)
  ).length;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
        <div className="h-40 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="h-60 animate-pulse rounded-[30px] bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-10 md:p-6">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          Company Pending
        </p>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              {copy.subtitle}
            </p>
          </div>

          <Link
            href="/b/jobs"
            className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {copy.viewJobs}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <StatCard label={copy.total} value={items.length} tone="dark" />
        <StatCard
          label={copy.urgent}
          value={urgentCount}
          tone={urgentCount > 0 ? "amber" : "default"}
        />
        <StatCard
          label={copy.unread}
          value={unreadCount}
          tone={unreadCount > 0 ? "blue" : "default"}
        />
      </section>

      {items.length > 0 ? (
        <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
          {copy.urgentNotice}
        </div>
      ) : null}

      {items.length === 0 ? (
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
        </div>
      ) : (
        <section className="space-y-4">
          {items.map((item) => {
            const isOrder = item.kind === "order";
            const unread = isUnreadChat(item.chat, currentUserId);

            const legacyMeta =
              item.kind === "legacy_request"
                ? getRequestStatusMeta(item.status, safeLocale)
                : null;

            const detailHref = isOrder
              ? `/b/orders/${item.id}`
              : `/b/requests/${item.id}`;

            const isUrgent =
              isOrder &&
              item.creator_accept_deadline &&
              isWithinHours(item.creator_accept_deadline, 24);

            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={detailHref}
                className={`block rounded-[30px] border bg-white p-5 shadow-sm transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md ${
                  isUrgent
                    ? "border-amber-200 ring-2 ring-amber-100"
                    : unread
                      ? "border-blue-200 ring-2 ring-blue-100"
                      : "border-slate-100"
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
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
                        <>
                          <Pill className={getOrderBadgeClass(item.status)}>
                            {getOrderStatusLabel(
                              item.status,
                              item.payment_status ?? "",
                              safeLocale
                            )}
                          </Pill>

                          <Pill
                            className={getPaymentBadgeClass(item.payment_status)}
                          >
                            {getPaymentStatusLabel(
                              item.payment_status,
                              safeLocale
                            )}
                          </Pill>
                        </>
                      ) : legacyMeta ? (
                        <Pill className={getRequestStatusBadgeClass(legacyMeta.tone)}>
                          {legacyMeta.shortLabel}
                        </Pill>
                      ) : null}

                      {unread ? (
                        <Pill className="bg-blue-50 text-blue-700 ring-blue-200">
                          {copy.newMessage}
                        </Pill>
                      ) : null}

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
                    </div>

                    <div className="flex items-start gap-4">
                      <Avatar
                        name={item.creator_name}
                        avatarUrl={item.creator_avatar_url}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-500">
                          {item.creator_name}
                        </p>
                        <h2 className="mt-1 truncate text-2xl font-black text-slate-950">
                          {item.product_name ?? copy.unnamedProduct}
                        </h2>
                        {isOrder && item.menu_title ? (
                          <p className="mt-2 text-sm font-semibold text-slate-500">
                            {copy.menu}: {item.menu_title}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 lg:flex">
                    ›
                  </span>
                </div>

                {isOrder ? (
                  <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailRow
                        label={copy.menuPrice}
                        value={formatPrice(item.amount, item.currency, safeLocale)}
                      />

                      <DetailRow
                        label={copy.marketplaceFee}
                        value={formatPrice(
                          item.buyer_marketplace_fee_amount,
                          item.currency,
                          safeLocale
                        )}
                      />

                      <DetailRow
                        label={copy.buyerTotal}
                        value={formatPrice(
                          item.buyer_total_amount ?? item.stripe_amount,
                          item.currency,
                          safeLocale
                        )}
                        strong
                      />

                      <DetailRow
                        label={copy.sentAt}
                        value={formatDateTime(item.created_at, safeLocale)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                    <DetailRow
                      label={copy.sentAt}
                      value={formatDateTime(item.created_at, safeLocale)}
                    />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
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
        </section>
      )}
    </div>
  );
}