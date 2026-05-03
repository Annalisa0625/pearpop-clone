//app/admin/companies/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CompanyRow = {
  id: string;
  username: string | null;
  is_public: boolean | null;
  created_at: string;
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================================
  // 企業一覧取得
  // =========================================
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles:profiles (
            id,
            username,
            is_public,
            created_at
          )
        `)
        .eq("role", "company");

      if (error) {
        console.error("COMPANY LOAD ERROR:", error);
        setCompanies([]);
        setLoading(false);
        return;
      }

      const rows: CompanyRow[] =
        data
          ?.map((r: any) => r.profiles)
          .filter(Boolean) ?? [];

      setCompanies(rows);
      setLoading(false);
    };

    load();
  }, []);

  // =========================================
  // 公開 / 非公開 切り替え
  // =========================================
  const togglePublic = async (company: CompanyRow) => {
    const next = !company.is_public;

    const { error } = await supabase
      .from("profiles")
      .update({ is_public: next })
      .eq("id", company.id);

    if (error) {
      alert("更新に失敗しました");
      console.error(error);
      return;
    }

    setCompanies((prev) =>
      prev.map((c) =>
        c.id === company.id ? { ...c, is_public: next } : c
      )
    );
  };

  if (loading) {
    return <div className="p-6 text-center">読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">企業一覧（管理者）</h1>

      {companies.length === 0 ? (
        <p className="text-gray-500">企業が存在しません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded">
            <thead className="bg-gray-100 text-sm">
              <tr>
                <th className="p-3 border">企業名</th>
                <th className="p-3 border">企業ID</th>
                <th className="p-3 border">公開状態</th>
                <th className="p-3 border">登録日</th>
                <th className="p-3 border">操作</th>
              </tr>
            </thead>

            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="text-sm hover:bg-gray-50">
                  <td className="p-3 border font-medium">
                    {c.username ?? "（未設定）"}
                  </td>

                  <td className="p-3 border text-gray-500">
                    {c.id}
                  </td>

                  <td className="p-3 border">
                    {c.is_public ? (
                      <span className="text-green-600 font-semibold">
                        公開中
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold">
                        非公開
                      </span>
                    )}
                  </td>

                  <td className="p-3 border">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>

                  <td className="p-3 border">
                    <button
                      onClick={() => togglePublic(c)}
                      className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
                    >
                      公開切替
                    </button>
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
