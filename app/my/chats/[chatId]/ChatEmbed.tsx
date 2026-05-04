// File: app/my/chats/[chatId]/ChatEmbed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ChatClient from "./ChatClient";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ChatEmbed({ chatId }: { chatId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("chat embed user load error:", error);
      }

      setUserId(user?.id ?? null);
      setLoading(false);
    };

    void loadUser();
  }, [supabase]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">読み込み中...</div>;
  }

  if (!userId) {
    return (
      <div className="p-4 text-sm text-red-600">
        ログイン情報を取得できませんでした。
      </div>
    );
  }

  return <ChatClient chatId={chatId} userId={userId} />;
}