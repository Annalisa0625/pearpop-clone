// File: app/b/requests/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
      influencer_name: string;
      influencer_avatar_url: string | null;
      status: string;
      menu_title: string | null;
      amount: number | null;
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
      influencer_name: string;
      influencer_avatar_url: string | null;
      status: string;
      menu_title: null;
      amount: null;
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
        className="h-13 w-13 rounded-2xl object-cover shadow-sm md:h-14 md:w-14"
      />
    );
  }

  const initial = (name?.trim()?.[0] ?? "I").toUpperCase();

  return (
    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-emerald-100 text-lg font-black text-slate-900 shadow-sm md:h-14 md:w-14">
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

function Pill({
  children,
  className,
}: {
  children: ReactNode;
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

function SummaryPill({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-full px-4 py-2 text-sm font-black ${
        active
          ? "bg-slate-950 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {label} <span className="ml-1">{value}</span>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <span className="text-right text-sm font-black text-slate-950">
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
            title: "返答待ち",
            subtitle:
              "インフルエンサーの返答を待っている注文です。承認されると注文が開始されます。",
            viewJobs: "注文を見る",
            empty: "返答待ちの注文はありません",
            emptyBody:
              "インフルエンサーに注文すると、返答待ちの注文がここに表示されます。",
            unnamedInfluencer: "unknown",
            unnamedProduct: "未入力",
            sentAt: "送信",
            menu: "メニュー",
            amount: "金額",
            detail: "詳細を見る",
            newMessage: "新着メッセージ",
            creatorDeadline: "返答期限",
            creatorDeadlineExpired: "返答期限切れ",
            total: "返答待ち",
            urgent: "期限間近",
            unread: "未読",
            searchInfluencers: "インフルエンサーを探す",
          }
        : {
            loading: "Loading...",
            title: "Waiting for replies",
            subtitle:
              "Orders waiting for influencer approval. Once accepted, the order begins.",
            viewJobs: "View orders",
            empty: "No orders waiting for replies",
            emptyBody:
              "Orders waiting for influencer approval will appear here.",
            unnamedInfluencer: "unknown",
            unnamedProduct: "Not entered",
            sentAt: "Sent",
            menu: "Menu",
            amount: "Amount",
            detail: "View details",
            newMessage: "New message",
            creatorDeadline: "Reply deadline",
            creatorDeadlineExpired: "Reply expired",
            total: "Waiting",
            urgent: "Urgent",
            unread: "Unread",
            searchInfluencers: "Find influencers",
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

    const influencerIds = Array.from(
      new Set(
        orders
          .map((order) => order.creator_id)
          .filter((value): value is string => !!value)
      )
    );

    let influencerMap = new Map<string, CreatorLite>();
    let orderChatMap = new Map<string, ChatRow>();
    let legacyChatMap = new Map<string, ChatRow>();

    if (influencerIds.length > 0) {
      const { data: influencers, error: influencersError } = await supabase
        .from("creators")
        .select("id, display_name, avatar_url")
        .in("id", influencerIds);

      if (influencersError) {
        console.error("order influencer load error:", influencersError);
      } else {
        influencerMap = new Map(
          ((influencers ?? []) as CreatorLite[]).map((influencer) => [
            influencer.id,
            influencer,
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
      const influencer = influencerMap.get(order.creator_id);

      return {
        kind: "order",
        id: order.id,
        created_at: order.created_at,
        product_name: order.product_name,
        influencer_name: influencer?.display_name ?? copy.unnamedInfluencer,
        influencer_avatar_url: influencer?.avatar_url ?? null,
        status: order.status,
        menu_title: order.menu_title_snapshot,
        amount: order.menu_price_amount,
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
      influencer_name: request.creators?.display_name ?? copy.unnamedInfluencer,
      influencer_avatar_url: request.creators?.avatar_url ?? null,
      status: request.status,
      menu_title: null,
      amount: null,
      currency: "JPY",
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
  }, [copy.unnamedInfluencer]);

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
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-32 animate-pulse rounded-[28px] bg-white shadow-sm" />
          <div className="h-36 animate-pulse rounded-[28px] bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[100px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 pb-10 md:px-6 md:py-8">
        <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-7 md:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[28px] font-black tracking-[-0.055em] text-slate-950 md:text-[38px]">
                {copy.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/b/jobs"
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
              >
                {copy.viewJobs}
              </Link>
              <Link
                href="/b/creators"
                className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
              >
                {copy.searchInfluencers}
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <SummaryPill label={copy.total} value={items.length} active />
            <SummaryPill label={copy.urgent} value={urgentCount} />
            <SummaryPill label={copy.unread} value={unreadCount} />
          </div>
        </section>

        {items.length === 0 ? (
          <div className="mt-5 rounded-[28px] bg-white p-8 text-center shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:p-12">
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              {copy.empty}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-slate-500">
              {copy.emptyBody}
            </p>
            <Link
              href="/b/creators"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              {copy.searchInfluencers}
            </Link>
          </div>
        ) : (
          <section className="mt-5 space-y-3">
            {items.map((item) => {
              const isOrder = item.kind === "order";
              const unread = isUnreadChat(item.chat, currentUserId);

              const detailHref = isOrder
                ? `/b/orders/${item.id}`
                : `/b/requests/${item.id}`;

              return (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={detailHref}
                  className="block rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-[0_24px_70px_rgba(15,23,42,0.07)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Pill className="bg-slate-950 text-white ring-slate-950">
                          {copy.title}
                        </Pill>

                        {unread ? (
                          <Pill className="bg-blue-50 text-blue-700 ring-blue-100">
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
                          name={item.influencer_name}
                          avatarUrl={item.influencer_avatar_url}
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-500">
                            {item.influencer_name}
                          </p>
                          <h2 className="mt-1 truncate text-[22px] font-black tracking-[-0.04em] text-slate-950">
                            {item.product_name ?? copy.unnamedProduct}
                          </h2>
                          {isOrder && item.menu_title ? (
                            <p className="mt-2 truncate text-sm font-semibold text-slate-500">
                              {copy.menu}: {item.menu_title}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 rounded-[22px] bg-slate-50 px-4 py-4 lg:w-[260px]">
                      <InfoLine
                        label={copy.amount}
                        value={formatPrice(
                          item.buyer_total_amount ?? item.stripe_amount ?? item.amount,
                          item.currency,
                          safeLocale
                        )}
                      />
                      <InfoLine
                        label={copy.sentAt}
                        value={formatDateTime(item.created_at, safeLocale)}
                      />
                    </div>

                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 lg:flex">
                      ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}