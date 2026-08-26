import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const RESERVED_USERNAMES = new Set(["admin", "api", "login", "signup", "creator", "company", "dashboard", "home", "privacy", "terms", "legal"]);

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim().toLowerCase() ?? "";
  if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(username) || RESERVED_USERNAMES.has(username)) {
    return NextResponse.json({ available: false });
  }

  const { data, error } = await supabaseAdmin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (error) return NextResponse.json({ error: "ユーザー名を確認できませんでした。" }, { status: 500 });
  return NextResponse.json({ available: !data });
}
