// File: app/api/creator/orders/[id]/materials-confirmed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return { user: null, error: "認証トークンがありません" };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "認証に失敗しました" };
  }

  return { user, error: null };
}

function canConfirmMaterials(order: {
  status: string;
  payment_status: string;
  fulfillment_type: string | null;
}) {
  if (order.fulfillment_type !== "material_provided") return false;
  if (order.payment_status !== "captured") return false;

  return order.status === "accepted_captured" || order.status === "in_progress";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json({
    ok: true,
    route: "creator order materials confirmed",
    order_id: id,
    message: "POST this route after the creator confirms provided materials.",
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await context.params;

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        creator_user_id,
        status,
        payment_status,
        fulfillment_type,
        preparation_status,
        materials_confirmed_at
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりませんでした" },
        { status: 404 }
      );
    }

    if (order.creator_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文の素材確認を更新する権限がありません" },
        { status: 403 }
      );
    }

    if (!canConfirmMaterials(order)) {
      return NextResponse.json(
        { error: "この注文では現在、素材確認を完了できません" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: order.status === "accepted_captured" ? "in_progress" : order.status,
        preparation_status: "materials_confirmed",
        materials_confirmed_at: nowIso,
        preparation_ready_at: nowIso,
        updated_at: nowIso,
      } as never)
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: order.materials_confirmed_at
        ? "creator_reconfirmed_materials"
        : "creator_confirmed_materials",
      event_data: {
        previous_preparation_status: order.preparation_status,
        preparation_status: "materials_confirmed",
        materials_confirmed_at: nowIso,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: order.status === "accepted_captured" ? "in_progress" : order.status,
      preparation_status: "materials_confirmed",
      materials_confirmed_at: nowIso,
      preparation_ready_at: nowIso,
    });
  } catch (error) {
    console.error("creator order materials confirmed error", error);

    return NextResponse.json(
      { error: "素材確認の更新に失敗しました" },
      { status: 500 }
    );
  }
}