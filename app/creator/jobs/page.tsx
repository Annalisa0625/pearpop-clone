// File: app/creator/jobs/page.tsx
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  creator_payout_amount: number | null;
  revision_requested_at: string | null;
  revision_note: string | null;
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
  creator_payout_amount?: number | null;
  revision_requested_at?: string | null;
  revision_note?: string | null;
  auto_complete_at?: string | null;
  chat: ChatRow | null;
};

type FilterKey = "todo" | "delivered" | "completed" | "all";

const STATUS_ORDER: Record<string, number> = {
  revision_requested: 0,
  accepted_captured: 1,
  in_progress: 1,
  accepted: 1,
  delivered: 2,
  completed: 3,
};

function normalizeChat(chats: LegacyRequestRow["chats"]): ChatRow | null {
  if (!chats) return null;
  if (Array.isArray(chats)) return chats[0] ?? null;
  return chats;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

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
  if (value == null) return locale === "ja" ? "未設定" : "Not set";

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

function isActionStatus(status: string) {
  return [
    "revision_requested",
    "accepted",
    "accepted_captured",
    "in_progress",
  ].includes(status);
}

function isUnreadForUser(item: JobItem, userId: string | null) {
  if (!userId) return false;
  if (!item.chat?.last_message_at) return false;

  const readRow =
    item.chat.chat_reads?.find((row) => row.user_id === userId) ?? null;

  if (!readRow?.last_read_at) return true;

  return (
    new Date(item.chat.last_message_at).getTime() >
    new Date(readRow.last_read_at).getTime()
  );
}

function getActionText(status: string, locale: "ja" | "en") {
  if (locale === "ja") {
    if (status === "revision_requested") return "修正内容を確認してください";
    if (
      status === "accepted" ||
      status === "accepted_captured" ||
      status === "in_progress"
    ) {
      return "制作・投稿を進めてください";
    }
    if (status === "delivered") return "企業の確認待ちです";
    if (status === "completed") return "完了しています";
    return "内容を確認してください";
  }

  if (status === "revision_requested") return "Check revision request";
  if (
    status === "accepted" ||
    status === "accepted_captured" ||
    status === "in_progress"
  ) {
    return "Continue production";
  }
  if (status === "delivered") return "Waiting for brand review";
  if (status === "completed") return "Completed";
  return "Check details";
}

function SoftPill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "rose" | "blue" | "green";
}) {
  const className =
    tone === "rose"
      ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : tone === "green"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-slate-50 text-slate-600 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition active:scale-95"
          : "shrink-0 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200 transition active:scale-95"
      }
    >
      {children}
    </button>
  );
}

function LoadingView() {
  return (
    <div className="max-w-full space-y-3 overflow-x-hidden pb-4">
      <div className="h-24 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
      <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
      <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
      <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m8 5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m8.3 12.2 2.4 2.4 5-5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniInfo({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p
        className={`mt-1 truncate text-sm ${
          strong
            ? "font-black tracking-[-0.03em] text-slate-950"
            : "font-bold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function JobCard({
  item,
  locale,
  copy,
  unread,
}: {
  item: JobItem;
  locale: "ja" | "en";
  copy: {
    unnamedProduct: string;
    updatedAt: string;
    menu: string;
    payoutAmount: string;
    newMessage: string;
    revisionNeeded: string;
    nextAction: string;
  };
  unread: boolean;
}) {
  const detailHref =
    item.kind === "order"
      ? `/creator/orders/${item.id}`
      : `/creator/requests/${item.id}`;

  const isRevision = item.status === "revision_requested";
  const shouldShowPills = unread || isRevision;

  return (
    <Link
      href={detailHref}
      className="creator-jobs-appear block rounded-[26px] bg-white p-4 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 transition active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {shouldShowPills ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {unread ? (
                <SoftPill tone="blue">{copy.newMessage}</SoftPill>
              ) : null}

              {isRevision ? (
                <SoftPill tone="rose">{copy.revisionNeeded}</SoftPill>
              ) : null}
            </div>
          ) : null}

          <h2 className="truncate text-[17px] font-black leading-tight tracking-[-0.045em] text-slate-950">
            {item.product_name || copy.unnamedProduct}
          </h2>

          <p className="mt-1.5 text-xs font-bold text-slate-400">
            {copy.updatedAt}：
            {formatDate(item.updated_at ?? item.created_at, locale)}
          </p>
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100">
          <ChevronIcon />
        </span>
      </div>

      <div className="mt-4 rounded-[22px] bg-slate-50 px-4 py-3.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
          <MiniInfo
            label={copy.nextAction}
            value={getActionText(item.status, locale)}
          />

          {item.kind === "order" ? (
            <MiniInfo
              label={copy.payoutAmount}
              value={formatPrice(
                item.creator_payout_amount,
                item.currency,
                locale
              )}
              strong
            />
          ) : null}
        </div>

        {item.menu_title ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <MiniInfo label={copy.menu} value={item.menu_title} />
          </div>
        ) : null}

        {isRevision && item.revision_note?.trim() ? (
          <div className="mt-3 rounded-[18px] bg-white px-3 py-3 ring-1 ring-rose-100">
            <p className="text-xs font-bold leading-6 text-rose-900">
              {item.revision_note}
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export default function CreatorJobsPage() {
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "ToDo",
            subtitle: "進行中の注文と、今やることを確認できます。",
            fetchError: "ToDoの取得に失敗しました。",
            unnamedProduct: "商品名未設定",
            menu: "メニュー",
            payoutAmount: "受取予定",
            revisionNeeded: "要確認",
            newMessage: "新着メッセージ",
            updatedAt: "更新日",
            empty: "対応中の注文はありません",
            emptyBody: "受けた注文や対応が必要なものがここに表示されます。",
            checkRequests: "届いた注文を見る",
            all: "すべて",
            todo: "対応中",
            delivered: "確認待ち",
            completed: "完了",
            errorTitle: "エラー",
            nextAction: "次にやること",
          }
        : {
            title: "ToDo",
            subtitle: "Check active orders and what to do next.",
            fetchError: "Failed to load ToDo.",
            unnamedProduct: "No product name",
            menu: "Menu",
            payoutAmount: "Expected",
            revisionNeeded: "Check",
            newMessage: "New message",
            updatedAt: "Updated",
            empty: "No active orders",
            emptyBody: "Accepted orders and action items will appear here.",
            checkRequests: "View incoming orders",
            all: "All",
            todo: "Active",
            delivered: "Review",
            completed: "Done",
            errorTitle: "Error",
            nextAction: "Next",
          },
    [safeLocale]
  );

  const [items, setItems] = useState<JobItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("todo");

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
          creator_payout_amount,
          revision_requested_at,
          revision_note,
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
      creator_payout_amount: order.creator_payout_amount,
      revision_requested_at: order.revision_requested_at,
      revision_note: order.revision_note,
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

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aUnread = isUnreadForUser(a, currentUserId) ? 1 : 0;
      const bUnread = isUnreadForUser(b, currentUserId) ? 1 : 0;

      if (aUnread !== bUnread) return bUnread - aUnread;

      const statusDiff =
        (STATUS_ORDER[a.status] ?? 999) - (STATUS_ORDER[b.status] ?? 999);

      if (statusDiff !== 0) return statusDiff;

      const aLast = a.chat?.last_message_at
        ? new Date(a.chat.last_message_at).getTime()
        : 0;
      const bLast = b.chat?.last_message_at
        ? new Date(b.chat.last_message_at).getTime()
        : 0;

      if (aLast !== bLast) return bLast - aLast;

      return (
        getTimestamp(b.updated_at ?? b.created_at) -
        getTimestamp(a.updated_at ?? a.created_at)
      );
    });
  }, [currentUserId, items]);

  const todoItems = sortedItems.filter((item) => isActionStatus(item.status));
  const deliveredItems = sortedItems.filter(
    (item) => item.status === "delivered"
  );
  const completedItems = sortedItems.filter(
    (item) => item.status === "completed"
  );

  const filteredItems =
    filter === "todo"
      ? todoItems
      : filter === "delivered"
        ? deliveredItems
        : filter === "completed"
          ? completedItems
          : sortedItems;

  if (loading) {
    return <LoadingView />;
  }

  return (
    <div className="max-w-full touch-pan-y space-y-3 overflow-x-hidden pb-4">
      <style jsx global>{`
        @keyframes creatorJobsFadeUp {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        .creator-jobs-appear {
          animation: creatorJobsFadeUp 380ms cubic-bezier(0.2, 0.8, 0.2, 1)
            both;
        }

        @media (prefers-reduced-motion: reduce) {
          .creator-jobs-appear {
            animation: none;
          }
        }
      `}</style>

      <section className="creator-jobs-appear relative overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-rose-100/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-44 w-44 rounded-full bg-emerald-100/35 blur-3xl" />

        <div className="relative">
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.055em] text-slate-950">
            {copy.title}
          </h1>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {copy.subtitle}
          </p>

          <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterButton
              active={filter === "todo"}
              onClick={() => setFilter("todo")}
            >
              {copy.todo} {todoItems.length}
            </FilterButton>

            <FilterButton
              active={filter === "delivered"}
              onClick={() => setFilter("delivered")}
            >
              {copy.delivered} {deliveredItems.length}
            </FilterButton>

            <FilterButton
              active={filter === "completed"}
              onClick={() => setFilter("completed")}
            >
              {copy.completed} {completedItems.length}
            </FilterButton>

            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              {copy.all}
            </FilterButton>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[24px] bg-rose-50 p-5 text-rose-900 ring-1 ring-rose-100">
          <p className="text-sm font-black">{copy.errorTitle}</p>
          <p className="mt-2 text-sm font-semibold leading-7 opacity-75">
            {error}
          </p>
        </section>
      ) : null}

      {filteredItems.length === 0 && !error ? (
        <section className="creator-jobs-appear rounded-[28px] bg-white p-8 text-center shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-slate-50 text-slate-400">
            <EmptyIcon />
          </div>

          <h2 className="mt-5 text-xl font-black tracking-[-0.04em] text-slate-950">
            {copy.empty}
          </h2>

          <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-7 text-slate-500">
            {copy.emptyBody}
          </p>

          <Link
            href="/creator/requests"
            className="mt-6 inline-flex rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,95,103,0.2)] transition active:scale-[0.98]"
          >
            {copy.checkRequests}
          </Link>
        </section>
      ) : null}

      <section className="space-y-3">
        {filteredItems.map((item) => (
          <JobCard
            key={`${item.kind}-${item.id}`}
            item={item}
            locale={safeLocale}
            copy={copy}
            unread={isUnreadForUser(item, currentUserId)}
          />
        ))}
      </section>
    </div>
  );
}