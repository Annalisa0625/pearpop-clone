// File: app/b/orders/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";
import DeadlineBadge from "@/app/components/DeadlineBadge";

type TabKey = "all" | "waiting" | "active" | "review" | "completed";

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
  buyer_total_amount: number | null;
  stripe_amount: number | null;
  currency: string | null;
  creator_accept_deadline: string | null;
  auto_complete_at: string | null;
  revision_requested_at: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
};

type InfluencerLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type OrderItem = {
  kind: "order" | "legacy_request";
  id: string;
  tab: TabKey;
  status: string;
  created_at: string;
  updated_at: string | null;
  product_name: string | null;
  delivered_post_url: string | null;
  influencer_name: string | null;
  influencer_avatar_url: string | null;
  menu_title: string | null;
  amount: number | null;
  currency: string | null;
  creator_accept_deadline: string | null;
  auto_complete_at: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
  chat: ChatRow | null;
};

function mapOrderStatusToTab(status: string): TabKey {
  if (status === "authorized_pending_creator" || status === "checkout_pending") {
    return "waiting";
  }

  if (
    status === "accepted_captured" ||
    status === "in_progress" ||
    status === "revision_requested"
  ) {
    return "active";
  }

  if (status === "delivered") {
    return "review";
  }

  return "completed";
}

function mapLegacyStatusToTab(status: string): TabKey {
  if (status === "pending") return "waiting";
  if (status === "accepted") return "active";
  if (status === "delivered") return "review";
  return "completed";
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

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getDeadlineTimestamp(value: string | null | undefined) {
  if (!value) return 9999999999999;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 9999999999999 : time;
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

function getStatusMeta(status: string, tab: TabKey, locale: "ja" | "en") {
  const ja: Record<TabKey, { label: string; className: string }> = {
    all: {
      label: "注文",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    waiting: {
      label: "返答待ち",
      className: "bg-amber-50 text-amber-800 ring-amber-100",
    },
    active: {
      label: status === "revision_requested" ? "修正依頼中" : "進行中",
      className:
        status === "revision_requested"
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : "bg-slate-950 text-white ring-slate-950",
    },
    review: {
      label: "確認する",
      className: "bg-rose-50 text-[#ff5f67] ring-rose-100",
    },
    completed: {
      label: "完了",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
  };

  const en: Record<TabKey, { label: string; className: string }> = {
    all: {
      label: "Order",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    waiting: {
      label: "Waiting",
      className: "bg-amber-50 text-amber-800 ring-amber-100",
    },
    active: {
      label: status === "revision_requested" ? "Revision" : "In progress",
      className:
        status === "revision_requested"
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : "bg-slate-950 text-white ring-slate-950",
    },
    review: {
      label: "Review",
      className: "bg-rose-50 text-[#ff5f67] ring-rose-100",
    },
    completed: {
      label: "Completed",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
  };

  return locale === "ja" ? ja[tab] : en[tab];
}

function getItemSortScore(item: OrderItem, userId: string | null) {
  const unreadScore = isUnreadChat(item.chat, userId) ? -100000000000000 : 0;

  if (item.tab === "review") {
    return unreadScore + getDeadlineTimestamp(item.auto_complete_at);
  }

  if (item.tab === "waiting") {
    return unreadScore + getDeadlineTimestamp(item.creator_accept_deadline);
  }

  const updated = getTimestamp(item.updated_at ?? item.created_at);
  return unreadScore - updated;
}

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
        className="h-12 w-12 rounded-2xl object-cover"
      />
    );
  }

  const initial = (name.trim()[0] ?? "I").toUpperCase();

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-emerald-100 text-lg font-black text-slate-900">
      {initial}
    </div>
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

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
        active
          ? "bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function OrderCard({
  item,
  userId,
  locale,
  copy,
}: {
  item: OrderItem;
  userId: string | null;
  locale: "ja" | "en";
  copy: {
    unnamedInfluencer: string;
    unnamedOrder: string;
    menu: string;
    amount: string;
    updated: string;
    sent: string;
    detail: string;
    newMessage: string;
    deliveredUrl: string;
    replyDeadline: string;
    replyExpired: string;
    autoComplete: string;
    autoCompleteExpired: string;
  };
}) {
  const meta = getStatusMeta(item.status, item.tab, locale);
  const unread = isUnreadChat(item.chat, userId);

  const detailHref =
    item.kind === "order" ? `/b/orders/${item.id}` : `/b/requests/${item.id}`;

  return (
    <Link
      href={detailHref}
      className="group block rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-[0_24px_70px_rgba(15,23,42,0.07)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Pill className={meta.className}>{meta.label}</Pill>

        {unread ? (
          <Pill className="bg-blue-50 text-blue-700 ring-blue-100">
            {copy.newMessage}
          </Pill>
        ) : null}

        {item.delivered_post_url ? (
          <Pill className="bg-rose-50 text-[#ff5f67] ring-rose-100">
            {copy.deliveredUrl}
          </Pill>
        ) : null}

        {item.tab === "waiting" && item.creator_accept_deadline ? (
          <DeadlineBadge
            deadline={item.creator_accept_deadline}
            label={copy.replyDeadline}
            expiredLabel={copy.replyExpired}
            locale={locale}
            urgentHours={12}
            warningHours={24}
          />
        ) : null}

        {item.tab === "review" && item.auto_complete_at ? (
          <DeadlineBadge
            deadline={item.auto_complete_at}
            label={copy.autoComplete}
            expiredLabel={copy.autoCompleteExpired}
            locale={locale}
            urgentHours={12}
            warningHours={24}
          />
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-4">
        <Avatar
          name={item.influencer_name ?? copy.unnamedInfluencer}
          avatarUrl={item.influencer_avatar_url}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-500">
            {item.influencer_name ?? copy.unnamedInfluencer}
          </p>

          <h2 className="mt-1 truncate text-xl font-black tracking-[-0.04em] text-slate-950">
            {item.product_name || copy.unnamedOrder}
          </h2>

          {item.menu_title ? (
            <p className="mt-2 truncate text-sm font-semibold text-slate-500">
              {copy.menu}: {item.menu_title}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-[22px] bg-slate-50 px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-400">
            {copy.amount}
          </span>
          <span className="text-sm font-black text-slate-950">
            {formatPrice(item.amount, item.currency, locale)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="text-xs font-black text-slate-400">
            {item.tab === "waiting" ? copy.sent : copy.updated}
          </span>
          <span className="text-sm font-bold text-slate-600">
            {formatDateTime(item.updated_at ?? item.created_at, locale)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-black text-slate-400">
          {copy.detail}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-slate-950 group-hover:text-white">
          →
        </span>
      </div>
    </Link>
  );
}

export default function CompanyOrdersPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "注文",
            subtitle:
              "返答待ち、進行中、納品確認、完了した注文をここで確認できます。",
            searchInfluencers: "インフルエンサーを探す",
            empty: "表示する注文はありません",
            emptyBody:
              "インフルエンサーに注文すると、ここに一覧表示されます。",
            all: "すべて",
            waiting: "返答待ち",
            active: "進行中",
            review: "確認する",
            completed: "完了",
            unnamedInfluencer: "unknown",
            unnamedOrder: "未入力",
            menu: "メニュー",
            amount: "金額",
            updated: "更新",
            sent: "送信",
            detail: "詳細を見る",
            newMessage: "新着メッセージ",
            deliveredUrl: "納品URLあり",
            replyDeadline: "返答期限",
            replyExpired: "返答期限切れ",
            autoComplete: "自動完了",
            autoCompleteExpired: "自動完了期限超過",
            fetchError: "注文の取得に失敗しました。",
          }
        : {
            loading: "Loading...",
            title: "Orders",
            subtitle:
              "Track waiting, active, delivered, and completed orders in one place.",
            searchInfluencers: "Find influencers",
            empty: "No orders to show",
            emptyBody:
              "Orders will appear here after you place them with influencers.",
            all: "All",
            waiting: "Waiting",
            active: "In progress",
            review: "Review",
            completed: "Completed",
            unnamedInfluencer: "unknown",
            unnamedOrder: "Not entered",
            menu: "Menu",
            amount: "Amount",
            updated: "Updated",
            sent: "Sent",
            detail: "View details",
            newMessage: "New message",
            deliveredUrl: "Delivery URL",
            replyDeadline: "Reply deadline",
            replyExpired: "Reply expired",
            autoComplete: "Auto complete",
            autoCompleteExpired: "Auto-complete overdue",
            fetchError: "Failed to load orders.",
          },
    [safeLocale]
  );

  const [tab, setTab] = useState<TabKey>("all");
  const [items, setItems] = useState<OrderItem[]>([]);
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
      setCurrentUserId(null);
      setItems([]);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const [{ data: orderRows, error: orderError }, { data: legacyRows, error: legacyError }] =
      await Promise.all([
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
            buyer_total_amount,
            stripe_amount,
            currency,
            creator_accept_deadline,
            auto_complete_at,
            revision_requested_at,
            revision_count,
            max_revision_count
          `
          )
          .eq("b_user_id", user.id)
          .in("status", [
            "checkout_pending",
            "authorized_pending_creator",
            "accepted_captured",
            "in_progress",
            "delivered",
            "revision_requested",
            "completed",
            "declined_canceled",
            "expired_canceled",
          ]),

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
            )
          `
          )
          .eq("b_user_id", user.id)
          .in("status", ["pending", "accepted", "delivered", "completed"]),
      ]);

    if (orderError || legacyError) {
      console.error("unified orders load error:", { orderError, legacyError });
      setError(copy.fetchError);
      setItems([]);
      setLoading(false);
      return;
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

    let influencerMap = new Map<string, InfluencerLite>();
    let orderChatMap = new Map<string, ChatRow>();
    let legacyChatMap = new Map<string, ChatRow>();

    if (influencerIds.length > 0) {
      const { data: influencerRows, error: influencerError } = await supabase
        .from("creators")
        .select("id, display_name, avatar_url")
        .in("id", influencerIds);

      if (influencerError) {
        console.error("orders influencer load error:", influencerError);
      } else {
        influencerMap = new Map(
          ((influencerRows ?? []) as InfluencerLite[]).map((influencer) => [
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
        console.error("orders chat load error:", chatError);
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
        console.error("legacy order chat load error:", chatError);
      } else {
        legacyChatMap = new Map(
          ((chatRows ?? []) as ChatRow[])
            .filter((chat) => !!chat.request_id)
            .map((chat) => [chat.request_id as string, chat])
        );
      }
    }

    const orderItems: OrderItem[] = orders.map((order) => {
      const influencer = influencerMap.get(order.creator_id) ?? null;
      const mappedTab = mapOrderStatusToTab(order.status);

      return {
        kind: "order",
        id: order.id,
        tab: mappedTab,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product_name: order.product_name,
        delivered_post_url: order.delivered_post_url,
        influencer_name: influencer?.display_name ?? null,
        influencer_avatar_url: influencer?.avatar_url ?? null,
        menu_title: order.menu_title_snapshot,
        amount: order.buyer_total_amount ?? order.stripe_amount ?? order.menu_price_amount,
        currency: order.currency,
        creator_accept_deadline: order.creator_accept_deadline,
        auto_complete_at: order.auto_complete_at,
        revision_count: order.revision_count,
        max_revision_count: order.max_revision_count,
        chat: orderChatMap.get(order.id) ?? null,
      };
    });

    const legacyItems: OrderItem[] = legacyRequests.map((request) => {
      const mappedTab = mapLegacyStatusToTab(request.status);

      return {
        kind: "legacy_request",
        id: request.id,
        tab: mappedTab,
        status: request.status,
        created_at: request.created_at,
        updated_at: request.updated_at,
        product_name: request.product_name,
        delivered_post_url: request.delivered_post_url,
        influencer_name: request.creators?.display_name ?? null,
        influencer_avatar_url: request.creators?.avatar_url ?? null,
        menu_title: null,
        amount: null,
        currency: "JPY",
        creator_accept_deadline: null,
        auto_complete_at: null,
        revision_count: null,
        max_revision_count: null,
        chat: legacyChatMap.get(request.id) ?? null,
      };
    });

    setItems([...orderItems, ...legacyItems]);
    setLoading(false);
  }, [copy.fetchError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("b-unified-orders-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads" },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        () => void load()
      )
      .subscribe();

    const onFocus = () => void load();

    window.addEventListener("focus", onFocus);
    window.addEventListener("trendre:chat-read-changed", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("trendre:chat-read-changed", onFocus);
    };
  }, [load]);

  const counts = useMemo(() => {
    return {
      all: items.length,
      waiting: items.filter((item) => item.tab === "waiting").length,
      active: items.filter((item) => item.tab === "active").length,
      review: items.filter((item) => item.tab === "review").length,
      completed: items.filter((item) => item.tab === "completed").length,
    };
  }, [items]);

  const visibleItems = useMemo(() => {
    const filtered =
      tab === "all" ? items : items.filter((item) => item.tab === tab);

    return [...filtered].sort((a, b) => {
      const scoreA = getItemSortScore(a, currentUserId);
      const scoreB = getItemSortScore(b, currentUserId);

      if (scoreA !== scoreB) return scoreA - scoreB;

      return (
        getTimestamp(b.updated_at ?? b.created_at) -
        getTimestamp(a.updated_at ?? a.created_at)
      );
    });
  }, [items, tab, currentUserId]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: copy.all, count: counts.all },
    { key: "waiting", label: copy.waiting, count: counts.waiting },
    { key: "active", label: copy.active, count: counts.active },
    { key: "review", label: copy.review, count: counts.review },
    { key: "completed", label: copy.completed, count: counts.completed },
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-32 animate-pulse rounded-[28px] bg-white shadow-sm" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-[28px] bg-white shadow-sm" />
            <div className="h-64 animate-pulse rounded-[28px] bg-white shadow-sm" />
          </div>
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

            <Link
              href="/b/creators"
              className="inline-flex w-fit items-center justify-center rounded-full bg-[#ff5f67] px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
            >
              {copy.searchInfluencers}
            </Link>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((item) => (
              <TabButton
                key={item.key}
                label={item.label}
                count={item.count}
                active={tab === item.key}
                onClick={() => setTab(item.key)}
              />
            ))}
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {visibleItems.length === 0 ? (
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
          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            {visibleItems.map((item) => (
              <OrderCard
                key={`${item.kind}-${item.id}`}
                item={item}
                userId={currentUserId}
                locale={safeLocale}
                copy={{
                  unnamedInfluencer: copy.unnamedInfluencer,
                  unnamedOrder: copy.unnamedOrder,
                  menu: copy.menu,
                  amount: copy.amount,
                  updated: copy.updated,
                  sent: copy.sent,
                  detail: copy.detail,
                  newMessage: copy.newMessage,
                  deliveredUrl: copy.deliveredUrl,
                  replyDeadline: copy.replyDeadline,
                  replyExpired: copy.replyExpired,
                  autoComplete: copy.autoComplete,
                  autoCompleteExpired: copy.autoCompleteExpired,
                }}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}