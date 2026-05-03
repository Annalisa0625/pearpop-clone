// File: app/components/ChatEmbed.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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

  // 既存の BLayoutShell / CreatorLayoutShell は window focus で未読を再取得しているため、
  // ここで同じイベントを発火して、ページリロードなしでサイドバー未読バッジを更新する。
  window.dispatchEvent(new Event("focus"));
}

export default function ChatEmbed({
  requestId,
  orderId,
  userId,
  title = "チャット",
}: ChatEmbedProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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
            setError("ログイン情報を取得できませんでした。");
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
            setError(json?.error ?? "注文チャットの取得に失敗しました。");
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
          setError("requestId または orderId が必要です。");
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
        setError(e?.message ?? "チャット取得エラー");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [requestId, orderId, supabase, currentUserId]);

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
    } catch (e: any) {
      setError(e?.message ?? "送信エラー");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="mt-4 text-sm text-gray-500">読み込み中...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </section>
    );
  }

  if (!chat) {
    return (
      <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="mt-4 text-sm text-gray-500">
          まだチャットが作成されていません。
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">
            この注文・依頼に関する連絡をここで行えます。
          </p>
        </div>
      </div>

      <div className="mb-4 h-80 overflow-y-auto rounded-2xl border bg-gray-50 p-4">
        {messages.length === 0 ? (
          <div className="text-sm text-gray-500">
            まだメッセージはありません。
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine =
                !!currentUserId && msg.sender_user_id === currentUserId;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      isMine
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-900"
                    }`}
                  >
                    <div className="break-words whitespace-pre-wrap leading-6">
                      {msg.content}
                    </div>
                    <div
                      className={`mt-2 text-[11px] ${
                        isMine ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleString("ja-JP")}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力"
          className="flex-1 rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />

        <button
          onClick={() => void handleSend()}
          disabled={sending || !text.trim() || !currentUserId}
          className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "送信中" : "送信"}
        </button>
      </div>
    </section>
  );
}