// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);

  const [totalUsers, setTotalUsers] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [creatorCount, setCreatorCount] = useState(0);
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);

      try {
        // ==========================
        // 総ユーザー数
        // ==========================
        const { count: totalUserCount, error: totalUserError } =
          await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true });

        if (totalUserError) throw totalUserError;

        setTotalUsers(totalUserCount ?? 0);

        // ==========================
        // 企業 / クリエイター数
        // ==========================
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role");

        if (rolesError) throw rolesError;

        const company = roles.filter((r) => r.role === "company").length;
        const creator = roles.filter((r) => r.role === "creator").length;

        setCompanyCount(company);
        setCreatorCount(creator);

        // ==========================
        // 進行中案件数（accepted）
        // ==========================
        const { count: requestCount, error: requestError } =
          await supabase
            .from("requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "accepted");

        if (requestError) throw requestError;

        setActiveRequests(requestCount ?? 0);
      } catch (err) {
        console.error("ADMIN DASHBOARD LOAD ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        管理データを読み込み中…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">管理者ダッシュボード</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 総ユーザー数 */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">総ユーザー数</p>
          <p className="text-3xl font-bold">{totalUsers}</p>
        </div>

        {/* 企業数 */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">企業ユーザー数</p>
          <p className="text-3xl font-bold">{companyCount}</p>
        </div>

        {/* クリエイター数 */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">クリエイター数</p>
          <p className="text-3xl font-bold">{creatorCount}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white border rounded-xl p-6 shadow-sm max-w-sm">
          <p className="text-sm text-gray-500 mb-1">進行中案件数</p>
          <p className="text-3xl font-bold">{activeRequests}</p>
        </div>
      </div>
    </div>
  );
}
