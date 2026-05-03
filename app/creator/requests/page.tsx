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

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US");
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

export default function CreatorRequestsPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "承認待ちの注文・依頼",
            subtitle:
              "企業から届いた承認待ち注文と、旧リクエスト型の未承認依頼を表示しています。期限が近い注文を優先表示します。",
            fetchError: "取得に失敗しました",
            unnamedProduct: "（商品名未入力）",
            deadline: "希望納期",
            detail: "詳細を見る",
            empty: "承認待ちの注文・依頼はありません。",
            viewActiveJobs: "進行中案件を見る",
            editProfile: "プロフィール編集",
            order: "注文",
            legacyRequest: "旧依頼",
            paymentAuthorized: "支払い方法確認済み",
            menu: "メニュー",
            price: "価格",
            creatorDeadline: "承認期限",
            creatorDeadlineExpired: "承認期限切れ",
            notSet: "未設定",
            newMessage: "新着メッセージあり",
            lastMessage: "最終メッセージ",
            urgentNotice:
              "承認期限が近い注文は上位に表示されます。期限内に承認または辞退してください。",
          }
        : {
            loading: "Loading...",
            title: "Pending Orders / Requests",
            subtitle:
              "Orders waiting for your approval and legacy pending requests are shown here. Urgent orders are shown first.",
            fetchError: "Failed to load requests.",
            unnamedProduct: "(No product name)",
            deadline: "Preferred deadline",
            detail: "View Details",
            empty: "There are no pending orders or requests.",
            viewActiveJobs: "View Active Jobs",
            editProfile: "Edit Profile",
            order: "Order",
            legacyRequest: "Legacy Request",
            paymentAuthorized: "Payment authorized",
            menu: "Menu",
            price: "Price",
            creatorDeadline: "Approval deadline",
            creatorDeadlineExpired: "Approval expired",
            notSet: "Not set",
            newMessage: "New messages",
            lastMessage: "Last message",
            urgentNotice:
              "Orders close to the approval deadline are shown first. Please accept or decline before the deadline.",
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

    const orders = (orderRes.data ?? []) as OrderRow[];

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

  if (loading) {
    return <div className="p-6">{copy.loading}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{copy.title}</h1>
          <p className="mt-1 text-sm text-gray-600">{copy.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link className="text-sm text-blue-600" href="/creator/jobs">
            {copy.viewActiveJobs}
          </Link>

          <Link className="text-sm text-blue-600" href="/creator/profile">
            {copy.editProfile}
          </Link>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        {copy.urgentNotice}
      </div>

      {error ? (
        <div className="mb-4 rounded border p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const isOrder = item.kind === "order";
          const unread = hasUnread(item.chat);

          const legacyMeta =
            item.kind === "legacy_request"
              ? getRequestStatusMeta(item.status ?? "pending", safeLocale)
              : null;

          return (
            <div
              key={`${item.kind}-${item.id}`}
              className="rounded-lg border bg-white p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
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

                    {isOrder ? (
                      <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                        {copy.paymentAuthorized}
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

                  <div className="font-medium">
                    {item.product_name ?? copy.unnamedProduct}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {formatDateTime(item.created_at, safeLocale)}
                </div>
              </div>

              <div className="mt-3 grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm md:grid-cols-2">
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

                    <div>
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

                {item.deadline ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {copy.deadline}
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatDate(item.deadline, safeLocale)}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {item.chat?.last_message_at ? (
                  <span className="text-xs text-gray-400">
                    {copy.lastMessage}:{" "}
                    {formatDateTime(item.chat.last_message_at, safeLocale)}
                  </span>
                ) : null}

                <Link
                  className="text-sm font-semibold text-blue-600 hover:underline"
                  href={
                    isOrder
                      ? `/creator/orders/${item.id}`
                      : `/creator/requests/${item.id}`
                  }
                >
                  {copy.detail}
                </Link>
              </div>
            </div>
          );
        })}

        {items.length === 0 && !error ? (
          <div className="rounded border bg-white p-6 text-center text-sm text-gray-500">
            {copy.empty}
          </div>
        ) : null}
      </div>
    </div>
  );
}