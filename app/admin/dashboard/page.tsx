// File: app/admin/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function QuickLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-lg font-black tracking-[-0.04em] text-slate-950">
        {title}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {body}
      </p>
    </Link>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <p className="text-sm font-black text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

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
        const { count: totalUserCount, error: totalUserError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        if (totalUserError) throw totalUserError;

        setTotalUsers(totalUserCount ?? 0);

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role");

        if (rolesError) throw rolesError;

        const company = (roles ?? []).filter((r) => r.role === "company").length;
        const creator = (roles ?? []).filter((r) => r.role === "creator").length;

        setCompanyCount(company);
        setCreatorCount(creator);

        const { count: requestCount, error: requestError } = await supabase
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

    void loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        管理データを読み込み中…
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <section className="mb-6 rounded-[30px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5f67]">
          Admin
        </p>

        <h1 className="mt-2 text-[32px] font-black tracking-[-0.06em] text-slate-950">
          管理者ダッシュボード
        </h1>

        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
          リリース前の確認・注文監視・ユーザー管理の入口です。
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="総ユーザー数" value={totalUsers} />
        <StatCard label="企業ユーザー数" value={companyCount} />
        <StatCard label="クリエイター数" value={creatorCount} />
        <StatCard label="旧進行中案件数" value={activeRequests} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QuickLink
          href="/admin/orders"
          title="注文管理"
          body="ordersテーブルの注文・決済・進行状態・要確認案件を確認します。"
        />

        <QuickLink
          href="/admin/users"
          title="ユーザー管理"
          body="B/C/Adminユーザーの状態を確認します。次に最終ログイン表示を強化予定です。"
        />

        <QuickLink
          href="/admin/creators"
          title="クリエイター管理"
          body="Cのプロフィール、公開状態、メニュー状況を確認します。"
        />

        <QuickLink
          href="/admin/companies"
          title="企業管理"
          body="B企業の登録状態や承認状態を確認します。"
        />

        <QuickLink
          href="/admin/inquiries"
          title="問い合わせ"
          body="ユーザーからの問い合わせや連絡を確認します。"
        />

        <QuickLink
          href="/admin/requests"
          title="旧リクエスト管理"
          body="旧requestsテーブルの案件を確認します。現在の本線は注文管理です。"
        />
      </section>
    </main>
  );
}