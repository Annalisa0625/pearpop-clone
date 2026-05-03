// app/api/creator/requests/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.delete(name);
        },
      },
    }
  );

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: creator, error: creatorErr } = await supabase
    .from("creators")
    .select("id, approval_status, is_suspended")
    .eq("user_id", user.id)
    .single();

  if (creatorErr || !creator) {
    return NextResponse.json({ message: "Creator not found" }, { status: 404 });
  }

  if (creator.is_suspended) {
    return NextResponse.json({ message: "Creator suspended" }, { status: 403 });
  }

  const { data: requests, error: reqErr } = await supabase
    .from("requests")
    .select(`
      id,
      created_at,
      status,
      product_name,
      product_url,
      deadline,
      has_free_offer,
      note,
      requested_platform,
      requested_budget,
      wants_secondary_use,
      delivered_post_url,
      delivered_at,
      updated_at,
      chats (
        id,
        last_message_at,
        chat_reads (
          user_id,
          last_read_at
        )
      )
    `)
    .eq("creator_user_id", creator.id)
    .order("created_at", { ascending: false });

  if (reqErr) {
    return NextResponse.json({ message: reqErr.message }, { status: 500 });
  }

  return NextResponse.json({ requests });
}