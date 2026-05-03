// app/b/accepted/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type RequestRow = {
  id: string;
  product_name: string | null;
  category: string | null;
  updated_at: string | null;
  status: string | null;
};

export default function CompanyAcceptedListPage() {
  const [list, setList] = useState<RequestRow[]>([]);
  const [chatInfo, setChatInfo] = useState<Record<string, { chatId: string; hasNew: boolean }>>(
    {}
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ログイン企業ID取得
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);

      // ✅ accepted + completed_by_creator を表示（C完了報告後も消えない）
      const { data: requests, error } = await supabase
        .from("requests")
        .select("id, product_name, category, updated_at, status")
        .eq("b_user_id", userId)
        .in("status", ["accepted", "completed_by_creator"])
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("REQUEST LOAD ERROR:", error);
        setList([]);
        setChatInfo({});
        setLoading(false);
        return;
      }

      setList((requests as RequestRow[]) ?? []);

      // request -> chatId & NEW
      const map: Record<string, { chatId: string; hasNew: boolean }> = {};

      for (const req of requests ?? []) {
        const { data: chat } = await supabase
          .from("chats")
          .select("id")
          .eq("request_id", (req as any).id)
          .maybeSingle();

        if (!chat?.id) continue;

        // chat_reads（自分の既読）
        const { data: readRow } = await supabase
          .from("chat_reads")
          .select("last_read_at")
          .eq("chat_id", chat.id)
          .eq("user_id", userId)
          .maybeSingle();

        // 最新メッセージ
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("created_at, sender_id")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastReadAt = readRow?.last_read_at ? new Date(readRow.last_read_at) : null;
        const lastCreatedAt = lastMsg?.created_at ? new Date(lastMsg.created_at) : null;

        const hasNew = !!(
          lastCreatedAt &&
          (!lastReadAt || lastCreatedAt > lastReadAt) &&
          lastMsg?.sender_id !== userId
        );

        map[(req as any).id] = { chatId: chat.id, hasNew };
      }

      setChatInfo(map);
      setLoading(false);
    };

    load();
  }, [userId]);

  if (loading) return <div className="p-6 text-center">読み込み中...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">進行中の案件（B側）</h1>

      {list.length === 0 ? (
        <p className="text-gray-600">データがありません</p>
      ) : (
        <div className="space-y-4">
          {list.map((req) => {
            const info = chatInfo[req.id];
            const waitingApprove = req.status === "completed_by_creator";

            return (
              <div
                key={req.id}
                className="border p-4 rounded shadow-sm bg-white flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-lg flex items-center gap-2">
                    {req.product_name ?? "（案件名なし）"}

                    {/* 🟢 新着 */}
                    {info?.hasNew && (
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                        新着
                      </span>
                    )}

                    {/* 🟠 完了報告待ち */}
                    {waitingApprove && (
                      <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                        完了報告あり
                      </span>
                    )}
                  </p>

                  <p className="text-sm text-gray-500">カテゴリ: {req.category ?? "未分類"}</p>
                </div>

                <Link
                  href={`/b/accepted/${req.id}`}
                  className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
                >
                  詳細へ
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
