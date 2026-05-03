//app/admin/chats/ChatReadOnly.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function ChatReadOnly({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, chat_id, sender_id, content, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("ADMIN CHAT LOAD ERROR:", error);
        return;
      }

      setMessages((data as MessageRow[]) ?? []);
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: "auto" })
      );
    };

    loadMessages();
  }, [chatId]);

  return (
    <div className="border rounded-lg bg-white">
      <div className="border-b px-4 py-2 font-bold text-sm bg-gray-50">
        チャット履歴（閲覧のみ）
      </div>

      <div className="max-h-[420px] overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="flex justify-start">
            <div className="bg-gray-200 text-black px-3 py-2 rounded-lg max-w-[70%] text-sm">
              <div className="text-xs text-gray-500 mb-1">
                {m.sender_id.slice(0, 8)} ·{" "}
                {new Date(m.created_at).toLocaleString()}
              </div>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
