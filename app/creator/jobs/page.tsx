// File: app/creator/jobs/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
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
  updated_at: string | null;
  status: string | null;
  product_name: string | null;
  deadline: string | null;
  delivered_post_url: string | null;
  chats?: ChatRow[] | ChatRow | null;
};

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  payment_status: string;
  product_name: string | null;
  deadline: string | null;
  delivered_post_url: string | null;
  menu_title_snapshot: string | null;
  menu_price_amount: number | null;
  currency: string | null;
  creator_transaction_fee_rate_bps: number | null;
  creator_transaction_fee_amount: number | null;
  creator_payout_amount: number | null;
  revision_requested_at: string | null;
  revision_note: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
  auto_complete_at: string | null;
};

type CreatorRow = {
  id: string;
  user_id: string;
};

type JobItem = {
  kind: "order" | "legacy_request";
  id: string;
  status: string;
  payment_status?: string | null;
  created_at: string;
  updated_at: string | null;
  product_name: string | null;
  deadline: string | null;
  delivered_post_url: string | null;
  menu_title?: string | null;
  menu_price_amount?: number | null;
  currency?: string | null;
  creator_transaction_fee_rate_bps?: number | null;
  creator_transaction_fee_amount?: number | null;
  creator_payout_amount?: number | null;
  revision_requested_at?: string | null;
  revision_note?: string | null;
  revision_count?: number | null;
  max_revision_count?: number | null;
  auto_complete_at?: string | null;
  chat: ChatRow | null;
};

const STATUS_ORDER: Record<string, number> = {
  revision_requested: 0,
  delivered: 1,
  accepted_captured: 2,
  in_progress: 2,
  accepted: 2,
  completed: 3,
};

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

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
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

function formatSignedFee(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: "ja" | "en"
) {
  if (value == null) return "";

  const formatted = formatPrice(Math.abs(value), currency, locale);
  return value === 0 ? formatted : `-${formatted}`;
}

function formatBps(value: number | null | undefined) {
  if (value == null) return "";
  return `${value / 100}%`;
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

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => !!value))
  );
}

export default function CreatorJobsPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "進行中案件",
            subtitle:
              "承認済み注文、修正依頼中の注文、納品済み注文、新着メッセージをまとめて表示しています。修正依頼中と自動完了が近い納品済み案件を優先表示します。",
            viewRequests: "承認待ちを見る",
            editProfile: "プロフィール編集",
            fetchError: "進行中案件の取得に失敗しました。",
            unnamedProduct: "（商品名未入力）",
            deadline: "期限",
            menu: "メニュー",
            price: "価格",
            transactionFeeRate: "C側手数料率",
            transactionFee: "Trendre transaction fee",
            payoutAmount: "受取予定額",
            deliveredUrl: "納品URLあり",
            revisionActionRequired: "修正対応が必要",
            revisionCount: "修正回数",
            unreadMessages: "新着メッセージあり",
            lastMessage: "最終メッセージ",
            updatedAt: "更新日",
            detail: "詳細を見る",
            empty: "進行中の案件はありません。",
            autoComplete: "自動完了",
            autoCompleteExpired: "自動完了期限超過",
          }
        : {
            loading: "Loading...",
            title: "Active Jobs",
            subtitle:
              "Accepted orders, revision requested orders, delivered orders, and unread messages are shown here. Revision requests and delivered orders close to auto-completion are prioritized.",
            viewRequests: "View Pending Requests",
            editProfile: "Edit Profile",
            fetchError: "Failed to load active jobs.",
            unnamedProduct: "(No product name)",
            deadline: "Deadline",
            menu: "Menu",
            price: "Price",
            transactionFeeRate: "Creator fee rate",
            transactionFee: "Trendre transaction fee",
            payoutAmount: "Estimated payout",
            deliveredUrl: "Delivered URL submitted",
            revisionActionRequired: "Revision needed",
            revisionCount: "Revision count",
            unreadMessages: "New messages",
            lastMessage: "Last message",
            updatedAt: "Updated",
            detail: "View Details",
            empty: "There are no active jobs.",
            autoComplete: "Auto complete",
            autoCompleteExpired: "Auto-complete overdue",
          },
    [safeLocale]
  );

  const [items, setItems] = useState<JobItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("creator jobs user load error:", userError);
      setItems([]);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data: creatorRow, error: creatorError } = await supabase
      .from("creators")
      .select("id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (creatorError) {
      console.error("creator row load error:", creatorError);
    }

    const creator = (creatorRow as CreatorRow | null) ?? null;
    const legacyCreatorKeys = uniqueStrings([user.id, creator?.id]);

    const [
      { data: legacyRows, error: legacyError },
      { data: orderRows, error: orderError },
    ] = await Promise.all([
      supabase
        .from("requests")
        .select(
          `
          id,
          created_at,
          updated_at,
          status,
          product_name,
          deadline,
          delivered_post_url,
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
        .in("creator_user_id", legacyCreatorKeys)
        .in("status", ["accepted", "delivered", "completed"]),

      supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          updated_at,
          status,
          payment_status,
          product_name,
          deadline,
          delivered_post_url,
          menu_title_snapshot,
          menu_price_amount,
          currency,
          creator_transaction_fee_rate_bps,
          creator_transaction_fee_amount,
          creator_payout_amount,
          revision_requested_at,
          revision_note,
          revision_count,
          max_revision_count,
          auto_complete_at
        `
        )
        .eq("creator_user_id", user.id)
        .in("status", [
          "accepted_captured",
          "in_progress",
          "delivered",
          "revision_requested",
          "completed",
        ]),
    ]);

    if (legacyError || orderError) {
      console.error("creator jobs load error:", { legacyError, orderError });
      setError(copy.fetchError);
      setItems([]);
      setLoading(false);
      return;
    }

    const orders = (orderRows ?? []) as unknown as OrderRow[];
    const orderIds = orders.map((order) => order.id);

    let orderChatMap = new Map<string, ChatRow>();

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
        console.error("creator order chat load error:", chatError);
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
        status: row.status ?? "accepted",
        created_at: row.created_at,
        updated_at: row.updated_at,
        product_name: row.product_name,
        deadline: row.deadline,
        delivered_post_url: row.delivered_post_url,
        chat: normalizeChat(row.chats),
      })
    );

    const orderItems: JobItem[] = orders.map((order) => ({
      kind: "order",
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      product_name: order.product_name,
      deadline: order.deadline,
      delivered_post_url: order.delivered_post_url,
      menu_title: order.menu_title_snapshot,
      menu_price_amount: order.menu_price_amount,
      currency: order.currency,
      creator_transaction_fee_rate_bps: order.creator_transaction_fee_rate_bps,
      creator_transaction_fee_amount: order.creator_transaction_fee_amount,
      creator_payout_amount: order.creator_payout_amount,
      revision_requested_at: order.revision_requested_at,
      revision_note: order.revision_note,
      revision_count: order.revision_count,
      max_revision_count: order.max_revision_count,
      auto_complete_at: order.auto_complete_at,
      chat: orderChatMap.get(order.id) ?? null,
    }));

    setItems([...orderItems, ...legacyItems]);
    setLoading(false);
  }, [copy.fetchError, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("creator-jobs-list-realtime")
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

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const statusDiff =
        (STATUS_ORDER[a.status] ?? 999) - (STATUS_ORDER[b.status] ?? 999);

      if (statusDiff !== 0) return statusDiff;

      const aAuto = getAutoCompleteSortValue(a);
      const bAuto = getAutoCompleteSortValue(b);

      if (aAuto !== bAuto) return aAuto - bAuto;

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
  }, [items, currentUserId]);

  if (loading) {
    return <div className="mx-auto max-w-4xl p-6">{copy.loading}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{copy.title}</h1>
          <p className="mt-1 text-sm text-gray-600">{copy.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link className="text-sm text-blue-600" href="/creator/requests">
            {copy.viewRequests}
          </Link>
          <Link className="text-sm text-blue-600" href="/creator/profile">
            {copy.editProfile}
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {sortedItems.length === 0 && !error ? (
        <div className="rounded border p-6 text-center text-sm text-gray-500">
          {copy.empty}
        </div>
      ) : null}

      <div className="space-y-3">
        {sortedItems.map((item) => {
          const meta = getStatusMeta(item.status, safeLocale);
          const detailHref =
            item.kind === "order"
              ? `/creator/orders/${item.id}`
              : `/creator/requests/${item.id}`;

          return (
            <div
              key={`${item.kind}-${item.id}`}
              className="rounded-2xl border bg-white p-4 shadow-sm transition hover:bg-gray-50"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.kind === "order"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {getKindLabel(item.kind, safeLocale)}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.className}`}
                    >
                      {meta.label}
                    </span>

                    {item.payment_status ? (
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        {item.payment_status}
                      </span>
                    ) : null}

                    {item.status === "revision_requested" ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {copy.revisionActionRequired}
                      </span>
                    ) : null}

                    {item.status === "delivered" && item.auto_complete_at ? (
                      <DeadlineBadge
                        deadline={item.auto_complete_at}
                        label={copy.autoComplete}
                        expiredLabel={copy.autoCompleteExpired}
                        locale={safeLocale}
                        urgentHours={12}
                        warningHours={24}
                      />
                    ) : null}

                    {hasUnread(item) ? (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {copy.unreadMessages}
                      </span>
                    ) : null}
                  </div>

                  <div className="font-medium">
                    {item.product_name ?? copy.unnamedProduct}
                  </div>

                  <div className="mt-3 grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm md:grid-cols-2">
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

                    {item.menu_title ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {copy.menu}
                        </p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {item.menu_title}
                        </p>
                      </div>
                    ) : null}

                    {item.kind === "order" ? (
                      <>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {copy.price}
                          </p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatPrice(
                              item.menu_price_amount,
                              item.currency,
                              safeLocale
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {copy.transactionFeeRate}
                          </p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatBps(item.creator_transaction_fee_rate_bps)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {copy.transactionFee}
                          </p>
                          <p className="mt-1 font-semibold text-red-600">
                            {formatSignedFee(
                              item.creator_transaction_fee_amount,
                              item.currency,
                              safeLocale
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-green-100 bg-green-50 p-3 md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                            {copy.payoutAmount}
                          </p>
                          <p className="mt-1 text-lg font-bold text-green-700">
                            {formatPrice(
                              item.creator_payout_amount,
                              item.currency,
                              safeLocale
                            )}
                          </p>
                        </div>
                      </>
                    ) : null}

                    {item.status === "revision_requested" &&
                    item.revision_count != null ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {copy.revisionCount}
                        </p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {item.revision_count}/{item.max_revision_count ?? 1}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    {item.delivered_post_url ? (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {copy.deliveredUrl}
                      </span>
                    ) : null}

                    {item.chat?.last_message_at ? (
                      <span className="text-xs text-gray-400">
                        {copy.lastMessage}:{" "}
                        {formatDateTime(item.chat.last_message_at, safeLocale)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {copy.updatedAt}:{" "}
                  {formatDateTime(
                    item.updated_at ?? item.created_at,
                    safeLocale
                  )}
                </div>
              </div>

              <div className="mt-3">
                <Link
                  className="text-sm font-semibold text-blue-600 hover:underline"
                  href={detailHref}
                >
                  {copy.detail}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
