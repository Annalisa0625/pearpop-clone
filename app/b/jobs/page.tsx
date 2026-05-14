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

function normalizeChat(chats: LegacyRequestRow["chats"]): ChatRow | null {
  if (!chats) return null;
  if (Array.isArray(chats)) return chats[0] ?? null;
  return chats;
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

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
      className: "bg-blue-100 text-blue-700 ring-blue-200",
    },
    accepted_captured: {
      label: "進行中",
      className: "bg-blue-100 text-blue-700 ring-blue-200",
    },
    in_progress: {
      label: "進行中",
      className: "bg-blue-100 text-blue-700 ring-blue-200",
    },
    delivered: {
      label: "納品済み",
      className: "bg-purple-100 text-purple-700 ring-purple-200",
    },
    revision_requested: {
      label: "修正依頼中",
      className: "bg-amber-100 text-amber-800 ring-amber-200",
    },
    completed: {
      label: "完了",
      className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    },
  };

  const en: Record<string, { label: string; className: string }> = {
    accepted: {
      label: "Active",
      className: "bg-blue-100 text-blue-700 ring-blue-200",
    },
    accepted_captured: {
      label: "Active",
      className: "bg-blue-100 text-blue-700 ring-blue-200",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-100 text-blue-700 ring-blue-200",
    },
    delivered: {
      label: "Delivered",
      className: "bg-purple-100 text-purple-700 ring-purple-200",
    },
    revision_requested: {
      label: "Revision Requested",
      className: "bg-amber-100 text-amber-800 ring-amber-200",
    },
    completed: {
      label: "Completed",
      className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    },
  };

  return (
    (locale === "ja" ? ja[status] : en[status]) ?? {
      label: status,
      className: "bg-slate-100 text-slate-700 ring-slate-200",
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

function isWithinHours(value: string | null | undefined, hours: number) {
  const time = getTimestamp(value);
  if (!time) return false;

  const diff = time - Date.now();
  return diff > 0 && diff <= hours * 60 * 60 * 1000;
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "dark" | "blue" | "purple" | "amber" | "green";
}) {
  const styles = {
    default: "border-slate-100 bg-white text-slate-950",
    dark: "border-slate-950 bg-slate-950 text-white",
    blue: "border-blue-100 bg-blue-50 text-slate-950",
    purple: "border-purple-100 bg-purple-50 text-slate-950",
    amber: "border-amber-100 bg-amber-50 text-slate-950",
    green: "border-emerald-100 bg-emerald-50 text-slate-950",
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

export default function JobsListPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "進行中案件",
            subtitle:
              "決済確定済みの注文、修正依頼中の注文、納品済み・完了済み案件を確認できます。",
            viewRequests: "承認待ちを見る",
            empty: "進行中の案件はありません。",
            emptyBody:
              "クリエイターが承認した注文や納品済み案件がここに表示されます。",
            unnamedCreator: "unknown",
            unnamedProduct: "未入力",
            productName: "商品名",
            menu: "メニュー",
            price: "価格",
            buyerFeeRate: "B側手数料率",
            marketplaceFee: "Trendre手数料",
            buyerTotal: "お支払い合計",
            stripeAmount: "Stripe決済額",
            deliveredUrl: "納品URLあり",
            revisionRequested: "修正依頼中",
            revisionCount: "修正回数",
            unreadMessages: "新着メッセージあり",
            lastMessage: "最終メッセージ",
            updatedAt: "更新",
            detail: "詳細を見る",
            fetchError: "進行中案件の取得に失敗しました。",
            autoComplete: "自動完了",
            autoCompleteExpired: "自動完了期限超過",
            total: "すべて",
            active: "進行中",
            delivered: "納品済み",
            revision: "修正",
            completed: "完了",
          }
        : {
            loading: "Loading...",
            title: "Active Jobs",
            subtitle:
              "Review captured orders, revision requests, delivered jobs, and completed jobs.",
            viewRequests: "View Pending",
            empty: "There are no active jobs.",
            emptyBody:
              "Accepted orders and delivered jobs will appear here.",
            unnamedCreator: "unknown",
            unnamedProduct: "Not entered",
            productName: "Product",
            menu: "Menu",
            price: "Price",
            buyerFeeRate: "Buyer fee rate",
            marketplaceFee: "Trendre fee",
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
            total: "Total",
            active: "Active",
            delivered: "Delivered",
            revision: "Revision",
            completed: "Completed",
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
    window.addEventListener("trendre:chat-read-changed", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("trendre:chat-read-changed", onFocus);
    };
  }, [load]);

  const hasUnread = useCallback(
    (item: JobItem) => {
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
    },
    [currentUserId]
  );

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
  }, [jobs, hasUnread]);

  const activeCount = sortedJobs.filter((job) =>
    ["accepted", "accepted_captured", "in_progress"].includes(job.status)
  ).length;
  const deliveredCount = sortedJobs.filter((job) => job.status === "delivered").length;
  const revisionCount = sortedJobs.filter(
    (job) => job.status === "revision_requested"
  ).length;
  const completedCount = sortedJobs.filter((job) => job.status === "completed").length;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
        <div className="h-40 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="h-60 animate-pulse rounded-[30px] bg-slate-100" />
        <div className="h-60 animate-pulse rounded-[30px] bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-10 md:p-6">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          Company Jobs
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
            href="/b/requests"
            className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {copy.viewRequests}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label={copy.total} value={sortedJobs.length} tone="dark" />
        <StatCard label={copy.active} value={activeCount} tone="blue" />
        <StatCard label={copy.delivered} value={deliveredCount} tone="purple" />
        <StatCard label={copy.revision} value={revisionCount} tone="amber" />
        <StatCard label={copy.completed} value={completedCount} tone="green" />
      </section>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {sortedJobs.length === 0 ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl">
            ▣
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
          {sortedJobs.map((job) => {
            const meta = getStatusMeta(job.status, safeLocale);
            const detailHref =
              job.kind === "order"
                ? `/b/orders/${job.id}`
                : `/b/requests/${job.id}`;

            const unread = hasUnread(job);
            const isDelivered = job.status === "delivered";
            const isRevision = job.status === "revision_requested";

            return (
              <Link
                key={`${job.kind}-${job.id}`}
                href={detailHref}
                className={`block rounded-[30px] border bg-white p-5 shadow-sm transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md ${
                  isDelivered
                    ? "border-purple-200 ring-2 ring-purple-100"
                    : isRevision
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
                          job.kind === "order"
                            ? "bg-slate-950 text-white ring-slate-950"
                            : "bg-slate-100 text-slate-700 ring-slate-200"
                        }
                      >
                        {getKindLabel(job.kind, safeLocale)}
                      </Pill>

                      <Pill className={meta.className}>{meta.label}</Pill>

                      {job.payment_status ? (
                        <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                          {job.payment_status}
                        </Pill>
                      ) : null}

                      {job.delivered_post_url ? (
                        <Pill className="bg-purple-50 text-purple-700 ring-purple-200">
                          {copy.deliveredUrl}
                        </Pill>
                      ) : null}

                      {isRevision ? (
                        <Pill className="bg-amber-50 text-amber-800 ring-amber-200">
                          {copy.revisionRequested}
                        </Pill>
                      ) : null}

                      {unread ? (
                        <Pill className="bg-blue-50 text-blue-700 ring-blue-200">
                          {copy.unreadMessages}
                        </Pill>
                      ) : null}
                    </div>

                    <div className="flex items-start gap-4">
                      <Avatar
                        name={job.creator_name ?? copy.unnamedCreator}
                        avatarUrl={job.creator_avatar_url}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-500">
                          @{job.creator_name ?? copy.unnamedCreator}
                        </p>
                        <h2 className="mt-1 truncate text-2xl font-black text-slate-950">
                          {job.product_name ?? copy.unnamedProduct}
                        </h2>
                        {job.menu_title ? (
                          <p className="mt-2 text-sm font-semibold text-slate-500">
                            {copy.menu}: {job.menu_title}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 lg:flex">
                    ›
                  </span>
                </div>

                {job.kind === "order" ? (
                  <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailRow
                        label={copy.price}
                        value={formatPrice(
                          job.menu_price_amount,
                          job.currency,
                          safeLocale
                        )}
                      />
                      <DetailRow
                        label={copy.buyerFeeRate}
                        value={formatBps(job.buyer_marketplace_fee_rate_bps)}
                      />
                      <DetailRow
                        label={copy.marketplaceFee}
                        value={formatPrice(
                          job.buyer_marketplace_fee_amount,
                          job.currency,
                          safeLocale
                        )}
                      />
                      <DetailRow
                        label={copy.buyerTotal}
                        value={formatPrice(
                          job.buyer_total_amount,
                          job.currency,
                          safeLocale
                        )}
                        strong
                      />
                      {job.stripe_amount != null &&
                      job.stripe_amount !== job.buyer_total_amount ? (
                        <DetailRow
                          label={copy.stripeAmount}
                          value={formatPrice(
                            job.stripe_amount,
                            job.currency,
                            safeLocale
                          )}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isDelivered && job.auto_complete_at ? (
                    <DeadlineBadge
                      deadline={job.auto_complete_at}
                      label={copy.autoComplete}
                      expiredLabel={copy.autoCompleteExpired}
                      locale={safeLocale}
                      urgentHours={12}
                      warningHours={24}
                    />
                  ) : null}

                  {isRevision && job.revision_count != null ? (
                    <Pill className="bg-amber-50 text-amber-800 ring-amber-200">
                      {copy.revisionCount}: {job.revision_count}/
                      {job.max_revision_count ?? 1}
                    </Pill>
                  ) : null}

                  {job.chat?.last_message_at ? (
                    <Pill className="bg-slate-50 text-slate-500 ring-slate-200">
                      {copy.lastMessage}:{" "}
                      {formatDateTime(job.chat.last_message_at, safeLocale)}
                    </Pill>
                  ) : null}

                  <Pill className="bg-slate-50 text-slate-500 ring-slate-200">
                    {copy.updatedAt}:{" "}
                    {formatDateTime(job.updated_at ?? job.created_at, safeLocale)}
                  </Pill>
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