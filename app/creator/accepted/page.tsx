// File: app/creator/accepted/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type AcceptedItem = {
  id: string;
  product_name: string | null;
  deadline: string | null;
  note: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type ChatInfo = {
  chatId: string;
  hasNew: boolean;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "未設定";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ja-JP");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ja-JP");
}

export default function CreatorAcceptedListPage() {
  const [items, setItems] = useState<AcceptedItem[]>([]);
  const [chatInfo, setChatInfo] = useState<Record<string, ChatInfo>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setUserId(null);
        setCreatorId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: creatorRow, error: creatorError } = await supabase
        .from("creators")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (creatorError) {
        console.error("CREATOR LOAD ERROR:", creatorError);
      }

      setCreatorId((creatorRow as { id: string } | null)?.id ?? null);
    };

    void loadUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      const creatorKeys = Array.from(
        new Set([userId, creatorId].filter((value): value is string => !!value))
      );

      const { data, error } = await supabase
        .from("requests")
        .select(
          `
          id,
          product_name,
          deadline,
          note,
          status,
          updated_at,
          created_at
        `
        )
        .in("creator_user_id", creatorKeys)
        .in("status", ["accepted", "delivered", "completed"])
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("ACCEPTED LOAD ERROR:", error);
        setItems([]);
        setChatInfo({});
        setErrorMessage("進行中案件の取得に失敗しました。");
        setLoading(false);
        return;
      }

      const list = (data ?? []) as AcceptedItem[];
      setItems(list);

      const map: Record<string, ChatInfo> = {};

      for (const item of list) {
        const { data: chat, error: chatError } = await supabase
          .from("chats")
          .select("id")
          .eq("request_id", item.id)
          .maybeSingle();

        if (chatError) {
          console.error("CHAT LOAD ERROR:", chatError);
          continue;
        }

        if (!chat?.id) continue;

        const chatId = chat.id as string;

        const { data: lastMessage, error: lastMessageError } = await supabase
          .from("messages")
          .select("created_at, sender_user_id")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMessageError) {
          console.error("LAST MESSAGE LOAD ERROR:", lastMessageError);
        }

        const { data: readRow, error: readError } = await supabase
          .from("chat_reads")
          .select("last_read_at")
          .eq("chat_id", chatId)
          .eq("user_id", userId)
          .maybeSingle();

        if (readError) {
          console.error("CHAT READ LOAD ERROR:", readError);
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

        map[item.id] = {
          chatId,
          hasNew,
        };
      }

      setChatInfo(map);
      setLoading(false);
    };

    void load();
  }, [userId, creatorId]);

  if (loading) {
    return <p className="p-4">読み込み中...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">進行中の案件（C側）</h1>
          <p className="mt-2 text-sm text-gray-600">
            旧リクエスト型の進行中案件を表示しています。新しい注文型案件は「進行中案件」から確認してください。
          </p>
        </div>

        <Link
          href="/creator/jobs"
          className="rounded border bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          新しい進行中案件へ
        </Link>
      </div>

      {errorMessage ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-gray-600">まだ進行中の案件はありません。</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const info = chatInfo[item.id];

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                    <span>{item.product_name ?? "（タイトル未設定）"}</span>

                    {info?.hasNew ? (
                      <span className="rounded bg-green-500 px-2 py-1 text-xs text-white">
                        新着
                      </span>
                    ) : null}
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    納期: {formatDate(item.deadline)}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    依頼内容: {item.note ?? "なし"}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    ステータス: {item.status ?? "未設定"}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    更新日: {formatDateTime(item.updated_at ?? item.created_at)}
                  </p>
                </div>

                <Link
                  href={`/creator/accepted/${item.id}`}
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