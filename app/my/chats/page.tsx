// app/my/chats/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ChatListPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadChats = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("chats")
        .select(`
          id,
          request:request_id ( product_name ),
          creator_user_id,
          company_user_id
        `)
        .or(
          `creator_user_id.eq.${user.id},company_user_id.eq.${user.id}`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setChats(data ?? []);
      setLoading(false);
    };

    loadChats();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-4 space-y-3">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className="border p-3 rounded cursor-pointer"
          onClick={() => router.push(`/my/chats/${chat.id}`)}
        >
          <p className="font-bold">
            {chat.request?.product_name ?? "案件"}
          </p>
        </div>
      ))}
    </div>
  );
}