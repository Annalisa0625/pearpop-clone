// app/api/creator/requests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id: requestId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const action = body?.action as "accept" | "reject" | undefined;

  if (!action || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
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
            // Route Handler 内で set できないケースに備えて握りつぶす
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

  const { data: creator, error: creatorErr } = await supabase
    .from("creators")
    .select("id, is_suspended")
    .eq("user_id", user.id)
    .maybeSingle();

  if (creatorErr) {
    return NextResponse.json({ message: creatorErr.message }, { status: 500 });
  }

  if (!creator) {
    return NextResponse.json({ message: "Creator not found" }, { status: 404 });
  }

  if (creator.is_suspended) {
    return NextResponse.json({ message: "Creator suspended" }, { status: 403 });
  }

  const { data: requestRow, error: requestErr } = await supabase
    .from("requests")
    .select("id, status, creator_user_id, b_user_id")
    .eq("id", requestId)
    .maybeSingle();

  if (requestErr) {
    return NextResponse.json({ message: requestErr.message }, { status: 500 });
  }

  if (!requestRow) {
    return NextResponse.json({ message: "Request not found" }, { status: 404 });
  }

  const ownerOk =
    requestRow.creator_user_id === user.id ||
    requestRow.creator_user_id === creator.id;

  if (!ownerOk) {
    return NextResponse.json(
      {
        message: "Forbidden",
        debug:
          process.env.NODE_ENV !== "production"
            ? {
                request_creator_user_id: requestRow.creator_user_id,
                authed_user_id: user.id,
                creators_id: creator.id,
              }
            : undefined,
      },
      { status: 403 }
    );
  }

  if (requestRow.status !== "pending") {
    return NextResponse.json({ message: "Already processed" }, { status: 400 });
  }

  const newStatus = action === "accept" ? "accepted" : "rejected";

  const { error: updateErr } = await supabase
    .from("requests")
    .update({
      status: newStatus,
      accepted_by: action === "accept" ? user.id : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateErr) {
    return NextResponse.json({ message: updateErr.message }, { status: 500 });
  }

  if (action === "accept") {
    const { data: existingChat, error: existingChatErr } = await supabase
      .from("chats")
      .select("id")
      .eq("request_id", requestId)
      .maybeSingle();

    if (existingChatErr) {
      return NextResponse.json({ message: existingChatErr.message }, { status: 500 });
    }

    let chatId = existingChat?.id ?? null;

    if (!chatId) {
      const { data: insertedChat, error: insertErr } = await supabase
        .from("chats")
        .insert({
          request_id: requestId,
          creator_user_id: user.id,
          company_user_id: requestRow.b_user_id,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr) {
        return NextResponse.json({ message: insertErr.message }, { status: 500 });
      }

      chatId = insertedChat.id;
    }

    return NextResponse.json({
      message: "Request accepted",
      chatId,
    });
  }

  return NextResponse.json({
    message: "Request rejected",
  });
}