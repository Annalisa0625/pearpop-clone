// app/b/accepted/[requestId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ChatEmbed from "@/app/my/chats/[chatId]/ChatEmbed";

type CreatorInfo = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type RequestDetail = {
  id: string;
  product_name: string | null;
  note: string | null;
  deadline: string | null;
  product_url: string | null;
  status: string | null;

  completed_post_url: string | null;
  completed_by_creator_at: string | null;
  completed_reported_at: string | null;
  completed_at: string | null;
  completed_approved_at: string | null;

  creator: CreatorInfo | null;
};

export default function CompanyAcceptedDetailPage({ params }: any) {
  const router = useRouter();
  const requestId = params?.requestId as string;

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const statusLabel = useMemo(() => {
    if (!detail?.status) return "—";
    if (detail.status === "accepted") return "進行中";
    if (detail.status === "completed_by_creator") return "完了報告あり（承認待ち）";
    if (detail.status === "completed") return "完了（承認済）";
    return detail.status;
  }, [detail?.status]);

  // =========================================
  // ① 案件詳細
  // =========================================
  const loadDetail = async () => {
    const { data, error } = await supabase
      .from("requests")
      .select(
        `
        id,
        product_name,
        note,
        deadline,
        product_url,
        status,
        completed_post_url,
        completed_by_creator_at,
        completed_reported_at,
        completed_at,
        completed_approved_at,
        creator:profiles!requests_creator_id_fkey (
          id,
          username,
          avatar_url
        )
      `
      )
      .eq("id", requestId)
      .single();

    if (error) {
      console.error("REQUEST DETAIL ERROR:", error);
      setDetail(null);
      return;
    }

    // Supabaseのjoinが配列で返るケース対策
    const creator = Array.isArray((data as any).creator)
      ? (data as any).creator?.[0] ?? null
      : (data as any).creator ?? null;

    setDetail({
      ...(data as any),
      creator,
    });
  };

  // =========================================
  // ② chat_id
  // =========================================
  const loadChatId = async () => {
    const { data, error } = await supabase
      .from("chats")
      .select("id")
      .eq("request_id", requestId)
      .maybeSingle();

    if (error) {
      console.error("CHAT ID LOAD ERROR:", error);
      return;
    }
    if (data?.id) setChatId(data.id);
  };

  // =========================================
  // 初期ロード
  // =========================================
  useEffect(() => {
    if (!requestId) return;
    const run = async () => {
      setLoading(true);
      await Promise.all([loadDetail(), loadChatId()]);
      setLoading(false);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // =========================================
  // 承認（B側）
  // =========================================
  const approveCompleted = async () => {
    if (!detail) return;

    // Cが入れたURLは completed_post_url に統一
    if (!detail.completed_post_url) {
      alert("投稿URLが未入力です（C側で完了報告URLが必要です）");
      return;
    }

    setApproving(true);

    const { error } = await supabase
      .from("requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_approved_at: new Date().toISOString(),
      })
      .eq("id", detail.id);

    setApproving(false);

    if (error) {
      console.error("APPROVE ERROR:", error);
      alert("承認に失敗しました");
      return;
    }

    alert("完了を承認しました（完了済みに移動します）");
    // 画面表示更新
    await loadDetail();
    // 一覧も見に行けるように移動（好みで外してOK）
    router.push("/b/completed");
  };

  if (loading) return <p className="p-4">読み込み中...</p>;
  if (!detail) return <p className="p-4">案件が見つかりません</p>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <h2 className="text-2xl font-bold">案件詳細（企業側）</h2>

      {/* ------- 案件情報 -------- */}
      <div className="border rounded-lg p-6 bg-white shadow-sm space-y-2">
        <div className="text-xl font-semibold">{detail.product_name ?? "（未設定）"}</div>

        <div className="text-sm text-gray-600">
          ステータス: <span className="font-semibold">{statusLabel}</span>
        </div>

        <div className="text-sm text-gray-600">
          納期: {detail.deadline ?? "未設定"}
        </div>

        <div className="text-sm text-gray-700">
          依頼内容: {detail.note ?? "なし"}
        </div>

        <div className="pt-3">
          <div className="font-semibold">クリエイター情報:</div>
          <div className="flex items-center space-x-3 mt-2">
            <img
              src={detail.creator?.avatar_url || "/default-avatar.png"}
              className="w-10 h-10 rounded-full"
              alt="creator avatar"
            />
            <span>@{detail.creator?.username ?? "unknown"}</span>
          </div>
        </div>

        {detail.product_url && (
          <div className="pt-2 text-sm">
            商品URL:{" "}
            <a className="text-blue-600 underline" href={detail.product_url} target="_blank" rel="noreferrer">
              {detail.product_url}
            </a>
          </div>
        )}
      </div>

      {/* ------- 完了報告（B側承認） -------- */}
      <div className="border rounded-lg p-6 bg-white shadow-sm space-y-3">
        <div className="text-lg font-bold">完了報告</div>

        {detail.status === "completed" ? (
          <div className="text-green-700 font-semibold">
            この案件は承認済み（完了）です。
          </div>
        ) : (
          <>
            <div className="text-orange-600 font-semibold">
              {detail.status === "completed_by_creator"
                ? "クリエイターから完了報告が届いています。"
                : "まだ完了報告は届いていません。"}
            </div>

            <div className="text-sm">
              投稿URL（必須）:{" "}
              {detail.completed_post_url ? (
                <a
                  className="text-blue-600 underline"
                  href={detail.completed_post_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {detail.completed_post_url}
                </a>
              ) : (
                <span className="text-red-500 font-semibold">（未入力）</span>
              )}
            </div>

            <button
              onClick={approveCompleted}
              disabled={approving || detail.status !== "completed_by_creator"}
              className={`px-4 py-2 rounded text-white font-semibold ${
                approving || detail.status !== "completed_by_creator"
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {approving ? "承認中..." : "完了を承認する"}
            </button>

            {detail.status !== "completed_by_creator" && (
              <div className="text-xs text-gray-500">
                ※ 承認ボタンは「完了報告あり（completed_by_creator）」の時だけ押せます
              </div>
            )}
          </>
        )}
      </div>

      {/* ------- チャット -------- */}
      <div className="border rounded-lg bg-white shadow-sm p-4">
        {chatId ? (
          <ChatEmbed chatId={chatId} />
        ) : (
          <p className="text-gray-500">チャットが見つかりませんでした。</p>
        )}
      </div>
    </div>
  );
}
