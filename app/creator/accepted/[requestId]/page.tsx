// app/creator/accepted/[requestId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ChatEmbed from "@/app/my/chats/[chatId]/ChatEmbed";

interface RequestDetail {
  id: string;
  product_name: string | null;
  note: string | null;
  deadline: string | null;
  product_url: string | null;
  completed_post_url: string | null;
  status: string | null;

  requester: {
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function CreatorAcceptedDetailPage({ params }: any) {
  const requestId = params.requestId;

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDetail = async () => {
    const { data, error } = await supabase
      .from("requests")
      .select(`
        id,
        product_name,
        note,
        deadline,
        product_url,
        completed_post_url,
        status,
        requester:profiles!requests_b_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq("id", requestId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setDetail({
      ...data,
      requester: Array.isArray(data.requester)
        ? data.requester[0]
        : data.requester,
    });

    setPostUrl(data.completed_post_url ?? "");
  };

  const loadChatId = async () => {
    const { data } = await supabase
      .from("chats")
      .select("id")
      .eq("request_id", requestId)
      .maybeSingle();

    if (data) setChatId(data.id);
  };

  useEffect(() => {
    const run = async () => {
      await loadDetail();
      await loadChatId();
      setLoading(false);
    };
    run();
  }, [requestId]);

  // ✅ ここが最重要
  const submitCompletion = async () => {
    if (!postUrl.trim()) {
      alert("投稿URLを入力してください");
      return;
    }

    const { error } = await supabase
      .from("requests")
      .update({
        completed_post_url: postUrl,
        completed_by_creator_at: new Date().toISOString(),
        status: "completed_by_creator",
      })
      .eq("id", requestId);

    if (error) {
      console.error(error);
      alert("完了報告に失敗しました");
      return;
    }

    alert("完了報告を送信しました。企業の確認待ちです。");
    await loadDetail();
  };

  if (loading) return <p className="p-4">読み込み中...</p>;
  if (!detail) return <p className="p-4">データがありません</p>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">案件詳細（C側）</h1>

      <div className="border rounded p-4 space-y-2">
        <p className="text-lg font-bold">{detail.product_name}</p>
        <p>納期: {detail.deadline ?? "未設定"}</p>
        <p>依頼内容: {detail.note ?? "なし"}</p>

        <p className="font-semibold mt-2">依頼者:</p>
        <div className="flex items-center space-x-2">
          <img
            src={detail.requester?.avatar_url || "/default-avatar.png"}
            className="w-10 h-10 rounded-full"
          />
          <span>{detail.requester?.username}</span>
        </div>
      </div>

      {detail.status === "accepted" && (
        <div className="border rounded p-4 space-y-3">
          <h2 className="font-semibold">投稿完了報告</h2>
          <input
            type="url"
            className="w-full border px-3 py-2 rounded"
            placeholder="投稿URLを入力"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
          />
          <button
            onClick={submitCompletion}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            完了報告を送信
          </button>
        </div>
      )}

      {detail.status === "completed_by_creator" && (
        <p className="text-orange-600 font-semibold">
          企業の確認待ちです
        </p>
      )}

      {chatId && (
        <div className="border rounded">
          <ChatEmbed chatId={chatId} />
        </div>
      )}
    </div>
  );
}
