// File: app/api/company/orders/[id]/shipment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createInAppNotification, getOrderNotificationName } from "@/lib/notifications/in-app";
import {
  executeShipmentRegistration,
  normalizeShipmentCarrier,
  normalizeShipmentTrackingNumber,
  ShipmentRegistrationError,
  type ShipmentOrder,
} from "@/lib/orders/order-shipment";

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

    const shippingCarrier = normalizeShipmentCarrier(body?.shipping_carrier);
    const shippingTrackingNumber = normalizeShipmentTrackingNumber(
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
        creator_menu_id,
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

    const nowIso = new Date().toISOString();
    const orderName = getOrderNotificationName(order);
    const plan = await executeShipmentRegistration({
      order: order as ShipmentOrder,
      userId: user.id,
      shippingCarrier,
      shippingTrackingNumber,
      nowIso,
      dependencies: {
        updateOrder: async (shipment) => {
          const { error } = await supabaseAdmin
            .from("orders")
            .update({
              status: shipment.nextStatus,
              preparation_status: "shipped",
              shipping_carrier: shipment.shippingCarrier,
              shipping_tracking_number: shipment.shippingTrackingNumber,
              shipped_at: shipment.shippedAt,
              updated_at: nowIso,
            } as never)
            .eq("id", order.id);
          if (error) throw error;
        },
        recordEvent: async (shipment) => {
          const { error } = await supabaseAdmin.from("order_events").upsert(
            {
              order_id: order.id,
              actor_user_id: user.id,
              event_type: shipment.eventType,
              dedupe_key: shipment.eventDedupeKey,
              event_data: {
                previous_preparation_status: order.preparation_status,
                preparation_status: "shipped",
                shipping_carrier: shipment.shippingCarrier,
                shipping_tracking_number: shipment.shippingTrackingNumber,
                shipped_at: shipment.shippedAt,
              },
            },
            { onConflict: "dedupe_key", ignoreDuplicates: true }
          );
          if (error) throw error;
        },
        notifyCreator: (shipment, recipientUserId) =>
          createInAppNotification({
            recipientUserId,
            actorUserId: user.id,
            notificationType: "product_shipped",
            title: shipment.notificationTitle,
            body:
              orderName === "注文"
                ? `配送会社：${shipment.shippingCarrier} / 追跡番号：${shipment.shippingTrackingNumber}`
                : `${orderName}の商品が発送されました。配送会社：${shipment.shippingCarrier} / 追跡番号：${shipment.shippingTrackingNumber}`,
            linkPath: `/creator/orders/${order.id}`,
            entityType: "order",
            entityId: order.id,
            orderId: order.id,
            importance: "high",
            dedupeKey: shipment.notificationDedupeKey,
            metadata: {
              product_name: order.product_name,
              menu_title: order.menu_title_snapshot,
              fulfillment_type: "product_shipping",
              shipping_carrier: shipment.shippingCarrier,
              shipping_tracking_number: shipment.shippingTrackingNumber,
              shipped_at: shipment.shippedAt,
              event_type: shipment.eventType,
            },
          }),
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: plan.nextStatus,
      preparation_status: "shipped",
      shipping_carrier: plan.shippingCarrier,
      shipping_tracking_number: plan.shippingTrackingNumber,
      shipped_at: plan.shippedAt,
    });
  } catch (error) {
    if (error instanceof ShipmentRegistrationError) {
      const status = error.code === "forbidden" ? 403 : error.code === "not_available" ? 409 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("company order shipment error", error);

    return NextResponse.json(
      { error: "発送情報の登録に失敗しました" },
      { status: 500 }
    );
  }
}
