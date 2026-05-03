// app/b/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ReportItem = {
  id: string;
  product_name: string | null;
  completed_post_url: string | null;
};

export default function BReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      /**
       * 🔴 重要ポイント
       * 承認待ち = completed_by_creator
       * completed_reported はもう使っていない
       */
      const { data, error } = await supabase
        .from("requests")
        .select(`
          id,
          product_name,
          completed_post_url
        `)
        .eq("status", "completed_by_creator")
        .order("completed_by_creator_at", { ascending: false });

      if (error) {
        console.error("b/reports load error:", error);
      } else {
        setItems(data ?? []);
      }

      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">完了報告一覧（承認待ち）</h1>

      {items.length === 0 && (
        <p className="text-gray-500">承認待ちの案件はありません。</p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="border rounded p-4 space-y-2 bg-white"
        >
          <p className="font-semibold text-lg">
            {item.product_name ?? "案件名なし"}
          </p>

          {item.completed_post_url && (
            <p>
              投稿URL：
              <a
                href={item.completed_post_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline ml-1"
              >
                {item.completed_post_url}
              </a>
            </p>
          )}

          <Link
            href={`/b/accepted/${item.id}`}
            className="inline-block mt-2"
          >
            <button className="bg-green-600 text-white px-4 py-2 rounded">
              承認へ
            </button>
          </Link>
        </div>
      ))}
    </div>
  );
}
