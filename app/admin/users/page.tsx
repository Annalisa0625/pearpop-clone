// app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UserRow = {
  user_id: string;
  type: "company" | "creator";
  name: string;
  approval_status: "pending" | "approved";
  is_suspended: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] =
    useState<"all" | "company" | "creator">("all");
  const [filterApproval, setFilterApproval] =
    useState<"all" | "pending" | "approved">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/users/list");
        if (!res.ok) {
          throw new Error("failed to load users");
        }

        const data = await res.json();

        const rows: UserRow[] = [];

        /* ===============================
           companies（B）
        =============================== */
        for (const c of data.companies ?? []) {
          rows.push({
            user_id: c.user_id,
            type: "company",
            name: c.company_name ?? "(no company name)",
            approval_status: c.approval_status,
            is_suspended: false,
          });
        }

        /* ===============================
           creators（C）
           - 表示名の優先順位
             1. creators.display_name
             2. profiles.username
             3. "(no name)"
        =============================== */
        for (const c of data.creators ?? []) {
          const profile = data.profiles?.find(
            (p: any) => p.id === c.user_id
          );

          const name =
            c.display_name ||
            profile?.username ||
            "(no name)";

          rows.push({
            user_id: c.user_id,
            type: "creator",
            name,
            approval_status: c.approval_status,
            is_suspended: profile?.is_suspended ?? false,
          });
        }

        setUsers(rows);
      } catch (err) {
        console.error(err);
        setError("ユーザー一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = users.filter((u) => {
    if (filterType !== "all" && u.type !== filterType) return false;
    if (
      filterApproval !== "all" &&
      u.approval_status !== filterApproval
    )
      return false;
    if (q && !u.user_id.includes(q)) return false;
    return true;
  });

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 font-bold">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <h1 className="text-xl font-bold">👤 ユーザー一覧</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as any)
          }
          className="border px-2 py-1 rounded"
        >
          <option value="all">すべて</option>
          <option value="company">company</option>
          <option value="creator">creator</option>
        </select>

        <select
          value={filterApproval}
          onChange={(e) =>
            setFilterApproval(e.target.value as any)
          }
          className="border px-2 py-1 rounded"
        >
          <option value="all">承認状態すべて</option>
          <option value="pending">未承認</option>
          <option value="approved">承認済</option>
        </select>

        <input
          className="border px-3 py-1 rounded flex-1"
          placeholder="user_id で検索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="border rounded divide-y">
        {filtered.map((u) => (
          <div
            key={`${u.type}-${u.user_id}`}
            className="p-3 flex justify-between items-center"
          >
            <div className="space-y-1">
              <div className="text-xs text-gray-500">
                {u.type} / {u.user_id}
              </div>
              <div className="font-semibold">
                {u.name}
              </div>

              <div className="text-sm">
                {u.approval_status === "pending" ? (
                  <span className="text-orange-600 font-bold">
                    🕒 未承認
                  </span>
                ) : (
                  <span className="text-green-600 font-bold">
                    ✅ 承認済
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {u.is_suspended && (
                <span className="text-red-600 text-sm">
                  停止中
                </span>
              )}
              <Link
                href={`/admin/users/${u.user_id}`}
                className="text-blue-600 underline text-sm"
              >
                詳細
              </Link>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            該当ユーザーがいません
          </div>
        )}
      </div>
    </div>
  );
}
