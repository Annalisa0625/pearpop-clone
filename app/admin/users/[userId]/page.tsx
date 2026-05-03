// app/admin/users/[userId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type UserType = "company" | "creator";

type Company = {
  id: string;
  user_id: string;
  company_name: string | null;
  description: string | null;
  approval_status: "pending" | "approved";
};

type Creator = {
  id: string;
  user_id: string;
  display_name: string | null;
  category: string | null;
  approval_status: "pending" | "approved";
};

type CreatorSocialAccount = {
  id: string;
  creator_id: string;
  platform: string;
  url: string;
  follower_range: string;
  audience_country: string;
  created_at: string;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;

  const [type, setType] = useState<UserType | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [creatorSocialAccounts, setCreatorSocialAccounts] = useState<
    CreatorSocialAccount[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          cache: "no-store",
        });

        const data = await res.json();

        setType(data.type ?? null);
        setCompany(data.company ?? null);
        setCreator(data.creator ?? null);
        setCreatorSocialAccounts(data.creatorSocialAccounts ?? []);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    };

    if (userId) {
      load();
    }
  }, [userId]);

  if (loading) return <div className="p-6">読み込み中...</div>;
  if (!type) return <div className="p-6">ユーザーが見つかりません</div>;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <h1 className="text-xl font-bold">👤 ユーザー詳細</h1>

      <div className="border rounded p-4 space-y-2">
        <div>
          <b>User ID:</b> {userId}
        </div>
        <div>
          <b>種別:</b> {type}
        </div>
      </div>

      {type === "company" && company && (
        <div className="border rounded p-4 space-y-2">
          <div>
            <b>Company:</b> {company.company_name}
          </div>

          {company.description && (
            <div>
              <b>Description:</b> {company.description}
            </div>
          )}

          <div>
            <b>承認状態:</b>{" "}
            {company.approval_status === "approved" ? (
              <span className="text-green-600 font-bold">承認済</span>
            ) : (
              <span className="text-orange-600 font-bold">未承認</span>
            )}
          </div>

          {company.approval_status === "pending" && (
            <button
              onClick={async () => {
                if (!confirm("Companyとして承認しますか？")) return;

                const res = await fetch("/api/admin/users/approve-company", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId }),
                });

                if (!res.ok) {
                  alert("承認に失敗しました");
                  return;
                }

                alert("承認しました");
                location.reload();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Companyとして承認
            </button>
          )}
        </div>
      )}

      {type === "creator" && creator && (
        <div className="border rounded p-4 space-y-4">
          <div>
            <b>表示名:</b> {creator.display_name ?? "-"}
          </div>

          <div>
            <b>ジャンル:</b> {creator.category ?? "-"}
          </div>

          <div>
            <b>承認状態:</b>{" "}
            {creator.approval_status === "approved" ? (
              <span className="text-green-600 font-bold">承認済</span>
            ) : (
              <span className="text-orange-600 font-bold">未承認</span>
            )}
          </div>

          <div className="pt-2">
            <div className="font-bold mb-2">SNS一覧</div>

            {creatorSocialAccounts.length === 0 ? (
              <div className="text-gray-500 text-sm">
                SNS情報が登録されていません
              </div>
            ) : (
              <div className="space-y-3">
                {creatorSocialAccounts.map((sns, index) => (
                  <div
                    key={sns.id ?? `${sns.platform}-${index}`}
                    className="border rounded p-3 space-y-1 bg-gray-50"
                  >
                    <div>
                      <b>SNS:</b> {sns.platform}
                    </div>

                    <div>
                      <b>SNS URL:</b>{" "}
                      <a
                        href={sns.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline break-all"
                      >
                        {sns.url}
                      </a>
                    </div>

                    <div>
                      <b>フォロワー帯:</b> {sns.follower_range}
                    </div>

                    <div>
                      <b>主な視聴者国:</b> {sns.audience_country}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {creator.approval_status === "pending" && (
            <button
              onClick={async () => {
                if (!confirm("Creatorとして承認しますか？")) return;

                const res = await fetch("/api/admin/users/approve-creator", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId }),
                });

                if (!res.ok) {
                  alert("承認に失敗しました");
                  return;
                }

                alert("承認しました");
                location.reload();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Creatorとして承認
            </button>
          )}
        </div>
      )}
    </div>
  );
}