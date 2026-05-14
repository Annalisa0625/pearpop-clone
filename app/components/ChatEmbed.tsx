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

function notifyUnreadStateChanged(chatId?: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("trendre:chat-read-changed", {
      detail: { chatId: chatId ?? null },
    })
  );

  window.dispatchEvent(new Event("focus"));
}

function formatMessageTime(value: string, locale: "ja" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export default function ChatEmbed({
  requestId,
  orderId,
  userId,
  title = "チャット",
}: ChatEmbedProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title,
            subtitle: "この注文・依頼に関する連絡をここで行えます。",
            loading: "読み込み中...",
            loginError: "ログイン情報を取得できませんでした。",
            orderChatError: "注文チャットの取得に失敗しました。",
            idRequired: "requestId または orderId が必要です。",
            fetchError: "チャット取得エラー",
            noChat: "まだチャットが作成されていません。",
            empty: "まだメッセージはありません。",
            emptyBody: "必要な確認事項や連絡があれば、ここにメッセージを送信できます。",
            placeholder: "メッセージを入力",
            sending: "送信中",
            send: "送信",
            sendError: "送信エラー",
            me: "自分",
            partner: "相手",
          }
        : {
            title: title === "チャット" ? "Chat" : title,
            subtitle: "Use this chat for messages about this order or request.",
            loading: "Loading...",
            loginError: "Could not retrieve your login session.",
            orderChatError: "Failed to load order chat.",
            idRequired: "requestId or orderId is required.",
            fetchError: "Chat fetch error",
            noChat: "Chat has not been created yet.",
            empty: "No messages yet.",
            emptyBody: "Send a message here if you need to confirm anything.",
            placeholder: "Type a message",
            sending: "Sending",
            send: "Send",
            sendError: "Send error",
            me: "Me",
            partner: "Partner",
          },
    [safeLocale, title]
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
          const {
            data: { session },
          } = await supabase.auth.getSession();

          const accessToken = session?.access_token ?? null;

          if (!accessToken) {
            setError(copy.loginError);
            setLoading(false);
            return;
          }

          const res = await fetch(`/api/orders/${orderId}/chat`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const json = await res.json().catch(() => ({}));

          if (!res.ok) {
            setError(json?.error ?? copy.orderChatError);
            setLoading(false);
            return;
          }

          chatRow = (json?.chat as ChatRow | null) ?? null;
        } else if (requestId) {
          const { data, error: chatErr } = await supabase
            .from("chats")
            .select(
              "id, request_id, order_id, company_user_id, creator_user_id, created_at, last_message_at"
            )
            .eq("request_id", requestId)
            .maybeSingle();

          if (chatErr) {
            setError(chatErr.message);
            setLoading(false);
            return;
          }

          chatRow = (data as ChatRow | null) ?? null;
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

        const { data: messageRows, error: msgErr } = await supabase
          .from("messages")
          .select("id, chat_id, sender_user_id, content, created_at")
          .eq("chat_id", chatRow.id)
          .order("created_at", { ascending: true });

        if (msgErr) {
          setError(msgErr.message);
          setLoading(false);
          return;
        }

        setMessages((messageRows ?? []) as MessageRow[]);

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
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const content = text.trim();

    if (!content || !chat?.id || sending || !currentUserId) return;

    setSending(true);
    setError(null);

    try {
      const { data: inserted, error: insertErr } = await supabase
        .from("messages")
        .insert({
          chat_id: chat.id,
          sender_user_id: currentUserId,
          content,
        })
        .select("id, chat_id, sender_user_id, content, created_at")
        .single();

      if (insertErr) {
        setError(insertErr.message);
        setSending(false);
        return;
      }

      if (inserted) {
        addMessageIfNotExists(inserted as MessageRow);
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

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">{copy.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {copy.subtitle}
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg">
            💬
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-5">
          <div className="rounded-[24px] bg-slate-50 p-5 text-sm font-semibold text-slate-500">
            {copy.loading}
          </div>
        </div>
      ) : error ? (
        <div className="p-5">
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
            {error}
          </div>
        </div>
      ) : !chat ? (
        <div className="p-5">
          <div className="rounded-[24px] bg-slate-50 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm">
              💬
            </div>
            <p className="mt-4 text-sm font-black text-slate-950">
              {copy.noChat}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-[420px] overflow-y-auto bg-slate-50 px-4 py-5">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-sm text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm">
                    💬
                  </div>
                  <p className="mt-4 text-sm font-black text-slate-950">
                    {copy.empty}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {copy.emptyBody}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isMine =
                    !!currentUserId && msg.sender_user_id === currentUserId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] ${
                          isMine ? "items-end" : "items-start"
                        } flex flex-col`}
                      >
                        <div
                          className={`rounded-[22px] px-4 py-3 text-sm shadow-sm ${
                            isMine
                              ? "rounded-br-md bg-slate-950 text-white"
                              : "rounded-bl-md bg-white text-slate-950"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words leading-6">
                            {msg.content}
                          </div>
                        </div>

                        <div
                          className={`mt-1 px-1 text-[11px] ${
                            isMine ? "text-slate-400" : "text-slate-400"
                          }`}
                        >
                          {isMine ? copy.me : copy.partner} ·{" "}
                          {formatMessageTime(msg.created_at, safeLocale)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white p-3">
            <div className="flex items-center gap-2 rounded-[24px] bg-slate-50 p-2">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={copy.placeholder}
                className="min-h-[44px] flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !text.trim() || !currentUserId}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white transition active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-slate-300"
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