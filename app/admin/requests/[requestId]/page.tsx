//app/admin/requests/[requestId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type RequestRow = {
  id: string;
  status: string | null;
  created_at: string;
  creator_user_id: string | null;
  b_user_id: string | null;
  creator_menu_id: string | null;
};

export default function AdminRequestDetailPage() {
  const params = useParams();
  const requestId = params.requestId as string;

  const [row, setRow] = useState<RequestRow | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [adminPriority, setAdminPriority] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("requests")
        .select(`
          id,
          status,
          created_at,
          creator_user_id,
          b_user_id,
          creator_menu_id,
          admin_request_meta (
            admin_priority,
            admin_note
          )
        `)
        .eq("id", requestId)
        .single();

      setRow(data as any);
      setAdminNote(data?.admin_request_meta?.admin_note ?? "");
      setAdminPriority(data?.admin_request_meta?.admin_priority ?? 0);
    };

    fetch();
  }, [requestId]);

  const save = async () => {
    await supabase
      .from("admin_request_meta")
      .upsert({
        request_id: requestId,
        admin_priority: adminPriority,
        admin_note: adminNote,
      });

    alert("保存しました");
  };

  if (!row) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Request Detail</h1>

      <div className="border p-4 space-y-2">
        <div>ID: {row.id}</div>
        <div>Status: {row.status}</div>
        <div>Creator: {row.creator_user_id}</div>
        <div>Company: {row.b_user_id}</div>
      </div>

      <div className="border p-4 space-y-4">
        <div>
          <label>Priority</label>
          <select
            value={adminPriority}
            onChange={(e) => setAdminPriority(Number(e.target.value))}
            className="border ml-2"
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>

        <div>
          <label>Admin Note</label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            className="border w-full"
          />
        </div>

        <button
          onClick={save}
          className="bg-black text-white px-4 py-2 rounded"
        >
          保存
        </button>
      </div>
    </div>
  );
}