// app/admin/creator-applications/CreatorApplicationsClient.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type CreatorApplicationRow = {
  user_id: string;
  display_name: string | null;
  category: string | null;
  approval_status: string;
  created_at: string | null;
};

function getStatusLabel(status: string) {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "pending") return "未承認";
  if (normalized === "approved") return "承認済";
  if (normalized === "rejected") return "却下";
  return status;
}

function getStatusClass(status: string) {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "pending") return "bg-orange-100 text-orange-700";
  if (normalized === "approved") return "bg-green-100 text-green-700";
  if (normalized === "rejected") return "bg-gray-200 text-gray-700";
  return "bg-gray-100 text-gray-700";
}

export default function CreatorApplicationsClient() {
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");

  const [items, setItems] = useState<CreatorApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/creator-applications", {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "failed to fetch creator applications");
      }

      setItems((data?.creators ?? []) as CreatorApplicationRow[]);
    } catch (e) {
      console.error(e);
      setError("クリエイター申請一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refresh]);

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">クリエイター申請一覧</h1>
        <p className="mt-1 text-sm text-gray-600">
          クリエイター登録の申請状況を確認できます。
        </p>
      </div>

      {error && (
        <div className="rounded border p-3 text-sm text-red-600">{error}</div>
      )}

      {items.length === 0 ? (
        <div className="rounded border p-6 text-sm text-gray-500">
          申請中のクリエイターはありません。
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.user_id}
              href={`/admin/creator-applications/${item.user_id}`}
              className="block rounded-xl border p-4 transition hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">
                    {item.display_name ?? "（表示名未入力）"}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>
                      カテゴリー：{item.category ?? "-"}
                    </span>
                    <span>
                      申請日：
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "-"}
                    </span>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                    item.approval_status
                  )}`}
                >
                  {getStatusLabel(item.approval_status)}
                </span>
              </div>

              <div className="mt-3 text-sm text-blue-600">詳細を見る</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}