// File: app/creator/chats/[id]/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  product_name: string | null;
  menu_title_snapshot: string | null;
  creator_user_id: string | null;
};

type ChatRow = {
  id: string;
  order_id: string | null;
  request_id?: string | null;
  last_message_at: string | null;
};

type MessageRow = {
  id: string;
  chat_id: string | null;
  sender_user_id?: string | null;
  user_id?: string | null;
  body?: string | null;
  content?: string | null;
  message?: string | null;
  text?: string | null;
  created_at: string | null;
};

function getOrderTitle(order: OrderRow | null, fallback: string) {
  const productName = order?.product_name?.trim();
  const menuName = order?.menu_title_snapshot?.trim();
  return productName || menuName || fallback;
}

function getMessageText(message: MessageRow) {
  return String(
    message.body ??
      message.content ??
      message.message ??
      message.text ??
      ""
  );
}

function getSenderId(message: MessageRow) {
  return message.sender_user_id ?? message.user_id ?? null;
}

function formatMessageTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m15 5-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4.5 11.5 19 4.5l-7 15-1.8-6.2-5.7-1.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m10.2 13.3 4.1-4.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoadingView() {
  return (
    <main className="flex min-h-[calc(100vh-92px)] flex-col bg-[#f8f9fa]">
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-4">
        <div className="h-14 w-2/3 animate-pulse rounded-[20px] bg-white" />
        <div className="ml-auto h-14 w-2/3 animate-pulse rounded-[20px] bg-rose-100/60" />
        <div className="h-14 w-1/2 animate-pulse rounded-[20px] bg-white" />
      </div>
    </main>
  );
}

function EmptyChat({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto mt-10 max-w-[280px] rounded-[24px] bg-white px-5 py-8 text-center ring-1 ring-slate-100">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
        <SendIcon />
      </div>
      <p className="mt-4 text-[15px] font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-[12px] font-medium leading-6 text-slate-500">{body}</p>
    </div>
  );
}

function Bubble({
  message,
  currentUserId,
  locale,
}: {
  message: MessageRow;
  currentUserId: string | null;
  locale: "ja" | "en";
}) {
  const mine = Boolean(currentUserId && getSenderId(message) === currentUserId);
  const body = getMessageText(message);

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-[20px] px-4 py-2.5 text-[14px] font-medium leading-6 shadow-sm ${
            mine
              ? "rounded-br-[6px] bg-[#ff3860] text-white"
              : "rounded-bl-[6px] bg-white text-slate-800 ring-1 ring-slate-100"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{body}</p>
        </div>
        <p className="mt-1 px-1 text-[10px] font-medium text-slate-400">
          {formatMessageTime(message.created_at, locale)}
        </p>
      </div>
    </div>
  );
}

export default function CreatorChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            fallbackTitle: "やりとり",
            subtitle: "依頼元とのメッセージ",
            emptyTitle: "まだメッセージはありません",
            emptyBody: "確認したいことがあれば、ここから相談できます。",
            inputPlaceholder: "メッセージを入力",
            sendError: "送信に失敗しました。時間をおいてもう一度お試しください。",
            loadError: "チャットを読み込めませんでした。",
            noChat: "この案件のチャットはまだ作成されていません。",
          }
        : {
            fallbackTitle: "Chat",
            subtitle: "Messages with the requester",
            emptyTitle: "No messages yet",
            emptyBody: "Ask anything you need to confirm here.",
            inputPlaceholder: "Type a message",
            sendError: "Failed to send. Please try again later.",
            loadError: "Failed to load chat.",
            noChat: "This order does not have a chat yet.",
          },
    [safeLocale]
  );

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [chat, setChat] = useState<ChatRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderId = String(params?.id ?? "");

  const markAsRead = useCallback(
    async (chatId: string, userId: string) => {
      try {
        await (supabase as any).from("chat_reads").upsert(
          {
            chat_id: chatId,
            user_id: userId,
            last_read_at: new Date().toISOString(),
          },
          {
            onConflict: "chat_id,user_id",
          }
        );
      } catch (error) {
        console.warn("creator chat read mark skipped:", error);
      }
    },
    [supabase]
  );

  const loadChat = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          updated_at,
          status,
          product_name,
          menu_title_snapshot,
          creator_user_id
        `
        )
        .eq("id", orderId)
        .eq("creator_user_id", user.id)
        .maybeSingle();

      if (orderError || !orderData) {
        console.error("creator chat order load error:", orderError);
        setError(copy.loadError);
        setOrder(null);
        setChat(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      const nextOrder = orderData as unknown as OrderRow;
      setOrder(nextOrder);

      const { data: chatData, error: chatError } = await supabase
        .from("chats")
        .select("id, order_id, last_message_at")
        .eq("order_id", nextOrder.id)
        .maybeSingle();

      if (chatError) {
        console.error("creator chat load error:", chatError);
        setError(copy.loadError);
        setChat(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      const nextChat = (chatData ?? null) as ChatRow | null;
      setChat(nextChat);

      if (!nextChat) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", nextChat.id)
        .order("created_at", { ascending: true });

      if (messageError) {
        console.error("creator messages load error:", messageError);
        setError(copy.loadError);
        setMessages([]);
        setLoading(false);
        return;
      }

      setMessages((messageData ?? []) as MessageRow[]);
      await markAsRead(nextChat.id, user.id);
      setLoading(false);
    } catch (error) {
      console.error("creator chat load error:", error);
      setError(copy.loadError);
      setLoading(false);
    }
  }, [copy.loadError, markAsRead, orderId, router, supabase]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  useEffect(() => {
    if (!chat?.id) return;

    const channel = supabase
      .channel(`creator-chat-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        () => {
          void loadChat();
        }
      )
      .subscribe();

    const onFocus = () => {
      void loadChat();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [chat?.id, loadChat, supabase]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !chat?.id || !currentUserId || sending) return;

    setSending(true);
    setError(null);

    const basePayloads = [
      { chat_id: chat.id, sender_user_id: currentUserId, body: text },
      { chat_id: chat.id, user_id: currentUserId, body: text },
      { chat_id: chat.id, sender_user_id: currentUserId, content: text },
      { chat_id: chat.id, user_id: currentUserId, content: text },
    ];

    try {
      let sent = false;
      let lastError: unknown = null;

      for (const payload of basePayloads) {
        const { error: sendError } = await (supabase as any)
          .from("messages")
          .insert(payload);

        if (!sendError) {
          sent = true;
          break;
        }

        lastError = sendError;
      }

      if (!sent) {
        console.error("creator chat send error:", lastError);
        setError(copy.sendError);
        setSending(false);
        return;
      }

      await (supabase as any)
        .from("chats")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", chat.id);

      setDraft("");
      await loadChat();
      setSending(false);
    } catch (error) {
      console.error("creator chat send error:", error);
      setError(copy.sendError);
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingView />;
  }

  const title = getOrderTitle(order, copy.fallbackTitle);

  return (
    <main className="flex min-h-[calc(100vh-92px)] flex-col bg-[#f8f9fa]">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-700 ring-1 ring-slate-100 active:scale-95"
            aria-label="back"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold tracking-[-0.035em] text-slate-950">
              {title}
            </h1>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {copy.subtitle}
            </p>
          </div>

          <Link
            href={order ? `/creator/orders/${order.id}` : "/creator/jobs"}
            className="rounded-full bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-100"
          >
            {safeLocale === "ja" ? "詳細" : "Details"}
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        {error ? (
          <div className="mb-3 rounded-[18px] bg-rose-50 px-4 py-3 text-[12px] font-semibold leading-5 text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {!chat ? (
          <EmptyChat title={copy.emptyTitle} body={copy.noChat} />
        ) : messages.length === 0 ? (
          <EmptyChat title={copy.emptyTitle} body={copy.emptyBody} />
        ) : (
          <div className="flex flex-1 flex-col justify-end space-y-3 pb-3">
            {messages.map((message) => (
              <Bubble
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                locale={safeLocale}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </section>

      <footer className="sticky bottom-0 z-20 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void sendMessage();
              }
            }}
            disabled={!chat || sending}
            rows={1}
            placeholder={copy.inputPlaceholder}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-medium leading-5 text-slate-950 outline-none placeholder:text-slate-400 focus:border-[#ff3860] focus:bg-white focus:ring-4 focus:ring-rose-50 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!chat || sending || draft.trim().length === 0}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ff3860] text-white shadow-[0_10px_22px_rgba(255,56,96,0.22)] transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            aria-label="send"
          >
            <SendIcon />
          </button>
        </div>
      </footer>
    </main>
  );
}
