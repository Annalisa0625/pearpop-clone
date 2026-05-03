// app/my/chats/[chatId]/ChatClient.tsx
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  chatId: string;
  userId: string;
};

type Message = {
  id: string;
  chat_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
};

export default function ChatClient({ chatId, userId }: Props) {
  const supabase = createSupabaseBrowserClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  // メッセージ取得
  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data as Message[]);
  };

  useEffect(() => {
    loadMessages();
  }, []);

  // 送信
  const sendMessage = async () => {
    if (!text.trim()) return;

    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_user_id: userId,
      content: text,
    });

    if (error) {
      console.error(error);
      alert("送信失敗");
      return;
    }

    setText("");

    // ここが重要
    await loadMessages();
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-xl font-semibold">チャット</h1>

      <div className="rounded-lg border p-4">
        <div className="h-[60vh] overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-sm">
              まだメッセージがありません
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.sender_user_id === userId
                    ? "text-right"
                    : "text-left"
                }
              >
                <span className="inline-block border rounded px-3 py-1">
                  {m.content}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="メッセージを入力"
            className="flex-1 border rounded px-3 py-2"
          />

          <button
            onClick={sendMessage}
            className="bg-black text-white px-4 py-2 rounded"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}