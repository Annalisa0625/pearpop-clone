// File: app/admin/chats/ChatReadOnly.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MessageRow = {
  id: string;
  chat_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
};

export default function ChatReadOnly({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadMessages = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("messages")
        .select("id, chat_id, sender_user_id, content, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error("ADMIN CHAT LOAD ERROR:", error);
        setErrorMessage("チャット履歴の取得に失敗しました。");
        setMessages([]);
        setLoading(false);
        return;
      }

      setMessages((data ?? []) as MessageRow[]);
      setLoading(false);

      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
    };

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, [chatId]);

  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b bg-gray-50 px-4 py-2 text-sm font-bold">
        チャット履歴（閲覧のみ）
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="text-sm text-gray-500">読み込み中...</div>
        ) : null}

        {errorMessage ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!loading && !errorMessage && messages.length === 0 ? (
          <div className="text-sm text-gray-500">
            まだメッセージはありません。
          </div>
        ) : null}

        {messages.map((message) => (
          <div key={message.id} className="flex justify-start">
            <div className="max-w-[70%] rounded-lg bg-gray-200 px-3 py-2 text-sm text-black">
              <div className="mb-1 text-xs text-gray-500">
                {message.sender_user_id.slice(0, 8)} ·{" "}
                {new Date(message.created_at).toLocaleString("ja-JP")}
              </div>

              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}