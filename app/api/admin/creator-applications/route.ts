// app/api/admin/creator-applications/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("creators")
    .select(`
      user_id,
      display_name,
      category,
      approval_status,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("creator-applications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ creators: data });
}