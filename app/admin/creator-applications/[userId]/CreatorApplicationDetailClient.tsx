// app/admin/creator-applications/[userId]/CreatorApplicationDetailClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CreatorApplication = {
  id: string;
  user_id: string;
  display_name: string | null;
  category: string | null;
  approval_status: "pending" | "approved" | "rejected" | string;
  created_at: string | null;
};

type SocialAccount = {
  id: string;
  platform: string | null;
  url: string | null;
  follower_range: string | null;
  audience_country: string | null;
  created_at: string | null;
};

export default function CreatorApplicationDetailClient({
  userId,
}: {
  userId: string;
}) {
  const router = useRouter();

  const [creator, setCreator] = useState<CreatorApplication | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/creator-applications/${userId}`, {
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "failed to fetch creator application");
      }

      setCreator((data?.creator ?? null) as CreatorApplication | null);
      setSocialAccounts((data?.socialAccounts ?? []) as SocialAccount[]);
    } catch (e) {
      console.error(e);
      setError("申請情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const handleAction = async (action: "approve" | "reject") => {
    if (!creator) return;

    const ok = confirm(
      action === "approve" ? "承認しますか？" : "却下しますか？"
    );
    if (!ok) return;

    try {
      setSubmitting(true);

      const res = await fetch("/api/admin/creator-applications/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        cache: "no-store",
        body: JSON.stringify({
          userId: creator.user_id,
          action,
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.error ?? "action failed");
      }

      const nextStatus =
        result.approval_status as CreatorApplication["approval_status"];

      setCreator((prev) =>
        prev ? { ...prev, approval_status: nextStatus } : prev
      );

      alert(action === "approve" ? "承認しました" : "却下しました");

      router.push(`/admin/creator-applications?refresh=${Date.now()}`);
    } catch (e) {
      console.error(e);
      alert("操作に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">読み込み中...</div>;
  if (error) return <div className="p-6 font-bold text-red-600">{error}</div>;
  if (!creator) return <div className="p-6">データがありません</div>;

  const normalizedStatus =
    typeof creator.approval_status === "string"
      ? creator.approval_status.trim().toLowerCase()
      : "";

  const statusLabel =
    normalizedStatus === "pending"
      ? "未承認"
      : normalizedStatus === "approved"
      ? "承認済"
      : "却下";

  const statusClass =
    normalizedStatus === "pending"
      ? "text-orange-600"
      : normalizedStatus === "approved"
      ? "text-green-600"
      : "text-gray-600";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-bold">🧑 Creator 申請詳細</h1>

      <div className="space-y-4 rounded border p-6">
        <div>
          <div className="text-sm text-gray-500">表示名</div>
          <div className="font-semibold">{creator.display_name ?? "-"}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">カテゴリー</div>
          <div>{creator.category ?? "-"}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">申請日</div>
          <div>
            {creator.created_at
              ? new Date(creator.created_at).toLocaleString()
              : "-"}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">状態</div>
          <div className={`font-bold ${statusClass}`}>{statusLabel}</div>
        </div>
      </div>

      <div className="space-y-4 rounded border p-6">
        <h2 className="text-lg font-semibold">活動SNS情報</h2>

        {socialAccounts.length === 0 ? (
          <div className="text-sm text-gray-500">SNS情報はありません。</div>
        ) : (
          <div className="space-y-4">
            {socialAccounts.map((account, index) => (
              <div
                key={account.id}
                className="rounded-lg border bg-gray-50 p-4"
              >
                <div className="mb-3 font-medium">SNS {index + 1}</div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-sm text-gray-500">SNS媒体</div>
                    <div>{account.platform ?? "-"}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500">フォロワー帯</div>
                    <div>{account.follower_range ?? "-"}</div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">SNS URL</div>
                    {account.url ? (
                      <a
                        href={account.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-blue-600 underline"
                      >
                        {account.url}
                      </a>
                    ) : (
                      <div>-</div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">
                      主なフォロワー・視聴者の国
                    </div>
                    <div>{account.audience_country ?? "-"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {normalizedStatus === "pending" ? (
        <div className="flex gap-3">
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
            disabled={submitting}
            onClick={() => handleAction("approve")}
          >
            承認
          </button>
          <button
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-60"
            disabled={submitting}
            onClick={() => handleAction("reject")}
          >
            却下
          </button>
        </div>
      ) : (
        <button
          className="rounded border px-4 py-2"
          onClick={() =>
            router.push(`/admin/creator-applications?refresh=${Date.now()}`)
          }
        >
          一覧へ戻る
        </button>
      )}
    </div>
  );
}