// File: app/components/ChatEmbed.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type ChatEmbedProps = {
  requestId?: string;
  orderId?: string;
  userId?: string;
  title?: string;
  subtitle?: string;
  variant?: "embedded" | "page";
  showHeader?: boolean;
};

type ChatRow = {
  id: string;
  request_id: string | null;
  order_id: string | null;
  company_user_id: string;
  creator_user_id: string;
  created_at: string;
  last_message_at: string | null;
};

type MessageRow = {
  id: string;
  chat_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
};

const AUTH_TIMEOUT_MS = 8000;
const CHAT_TIMEOUT_MS = 12000;
const MESSAGE_TIMEOUT_MS = 12000;
const SEND_TIMEOUT_MS = 15000;

function notifyUnreadStateChanged(chatId?: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("trendre:chat-read-changed", {
      detail: { chatId: chatId ?? null },
    })
  );

  window.dispatchEvent(new Event("focus"));
}

function withTimeout<T = any>(
  promiseLike: PromiseLike<T> | T,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = Promise.resolve(promiseLike);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  ms: number,
  timeoutMessage: string
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => {
    controller.abort();
  }, ms);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    const isAbort =
      error instanceof DOMException && error.name === "AbortError";

    if (isAbort) {
      throw new Error(timeoutMessage);
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function formatMessageTime(value: string, locale: "ja" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMessageDate(value: string, locale: "ja" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}

function isDifferentDay(a: string, b: string) {
  const dateA = new Date(a);
  const dateB = new Date(b);

  if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) {
    return true;
  }

  return dateA.toDateString() !== dateB.toDateString();
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4.5 19.5 20 12 4.5 4.5v5.7L13 12l-8.5 1.8v5.7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4A3.5 3.5 0 0 1 15.5 14H11l-5 4v-4.3A3.5 3.5 0 0 1 5 11V6.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyState({
  title,
  body,
  compact,
}: {
  title: string;
  body: string;
  compact: boolean;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="max-w-sm text-center">
        <div
          className={`mx-auto flex items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-100 ${
            compact ? "h-11 w-11" : "h-14 w-14"
          }`}
        >
          <ChatBubbleIcon />
        </div>
        <p className="mt-4 text-sm font-black text-slate-800">{title}</p>
        <p className="mt-2 text-xs font-semibold leading-6 text-slate-400">
          {body}
        </p>
      </div>
    </div>
  );
}

export default function ChatEmbed({
  requestId,
  orderId,
  userId,
  title = "チャット",
  subtitle,
  variant = "embedded",
  showHeader = true,
}: ChatEmbedProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";
  const isPage = variant === "page";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title,
            subtitle: subtitle ?? "この注文に関する連絡をここで行えます。",
            loading: "読み込み中...",
            loginError: "ログイン情報を取得できませんでした。",
            orderChatError: "注文チャットの取得に失敗しました。",
            idRequired: "requestId または orderId が必要です。",
            fetchError: "チャット取得エラー",
            noChat: "まだチャットが作成されていません。",
            empty: "まだメッセージはありません",
            emptyBody:
              "必要な確認がある場合だけ、ここからメッセージを送れます。",
            placeholder: "メッセージを入力",
            sending: "送信中",
            send: "送信",
            sendError: "送信エラー",
            me: "自分",
            partner: "相手",
            today: "今日",
          }
        : {
            title: title === "チャット" ? "Chat" : title,
            subtitle: subtitle ?? "Use this chat for messages about this order.",
            loading: "Loading...",
            loginError: "Could not retrieve your login session.",
            orderChatError: "Failed to load order chat.",
            idRequired: "requestId or orderId is required.",
            fetchError: "Chat fetch error",
            noChat: "Chat has not been created yet.",
            empty: "No messages yet",
            emptyBody: "Send a message here only when you need to confirm something.",
            placeholder: "Type a message",
            sending: "Sending",
            send: "Send",
            sendError: "Send error",
            me: "Me",
            partner: "Partner",
            today: "Today",
          },
    [safeLocale, title, subtitle]
  );

  const [chat, setChat] = useState<ChatRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    userId ?? null
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior });
    });
  };

  const addMessageIfNotExists = (msg: MessageRow) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === msg.id);
      if (exists) return prev;
      return [...prev, msg];
    });
  };

  const markChatAsRead = async (chatId: string, uid: string) => {
    if (!chatId || !uid) return false;

    const now = new Date().toISOString();

    const { error: upsertError } = await supabase.from("chat_reads").upsert(
      {
        chat_id: chatId,
        user_id: uid,
        last_read_at: now,
        updated_at: now,
      },
      {
        onConflict: "chat_id,user_id",
      }
    );

    if (upsertError) {
      console.error("chat read upsert error:", upsertError);
      return false;
    }

    notifyUnreadStateChanged(chatId);
    return true;
  };

  useEffect(() => {
    const fetchAuthedUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        setCurrentUserId(user.id);
      } else if (userId) {
        setCurrentUserId(userId);
      }
    };

    void fetchAuthedUser();
  }, [supabase, userId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let chatRow: ChatRow | null = null;

        if (orderId) {
          const sessionResult: any = await withTimeout(
            supabase.auth.getSession(),
            AUTH_TIMEOUT_MS,
            copy.loginError
          );

          const accessToken =
            sessionResult?.data?.session?.access_token ?? null;

          if (!accessToken) {
            setError(copy.loginError);
            setLoading(false);
            return;
          }

          const res = await fetchWithTimeout(
            `/api/orders/${orderId}/chat`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
            CHAT_TIMEOUT_MS,
            copy.orderChatError
          );

          const json = await res.json().catch(() => ({}));

          if (!res.ok) {
            setError(json?.error ?? copy.orderChatError);
            setLoading(false);
            return;
          }

          chatRow = (json?.chat as ChatRow | null) ?? null;
        } else if (requestId) {
          const result: any = await withTimeout(
            supabase
              .from("chats")
              .select(
                "id, request_id, order_id, company_user_id, creator_user_id, created_at, last_message_at"
              )
              .eq("request_id", requestId)
              .maybeSingle(),
            CHAT_TIMEOUT_MS,
            copy.fetchError
          );

          if (result?.error) {
            setError(result.error.message);
            setLoading(false);
            return;
          }

          chatRow = (result?.data as ChatRow | null) ?? null;
        } else {
          setError(copy.idRequired);
          setLoading(false);
          return;
        }

        if (!chatRow) {
          setChat(null);
          setMessages([]);
          setLoading(false);
          return;
        }

        setChat(chatRow);

        const messageResult: any = await withTimeout(
          supabase
            .from("messages")
            .select("id, chat_id, sender_user_id, content, created_at")
            .eq("chat_id", chatRow.id)
            .order("created_at", { ascending: true }),
          MESSAGE_TIMEOUT_MS,
          copy.fetchError
        );

        if (messageResult?.error) {
          setError(messageResult.error.message);
          setLoading(false);
          return;
        }

        setMessages((messageResult?.data ?? []) as MessageRow[]);

        if (currentUserId) {
          await markChatAsRead(chatRow.id, currentUserId);
        }
      } catch (e: any) {
        setError(e?.message ?? copy.fetchError);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [requestId, orderId, supabase, currentUserId, copy]);

  useEffect(() => {
    if (!chat?.id) return;

    const channel = supabase
      .channel(`messages-chat-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as MessageRow;

          addMessageIfNotExists(newMsg);
          scrollToBottom();

          if (currentUserId && newMsg.sender_user_id !== currentUserId) {
            await markChatAsRead(chat.id, currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chat?.id, supabase, currentUserId]);

  useEffect(() => {
    if (!loading) {
      scrollToBottom("auto");
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const content = text.trim();

    if (!content || !chat?.id || sending || !currentUserId) return;

    setSending(true);
    setError(null);

    try {
      const insertResult: any = await withTimeout(
        supabase
          .from("messages")
          .insert({
            chat_id: chat.id,
            sender_user_id: currentUserId,
            content,
          })
          .select("id, chat_id, sender_user_id, content, created_at")
          .single(),
        SEND_TIMEOUT_MS,
        copy.sendError
      );

      if (insertResult?.error) {
        setError(insertResult.error.message);
        setSending(false);
        return;
      }

      const inserted = insertResult?.data as MessageRow | null;

      if (inserted) {
        addMessageIfNotExists(inserted);
      }

      const now = new Date().toISOString();

      const { error: chatUpdateError } = await supabase
        .from("chats")
        .update({
          last_message_at: now,
        })
        .eq("id", chat.id);

      if (chatUpdateError) {
        console.error("chat last_message_at update error:", chatUpdateError);
      } else {
        setChat((prev) =>
          prev
            ? {
                ...prev,
                last_message_at: now,
              }
            : prev
        );
      }

      await markChatAsRead(chat.id, currentUserId);

      setText("");
      scrollToBottom();
      inputRef.current?.focus();
    } catch (e: any) {
      setError(e?.message ?? copy.sendError);
    } finally {
      setSending(false);
    }
  };

  const shellClass = isPage
    ? "flex h-full min-h-[520px] flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_14px_44px_rgba(15,23,42,0.04)]"
    : "flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm";

  const messageAreaClass = isPage
    ? "min-h-[430px] flex-1 overflow-y-auto bg-[#F8F9FA] px-3 py-4 sm:px-5"
    : "h-[420px] overflow-y-auto bg-[#F8F9FA] px-3 py-4 sm:px-5";

  return (
    <div className={shellClass}>
      {showHeader ? (
        <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-black tracking-[-0.03em] text-slate-950">
                {copy.title}
              </h2>
              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100">
              <ChatBubbleIcon />
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className={messageAreaClass}>
          <div className="flex h-full items-center justify-center">
            <div className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-400 ring-1 ring-slate-100">
              {copy.loading}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className={messageAreaClass}>
          <div className="mx-auto mt-4 max-w-md rounded-[22px] border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-7 text-rose-700">
            {error}
          </div>
        </div>
      ) : !chat ? (
        <div className={messageAreaClass}>
          <EmptyState title={copy.noChat} body={copy.emptyBody} compact={isPage} />
        </div>
      ) : (
        <>
          <div className={messageAreaClass}>
            {messages.length === 0 ? (
              <EmptyState title={copy.empty} body={copy.emptyBody} compact={isPage} />
            ) : (
              <div className="space-y-3">
                {messages.map((msg, index) => {
                  const isMine =
                    !!currentUserId && msg.sender_user_id === currentUserId;

                  const previous = messages[index - 1] ?? null;
                  const showDate =
                    !previous || isDifferentDay(previous.created_at, msg.created_at);

                  return (
                    <div key={msg.id}>
                      {showDate ? (
                        <div className="my-4 flex justify-center">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-400 ring-1 ring-slate-100">
                            {formatMessageDate(msg.created_at, safeLocale)}
                          </span>
                        </div>
                      ) : null}

                      <div
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex max-w-[82%] flex-col ${
                            isMine ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`rounded-[22px] px-4 py-3 text-sm shadow-sm ${
                              isMine
                                ? "rounded-br-md bg-slate-950 text-white"
                                : "rounded-bl-md bg-white text-slate-950 ring-1 ring-slate-100"
                            }`}
                          >
                            <div className="whitespace-pre-wrap break-words leading-6">
                              {msg.content}
                            </div>
                          </div>

                          <div
                            className={`mt-1 px-1 text-[10px] font-semibold text-slate-400 ${
                              isMine ? "text-right" : "text-left"
                            }`}
                          >
                            {formatMessageTime(msg.created_at, safeLocale)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white p-3">
            <div className="flex items-end gap-2 rounded-[24px] bg-slate-50 p-2 ring-1 ring-slate-100">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={copy.placeholder}
                rows={1}
                className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !text.trim() || !currentUserId}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff5f67] text-white shadow-[0_10px_24px_rgba(255,95,103,0.22)] transition active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                aria-label={sending ? copy.sending : copy.send}
              >
                {sending ? (
                  <span className="text-[10px] font-black">...</span>
                ) : (
                  <SendIcon />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}