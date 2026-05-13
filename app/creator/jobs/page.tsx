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

function isWithinHours(value: string | null | undefined, hours: number) {
  const time = getTimestamp(value);
  if (!time) return false;

  const diff = time - Date.now();
  return diff > 0 && diff <= hours * 60 * 60 * 1000;
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
      label: "修正依頼",
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
      label: "Revision",
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
  return locale === "ja" ? "旧依頼" : "Legacy";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => !!value))
  );
}

function HeaderStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "attention" | "dark";
}) {
  const styles = {
    default: "bg-white text-slate-950",
    attention: "bg-amber-50 text-slate-950",
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

function RevisionNotice({
  note,
  copy,
}: {
  note: string | null | undefined;
  copy: { revisionActionRequired: string };
}) {
  if (!note?.trim()) return null;

  return (
    <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-amber-700">
        {copy.revisionActionRequired}
      </p>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-amber-900">
        {note}
      </p>
    </div>
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
              "承認済み・修正依頼・納品済み・完了済みの案件を確認できます。",
            viewRequests: "承認待ちを見る",
            editProfile: "プロフィール編集",
            fetchError: "進行中案件の取得に失敗しました。",
            unnamedProduct: "商品名未入力",
            deadline: "期限",
            menu: "メニュー",
            price: "価格",
            transactionFeeRate: "C側手数料率",
            transactionFee: "Trendre手数料",
            payoutAmount: "受取予定額",
            deliveredUrl: "納品URLあり",
            revisionActionRequired: "修正対応が必要",
            revisionCount: "修正回数",
            unreadMessages: "新着メッセージ",
            lastMessage: "最終メッセージ",
            updatedAt: "更新",
            detail: "案件を開く",
            empty: "進行中の案件はありません。",
            emptyBody:
              "承認した注文や進行中の案件がここに表示されます。納品や修正対応もこの画面から確認できます。",
            autoComplete: "自動完了",
            autoCompleteExpired: "自動完了期限超過",
            total: "すべて",
            active: "進行中",
            revision: "修正",
            delivered: "納品済み",
            completed: "完了",
            checkRequests: "承認待ちを見る",
          }
        : {
            loading: "Loading...",
            title: "Active Jobs",
            subtitle:
              "Check accepted, revision requested, delivered, and completed jobs.",
            viewRequests: "View Pending Requests",
            editProfile: "Edit Profile",
            fetchError: "Failed to load active jobs.",
            unnamedProduct: "No product name",
            deadline: "Deadline",
            menu: "Menu",
            price: "Price",
            transactionFeeRate: "Creator fee rate",
            transactionFee: "Trendre fee",
            payoutAmount: "Estimated payout",
            deliveredUrl: "Delivered URL submitted",
            revisionActionRequired: "Revision needed",
            revisionCount: "Revision count",
            unreadMessages: "New messages",
            lastMessage: "Last message",
            updatedAt: "Updated",
            detail: "Open job",
            empty: "There are no active jobs.",
            emptyBody:
              "Accepted orders and active jobs will appear here. Delivery and revision tasks can also be checked from this screen.",
            autoComplete: "Auto complete",
            autoCompleteExpired: "Auto-complete overdue",
            total: "Total",
            active: "Active",
            revision: "Revision",
            delivered: "Delivered",
            completed: "Completed",
            checkRequests: "View requests",
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
  }, [items, hasUnread]);

  const activeCount = sortedItems.filter((item) =>
    ["accepted", "accepted_captured", "in_progress"].includes(item.status)
  ).length;

  const revisionCount = sortedItems.filter(
    (item) => item.status === "revision_requested"
  ).length;

  const deliveredCount = sortedItems.filter(
    (item) => item.status === "delivered"
  ).length;

  const completedCount = sortedItems.filter(
    (item) => item.status === "completed"
  ).length;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-32 animate-pulse rounded-[32px] bg-slate-100" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-52 animate-pulse rounded-[28px] bg-slate-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          Creator Jobs
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              {copy.subtitle}
            </p>
          </div>

          <div className="text-right">
            <p className="text-5xl font-black">{sortedItems.length}</p>
            <p className="text-xs font-bold text-white/50">{copy.total}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <HeaderStat
          label={copy.active}
          value={activeCount}
          tone={activeCount > 0 ? "dark" : "default"}
        />
        <HeaderStat
          label={copy.revision}
          value={revisionCount}
          tone={revisionCount > 0 ? "attention" : "default"}
        />
        <HeaderStat
          label={copy.delivered}
          value={deliveredCount}
          tone={deliveredCount > 0 ? "attention" : "default"}
        />
        <HeaderStat
          label={copy.completed}
          value={completedCount}
          tone="default"
        />
      </section>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {sortedItems.length === 0 && !error ? (
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
          <Link
            href="/creator/requests"
            className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {copy.checkRequests}
          </Link>
        </div>
      ) : null}

      <section className="space-y-4">
        {sortedItems.map((item) => {
          const meta = getStatusMeta(item.status, safeLocale);
          const detailHref =
            item.kind === "order"
              ? `/creator/orders/${item.id}`
              : `/creator/requests/${item.id}`;

          const unread = hasUnread(item);
          const needsRevision = item.status === "revision_requested";
          const delivered = item.status === "delivered";
          const completed = item.status === "completed";

          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={detailHref}
              className={`block rounded-[30px] border bg-white p-5 shadow-sm transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md ${
                needsRevision
                  ? "border-amber-200 ring-2 ring-amber-100"
                  : delivered
                  ? "border-purple-200 ring-2 ring-purple-100"
                  : unread
                  ? "border-blue-200 ring-2 ring-blue-100"
                  : "border-slate-100"
              }`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Pill
                  className={
                    item.kind === "order"
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-slate-100 text-slate-700 ring-slate-200"
                  }
                >
                  {getKindLabel(item.kind, safeLocale)}
                </Pill>

                <Pill className={meta.className}>{meta.label}</Pill>

                {item.payment_status ? (
                  <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                    {item.payment_status}
                  </Pill>
                ) : null}

                {needsRevision ? (
                  <Pill className="bg-amber-50 text-amber-800 ring-amber-200">
                    {copy.revisionActionRequired}
                  </Pill>
                ) : null}

                {unread ? (
                  <Pill className="bg-blue-50 text-blue-700 ring-blue-200">
                    {copy.unreadMessages}
                  </Pill>
                ) : null}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-xl font-black text-slate-950">
                    {item.product_name ?? copy.unnamedProduct}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    {copy.updatedAt}:{" "}
                    {formatDateTime(item.updated_at ?? item.created_at, safeLocale)}
                  </p>
                </div>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  ›
                </span>
              </div>

              {needsRevision ? (
                <RevisionNotice
                  note={item.revision_note}
                  copy={{ revisionActionRequired: copy.revisionActionRequired }}
                />
              ) : null}

              <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                <div className="grid gap-3">
                  {item.deadline ? (
                    <MoneyRow
                      label={copy.deadline}
                      value={formatDate(item.deadline, safeLocale)}
                    />
                  ) : null}

                  {item.menu_title ? (
                    <MoneyRow label={copy.menu} value={item.menu_title} />
                  ) : null}

                  {item.kind === "order" ? (
                    <>
                      <MoneyRow
                        label={copy.price}
                        value={formatPrice(
                          item.menu_price_amount,
                          item.currency,
                          safeLocale
                        )}
                      />

                      <MoneyRow
                        label={copy.transactionFee}
                        value={formatSignedFee(
                          item.creator_transaction_fee_amount,
                          item.currency,
                          safeLocale
                        )}
                        danger
                      />

                      <MoneyRow
                        label={copy.payoutAmount}
                        value={formatPrice(
                          item.creator_payout_amount,
                          item.currency,
                          safeLocale
                        )}
                        strong
                      />
                    </>
                  ) : null}

                  {needsRevision && item.revision_count != null ? (
                    <MoneyRow
                      label={copy.revisionCount}
                      value={`${item.revision_count}/${item.max_revision_count ?? 1}`}
                    />
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {delivered && item.auto_complete_at ? (
                  <DeadlineBadge
                    deadline={item.auto_complete_at}
                    label={copy.autoComplete}
                    expiredLabel={copy.autoCompleteExpired}
                    locale={safeLocale}
                    urgentHours={12}
                    warningHours={24}
                  />
                ) : null}

                {item.delivered_post_url ? (
                  <Pill className="bg-purple-50 text-purple-700 ring-purple-200">
                    {copy.deliveredUrl}
                  </Pill>
                ) : null}

                {completed ? (
                  <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                    {copy.completed}
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
      </section>
    </div>
  );
}