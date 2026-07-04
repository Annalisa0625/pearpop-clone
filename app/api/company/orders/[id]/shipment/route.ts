// File: app/api/company/orders/[id]/shipment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createInAppNotification, getOrderNotificationName } from "@/lib/notifications/in-app";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ShipmentInput = {
  shipping_carrier?: unknown;
  shipping_tracking_number?: unknown;
};

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

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCarrier(value: unknown) {
  return getString(value).slice(0, 80);
}

function normalizeTrackingNumber(value: unknown) {
  return getString(value).replace(/\s+/g, "").slice(0, 120);
}

function canRegisterShipment(order: {
  status: string;
  payment_status: string;
  fulfillment_type: string | null;
  shipping_address_shared_at: string | null;
  received_at: string | null;
}) {
  if (order.fulfillment_type !== "product_shipping") return false;
  if (order.payment_status !== "captured") return false;
  if (!order.shipping_address_shared_at) return false;
  if (order.received_at) return false;

  return order.status === "accepted_captured" || order.status === "in_progress";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json({
    ok: true,
    route: "company order shipment",
    order_id: id,
    message: "POST this route to register shipment information.",
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

    const body = (await req.json().catch(() => null)) as ShipmentInput | null;

    const shippingCarrier = normalizeCarrier(body?.shipping_carrier);
    const shippingTrackingNumber = normalizeTrackingNumber(
      body?.shipping_tracking_number
    );

    if (!shippingCarrier) {
      return NextResponse.json(
        { error: "配送会社を入力してください" },
        { status: 400 }
      );
    }

    if (!shippingTrackingNumber) {
      return NextResponse.json(
        { error: "追跡番号を入力してください" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        b_user_id,
        creator_user_id,
        status,
        payment_status,
        fulfillment_type,
        preparation_status,
        shipping_address_shared_at,
        shipping_carrier,
        shipping_tracking_number,
        shipped_at,
        received_at,
        product_name,
        menu_title_snapshot
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

    if (order.b_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文の発送情報を更新する権限がありません" },
        { status: 403 }
      );
    }

    if (!canRegisterShipment(order)) {
      return NextResponse.json(
        { error: "この注文では現在、発送情報を登録できません" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: order.status === "accepted_captured" ? "in_progress" : order.status,
        preparation_status: "shipped",
        shipping_carrier: shippingCarrier,
        shipping_tracking_number: shippingTrackingNumber,
        shipped_at: order.shipped_at ?? nowIso,
        updated_at: nowIso,
      } as never)
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    const eventType = order.shipped_at
      ? "company_updated_product_shipment"
      : "company_registered_product_shipment";
    const shippedAt = order.shipped_at ?? nowIso;

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: eventType,
      event_data: {
        previous_preparation_status: order.preparation_status,
        preparation_status: "shipped",
        shipping_carrier: shippingCarrier,
        shipping_tracking_number: shippingTrackingNumber,
        shipped_at: shippedAt,
      },
    });

    const orderName = getOrderNotificationName(order);

    await createInAppNotification({
      recipientUserId: order.creator_user_id,
      actorUserId: user.id,
      notificationType: "product_shipped",
      title: order.shipped_at ? "発送情報が更新されました" : "商品が発送されました",
      body:
        orderName === "注文"
          ? `配送会社：${shippingCarrier} / 追跡番号：${shippingTrackingNumber}`
          : `${orderName}の商品が発送されました。配送会社：${shippingCarrier} / 追跡番号：${shippingTrackingNumber}`,
      linkPath: `/creator/orders/${order.id}`,
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      importance: "high",
      dedupeKey: `product_shipped:${order.id}`,
      metadata: {
        product_name: order.product_name,
        menu_title: order.menu_title_snapshot,
        fulfillment_type: "product_shipping",
        shipping_carrier: shippingCarrier,
        shipping_tracking_number: shippingTrackingNumber,
        shipped_at: shippedAt,
        event_type: eventType,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: order.status === "accepted_captured" ? "in_progress" : order.status,
      preparation_status: "shipped",
      shipping_carrier: shippingCarrier,
      shipping_tracking_number: shippingTrackingNumber,
      shipped_at: order.shipped_at ?? nowIso,
    });
  } catch (error) {
    console.error("company order shipment error", error);

    return NextResponse.json(
      { error: "発送情報の登録に失敗しました" },
      { status: 500 }
    );
  }
}