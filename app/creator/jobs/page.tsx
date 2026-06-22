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

type FulfillmentType = "material_provided" | "product_shipping" | "visit" | null;

type PreparationStatus =
  | "not_started"
  | "waiting_materials"
  | "materials_provided"
  | "materials_confirmed"
  | "waiting_shipping_address"
  | "waiting_shipment"
  | "shipped"
  | "received"
  | "waiting_schedule"
  | "schedule_confirmed"
  | "ready_to_start"
  | null;

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  payment_status: string;
  product_name: string | null;
  menu_title_snapshot: string | null;
  creator_accept_deadline: string | null;
  fulfillment_type: FulfillmentType;
  preparation_status: PreparationStatus;
};

type ActiveOrder = {
  id: string;
  title: string;
  status: string;
  updated_at: string | null;
  created_at: string;
  fulfillment_type: FulfillmentType;
  preparation_status: PreparationStatus;
};

type ChatReadRow = {
  user_id: string;
  last_read_at: string | null;
};

type ChatRow = {
  id: string;
  order_id: string | null;
  last_message_at: string | null;
  chat_reads?: ChatReadRow[] | null;
};

type MessageRow = {
  id?: string;
  chat_id?: string | null;
  sender_user_id?: string | null;
  user_id?: string | null;
  body?: string | null;
  content?: string | null;
  message?: string | null;
  text?: string | null;
  created_at?: string | null;
};

type ChatItem = {
  order: ActiveOrder;
  chat: ChatRow | null;
  latestMessage: MessageRow | null;
  unreadCount: number;
  latestAt: string | null;
};

type TabKey = "jobs" | "chats";

function getTime(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  return time;
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

function formatTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isExecutionOrder(order: OrderRow) {
  return [
    "accepted_captured",
    "in_progress",
    "revision_requested",
    "delivered",
  ].includes(order.status);
}

function getOrderTitle(order: Pick<OrderRow, "product_name" | "menu_title_snapshot">) {
  const productName = order.product_name?.trim();
  const menuName = order.menu_title_snapshot?.trim();

  return productName || menuName || "案件";
}

function getMessageText(message: MessageRow | null, fallback: string) {
  if (!message) return fallback;

  const value =
    message.body ??
    message.content ??
    message.message ??
    message.text ??
    fallback;

  return String(value || fallback);
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

function countUnreadMessages({
  chat,
  messages,
  userId,
}: {
  chat: ChatRow | null;
  messages: MessageRow[];
  userId: string | null;
}) {
  if (!chat || !userId) return 0;

  const readRow =
    chat.chat_reads?.find((row) => row.user_id === userId) ?? null;

  if (!isUnreadForUser(chat, userId)) return 0;

  const readTime = readRow?.last_read_at
    ? new Date(readRow.last_read_at).getTime()
    : 0;

  const count = messages.filter((message) => {
    const createdAt = message.created_at ? new Date(message.created_at).getTime() : 0;
    const senderId = message.sender_user_id ?? message.user_id ?? null;

    return createdAt > readTime && senderId !== userId;
  }).length;

  return Math.max(count, 1);
}

function getJobStatusLabel(status: string, locale: "ja" | "en") {
  if (locale === "en") {
    if (status === "revision_requested") return "Revision requested";
    if (status === "delivered") return "Waiting for review";
    return "In progress";
  }

  if (status === "revision_requested") return "修正依頼あり";
  if (status === "delivered") return "確認待ち";
  return "進行中";
}

function getJobActionBubble(order: ActiveOrder, locale: "ja" | "en") {
  if (order.status === "delivered") return null;

  if (
    order.fulfillment_type === "product_shipping" &&
    order.preparation_status === "waiting_shipping_address"
  ) {
    return locale === "ja"
      ? "配送先を登録しましょう"
      : "Add your shipping address";
  }

  if (
    order.fulfillment_type === "visit" &&
    !["schedule_confirmed", "ready_to_start"].includes(
      order.preparation_status ?? ""
    )
  ) {
    return locale === "ja"
      ? "日程調整を行いましょう"
      : "Schedule your visit";
  }

  return null;
}

function getJobBody(order: ActiveOrder, locale: "ja" | "en") {
  if (order.status === "revision_requested") {
    return locale === "ja"
      ? "修正内容を確認して、必要に応じて再提出してください。"
      : "Review the requested changes and submit again if needed.";
  }

  if (order.status === "delivered") {
    return locale === "ja"
      ? "依頼元の確認が完了するまでお待ちください。"
      : "Waiting for the requester to complete their review.";
  }

  if (
    order.fulfillment_type === "product_shipping" &&
    order.preparation_status === "waiting_shipping_address"
  ) {
    return locale === "ja"
      ? "商品を受け取るために、配送先の登録が必要です。"
      : "Add the shipping address so the product can be sent.";
  }

  if (
    order.fulfillment_type === "visit" &&
    !["schedule_confirmed", "ready_to_start"].includes(
      order.preparation_status ?? ""
    )
  ) {
    return locale === "ja"
      ? "チャットで来店日・場所・撮影ルールを相談しましょう。"
      : "Discuss the visit date, location, and rules in chat.";
  }

  return locale === "ja"
    ? "案件の詳細を確認して、必要な作業を進めましょう。"
    : "Review the order details and continue the required work.";
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
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
        d="m8.4 12.2 2.4 2.4 5-5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4.5 4v-4A2.5 2.5 0 0 1 4 12.5v-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 8.5h8M8 11.5h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M5 12.5 10 17 19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoadingView() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
      <div className="space-y-2.5">
        <div className="h-9 animate-pulse rounded-xl bg-white ring-1 ring-slate-100" />
        <div className="h-12 animate-pulse rounded-[18px] bg-white ring-1 ring-slate-100" />
        <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
        <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
        <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
      </div>
    </main>
  );
}

function ActionStyle() {
  return (
    <style jsx global>{`
      @keyframes trendreJobBubbleFloat {
        0%,
        100% {
          transform: translate3d(0, 0, 0);
        }
        50% {
          transform: translate3d(0, -3px, 0);
        }
      }

      .trendre-job-bubble {
        animation: trendreJobBubbleFloat 2.4s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .trendre-job-bubble {
          animation: none;
        }
      }
    `}</style>
  );
}

function IconBubble({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "rose" | "slate" | "blue";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-[#ff3860] ring-rose-100"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-[17px] ring-1 ${toneClass}`}
    >
      {children}
    </span>
  );
}

function SpeechBubble({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="trendre-job-bubble relative inline-flex items-center rounded-full bg-rose-50 px-3.5 py-2 text-[13px] font-semibold text-[#ff3860] ring-1 ring-rose-100">
      <span className="absolute -left-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-r-[8px] border-y-transparent border-r-rose-50" />
      {children}
    </span>
  );
}

function StatusPill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "rose" | "slate" | "blue";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-[#ff3860] ring-rose-100"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : "bg-slate-50 text-slate-600 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 ${toneClass}`}
    >
      {children}
    </span>
  );
}

function TabButton({
  active,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-3 pb-3 pt-2 text-[14px] font-semibold transition ${
        active
          ? "border-[#ff3860] text-slate-950"
          : "border-transparent text-slate-400"
      }`}
    >
      {label}
      {badge && badge > 0 ? (
        <span className="grid min-w-5 place-items-center rounded-full bg-[#ff3860] px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

function JobCard({
  order,
  locale,
}: {
  order: ActiveOrder;
  locale: "ja" | "en";
}) {
  const actionBubble = getJobActionBubble(order, locale);
  const statusLabel = getJobStatusLabel(order.status, locale);
  const statusTone =
    order.status === "revision_requested"
      ? "rose"
      : order.status === "delivered"
        ? "blue"
        : "slate";

  return (
    <Link href={`/creator/orders/${order.id}`} className="block">
      <article className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-100 transition active:scale-[0.99]">
        <div className="flex items-start gap-3">
          <IconBubble tone={actionBubble ? "rose" : "slate"}>
            <CheckIcon />
          </IconBubble>

          <div className="min-w-0 flex-1">
            {actionBubble ? (
              <SpeechBubble>{actionBubble}</SpeechBubble>
            ) : (
              <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
            )}

            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[16px] font-semibold tracking-[-0.035em] text-slate-950">
                  {order.title}
                </h2>
                <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
                  {getJobBody(order, locale)}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {locale === "ja" ? "更新日" : "Updated"}：
                  {formatDate(order.updated_at || order.created_at, locale)}
                </p>
              </div>

              <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                <ChevronIcon />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function ChatRowItem({
  item,
  locale,
  fallbackMessage,
}: {
  item: ChatItem;
  locale: "ja" | "en";
  fallbackMessage: string;
}) {
  const latestText = getMessageText(item.latestMessage, fallbackMessage);
  const timeText = formatTime(item.latestAt, locale);

  return (
    <Link href={`/creator/orders/${item.order.id}?focus=chat`} className="block">
      <article className="flex items-center gap-3 rounded-[22px] bg-white px-4 py-3.5 ring-1 ring-slate-100 transition active:scale-[0.99]">
        <div className="relative">
          <IconBubble tone={item.unreadCount > 0 ? "rose" : "blue"}>
            <ChatIcon />
          </IconBubble>
          {item.unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#ff3860] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.03em] text-slate-950">
              {item.order.title}
            </h2>
            {timeText ? (
              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                {timeText}
              </span>
            ) : null}
          </div>

          <p
            className={`mt-1 truncate text-[12px] leading-5 ${
              item.unreadCount > 0
                ? "font-semibold text-slate-700"
                : "font-medium text-slate-500"
            }`}
          >
            {latestText}
          </p>
        </div>

        <span className="shrink-0 text-slate-300">
          <ChevronIcon />
        </span>
      </article>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-[24px] bg-white px-6 py-10 text-center ring-1 ring-slate-100">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
        {icon}
      </div>

      <h2 className="mt-5 text-[16px] font-semibold tracking-[-0.035em] text-slate-950">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-slate-500">
        {body}
      </p>
    </section>
  );
}

function ErrorBox({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-[22px] bg-rose-50 px-4 py-3 text-rose-800 ring-1 ring-rose-100">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs font-medium leading-5">{body}</p>
    </section>
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
            title: "参加中の仕事",
            subtitle: "進行中の案件とやりとりを確認できます。",
            jobsTab: "案件一覧",
            chatsTab: "やりとり",
            emptyJobsTitle: "参加中の仕事はありません",
            emptyJobsBody:
              "承諾した案件があると、ここに表示されます。",
            emptyChatsTitle: "やりとりはありません",
            emptyChatsBody:
              "進行中の案件でメッセージが届くと、ここに表示されます。",
            errorTitle: "参加中の仕事を取得できませんでした",
            errorBody: "時間をおいてもう一度お試しください。",
            noMessage: "まだメッセージはありません",
          }
        : {
            title: "Active work",
            subtitle: "Check active orders and conversations.",
            jobsTab: "Jobs",
            chatsTab: "Chats",
            emptyJobsTitle: "No active work",
            emptyJobsBody:
              "Accepted orders will appear here.",
            emptyChatsTitle: "No conversations",
            emptyChatsBody:
              "Messages for active orders will appear here.",
            errorTitle: "Failed to load active work",
            errorBody: "Please try again later.",
            noMessage: "No messages yet",
          },
    [safeLocale]
  );

  const [activeTab, setActiveTab] = useState<TabKey>("jobs");
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setOrders([]);
        setChatItems([]);
        setLoading(false);
        return;
      }

      const { data, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          updated_at,
          status,
          payment_status,
          product_name,
          menu_title_snapshot,
          creator_accept_deadline,
          fulfillment_type,
          preparation_status
        `
        )
        .eq("creator_user_id", user.id)
        .in("status", [
          "accepted_captured",
          "in_progress",
          "revision_requested",
          "delivered",
        ])
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (orderError) {
        console.error("creator active jobs load error:", orderError);
        setOrders([]);
        setChatItems([]);
        setError(true);
        setLoading(false);
        return;
      }

      const nextOrders = ((data ?? []) as unknown as OrderRow[])
        .filter(Boolean)
        .filter(isExecutionOrder)
        .map((order) => ({
          id: order.id,
          title: getOrderTitle(order),
          status: order.status,
          updated_at: order.updated_at,
          created_at: order.created_at,
          fulfillment_type: order.fulfillment_type ?? null,
          preparation_status: order.preparation_status ?? null,
        }));

      setOrders(nextOrders);

      const orderIds = nextOrders.map((order) => order.id);

      if (orderIds.length === 0) {
        setChatItems([]);
        setLoading(false);
        return;
      }

      const { data: chatData, error: chatError } = await supabase
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
        console.warn("creator active chats load skipped:", chatError);
        setChatItems(
          nextOrders.map((order) => ({
            order,
            chat: null,
            latestMessage: null,
            unreadCount: 0,
            latestAt: order.updated_at || order.created_at,
          }))
        );
        setLoading(false);
        return;
      }

      const chats = (chatData ?? []) as unknown as ChatRow[];
      const chatByOrderId = new Map<string, ChatRow>();

      chats.forEach((chat) => {
        if (chat.order_id) {
          chatByOrderId.set(chat.order_id, chat);
        }
      });

      const chatIds = chats.map((chat) => chat.id).filter(Boolean);

      let messagesByChatId = new Map<string, MessageRow[]>();

      if (chatIds.length > 0) {
        try {
          const { data: messageData, error: messageError } = await supabase
            .from("messages")
            .select("*")
            .in("chat_id", chatIds)
            .order("created_at", { ascending: false })
            .limit(200);

          if (messageError) {
            throw messageError;
          }

          messagesByChatId = ((messageData ?? []) as MessageRow[]).reduce(
            (map, message) => {
              const chatId = message.chat_id;
              if (!chatId) return map;

              const current = map.get(chatId) ?? [];
              current.push(message);
              map.set(chatId, current);

              return map;
            },
            new Map<string, MessageRow[]>()
          );
        } catch (messageError) {
          console.warn("creator latest messages load skipped:", messageError);
        }
      }

      const nextChatItems = nextOrders
        .map((order) => {
          const chat = chatByOrderId.get(order.id) ?? null;
          const messages = chat ? messagesByChatId.get(chat.id) ?? [] : [];
          const latestMessage = messages[0] ?? null;
          const unreadCount = countUnreadMessages({
            chat,
            messages,
            userId: user.id,
          });

          return {
            order,
            chat,
            latestMessage,
            unreadCount,
            latestAt:
              latestMessage?.created_at ??
              chat?.last_message_at ??
              order.updated_at ??
              order.created_at,
          };
        })
        .sort((a, b) => {
          const unreadDiff = b.unreadCount - a.unreadCount;
          if (unreadDiff !== 0) return unreadDiff;

          return (
            new Date(b.latestAt ?? b.order.created_at).getTime() -
            new Date(a.latestAt ?? a.order.created_at).getTime()
          );
        });

      setChatItems(nextChatItems);
      setLoading(false);
    } catch (error) {
      console.error("creator active jobs load error:", error);
      setOrders([]);
      setChatItems([]);
      setError(true);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const channel = supabase
      .channel("creator-active-work-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          void loadJobs();
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
          void loadJobs();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          void loadJobs();
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
          void loadJobs();
        }
      )
      .subscribe();

    const onFocus = () => {
      void loadJobs();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadJobs, supabase]);

  const totalUnread = chatItems.reduce(
    (sum, item) => sum + item.unreadCount,
    0
  );

  if (loading) {
    return <LoadingView />;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
      <ActionStyle />

      <div className="space-y-3">
        <section className="px-1 pt-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.045em] text-slate-950">
            {copy.title}
          </h1>
          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            {copy.subtitle}
          </p>
        </section>

        <section className="sticky top-0 z-10 -mx-4 bg-[#f8f9fa]/90 px-4 pt-1 backdrop-blur">
          <div className="grid grid-cols-2 border-b border-slate-200/80">
            <TabButton
              active={activeTab === "jobs"}
              label={copy.jobsTab}
              onClick={() => setActiveTab("jobs")}
            />
            <TabButton
              active={activeTab === "chats"}
              label={copy.chatsTab}
              badge={totalUnread}
              onClick={() => setActiveTab("chats")}
            />
          </div>
        </section>

        {error ? (
          <ErrorBox title={copy.errorTitle} body={copy.errorBody} />
        ) : null}

        {!error && activeTab === "jobs" ? (
          <section className="space-y-2.5">
            {orders.length === 0 ? (
              <EmptyState
                icon={<EmptyIcon />}
                title={copy.emptyJobsTitle}
                body={copy.emptyJobsBody}
              />
            ) : (
              orders.map((order) => (
                <JobCard key={order.id} order={order} locale={safeLocale} />
              ))
            )}
          </section>
        ) : null}

        {!error && activeTab === "chats" ? (
          <section className="space-y-2.5">
            {chatItems.length === 0 ? (
              <EmptyState
                icon={<ChatIcon />}
                title={copy.emptyChatsTitle}
                body={copy.emptyChatsBody}
              />
            ) : (
              chatItems.map((item) => (
                <ChatRowItem
                  key={item.order.id}
                  item={item}
                  locale={safeLocale}
                  fallbackMessage={copy.noMessage}
                />
              ))
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
