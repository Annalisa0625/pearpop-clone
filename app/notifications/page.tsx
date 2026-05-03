// File: app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type NotificationRow = {
  id: string;
  user_id: string;
  request_id: string;
  type: "message" | "request_status";
  title: string | null;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setMe(null);
      setItems([]);
      setLoading(false);
      return;
    }
    setMe(userData.user);

    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (showUnreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;
    if (error) console.error("notifications fetch error:", error);
    setItems((data as NotificationRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [showUnreadOnly]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) {
      console.error("mark read error:", error);
      alert("更新に失敗しました");
    } else {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    }
  };

  if (loading) return <p className="p-6 text-center">読み込み中...</p>;
  if (!me) return <p className="p-6 text-center">未ログインです。/login からログインしてください。</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">通知</h1>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
          />
          未読のみ表示
        </label>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600">通知はありません。</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className={`border rounded p-3 bg-white ${n.is_read ? "opacity-75" : ""}`}>
              <div className="text-xs text-gray-500">
                {new Date(n.created_at).toLocaleString()} ・ {n.type}
              </div>
              <div className="font-semibold">{n.title || "(タイトルなし)"}</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{n.body || ""}</div>

              <div className="mt-2 flex gap-3">
                {n.link && (
                  <Link className="text-blue-600 hover:underline" href={n.link}>
                    開く →
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="ml-auto px-3 py-1 rounded bg-gray-800 text-white text-sm"
                  >
                    既読にする
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
