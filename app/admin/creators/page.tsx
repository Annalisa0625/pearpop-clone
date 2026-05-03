// app/admin/creators/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CreatorBaseRow = {
  id: string;
  user_id: string;
  display_name: string;
  category: string | null;
  approval_status: "pending" | "approved" | "rejected" | string;
  is_public: boolean;
  created_at: string;
};

type CreatorSocialRow = {
  id: string;
  creator_id: string;
  platform: string;
  url: string;
  follower_range: string;
  audience_country: string;
};

type CreatorListItem = CreatorBaseRow & {
  social_accounts: CreatorSocialRow[];
};

function approvalLabel(status: string) {
  if (status === "approved") return "承認済";
  if (status === "rejected") return "却下";
  return "審査中";
}

function approvalClass(status: string) {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export default function AdminCreatorsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [creators, setCreators] = useState<CreatorListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("ログインが必要です");
        setLoading(false);
        return;
      }

      const { data: selfRoles, error: selfRolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (selfRolesError) {
        console.error("self role load error:", selfRolesError);
        setError("権限確認に失敗しました");
        setLoading(false);
        return;
      }

      const isAdmin = (selfRoles ?? []).some((r) => r.role === "admin");

      if (!isAdmin) {
        setError("管理者のみ閲覧できます");
        setLoading(false);
        return;
      }

      const [
        { data: creatorRows, error: creatorsError },
        { data: socialRows, error: socialsError },
      ] = await Promise.all([
        supabase
          .from("creators")
          .select(
            "id, user_id, display_name, category, approval_status, is_public, created_at"
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("creator_social_accounts")
          .select(
            "id, creator_id, platform, url, follower_range, audience_country"
          )
          .order("created_at", { ascending: true }),
      ]);

      if (creatorsError || socialsError) {
        console.error("admin creators load error:", {
          creatorsError,
          socialsError,
        });
        setError("クリエイター一覧の取得に失敗しました");
        setLoading(false);
        return;
      }

      const socialsByCreatorId = new Map<string, CreatorSocialRow[]>();

      for (const row of (socialRows ?? []) as CreatorSocialRow[]) {
        const bucket = socialsByCreatorId.get(row.creator_id) ?? [];
        bucket.push(row);
        socialsByCreatorId.set(row.creator_id, bucket);
      }

      const merged = ((creatorRows ?? []) as CreatorBaseRow[]).map(
        (creator) => ({
          ...creator,
          social_accounts: socialsByCreatorId.get(creator.id) ?? [],
        })
      );

      setCreators(merged);
      setLoading(false);
    };

    load();
  }, [supabase]);

  const filtered = creators.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;

    const inName = (c.display_name ?? "").toLowerCase().includes(q);
    const inCategory = (c.category ?? "").toLowerCase().includes(q);
    const inSocial = c.social_accounts.some(
      (s) =>
        s.platform.toLowerCase().includes(q) ||
        s.audience_country.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q)
    );

    return inName || inCategory || inSocial;
  });

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-bold">クリエイター一覧（Admin）</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="表示名 / カテゴリー / SNS媒体 / 視聴者国で検索"
          className="w-full max-w-md rounded border px-3 py-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">クリエイターが存在しません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">表示名</th>
                <th className="border px-3 py-2 text-left">カテゴリ</th>
                <th className="border px-3 py-2 text-left">SNS</th>
                <th className="border px-3 py-2 text-center">審査状態</th>
                <th className="border px-3 py-2 text-center">公開</th>
                <th className="border px-3 py-2 text-center">登録日</th>
                <th className="border px-3 py-2 text-center">詳細</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="align-top hover:bg-gray-50">
                  <td className="border px-3 py-2 font-medium">
                    {c.display_name ?? "未設定"}
                    <div className="mt-1 text-xs text-gray-400">
                      {c.user_id}
                    </div>
                  </td>

                  <td className="border px-3 py-2">{c.category ?? "—"}</td>

                  <td className="border px-3 py-2">
                    {c.social_accounts.length === 0 ? (
                      <span className="text-gray-400">未登録</span>
                    ) : (
                      <div className="space-y-2">
                        {c.social_accounts.slice(0, 3).map((s) => (
                          <div
                            key={s.id}
                            className="rounded border bg-gray-50 p-2"
                          >
                            <div className="font-medium">{s.platform}</div>
                            <div className="text-xs text-gray-600">
                              視聴者国: {s.audience_country}
                            </div>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-xs text-blue-600 underline"
                            >
                              {s.url}
                            </a>
                          </div>
                        ))}
                        {c.social_accounts.length > 3 && (
                          <div className="text-xs text-gray-500">
                            他 {c.social_accounts.length - 3} 件
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="border px-3 py-2 text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${approvalClass(
                        c.approval_status
                      )}`}
                    >
                      {approvalLabel(c.approval_status)}
                    </span>
                  </td>

                  <td className="border px-3 py-2 text-center">
                    {c.is_public ? "公開" : "非公開"}
                  </td>

                  <td className="border px-3 py-2 text-center">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>

                  <td className="border px-3 py-2 text-center">
                    <Link
                      href={`/admin/users/${c.user_id}`}
                      className="text-blue-600 underline"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}