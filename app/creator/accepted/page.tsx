// app/creator/accepted/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type AcceptedItem = {
  id: string;
  product_name: string | null;
  deadline: string | null;
  note: string | null;
  requester: { username: string | null }[] | null;
};

type ChatInfo = {
  chatId: string;
  hasNew: boolean;
};

export default function CreatorAcceptedListPage() {
  const [items, setItems] = useState<AcceptedItem[]>([]);
  const [chatInfo, setChatInfo] = useState<Record<string, ChatInfo>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // ログインユーザーID取得
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(`
          id,
          product_name,
          deadline,
          note,
          requester:profiles!requests_b_user_id_fkey(username)
        `)
        .eq("creator_id", userId)
        .eq("status", "accepted")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("ACCEPTED LOAD ERROR:", error);
        setItems([]);
        setLoading(false);
        return;
      }

      const list = (data || []) as AcceptedItem[];
      setItems(list);
      setLoading(false);

      const map: Record<string, ChatInfo> = {};

      for (const item of list) {
        const { data: chat } = await supabase
          .from("chats")
          .select("id")
          .eq("request_id", item.id)
          .maybeSingle();

        if (!chat) continue;

        const chatId = chat.id as string;

        const { data: lastMessage } = await supabase
          .from("messages")
          .select("created_at")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: readRow } = await supabase
          .from("chat_reads")
          .select("last_read_at")
          .eq("chat_id", chatId)
          .eq("user_id", userId)
          .maybeSingle();

        // 🔥 安全な NEW 判定
        const hasNew =
          lastMessage?.created_at &&
          (
            !readRow?.last_read_at ||
            new Date(lastMessage.created_at).getTime() >
              new Date(readRow.last_read_at).getTime()
          );

        map[item.id] = {
          chatId,
          hasNew: !!hasNew,
        };
      }

      setChatInfo(map);
    };

    load();
  }, [userId]);

  if (loading) return <p className="p-4">読み込み中...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">進行中の案件（C側）</h1>

      {items.length === 0 ? (
        <p className="text-gray-600">まだ進行中の案件はありません。</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const info = chatInfo[item.id];

            return (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-white shadow-sm flex justify-between items-center"
              >
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    {item.product_name ?? "（タイトル未設定）"}
                    {info?.hasNew && (
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                        新着
                      </span>
                    )}
                  </h2>

                  <p className="text-sm text-gray-600 mt-1">
                    納期: {item.deadline ?? "未設定"}
                  </p>

                  <p className="text-sm text-gray-600 mt-1">
                    依頼内容: {item.note ?? "なし"}
                  </p>

                  <p className="text-sm mt-2 font-medium">
                    依頼者: {item.requester?.[0]?.username ?? "不明"}
                  </p>
                </div>

                <Link
                  href={`/creator/accepted/${item.id}`}
                  className="text-sm bg-blue-500 text-white px-4 py-2 rounded"
                >
                  案件の詳細（チャットへ）
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}