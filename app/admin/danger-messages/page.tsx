// app/admin/danger-messages/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DangerMessage = {
  id: string;
  request_id: string;
  chat_id: string;
  sender_id: string;
  matched_word: string;
  content: string;
  created_at: string;
};

export default function AdminDangerMessagesPage() {
  const [rows, setRows] = useState<DangerMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("danger_message_flags")
      .select(
        "id, request_id, chat_id, sender_id, matched_word, content, created_at"
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as DangerMessage[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <h1 className="text-xl font-bold">🚨 危険ワード検知メッセージ一覧</h1>

      {rows.length === 0 && (
        <div className="text-gray-500">
          現在、検知されたメッセージはありません
        </div>
      )}

      {rows.map((r) => (
        <div key={r.id} className="border rounded p-4 bg-red-50 space-y-2">
          <div className="text-sm text-gray-600">
            {new Date(r.created_at).toLocaleString()}
          </div>

          <div className="text-sm">
            <b>検知ワード:</b>{" "}
            <span className="text-red-600 font-semibold">{r.matched_word}</span>
          </div>

          <div className="text-sm">
            <b>内容:</b>
            <div className="mt-1 bg-white p-2 rounded border">
              {r.content}
            </div>
          </div>

          <div className="text-xs text-gray-500">
            <div>Sender: {r.sender_id}</div>
            <div>Request: {r.request_id}</div>
            <div>Chat: {r.chat_id}</div>
          </div>

          <div className="flex gap-4 pt-2">
            <a
              href={`/admin/requests/${r.request_id}`}
              className="text-blue-600 underline text-sm"
            >
              この案件を見る
            </a>

            <a
              href={`/admin/users/${r.sender_id}`}
              className="text-sm bg-gray-800 text-white px-3 py-1 rounded"
            >
              ユーザー詳細を見る
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
