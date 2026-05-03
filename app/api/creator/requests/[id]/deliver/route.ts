//app/api/creator/requests/[id]/deliver/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: requestId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const url = body?.url?.trim();

  if (!url) {
    return NextResponse.json({ message: "投稿URLが必要です" }, { status: 400 });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // no-op
          }
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

  const { data: requestRow, error: requestErr } = await supabase
    .from("requests")
    .select("id, creator_user_id, status")
    .eq("id", requestId)
    .single();

  if (requestErr || !requestRow) {
    return NextResponse.json({ message: "Request not found" }, { status: 404 });
  }

  const { data: creator, error: creatorErr } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (creatorErr || !creator) {
    return NextResponse.json({ message: "Creator not found" }, { status: 404 });
  }

  const ownerOk =
    requestRow.creator_user_id === user.id ||
    requestRow.creator_user_id === creator.id;

  if (!ownerOk) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (requestRow.status !== "accepted") {
    return NextResponse.json(
      { message: "この案件は納品できません" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("requests")
    .update({
      delivered_post_url: url,
      delivered_at: now,
      status: "delivered",
      updated_at: now,
    })
    .eq("id", requestId);

  if (updateErr) {
    return NextResponse.json({ message: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "納品しました",
  });
}