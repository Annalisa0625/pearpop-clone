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
        className="h-12 w-12 rounded-full object-cover"
      />
    );
  }

  const initial = (name?.trim()?.[0] ?? "C").toUpperCase();

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-700">
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

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US");
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
    return locale === "ja" ? "与信確保済み" : "Authorized";
  }

  return status;
}

function getOrderBadgeClass(status: string) {
  if (status === "authorized_pending_creator") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "checkout_pending") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-gray-50 text-gray-700 ring-gray-200";
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

export default function RequestsListPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "承認待ちの注文・リクエスト",
            subtitle:
              "クリエイター承認待ちの注文と、旧リクエスト型の承認待ち依頼を表示しています。期限が近い注文を優先表示します。",
            viewJobs: "進行中案件を見る",
            empty: "現在、承認待ちの注文・リクエストはありません。",
            unnamedCreator: "unknown",
            unnamedProduct: "未入力",
            productName: "商品名・案件名",
            sentAt: "送信日",
            menu: "メニュー",
            price: "価格",
            creatorDeadline: "承認期限",
            creatorDeadlineExpired: "承認期限切れ",
            detail: "詳細を見る",
            legacyRequest: "旧リクエスト",
            order: "注文",
            notSet: "未設定",
            newMessage: "新着メッセージあり",
            lastMessage: "最終メッセージ",
            urgentNotice:
              "承認期限が近い注文は上位に表示されます。クリエイターが期限内に承認または辞退するまでお待ちください。",
          }
        : {
            loading: "Loading...",
            title: "Pending Orders / Requests",
            subtitle:
              "Orders waiting for creator approval and legacy pending requests are shown here. Urgent orders are shown first.",
            viewJobs: "View Active Jobs",
            empty: "There are no pending orders or requests.",
            unnamedCreator: "unknown",
            unnamedProduct: "Not entered",
            productName: "Product / Campaign",
            sentAt: "Sent At",
            menu: "Menu",
            price: "Price",
            creatorDeadline: "Approval deadline",
            creatorDeadlineExpired: "Approval expired",
            detail: "View Details",
            legacyRequest: "Legacy Request",
            order: "Order",
            notSet: "Not set",
            newMessage: "New messages",
            lastMessage: "Last message",
            urgentNotice:
              "Orders close to the creator approval deadline are shown first.",
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

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  if (loading) {
    return <p className="p-6">{copy.loading}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold">{copy.title}</h1>
          <p className="text-sm text-gray-600">{copy.subtitle}</p>
        </div>

        <Link
          href="/b/jobs"
          className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          {copy.viewJobs}
        </Link>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        {copy.urgentNotice}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600">{copy.empty}</p>
      ) : (
        <div className="space-y-4">
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

            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={detailHref}
                className="block rounded-3xl border bg-white p-5 shadow-sm transition hover:bg-gray-50"
              >
                <div className="mb-4 flex items-start gap-4">
                  <Avatar
                    name={item.creator_name}
                    avatarUrl={item.creator_avatar_url}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          isOrder
                            ? "bg-purple-50 text-purple-700 ring-purple-200"
                            : "bg-gray-50 text-gray-700 ring-gray-200"
                        }`}
                      >
                        {isOrder ? copy.order : copy.legacyRequest}
                      </span>

                      {isOrder ? (
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getOrderBadgeClass(
                            item.status
                          )}`}
                        >
                          {getOrderStatusLabel(
                            item.status,
                            item.payment_status ?? "",
                            safeLocale
                          )}
                        </span>
                      ) : legacyMeta ? (
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getRequestStatusBadgeClass(
                            legacyMeta.tone
                          )}`}
                        >
                          {legacyMeta.shortLabel}
                        </span>
                      ) : null}

                      {unread ? (
                        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                          {copy.newMessage}
                        </span>
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

                    <p className="mt-3 font-semibold">@{item.creator_name}</p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.productName}
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {item.product_name ?? copy.unnamedProduct}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.sentAt}
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatDateTime(item.created_at, safeLocale)}
                    </p>
                  </div>

                  {isOrder ? (
                    <>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {copy.menu}
                        </p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {item.menu_title || copy.notSet}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {copy.price}
                        </p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {formatPrice(item.amount, item.currency, safeLocale)}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {copy.creatorDeadline}
                        </p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {formatDateTime(
                            item.creator_accept_deadline,
                            safeLocale
                          )}
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {item.chat?.last_message_at ? (
                    <span className="text-xs text-gray-400">
                      {copy.lastMessage}:{" "}
                      {formatDateTime(item.chat.last_message_at, safeLocale)}
                    </span>
                  ) : null}

                  <span className="text-sm font-semibold text-blue-600">
                    {copy.detail}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}