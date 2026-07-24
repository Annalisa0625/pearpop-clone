"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
  fulfillment_type: FulfillmentType;
  preparation_status: PreparationStatus;
};

type ActiveOrder = {
  id: string;
  title: string;
  status: string;
  updatedAt: string | null;
  createdAt: string;
  fulfillmentType: FulfillmentType;
  preparationStatus: PreparationStatus;
};

type ChatReadRow = { user_id: string; last_read_at: string | null };
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
  latestMessage: MessageRow | null;
  unreadCount: number;
  latestAt: string | null;
};

type TabKey = "jobs" | "messages";

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WorkIcon({ message = false }: { message?: boolean }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-white to-slate-100 text-slate-700 shadow-[0_5px_14px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      {message ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M7.5 9.5h9M7.5 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <rect x="4" y="7" width="16" height="13" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16M10 12v2h4v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <path d="M5 12.5 10 17 19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}

function formatChatTimestamp(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / 86400000);

  if (diffDays <= 0) {
    return date.toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return locale === "ja" ? "昨日" : "Yesterday";
  if (diffDays <= 6) return locale === "ja" ? `${diffDays}日前` : `${diffDays}d ago`;
  return formatDate(value, locale);
}

function getOrderTitle(order: Pick<OrderRow, "product_name" | "menu_title_snapshot">) {
  return order.product_name?.trim() || order.menu_title_snapshot?.trim() || "案件";
}

function getMessageText(message: MessageRow | null, fallback: string) {
  if (!message) return fallback;
  return String(message.body ?? message.content ?? message.message ?? message.text ?? fallback);
}

function isUnreadForUser(chat: ChatRow | null, userId: string) {
  if (!chat?.last_message_at) return false;
  const read = chat.chat_reads?.find((row) => row.user_id === userId) ?? null;
  if (!read?.last_read_at) return true;
  return new Date(chat.last_message_at).getTime() > new Date(read.last_read_at).getTime();
}

function countUnreadMessages(chat: ChatRow | null, messages: MessageRow[], userId: string) {
  if (!chat || !isUnreadForUser(chat, userId)) return 0;
  const read = chat.chat_reads?.find((row) => row.user_id === userId) ?? null;
  const readTime = read?.last_read_at ? new Date(read.last_read_at).getTime() : 0;
  const count = messages.filter((message) => {
    const createdAt = message.created_at ? new Date(message.created_at).getTime() : 0;
    const senderId = message.sender_user_id ?? message.user_id ?? null;
    return createdAt > readTime && senderId !== userId;
  }).length;
  return Math.max(count, 1);
}

function getNextAction(order: ActiveOrder, locale: "ja" | "en") {
  const ja = locale === "ja";

  if (order.status === "revision_requested") {
    return {
      title: ja ? "修正内容を確認してください" : "Review requested changes",
      body: ja ? "内容を確認して再提出へ進みます" : "Review the details and submit again",
      urgent: true,
    };
  }
  if (order.status === "delivered") {
    return {
      title: ja ? "依頼元の確認待ち" : "Waiting for review",
      body: ja ? "納品内容を確認してもらっています" : "The delivery is being reviewed",
      urgent: false,
    };
  }
  if (order.fulfillmentType === "product_shipping") {
    if (order.preparationStatus === "waiting_shipping_address") {
      return {
        title: ja ? "配送先を入力してください" : "Add a shipping address",
        body: ja ? "商品の発送に必要な情報を登録します" : "Add the details needed for shipping",
        urgent: true,
      };
    }
    if (["waiting_shipment", "shipped"].includes(order.preparationStatus ?? "")) {
      return {
        title: ja ? "商品の到着を待っています" : "Waiting for the product",
        body: ja ? "届いたら受取確認へ進みます" : "Confirm when the product arrives",
        urgent: false,
      };
    }
  }
  if (
    order.fulfillmentType === "visit" &&
    !["schedule_confirmed", "ready_to_start"].includes(order.preparationStatus ?? "")
  ) {
    return {
      title: ja ? "日程を調整してください" : "Schedule the visit",
      body: ja ? "候補日を確認して日程を決めます" : "Review dates and confirm the schedule",
      urgent: true,
    };
  }
  if (
    order.fulfillmentType === "material_provided" &&
    ["waiting_materials", "materials_provided"].includes(order.preparationStatus ?? "")
  ) {
    return {
      title: ja ? "素材を確認してください" : "Review the materials",
      body: ja ? "受け取った素材を確認して作業を始めます" : "Review the supplied materials and start",
      urgent: true,
    };
  }

  return {
    title: ja ? "進行中" : "In progress",
    body: ja ? "案件詳細から次の作業を確認できます" : "Open the job to see the next step",
    urgent: false,
  };
}

function JobRow({ order, locale }: { order: ActiveOrder; locale: "ja" | "en" }) {
  const action = getNextAction(order, locale);
  return (
    <Link href={`/creator/orders/${order.id}`} className="group flex min-h-[112px] items-start gap-3.5 px-4 py-4 transition duration-200 active:scale-[0.985] active:bg-slate-50/80">
      <div className="relative">
        <WorkIcon />
        {action.urgent ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#ff304f] ring-[3px] ring-white" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-slate-400">{locale === "ja" ? "進行中" : "Active"}</p>
          <time className="text-[11px] font-medium text-slate-400">{formatDate(order.updatedAt || order.createdAt, locale)}</time>
        </div>
        <div className="mt-1 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[16px] font-semibold tracking-[-0.025em] text-slate-950">{order.title}</h2>
            <p className={`mt-1 line-clamp-1 text-[13px] leading-5 ${action.urgent ? "font-medium text-slate-800" : "text-slate-500"}`}>{action.title}</p>
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">{action.body}</p>
          </div>
          <span className="mt-1 shrink-0 text-slate-300 transition duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500"><ChevronIcon /></span>
        </div>
      </div>
    </Link>
  );
}

function ChatRowItem({ item, locale, fallback }: { item: ChatItem; locale: "ja" | "en"; fallback: string }) {
  const unread = item.unreadCount > 0;
  return (
    <Link href={`/creator/chats/${item.order.id}`} className="group flex min-h-[94px] items-center gap-3.5 px-4 py-3.5 transition duration-200 active:scale-[0.985] active:bg-slate-50/80">
      <div className="relative">
        <WorkIcon message />
        {unread ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#ff304f] ring-[3px] ring-white" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className={`truncate text-[15px] tracking-[-0.02em] text-slate-950 ${unread ? "font-semibold" : "font-medium"}`}>{item.order.title}</h2>
          <time className="shrink-0 text-[11px] font-medium text-slate-400">{formatChatTimestamp(item.latestAt, locale)}</time>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-[13px] ${unread ? "font-medium text-slate-800" : "text-slate-500"}`}>{getMessageText(item.latestMessage, fallback)}</p>
          {unread ? <span className="flex min-w-5 items-center justify-center rounded-full bg-[#ff304f] px-1.5 py-0.5 text-[10px] font-semibold text-white">{item.unreadCount > 99 ? "99+" : item.unreadCount}</span> : null}
        </div>
      </div>
      <span className="shrink-0 text-slate-300 transition duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500"><ChevronIcon /></span>
    </Link>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <span className="mx-auto flex h-13 w-13 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100"><EmptyIcon /></span>
      <h2 className="mt-4 text-[16px] font-semibold tracking-[-0.025em] text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-slate-500">{body}</p>
    </div>
  );
}

export default function CreatorJobsPage() {
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [tab, setTab] = useState<TabKey>("jobs");
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const copy = safeLocale === "ja"
    ? {
        title: "仕事",
        jobs: "進行中",
        messages: "メッセージ",
        emptyJobs: "進行中の仕事はありません",
        emptyJobsBody: "成立した依頼は、ここで準備から納品まで進めます。",
        emptyMessages: "メッセージはありません",
        emptyMessagesBody: "案件のやりとりが始まると、ここに表示されます。",
        noMessage: "まだメッセージはありません",
        loadError: "仕事を読み込めませんでした。",
        retry: "再読み込み",
      }
    : {
        title: "Jobs",
        jobs: "Active",
        messages: "Messages",
        emptyJobs: "No active jobs",
        emptyJobsBody: "Accepted work will appear here from preparation through delivery.",
        emptyMessages: "No messages",
        emptyMessagesBody: "Job conversations will appear here.",
        noMessage: "No messages yet",
        loadError: "Could not load jobs.",
        retry: "Reload",
      };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        window.location.assign("/login?next=/creator/jobs");
        return;
      }

      const { data, error: orderError } = await supabase
        .from("orders")
        .select("id, created_at, updated_at, status, payment_status, product_name, menu_title_snapshot, fulfillment_type, preparation_status")
        .eq("creator_user_id", user.id)
        .in("status", ["accepted_captured", "in_progress", "revision_requested", "delivered"])
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (orderError) throw orderError;

      const nextOrders: ActiveOrder[] = ((data ?? []) as unknown as OrderRow[]).map((order) => ({
        id: order.id,
        title: getOrderTitle(order),
        status: order.status,
        updatedAt: order.updated_at,
        createdAt: order.created_at,
        fulfillmentType: order.fulfillment_type ?? null,
        preparationStatus: order.preparation_status ?? null,
      }));

      setOrders(nextOrders);
      const orderIds = nextOrders.map((order) => order.id);
      if (orderIds.length === 0) {
        setChatItems([]);
        return;
      }

      const { data: chatData, error: chatError } = await supabase
        .from("chats")
        .select("id, order_id, last_message_at, chat_reads(user_id, last_read_at)")
        .in("order_id", orderIds);

      if (chatError) {
        setChatItems(nextOrders.map((order) => ({
          order,
          latestMessage: null,
          unreadCount: 0,
          latestAt: order.updatedAt || order.createdAt,
        })));
        return;
      }

      const chats = (chatData ?? []) as unknown as ChatRow[];
      const chatByOrder = new Map(
        chats.filter((chat) => chat.order_id).map((chat) => [chat.order_id as string, chat])
      );
      const chatIds = chats.map((chat) => chat.id).filter(Boolean);
      const messagesByChat = new Map<string, MessageRow[]>();

      if (chatIds.length > 0) {
        const { data: messageData, error: messageError } = await supabase
          .from("messages")
          .select("*")
          .in("chat_id", chatIds)
          .order("created_at", { ascending: false })
          .limit(200);

        if (!messageError) {
          ((messageData ?? []) as MessageRow[]).forEach((message) => {
            if (!message.chat_id) return;
            const current = messagesByChat.get(message.chat_id) ?? [];
            current.push(message);
            messagesByChat.set(message.chat_id, current);
          });
        }
      }

      const nextChats = nextOrders
        .map((order) => {
          const chat = chatByOrder.get(order.id) ?? null;
          const messages = chat ? messagesByChat.get(chat.id) ?? [] : [];
          const latestMessage = messages[0] ?? null;
          return {
            order,
            latestMessage,
            unreadCount: countUnreadMessages(chat, messages, user.id),
            latestAt: latestMessage?.created_at ?? chat?.last_message_at ?? order.updatedAt ?? order.createdAt,
          };
        })
        .sort((a, b) =>
          b.unreadCount - a.unreadCount ||
          new Date(b.latestAt ?? b.order.createdAt).getTime() -
            new Date(a.latestAt ?? a.order.createdAt).getTime()
        );

      setChatItems(nextChats);
    } catch (loadError) {
      console.error("creator active jobs load error", loadError);
      setOrders([]);
      setChatItems([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const channel = supabase
      .channel("creator-active-work-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void loadJobs())
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => void loadJobs())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void loadJobs())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads" }, () => void loadJobs())
      .subscribe();

    const onFocus = () => void loadJobs();
    window.addEventListener("focus", onFocus);
    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadJobs, supabase]);

  const unreadTotal = chatItems.reduce((sum, item) => sum + item.unreadCount, 0);

  return (
    <div className="mx-auto w-full max-w-3xl pb-5 pt-3">
      <header className="flex items-end justify-between px-1 pb-3 pt-2">
        <h1 className="text-[27px] font-semibold tracking-[-0.05em] text-slate-950">{copy.title}</h1>
        <p className="pb-1 text-xs font-medium text-slate-400">{orders.length}</p>
      </header>

      <nav className="flex border-b border-slate-200/80" aria-label={copy.title}>
        <button type="button" onClick={() => setTab("jobs")} className={`relative min-h-11 flex-1 px-4 text-[13px] font-medium transition duration-200 active:opacity-60 ${tab === "jobs" ? "text-slate-950" : "text-slate-400"}`}>
          {copy.jobs}<span className="ml-1.5 text-[11px] text-slate-400">{orders.length}</span>
          {tab === "jobs" ? <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-slate-950" /> : null}
        </button>
        <button type="button" onClick={() => setTab("messages")} className={`relative min-h-11 flex-1 px-4 text-[13px] font-medium transition duration-200 active:opacity-60 ${tab === "messages" ? "text-slate-950" : "text-slate-400"}`}>
          <span className="relative inline-flex items-center">
            {copy.messages}
            {unreadTotal > 0 ? <span className="absolute -right-3 -top-1 h-2 w-2 rounded-full bg-[#ff304f]" /> : null}
          </span>
          {unreadTotal > 0 ? <span className="ml-1.5 text-[11px] text-slate-400">{unreadTotal}</span> : null}
          {tab === "messages" ? <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-slate-950" /> : null}
        </button>
      </nav>

      <section className="mt-3 overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.045)] ring-1 ring-slate-200/70" aria-busy={loading}>
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex h-[112px] items-center gap-4 px-4">
                <div className="h-11 w-11 animate-pulse rounded-[14px] bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">{copy.loadError}</p>
            <button type="button" onClick={() => void loadJobs()} className="mt-5 min-h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition active:scale-[0.97]">{copy.retry}</button>
          </div>
        ) : tab === "jobs" ? (
          orders.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {orders.map((order) => <JobRow key={order.id} order={order} locale={safeLocale} />)}
            </div>
          ) : <EmptyState title={copy.emptyJobs} body={copy.emptyJobsBody} />
        ) : chatItems.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {chatItems.map((item) => <ChatRowItem key={item.order.id} item={item} locale={safeLocale} fallback={copy.noMessage} />)}
          </div>
        ) : <EmptyState title={copy.emptyMessages} body={copy.emptyMessagesBody} />}
      </section>
    </div>
  );
}
