// File: app/b/jobs/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
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
  status: string;
  created_at: string;
  updated_at: string | null;
  product_name: string | null;
  delivered_post_url: string | null;
  creators: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  chats: ChatRow[] | ChatRow | null;
};

type OrderRow = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string | null;
  product_name: string | null;
  delivered_post_url: string | null;
  creator_id: string;
  creator_user_id: string;
  menu_title_snapshot: string | null;
  menu_price_amount: number | null;
  buyer_marketplace_fee_rate_bps: number | null;
  buyer_marketplace_fee_amount: number | null;
  buyer_total_amount: number | null;
  stripe_amount: number | null;
  currency: string | null;
  revision_requested_at: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
  auto_complete_at: string | null;
};

type CreatorLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type JobItem = {
  kind: "order" | "legacy_request";
  id: string;
  status: string;
  payment_status?: string | null;
  created_at: string;
  updated_at: string | null;
  product_name: string | null;
  delivered_post_url: string | null;
  creator_name: string | null;
  creator_avatar_url: string | null;
  menu_title?: string | null;
  menu_price_amount?: number | null;
  buyer_marketplace_fee_rate_bps?: number | null;
  buyer_marketplace_fee_amount?: number | null;
  buyer_total_amount?: number | null;
  stripe_amount?: number | null;
  currency?: string | null;
  revision_requested_at?: string | null;
  revision_count?: number | null;
  max_revision_count?: number | null;
  auto_complete_at?: string | null;
  chat: ChatRow | null;
};

const STATUS_ORDER: Record<string, number> = {
  delivered: 0,
  revision_requested: 1,
  accepted_captured: 2,
  in_progress: 2,
  accepted: 2,
  completed: 3,
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

function normalizeChat(chats: LegacyRequestRow["chats"]): ChatRow | null {
  if (!chats) return null;
  if (Array.isArray(chats)) return chats[0] ?? null;
  return chats;
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US");
}

function formatPrice(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: "ja" | "en"
) {
  if (value == null) return "";

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

function formatBps(value: number | null | undefined) {
  if (value == null) return "";
  return `${value / 100}%`;
}

function getStatusMeta(status: string, locale: "ja" | "en") {
  const ja: Record<string, { label: string; className: string }> = {
    accepted: {
      label: "進行中",
      className: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    accepted_captured: {
      label: "承認済み・決済確定",
      className: "bg-green-50 text-green-700 ring-green-200",
    },
    in_progress: {
      label: "進行中",
      className: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    delivered: {
      label: "納品済み",
      className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    },
    revision_requested: {
      label: "修正依頼中",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    completed: {
      label: "完了",
      className: "bg-gray-50 text-gray-700 ring-gray-200",
    },
  };

  const en: Record<string, { label: string; className: string }> = {
    accepted: {
      label: "Active",
      className: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    accepted_captured: {
      label: "Accepted / Captured",
      className: "bg-green-50 text-green-700 ring-green-200",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    delivered: {
      label: "Delivered",
      className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    },
    revision_requested: {
      label: "Revision Requested",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    completed: {
      label: "Completed",
      className: "bg-gray-50 text-gray-700 ring-gray-200",
    },
  };

  return (
    (locale === "ja" ? ja[status] : en[status]) ?? {
      label: status,
      className: "bg-gray-50 text-gray-700 ring-gray-200",
    }
  );
}

function getKindLabel(kind: JobItem["kind"], locale: "ja" | "en") {
  if (kind === "order") return locale === "ja" ? "注文" : "Order";
  return locale === "ja" ? "旧依頼" : "Legacy Request";
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  return time;
}

function getAutoCompleteSortValue(item: JobItem) {
  if (item.kind !== "order") return 9999999999999;
  if (item.status !== "delivered") return 9999999999999;

  return getTimestamp(item.auto_complete_at) ?? 9999999999999;
}

export default function JobsListPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "進行中案件一覧",
            subtitle:
              "決済確定済みの注文、修正依頼中の注文、旧リクエスト型の進行中案件、新着メッセージをまとめて表示しています。納品済みで自動完了が近い案件を優先表示します。",
            viewRequests: "承認待ちを見る",
            empty: "進行中の案件はありません。",
            unnamedCreator: "unknown",
            unnamedProduct: "未入力",
            productName: "商品名",
            menu: "メニュー",
            price: "価格",
            buyerFeeRate: "B側手数料率",
            marketplaceFee: "Trendre marketplace fee",
            buyerTotal: "お支払い合計",
            stripeAmount: "Stripe決済額",
            deliveredUrl: "納品URLあり",
            revisionRequested: "修正依頼中",
            revisionCount: "修正回数",
            unreadMessages: "新着メッセージあり",
            lastMessage: "最終メッセージ",
            updatedAt: "更新日",
            detail: "詳細を見る",
            fetchError: "進行中案件の取得に失敗しました。",
            autoComplete: "自動完了",
            autoCompleteExpired: "自動完了期限超過",
          }
        : {
            loading: "Loading...",
            title: "Active Jobs",
            subtitle:
              "Captured orders, revision requested orders, active legacy requests, and unread messages are shown here. Delivered orders close to auto-completion are prioritized.",
            viewRequests: "View Pending",
            empty: "There are no active jobs.",
            unnamedCreator: "unknown",
            unnamedProduct: "Not entered",
            productName: "Product",
            menu: "Menu",
            price: "Price",
            buyerFeeRate: "Buyer fee rate",
            marketplaceFee: "Trendre marketplace fee",
            buyerTotal: "Payment total",
            stripeAmount: "Stripe amount",
            deliveredUrl: "Delivered URL submitted",
            revisionRequested: "Revision requested",
            revisionCount: "Revision count",
            unreadMessages: "New messages",
            lastMessage: "Last message",
            updatedAt: "Updated",
            detail: "View Details",
            fetchError: "Failed to load active jobs.",
            autoComplete: "Auto complete",
            autoCompleteExpired: "Auto-complete overdue",
          },
    [safeLocale]
  );

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("user load error:", userError);
      setJobs([]);
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
          updated_at,
          product_name,
          delivered_post_url,
          creators:creators!requests_creator_user_id_fkey (
            display_name,
            avatar_url
          ),
          chats (
            id,
            request_id,
            last_message_at,
            chat_reads (
              user_id,
              last_read_at
            )
          )
        `
        )
        .eq("b_user_id", user.id)
        .in("status", ["accepted", "delivered", "completed"]),

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
          delivered_post_url,
          creator_id,
          creator_user_id,
          menu_title_snapshot,
          menu_price_amount,
          buyer_marketplace_fee_rate_bps,
          buyer_marketplace_fee_amount,
          buyer_total_amount,
          stripe_amount,
          currency,
          revision_requested_at,
          revision_count,
          max_revision_count,
          auto_complete_at
        `
        )
        .eq("b_user_id", user.id)
        .in("status", [
          "accepted_captured",
          "in_progress",
          "delivered",
          "revision_requested",
          "completed",
        ]),
    ]);

    if (legacyError || orderError) {
      console.error("jobs load error:", { legacyError, orderError });
      setError(copy.fetchError);
      setJobs([]);
      setLoading(false);
      return;
    }

    const orders = (orderRows ?? []) as OrderRow[];
    const orderIds = orders.map((order) => order.id);
    const creatorIds = Array.from(
      new Set(orders.map((order) => order.creator_id).filter(Boolean))
    );

    let creatorMap = new Map<string, CreatorLite>();
    let orderChatMap = new Map<string, ChatRow>();

    if (creatorIds.length > 0) {
      const { data: creatorRows, error: creatorError } = await supabase
        .from("creators")
        .select("id, display_name, avatar_url")
        .in("id", creatorIds);

      if (creatorError) {
        console.error("order creator load error:", creatorError);
      } else {
        creatorMap = new Map(
          ((creatorRows ?? []) as CreatorLite[]).map((creator) => [
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
        console.error("order chat load error:", chatError);
      } else {
        orderChatMap = new Map(
          ((chatRows ?? []) as ChatRow[])
            .filter((chat) => !!chat.order_id)
            .map((chat) => [chat.order_id as string, chat])
        );
      }
    }

    const legacyItems: JobItem[] = ((legacyRows ?? []) as LegacyRequestRow[]).map(
      (row) => ({
        kind: "legacy_request",
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        product_name: row.product_name,
        delivered_post_url: row.delivered_post_url,
        creator_name: row.creators?.display_name ?? null,
        creator_avatar_url: row.creators?.avatar_url ?? null,
        chat: normalizeChat(row.chats),
      })
    );

    const orderItems: JobItem[] = orders.map((order) => {
      const creator = creatorMap.get(order.creator_id) ?? null;

      return {
        kind: "order",
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product_name: order.product_name,
        delivered_post_url: order.delivered_post_url,
        creator_name: creator?.display_name ?? null,
        creator_avatar_url: creator?.avatar_url ?? null,
        menu_title: order.menu_title_snapshot,
        menu_price_amount: order.menu_price_amount,
        buyer_marketplace_fee_rate_bps: order.buyer_marketplace_fee_rate_bps,
        buyer_marketplace_fee_amount: order.buyer_marketplace_fee_amount,
        buyer_total_amount: order.buyer_total_amount,
        stripe_amount: order.stripe_amount,
        currency: order.currency,
        revision_requested_at: order.revision_requested_at,
        revision_count: order.revision_count,
        max_revision_count: order.max_revision_count,
        auto_complete_at: order.auto_complete_at,
        chat: orderChatMap.get(order.id) ?? null,
      };
    });

    setJobs([...orderItems, ...legacyItems]);
    setLoading(false);
  }, [copy.fetchError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("b-jobs-list-realtime")
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

  const hasUnread = (item: JobItem) => {
    if (!currentUserId) return false;
    if (!item.chat?.last_message_at) return false;

    const readRow =
      item.chat.chat_reads?.find((row) => row.user_id === currentUserId) ??
      null;

    if (!readRow?.last_read_at) return true;

    return (
      new Date(item.chat.last_message_at).getTime() >
      new Date(readRow.last_read_at).getTime()
    );
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aAuto = getAutoCompleteSortValue(a);
      const bAuto = getAutoCompleteSortValue(b);

      if (aAuto !== bAuto) return aAuto - bAuto;

      const statusDiff =
        (STATUS_ORDER[a.status] ?? 999) - (STATUS_ORDER[b.status] ?? 999);

      if (statusDiff !== 0) return statusDiff;

      const aUnread = hasUnread(a) ? 1 : 0;
      const bUnread = hasUnread(b) ? 1 : 0;

      if (aUnread !== bUnread) return bUnread - aUnread;

      const aLast = a.chat?.last_message_at
        ? new Date(a.chat.last_message_at).getTime()
        : 0;
      const bLast = b.chat?.last_message_at
        ? new Date(b.chat.last_message_at).getTime()
        : 0;

      if (aLast !== bLast) return bLast - aLast;

      const aTime = new Date(a.updated_at ?? a.created_at).getTime();
      const bTime = new Date(b.updated_at ?? b.created_at).getTime();

      return bTime - aTime;
    });
  }, [jobs, currentUserId]);

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
          href="/b/requests"
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          {copy.viewRequests}
        </Link>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {sortedJobs.length === 0 ? (
        <p className="text-gray-600">{copy.empty}</p>
      ) : (
        <div className="space-y-4">
          {sortedJobs.map((job) => {
            const meta = getStatusMeta(job.status, safeLocale);
            const detailHref =
              job.kind === "order"
                ? `/b/orders/${job.id}`
                : `/b/requests/${job.id}`;

            return (
              <Link
                key={`${job.kind}-${job.id}`}
                href={detailHref}
                className="block rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-gray-50"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={job.creator_name ?? copy.unnamedCreator}
                      avatarUrl={job.creator_avatar_url}
                    />
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            job.kind === "order"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {getKindLabel(job.kind, safeLocale)}
                        </span>

                        {job.payment_status ? (
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                            {job.payment_status}
                          </span>
                        ) : null}
                      </div>

                      <p className="font-semibold">
                        @{job.creator_name ?? copy.unnamedCreator}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="font-medium text-gray-800">
                    {copy.productName}:{" "}
                    {job.product_name ?? copy.unnamedProduct}
                  </p>

                  {job.menu_title ? (
                    <p className="mt-2 text-sm text-gray-600">
                      {copy.menu}: {job.menu_title}
                    </p>
                  ) : null}

                  {job.kind === "order" ? (
                    <div className="mt-3 grid gap-2 rounded-xl border bg-white p-3 text-sm md:grid-cols-2">
                      {job.menu_price_amount != null ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {copy.price}
                          </p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatPrice(
                              job.menu_price_amount,
                              job.currency,
                              safeLocale
                            )}
                          </p>
                        </div>
                      ) : null}

                      {job.buyer_marketplace_fee_rate_bps != null ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {copy.buyerFeeRate}
                          </p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatBps(job.buyer_marketplace_fee_rate_bps)}
                          </p>
                        </div>
                      ) : null}

                      {job.buyer_marketplace_fee_amount != null ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {copy.marketplaceFee}
                          </p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatPrice(
                              job.buyer_marketplace_fee_amount,
                              job.currency,
                              safeLocale
                            )}
                          </p>
                        </div>
                      ) : null}

                      {job.buyer_total_amount != null ? (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                            {copy.buyerTotal}
                          </p>
                          <p className="mt-1 text-lg font-bold text-blue-900">
                            {formatPrice(
                              job.buyer_total_amount,
                              job.currency,
                              safeLocale
                            )}
                          </p>
                        </div>
                      ) : null}

                      {job.stripe_amount != null &&
                      job.stripe_amount !== job.buyer_total_amount ? (
                        <div className="md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {copy.stripeAmount}
                          </p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatPrice(
                              job.stripe_amount,
                              job.currency,
                              safeLocale
                            )}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {job.delivered_post_url ? (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {copy.deliveredUrl}
                    </span>
                  ) : null}

                  {job.status === "delivered" && job.auto_complete_at ? (
                    <DeadlineBadge
                      deadline={job.auto_complete_at}
                      label={copy.autoComplete}
                      expiredLabel={copy.autoCompleteExpired}
                      locale={safeLocale}
                      urgentHours={12}
                      warningHours={24}
                    />
                  ) : null}

                  {job.status === "revision_requested" ? (
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      {copy.revisionRequested}
                    </span>
                  ) : null}

                  {job.status === "revision_requested" &&
                  job.revision_count != null ? (
                    <span className="text-xs text-amber-700">
                      {copy.revisionCount}: {job.revision_count}/
                      {job.max_revision_count ?? 1}
                    </span>
                  ) : null}

                  {hasUnread(job) ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      {copy.unreadMessages}
                    </span>
                  ) : null}

                  {job.chat?.last_message_at ? (
                    <span className="text-xs text-gray-400">
                      {copy.lastMessage}:{" "}
                      {formatDateTime(job.chat.last_message_at, safeLocale)}
                    </span>
                  ) : null}

                  <span className="text-xs text-gray-400">
                    {copy.updatedAt}:{" "}
                    {formatDateTime(
                      job.updated_at ?? job.created_at,
                      safeLocale
                    )}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-blue-600">
                  {copy.detail}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}