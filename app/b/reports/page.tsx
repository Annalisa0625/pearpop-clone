// File: app/b/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ReportItem = {
  id: string;
  product_name: string | null;
  delivered_post_url: string | null;
  delivered_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  status: string | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ja-JP");
}

export default function BReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("ログイン情報を取得できませんでした。");
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("requests")
        .select(
          `
          id,
          product_name,
          delivered_post_url,
          delivered_at,
          updated_at,
          created_at,
          status
        `
        )
        .eq("b_user_id", user.id)
        .in("status", ["delivered", "completed"])
        .order("delivered_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false, nullsFirst: false });

      if (error) {
        console.error("b/reports load error:", error);
        setErrorMessage("完了報告一覧の取得に失敗しました。");
        setItems([]);
        setLoading(false);
        return;
      }

      setItems((data ?? []) as ReportItem[]);
      setLoading(false);
    };

    void load();
  }, []);

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">納品・完了報告一覧</h1>
        <p className="mt-2 text-sm text-gray-600">
          旧リクエスト型の納品済み・完了済み案件を表示しています。新しい注文型案件は「進行中案件」から確認してください。
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/b/jobs"
          className="rounded border bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          進行中案件へ
        </Link>

        <Link
          href="/b/requests"
          className="rounded border bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          承認待ち一覧へ
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-gray-500">表示できる納品・完了報告はありません。</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded border bg-white p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {item.product_name ?? "案件名なし"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    ステータス: {item.status ?? "未設定"}
                  </p>
                </div>

                <p className="text-xs text-gray-400">
                  納品日時: {formatDateTime(item.delivered_at)}
                </p>
              </div>

              {item.delivered_post_url ? (
                <p className="break-all text-sm">
                  投稿URL：
                  <a
                    href={item.delivered_post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-blue-600 underline"
                  >
                    {item.delivered_post_url}
                  </a>
                </p>
              ) : (
                <p className="text-sm text-gray-500">投稿URLは未登録です。</p>
              )}

              <Link
                href={`/b/requests/${item.id}`}
                className="inline-flex rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                詳細へ
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}