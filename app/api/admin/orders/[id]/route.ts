// File: app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthUserLite = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

async function getAuthUser(userId: string): Promise<AuthUserLite | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !data?.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      created_at: data.user.created_at ?? null,
      last_sign_in_at: data.user.last_sign_in_at ?? null,
    };
  } catch (error) {
    console.error("admin order detail auth user error:", error);
    return null;
  }
}

function getPublicUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) return null;

  try {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "order id is required" }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        created_at,
        updated_at,
        accepted_at,
        authorized_at,
        auto_complete_at,
        canceled_at,
        captured_at,
        completed_at,
        completed_reason,
        creator_accept_deadline,
        deadline,
        declined_at,
        delivered_at,
        delivered_post_url,
        disputed_at,
        expired_at,
        revision_requested_at,
        revision_count,
        max_revision_count,
        revision_note,
        status,
        payment_status,
        stripe_payment_status,
        payment_flow,
        product_name,
        product_url,
        project_type,
        requirements,
        post_notes,
        pr_account,
        pr_copy_text,
        pr_hashtags,
        has_free_offer,
        wants_secondary_use,
        menu_title_snapshot,
        menu_description_snapshot,
        menu_deliverables_snapshot,
        menu_platform_snapshot,
        menu_category_snapshot,
        menu_type_snapshot,
        menu_delivery_days_snapshot,
        menu_allow_secondary_use_snapshot,
        menu_price_amount,
        buyer_marketplace_fee_amount,
        buyer_marketplace_fee_rate_bps,
        buyer_plan_code_snapshot,
        buyer_plan_public_name_snapshot,
        buyer_total_amount,
        creator_transaction_fee_amount,
        creator_transaction_fee_rate_bps,
        creator_payout_amount,
        platform_fee_amount,
        platform_gross_revenue_amount,
        fee_rate_bps,
        stripe_amount,
        currency,
        stripe_checkout_session_id,
        stripe_customer_id,
        stripe_payment_intent_id,
        stripe_transfer_id,
        transfer_status,
        transfer_attempted_at,
        transfer_failed_reason,
        transferred_at,
        b_user_id,
        creator_user_id,
        creator_id,
        creator_menu_id,
        linked_request_id,
        metadata
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      console.error("admin order detail order error:", orderError);
      throw orderError;
    }

    if (!order) {
      return NextResponse.json({ error: "order not found" }, { status: 404 });
    }

    const [
      { data: company, error: companyError },
      { data: creator, error: creatorError },
      { data: chat, error: chatError },
      { data: events, error: eventsError },
      { data: assets, error: assetsError },
      bAuthUser,
      creatorAuthUser,
    ] = await Promise.all([
      supabaseAdmin
        .from("companies")
        .select("*")
        .eq("user_id", order.b_user_id)
        .maybeSingle(),

      supabaseAdmin
        .from("creators")
        .select("*")
        .eq("user_id", order.creator_user_id)
        .maybeSingle(),

      supabaseAdmin
        .from("chats")
        .select("id, created_at, last_message_at, order_id, request_id, company_user_id, creator_user_id")
        .eq("order_id", order.id)
        .maybeSingle(),

      supabaseAdmin
        .from("order_events")
        .select("id, order_id, actor_user_id, event_type, event_data, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(80),

      supabaseAdmin
        .from("order_reference_assets")
        .select(
          "id, order_id, b_user_id, creator_user_id, uploaded_by_user_id, file_name, file_type, mime_type, size_bytes, storage_bucket, storage_path, sort_order, created_at"
        )
        .eq("order_id", order.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),

      getAuthUser(order.b_user_id),
      getAuthUser(order.creator_user_id),
    ]);

    if (companyError) {
      console.error("admin order detail company error:", companyError);
    }

    if (creatorError) {
      console.error("admin order detail creator error:", creatorError);
    }

    if (chatError) {
      console.error("admin order detail chat error:", chatError);
    }

    if (eventsError) {
      console.error("admin order detail events error:", eventsError);
    }

    if (assetsError) {
      console.error("admin order detail assets error:", assetsError);
    }

    let messages: any[] = [];

    if (chat?.id) {
      const { data: messageRows, error: messagesError } = await supabaseAdmin
        .from("messages")
        .select("id, chat_id, sender_user_id, content, created_at")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true })
        .limit(300);

      if (messagesError) {
        console.error("admin order detail messages error:", messagesError);
      }

      messages = messageRows ?? [];
    }

    const enrichedAssets = (assets ?? []).map((asset: any) => ({
      ...asset,
      public_url: getPublicUrl(asset.storage_bucket, asset.storage_path),
    }));

    return NextResponse.json(
      {
        order,
        company: company ?? null,
        creator: creator ?? null,
        bAuthUser,
        creatorAuthUser,
        chat: chat ?? null,
        messages,
        events: events ?? [],
        assets: enrichedAssets,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("admin order detail error:", error);

    return NextResponse.json(
      { error: "failed to load admin order detail" },
      { status: 500 }
    );
  }
}