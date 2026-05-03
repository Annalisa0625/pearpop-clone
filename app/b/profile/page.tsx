// File: app/b/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Company = {
  id: string;
  user_id: string;
  company_name: string | null;
  description: string | null;
  contact_email: string | null;
  created_at: string;
};

export default function BProfilePage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState({
    company_name: "",
    description: "",
    contact_email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // 1. ログインユーザー取得
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("ユーザー取得エラー:", userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        console.log("未ログインです");
        setLoading(false);
        return;
      }

      // 2. 既存 company 情報があれば取得
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<Company>();

      if (error && error.code !== "PGRST116") {
        console.error("企業データ取得エラー:", error.message);
      } else if (data) {
        setCompany(data);
        setForm({
          company_name: data.company_name || "",
          description: data.description || "",
          contact_email: data.contact_email || "",
        });
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const ensureCompanyRole = async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "company" }, { onConflict: "user_id" });

    if (error) {
      console.error("user_roles upsert error:", error);
      // 致命的ではないので alert までは出さない（ログだけ）
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("ログインしてください");
      setSaving(false);
      return;
    }

    try {
      if (company) {
        // 既存レコードを更新
        const { error } = await supabase
          .from("companies")
          .update({
            company_name: form.company_name,
            description: form.description,
            contact_email: form.contact_email,
          })
          .eq("id", company.id);

        if (error) {
          console.error("更新エラー:", error.message);
          alert("企業情報の更新に失敗しました");
          setSaving(false);
          return;
        }

        await ensureCompanyRole(user.id);
        alert("企業情報を更新しました");
      } else {
        // 新規作成
        const { data, error } = await supabase
          .from("companies")
          .insert([
            {
              user_id: user.id,
              company_name: form.company_name,
              description: form.description,
              contact_email: form.contact_email,
            },
          ])
          .select()
          .maybeSingle<Company>();

        if (error) {
          console.error("作成エラー:", error.message);
          alert("企業情報の登録に失敗しました");
          setSaving(false);
          return;
        }

        if (data) {
          setCompany(data);
        }

        await ensureCompanyRole(user.id);
        alert("企業情報を登録しました");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6">読み込み中...</p>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">企業情報の登録 / 編集</h1>

      <label className="block mb-2 font-medium">会社名</label>
      <input
        type="text"
        name="company_name"
        value={form.company_name}
        onChange={handleChange}
        className="w-full border p-2 mb-4 rounded"
        placeholder="例）株式会社○○"
      />

      <label className="block mb-2 font-medium">会社説明</label>
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        className="w-full border p-2 mb-4 rounded"
        rows={4}
        placeholder="例）自社サービスや取扱い商材について"
      />

      <label className="block mb-2 font-medium">連絡先メール</label>
      <input
        type="email"
        name="contact_email"
        value={form.contact_email}
        onChange={handleChange}
        className="w-full border p-2 mb-6 rounded"
        placeholder="example@company.jp"
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </div>
  );
}
