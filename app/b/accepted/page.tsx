// File: app/b/accepted/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type RequestRow = {
  id: string;
  product_name: string | null;
  updated_at: string | null;
  created_at: string | null;
  status: string | null;
};

type ChatInfo = {
  chatId: string;
  hasNew: boolean;
};

export default function CompanyAcceptedListPage() {
  const [list, setList] = useState<RequestRow[]>([]);
  const [chatInfo, setChatInfo] = useState<Record<string, ChatInfo>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    };

    void loadUser();
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);

      const { data: requests, error } = await supabase
        .from("requests")
        .select("id, product_name, updated_at, created_at, status")
        .eq("b_user_id", userId)
        .in("status", ["accepted", "delivered", "completed"])
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("REQUEST LOAD ERROR:", error);
        setList([]);
        setChatInfo({});
        setLoading(false);
        return;
      }

      const requestRows = (requests ?? []) as RequestRow[];
      setList(requestRows);

      const map: Record<string, ChatInfo> = {};

      for (const request of requestRows) {
        const { data: chat, error: chatError } = await supabase
          .from("chats")
          .select("id")
          .eq("request_id", request.id)
          .maybeSingle();

        if (chatError) {
          console.error("CHAT LOAD ERROR:", chatError);
          continue;
        }

        if (!chat?.id) continue;

        const { data: readRow, error: readError } = await supabase
          .from("chat_reads")
          .select("last_read_at")
          .eq("chat_id", chat.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (readError) {
          console.error("CHAT READ LOAD ERROR:", readError);
        }

        const { data: lastMessage, error: lastMessageError } = await supabase
          .from("messages")
          .select("created_at, sender_user_id")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMessageError) {
          console.error("LAST MESSAGE LOAD ERROR:", lastMessageError);
        }

        const lastReadAt = readRow?.last_read_at
          ? new Date(readRow.last_read_at)
          : null;

        const lastCreatedAt = lastMessage?.created_at
          ? new Date(lastMessage.created_at)
          : null;

        const hasNew = !!(
          lastCreatedAt &&
          (!lastReadAt || lastCreatedAt > lastReadAt) &&
          lastMessage?.sender_user_id !== userId
        );

        map[request.id] = {
          chatId: chat.id,
          hasNew,
        };
      }

      setChatInfo(map);
      setLoading(false);
    };

    void load();
  }, [userId]);

  if (loading) {
    return <div className="p-6 text-center">読み込み中...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">進行中の案件（B側）</h1>
          <p className="mt-2 text-sm text-gray-600">
            旧リクエスト型の進行中案件を表示しています。
          </p>
        </div>

        <Link
          href="/b/jobs"
          className="rounded border bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          新しい進行中案件へ
        </Link>
      </div>

      {list.length === 0 ? (
        <p className="text-gray-600">データがありません</p>
      ) : (
        <div className="space-y-4">
          {list.map((request) => {
            const info = chatInfo[request.id];
            const delivered = request.status === "delivered";
            const completed = request.status === "completed";

            return (
              <div
                key={request.id}
                className="flex items-center justify-between rounded border bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
                    <span>{request.product_name ?? "（案件名なし）"}</span>

                    {info?.hasNew ? (
                      <span className="rounded bg-green-500 px-2 py-1 text-xs text-white">
                        新着
                      </span>
                    ) : null}

                    {delivered ? (
                      <span className="rounded bg-orange-500 px-2 py-1 text-xs text-white">
                        納品あり
                      </span>
                    ) : null}

                    {completed ? (
                      <span className="rounded bg-gray-500 px-2 py-1 text-xs text-white">
                        完了
                      </span>
                    ) : null}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    ステータス: {request.status ?? "未設定"}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    更新日:{" "}
                    {request.updated_at || request.created_at
                      ? new Date(
                          request.updated_at ?? request.created_at ?? ""
                        ).toLocaleString("ja-JP")
                      : "-"}
                  </p>
                </div>

                <Link
                  href={`/b/accepted/${request.id}`}
                  className="shrink-0 rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
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