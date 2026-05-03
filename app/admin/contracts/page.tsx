// app/admin/contracts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ContractRow = {
  id: string;
  product_name: string | null;
  status: string | null;
  updated_at: string | null;
  company: {
    id: string;
    username: string | null;
  } | null;
  creator: {
    id: string;
    username: string | null;
  } | null;
  chat_exists: boolean;
};

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================================
  // 契約（accepted request）一覧取得
  // =========================================
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // ① accepted な requests を取得
      const { data: requests, error } = await supabase
        .from("requests")
        .select(`
          id,
          product_name,
          status,
          updated_at,
          company:profiles!requests_b_user_id_fkey (
            id,
            username
          ),
          creator:profiles!requests_creator_id_fkey (
            id,
            username
          )
        `)
        .eq("status", "accepted")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("CONTRACT LOAD ERROR:", error);
        setContracts([]);
        setLoading(false);
        return;
      }

      // ② chats が存在するかチェック
      const rows: ContractRow[] = [];

      for (const r of requests ?? []) {
        const { data: chat } = await supabase
          .from("chats")
          .select("id")
          .eq("request_id", r.id)
          .maybeSingle();

        rows.push({
          id: r.id,
          product_name: r.product_name,
          status: r.status,
          updated_at: r.updated_at,
          company: Array.isArray(r.company) ? r.company[0] : r.company,
          creator: Array.isArray(r.creator) ? r.creator[0] : r.creator,
          chat_exists: !!chat,
        });
      }

      setContracts(rows);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return <div className="p-6 text-center">読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">契約一覧（管理者）</h1>

      {contracts.length === 0 ? (
        <p className="text-gray-500">現在、契約中の案件はありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded">
            <thead className="bg-gray-100 text-sm">
              <tr>
                <th className="p-3 border">商品名</th>
                <th className="p-3 border">企業</th>
                <th className="p-3 border">クリエイター</th>
                <th className="p-3 border">ステータス</th>
                <th className="p-3 border">承認日</th>
                <th className="p-3 border">進行状況</th>
              </tr>
            </thead>

            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="text-sm hover:bg-gray-50">
                  <td className="p-3 border font-medium">
                    {c.product_name ?? "（未設定）"}
                  </td>

                  <td className="p-3 border">
                    {c.company?.username ?? "不明"}
                  </td>

                  <td className="p-3 border">
                    {c.creator?.username ?? "不明"}
                  </td>

                  <td className="p-3 border">
                    <span className="font-semibold text-blue-600">
                      {c.status}
                    </span>
                  </td>

                  <td className="p-3 border">
                    {c.updated_at
                      ? new Date(c.updated_at).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="p-3 border">
                    {c.chat_exists ? (
                      <span className="text-green-600 font-semibold">
                        進行中
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        未開始
                      </span>
                    )}
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
