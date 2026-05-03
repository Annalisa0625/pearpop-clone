// app/b/completed/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  id: string;
  product_name: string | null;
  deadline: string | null;
  completed_at: string | null;
  completed_post_url: string | null;
  creator: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export default function BCompletedPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      setRows([]);
      setLoading(false);
      setErrorMsg("ログインしてください");
      return;
    }

    const { data, error } = await supabase
      .from("requests")
      .select(
        `
        id,
        product_name,
        deadline,
        completed_at,
        completed_post_url,
        creator:profiles!requests_creator_id_fkey (
          id,
          username,
          avatar_url
        )
      `
      )
      .eq("b_user_id", uid)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("LOAD COMPLETED ERROR:", error);
      setRows([]);
      setLoading(false);
      setErrorMsg("読み込みに失敗しました（RLS/権限の可能性）");
      return;
    }

    const normalized: Row[] =
      (data as any[])?.map((r) => {
        const creator = Array.isArray(r.creator) ? r.creator?.[0] ?? null : r.creator ?? null;
        return { ...r, creator };
      }) ?? [];

    setRows(normalized);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-2xl font-bold">完了済案件一覧</h1>
        <button
          onClick={load}
          className="px-3 py-2 rounded bg-gray-900 text-white text-sm hover:bg-gray-800"
        >
          再読み込み
        </button>
      </div>

      {errorMsg && <div className="mb-4 text-red-600 font-semibold">{errorMsg}</div>}

      {rows.length === 0 ? (
        <p className="text-gray-500">完了済の案件はまだありません。</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="border rounded-lg p-5 bg-white shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-bold text-lg">{r.product_name ?? "（未設定）"}</div>

                <div className="text-sm text-gray-600">
                  納期: {r.deadline ?? "未設定"}
                </div>

                <div className="text-sm text-gray-600">
                  完了日: {r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}
                </div>

                <div className="text-sm">
                  投稿URL:{" "}
                  {r.completed_post_url ? (
                    <a className="text-blue-600 underline" href={r.completed_post_url} target="_blank" rel="noreferrer">
                      {r.completed_post_url}
                    </a>
                  ) : (
                    <span className="text-gray-500">（未入力）</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 text-sm text-gray-700">
                  <img
                    src={r.creator?.avatar_url || "/default-avatar.png"}
                    className="w-7 h-7 rounded-full"
                    alt="creator avatar"
                  />
                  <span>@{r.creator?.username ?? "unknown"}</span>
                </div>
              </div>

              <Link
                href={`/b/accepted/${r.id}`}
                className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                詳細を見る
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
