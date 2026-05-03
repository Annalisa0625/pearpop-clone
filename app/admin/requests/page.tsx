// app/admin/requests/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  id: string;
  created_at: string;
  status: string | null;
  creator_user_id: string | null;
  b_user_id: string | null;
  creator_menu_id: string | null;

  admin_request_meta: {
    admin_priority: number | null;
  } | null;
};

export default function AdminRequestsPage() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("requests")
        .select(`
          id,
          created_at,
          status,
          creator_user_id,
          b_user_id,
          creator_menu_id,
          admin_request_meta (
            admin_priority
          )
        `);

      setData((data as Row[]) ?? []);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Requests</h1>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border px-3 py-2">Priority</th>
            <th className="border px-3 py-2">ID</th>
            <th className="border px-3 py-2">Creator</th>
            <th className="border px-3 py-2">Company</th>
            <th className="border px-3 py-2">Status</th>
            <th className="border px-3 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td className="border px-3 py-2">
                {r.admin_request_meta?.admin_priority ?? 0}
              </td>

              <td className="border px-3 py-2">
                <Link
                  href={`/admin/requests/${r.id}`}
                  className="text-blue-600 underline"
                >
                  {r.id.slice(0, 8)}...
                </Link>
              </td>

              <td className="border px-3 py-2">
                {r.creator_user_id?.slice(0, 8)}
              </td>

              <td className="border px-3 py-2">
                {r.b_user_id?.slice(0, 8)}
              </td>

              <td className="border px-3 py-2">
                {r.status}
              </td>

              <td className="border px-3 py-2">
                {new Date(r.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}