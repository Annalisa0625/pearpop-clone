"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

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
  latestMessage: MessageRow | null;
  unreadCount: number;
  latestAt: string | null;
};

type TabKey = "jobs" | "messages";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BriefcaseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="7" width="16" height="13" rx="3" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16M10 12v2h4v-2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M7.5 9.5h9M7.5 13h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <path d="M5 12.5 10 17 19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

function getStatus(order: ActiveOrder, locale: "ja" | "en") {
  if (order.status === "revision_requested") {
    return {
      label: locale === "ja" ? "修正対応が必要" : "Revision required",
      body: locale === "ja" ? "修正内容を確認して、再提出へ進んでください。" : "Review the requested changes and submit again.",
      tone: "rose" as const,
      action: true,
    };
  }

  if (order.status === "delivered") {
    return {
      label: locale === "ja" ? "確認待ち" : "Waiting for review",
      body: locale === "ja" ? "依頼元の確認が完了するまでお待ちください。" : "Waiting for the requester to review the delivery.",
      tone: "blue" as const,
      action: false,
    };
  }

  if (order.fulfillmentType === "product_shipping") {
    if (order.preparationStatus === "waiting_shipping_address") {
      return {
        label: locale === "ja" ? "配送先を入力" : "Add shipping address",
        body: locale === "ja" ? "商品を受け取るために配送先の登録が必要です。" : "Add an address so the product can be shipped.",
        tone: "amber" as const,
        action: true,
      };
    }
    if (["waiting_shipment", "shipped"].includes(order.preparationStatus ?? "")) {
      return {
        label: locale === "ja" ? "商品の到着待ち" : "Waiting for product",
        body: locale === "ja" ? "発送状況を確認し、商品が届いたら受取確認へ進みます。" : "Check shipping and confirm when the product arrives.",
        tone: "blue" as const,
        action: false,
      };
    }
  }

  if (order.fulfillmentType === "visit" && !["schedule_confirmed", "ready_to_start"].includes(order.preparationStatus ?? "")) {
    return {
      label: locale === "ja" ? "日程を調整" : "Schedule the visit",
      body: locale === "ja" ? "来店日・場所・撮影ルールを依頼元と調整してください。" : "Coordinate the visit date, location, and rules.",
      tone: "amber" as const,
      action: true,
    };
  }

  if (order.fulfillmentType === "material_provided" && ["waiting_materials", "materials_provided"].includes(order.preparationStatus ?? "")) {
    return {
      label: locale === "ja" ? "素材を確認" : "Review materials",
      body: locale === "ja" ? "提供された素材を確認し、作業開始の準備を進めてください。" : "Review the supplied materials and prepare to start.",
      tone: "amber" as const,
      action: true,
    };
  }

  return {
    label: locale === "ja" ? "進行中" : "In progress",
    body: locale === "ja" ? "案件詳細を確認して、次の作業を進めてください。" : "Review the job details and continue the next task.",
    tone: "slate" as const,
    action: false,
  };
}

function ToneBadge({ tone, children }: { tone: "rose" | "blue" | "amber" | "slate"; children: ReactNode }) {
  const className =
    tone === "rose"
      ? "bg-rose-50 text-[#ff4765]"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${className}`}>{children}</span>;
}

function JobCard({ order, locale }: { order: ActiveOrder; locale: "ja" | "en" }) {
  const status = getStatus(order, locale);

  return (
    <Link href={`/creator/orders/${order.id}`} className="group block rounded-[22px] bg-white px-4 py-4 ring-1 ring-slate-200/70 transition active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${status.action ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`}>
          <BriefcaseIcon />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">Trend Mart</span>
            <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
          </div>

          <div className="mt-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-bold tracking-[-0.035em] text-slate-950">{order.title}</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{status.body}</p>
            </div>
            <span className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"><ArrowIcon /></span>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-400">
            {locale === "ja" ? "更新" : "Updated"} {formatDate(order.updatedAt || order.createdAt, locale)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ChatCard({ item, locale, fallback }: { item: ChatItem; locale: "ja" | "en"; fallback: string }) {
  const unread = item.unreadCount > 0;
  return (
    <Link href={`/creator/chats/${item.order.id}`} className={`group flex items-center gap-3 rounded-[22px] px-4 py-4 ring-1 transition active:scale-[0.99] ${unread ? "bg-white ring-violet-200" : "bg-white ring-slate-200/70"}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${unread ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
        <MessageIcon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className={`truncate text-[16px] tracking-[-0.03em] text-slate-950 ${unread ? "font-bold" : "font-semibold"}`}>{item.order.title}</h2>
          <span className={`shrink-0 text-[11px] font-medium ${unread ? "text-violet-700" : "text-slate-400"}`}>{formatChatTimestamp(item.latestAt, locale)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-semibold text-slate-700" : "font-medium text-slate-500"}`}>{getMessageText(item.latestMessage, fallback)}</p>
          {unread ? <span className="flex min-w-5 items-center justify-center rounded-full bg-[#ff4765] px-1.5 py-0.5 text-[10px] font-bold text-white">{item.unreadCount > 99 ? "99+" : item.unreadCount}</span> : null}
        </div>
      </div>
      <span className="text-slate-300 transition group-hover:translate-x-0.5"><ArrowIcon /></span>
    </Link>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[24px] bg-white px-6 py-12 text-center ring-1 ring-slate-200/70">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100"><EmptyIcon /></span>
      <h2 className="mt-5 text-lg font-bold tracking-[-0.035em] text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">{body}</p>
    </section>
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
        eyebrow: "成立後",
        title: "Job",
        description: "承認済みの案件と、進行に必要なやりとりを確認します。",
        jobs: "案件",
        messages: "メッセージ",
        active: "進行中",
        unread: "未読",
        emptyJobs: "進行中のJobはありません",
        emptyJobsBody: "Orderを承認した案件や、企業に承認された見積もりがここへ移動します。",
        emptyMessages: "メッセージはありません",
        emptyMessagesBody: "進行中のJobでやりとりが始まると、ここに表示されます。",
        noMessage: "まだメッセージはありません",
        loadError: "Jobを読み込めませんでした。",
        retry: "もう一度試す",
      }
    : {
        eyebrow: "After agreement",
        title: "Job",
        description: "Manage accepted work and the conversations needed to complete it.",
        jobs: "Jobs",
        messages: "Messages",
        active: "Active",
        unread: "Unread",
        emptyJobs: "No active jobs",
        emptyJobsBody: "Accepted orders and approved quotes will move here.",
        emptyMessages: "No messages",
        emptyMessagesBody: "Conversations for active jobs will appear here.",
        noMessage: "No messages yet",
        loadError: "Could not load Job.",
        retry: "Try again",
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
        console.warn("creator active chats load skipped", chatError);
        setChatItems(nextOrders.map((order) => ({ order, latestMessage: null, unreadCount: 0, latestAt: order.updatedAt || order.createdAt })));
        return;
      }

      const chats = (chatData ?? []) as unknown as ChatRow[];
      const chatByOrder = new Map(chats.filter((chat) => chat.order_id).map((chat) => [chat.order_id as string, chat]));
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
        .sort((a, b) => b.unreadCount - a.unreadCount || new Date(b.latestAt ?? b.order.createdAt).getTime() - new Date(a.latestAt ?? a.order.createdAt).getTime());

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
    <div className="mx-auto w-full max-w-3xl pb-4 pt-3">
      <section className="px-1 pb-5 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff4765]">{copy.eyebrow}</p>
        <h1 className="mt-2 text-[34px] font-bold tracking-[-0.06em] text-slate-950">{copy.title}</h1>
        <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-slate-500">{copy.description}</p>
      </section>

      <section className="grid grid-cols-2 overflow-hidden rounded-[24px] bg-[#121117] text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
        <div className="border-r border-white/10 px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{copy.active}</p>
          <p className="mt-2 text-[30px] font-bold tracking-[-0.06em]">{orders.length}</p>
        </div>
        <div className="px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{copy.unread}</p>
          <p className="mt-2 text-[30px] font-bold tracking-[-0.06em]">{unreadTotal}</p>
        </div>
      </section>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setTab("jobs")} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition ${tab === "jobs" ? "bg-slate-950 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200/70"}`}>
          <BriefcaseIcon className="h-4 w-4" />
          {copy.jobs}
          <span className={tab === "jobs" ? "text-white/55" : "text-slate-400"}>{orders.length}</span>
        </button>
        <button type="button" onClick={() => setTab("messages")} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition ${tab === "messages" ? "bg-slate-950 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200/70"}`}>
          <MessageIcon className="h-4 w-4" />
          {copy.messages}
          <span className={tab === "messages" ? "text-white/55" : "text-slate-400"}>{unreadTotal}</span>
        </button>
      </div>

      <section className="mt-3 space-y-3" aria-busy={loading}>
        {loading ? (
          [0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-[22px] bg-white ring-1 ring-slate-100" />)
        ) : error ? (
          <div className="rounded-[22px] bg-white px-6 py-10 text-center ring-1 ring-slate-200/70">
            <p className="text-base font-bold text-slate-950">{copy.loadError}</p>
            <button type="button" onClick={() => void loadJobs()} className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">{copy.retry}</button>
          </div>
        ) : tab === "jobs" ? (
          orders.length > 0
            ? orders.map((order) => <JobCard key={order.id} order={order} locale={safeLocale} />)
            : <EmptyState title={copy.emptyJobs} body={copy.emptyJobsBody} />
        ) : chatItems.length > 0 ? (
          chatItems.map((item) => <ChatCard key={item.order.id} item={item} locale={safeLocale} fallback={copy.noMessage} />)
        ) : (
          <EmptyState title={copy.emptyMessages} body={copy.emptyMessagesBody} />
        )}
      </section>
    </div>
  );
}
