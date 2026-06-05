// File: app/creator/requests/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  CreatorBadge,
  CreatorCard,
  CreatorChevron,
  CreatorEmptyState,
  CreatorHero,
  CreatorLinkButton,
  CreatorMiniInfo,
  CreatorNotice,
  CreatorPage,
  CreatorSkeleton,
} from "@/app/creator/_components/CreatorDesignSystem";

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
  menu_title_snapshot: string | null;
  creator_payout_amount: number | null;
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
      creator_payout_amount: number | null;
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
      creator_payout_amount: null;
      currency: "JPY";
      creator_accept_deadline: null;
      chat: ChatRow | null;
    };

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    return `¥${value.toLocaleString()}`;
  }
}

function getDeadlineTime(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  return time;
}

function isWithinHours(value: string | null | undefined, hours: number) {
  const time = getDeadlineTime(value);

  if (!time) return false;

  const diff = time - Date.now();

  return diff > 0 && diff <= hours * 60 * 60 * 1000;
}

function isExpired(value: string | null | undefined) {
  const time = getDeadlineTime(value);

  if (!time) return false;

  return time <= Date.now();
}

function getUrgencyScore(item: PendingItem) {
  if (item.kind !== "order") return 9999999999999;

  const deadlineTime = getDeadlineTime(item.creator_accept_deadline);

  if (!deadlineTime) return 9999999999999;

  return deadlineTime;
}

function isUnreadForUser(chat: ChatRow | null, userId: string | null) {
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

function getAcceptDeadlineLabel(
  value: string | null | undefined,
  locale: "ja" | "en"
) {
  if (!value) return null;

  if (isExpired(value)) {
    return locale === "ja" ? "返答期限切れ" : "Expired";
  }

  if (isWithinHours(value, 12)) {
    return locale === "ja"
      ? `まもなく期限 ${formatDateTime(value, locale)}`
      : `Due soon ${formatDateTime(value, locale)}`;
  }

  if (isWithinHours(value, 24)) {
    return locale === "ja"
      ? `返答期限 ${formatDateTime(value, locale)}`
      : `Reply by ${formatDateTime(value, locale)}`;
  }

  return null;
}

function getItemHref(item: PendingItem) {
  return item.kind === "order"
    ? `/creator/orders/${item.id}`
    : `/creator/requests/${item.id}`;
}

function LoadingView() {
  return (
    <CreatorPage>
      <CreatorSkeleton className="h-28" />
      <CreatorSkeleton className="h-28" />
      <CreatorSkeleton className="h-28" />
      <CreatorSkeleton className="h-28" />
    </CreatorPage>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.7-2.7 1.7-2.6-1.7L8 20l-3-1.7V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OrderCard({
  item,
  locale,
  copy,
  unread,
  urgent,
}: {
  item: PendingItem;
  locale: "ja" | "en";
  copy: {
    unnamedProduct: string;
    orderDate: string;
    menu: string;
    payout: string;
    newMessage: string;
    deadlineAlert: string;
    checkDetail: string;
  };
  unread: boolean;
  urgent: boolean;
}) {
  const href = getItemHref(item);
  const acceptDeadline =
    item.kind === "order"
      ? getAcceptDeadlineLabel(item.creator_accept_deadline, locale)
      : null;

  const hasBadges = unread || (urgent && acceptDeadline);

  return (
    <a href={href} className="block">
      <CreatorCard className="p-4 transition active:scale-[0.98]">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-rose-50 text-[#FF3B5C] ring-1 ring-rose-100">
            <OrderIcon />
          </div>

          <div className="min-w-0 flex-1">
            {hasBadges ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {unread ? (
                  <CreatorBadge tone="blue">{copy.newMessage}</CreatorBadge>
                ) : null}

                {urgent && acceptDeadline ? (
                  <CreatorBadge tone="amber">{acceptDeadline}</CreatorBadge>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[17px] font-black leading-tight tracking-[-0.045em] text-slate-950">
                  {item.product_name || copy.unnamedProduct}
                </h2>

                <p className="mt-1.5 text-xs font-bold text-slate-400">
                  {copy.orderDate}：{formatDate(item.created_at, locale)}
                </p>
              </div>

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                <CreatorChevron />
              </span>
            </div>

            {item.kind === "order" ? (
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-[22px] bg-[#F8F9FA] px-4 py-3.5 ring-1 ring-slate-100">
                <CreatorMiniInfo
                  label={copy.menu}
                  value={item.menu_title || "-"}
                />

                <CreatorMiniInfo
                  label={copy.payout}
                  value={formatPrice(
                    item.creator_payout_amount,
                    item.currency,
                    locale
                  )}
                  strong
                />
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] bg-[#F8F9FA] px-4 py-3.5 ring-1 ring-slate-100">
                <p className="text-sm font-bold text-slate-600">
                  {copy.checkDetail}
                </p>
              </div>
            )}
          </div>
        </div>
      </CreatorCard>
    </a>
  );
}

export default function CreatorRequestsPage() {
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "注文",
            subtitle: "届いた注文を確認して、受けるか相談できます。",
            fetchError: "注文の取得に失敗しました。",
            unnamedProduct: "商品名未設定",
            orderDate: "注文日",
            menu: "メニュー",
            payout: "受取予定",
            empty: "届いている注文はありません",
            emptyBody: "新しい注文が届くとここに表示されます。",
            profileCta: "プロフィールを整える",
            newMessage: "新着メッセージ",
            deadlineAlert: "返答期限",
            checkDetail: "内容を確認してください",
            errorTitle: "エラー",
            unreadLabel: "新着",
            unreadSuffix: "件",
            totalLabel: "届いている注文",
          }
        : {
            title: "Orders",
            subtitle: "Review incoming orders and discuss if needed.",
            fetchError: "Failed to load orders.",
            unnamedProduct: "No product name",
            orderDate: "Order date",
            menu: "Menu",
            payout: "Expected",
            empty: "No incoming orders",
            emptyBody: "New orders will appear here.",
            profileCta: "Update profile",
            newMessage: "New message",
            deadlineAlert: "Reply by",
            checkDetail: "Check details",
            errorTitle: "Error",
            unreadLabel: "New",
            unreadSuffix: "",
            totalLabel: "Incoming orders",
          },
    [safeLocale]
  );

  const [items, setItems] = useState<PendingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
        cache: "no-store",
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
          menu_title_snapshot,
          creator_payout_amount,
          currency,
          creator_accept_deadline
        `
        )
        .eq("creator_user_id", user.id)
        .eq("status", "authorized_pending_creator")
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

    const orders = (orderRes.data ?? []) as unknown as OrderRow[];

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
        creator_payout_amount: null,
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
        creator_payout_amount: order.creator_payout_amount,
        currency: order.currency,
        creator_accept_deadline: order.creator_accept_deadline,
        chat: orderChatMap.get(order.id) ?? null,
      })
    );

    const nextItems = [...orderItems, ...legacyPendingItems].sort((a, b) => {
      const aUnread = isUnreadForUser(a.chat, user.id) ? 1 : 0;
      const bUnread = isUnreadForUser(b.chat, user.id) ? 1 : 0;

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
  }, [copy.fetchError, supabase]);

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
    return <LoadingView />;
  }

  const unreadCount = items.filter((item) =>
    isUnreadForUser(item.chat, currentUserId)
  ).length;

  return (
    <CreatorPage>
      <CreatorHero
        title={copy.title}
        description={copy.subtitle}
        right={
          unreadCount > 0 ? (
            <CreatorBadge tone="blue">
              {copy.unreadLabel} {unreadCount}
              {safeLocale === "ja" ? copy.unreadSuffix : ""}
            </CreatorBadge>
          ) : null
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-white/70 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur">
            <p className="text-xs font-black text-slate-400">
              {copy.totalLabel}
            </p>
            <p className="mt-1 text-[26px] font-black tracking-[-0.065em] text-slate-950">
              {items.length}
              {safeLocale === "ja" ? "件" : ""}
            </p>
          </div>

          <div className="rounded-[22px] bg-white/70 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur">
            <p className="text-xs font-black text-slate-400">
              {copy.unreadLabel}
            </p>
            <p className="mt-1 text-[26px] font-black tracking-[-0.065em] text-slate-950">
              {unreadCount}
              {safeLocale === "ja" ? "件" : ""}
            </p>
          </div>
        </div>
      </CreatorHero>

      {error ? (
        <CreatorNotice
          tone="red"
          title={copy.errorTitle}
          description={error}
        />
      ) : null}

      <section className="space-y-3">
        {items.map((item) => {
          const unread = isUnreadForUser(item.chat, currentUserId);
          const urgent =
            item.kind === "order" &&
            isWithinHours(item.creator_accept_deadline, 24);

          return (
            <OrderCard
              key={`${item.kind}-${item.id}`}
              item={item}
              locale={safeLocale}
              copy={copy}
              unread={unread}
              urgent={urgent}
            />
          );
        })}

        {items.length === 0 && !error ? (
          <CreatorCard className="p-5">
            <CreatorEmptyState
              icon={<EmptyIcon />}
              title={copy.empty}
              description={copy.emptyBody}
              action={
                <CreatorLinkButton href="/creator/profile">
                  {copy.profileCta}
                </CreatorLinkButton>
              }
            />
          </CreatorCard>
        ) : null}
      </section>
    </CreatorPage>
  );
}