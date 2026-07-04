// File: app/api/creator/orders/[id]/shipping-address/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createInAppNotification, getOrderNotificationName } from "@/lib/notifications/in-app";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ShippingAddressInput = {
  recipient_name?: unknown;
  postal_code?: unknown;
  prefecture?: unknown;
  city?: unknown;
  address_line1?: unknown;
  address_line2?: unknown;
  phone_number?: unknown;
  notes?: unknown;
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

function getOptionalString(value: unknown) {
  const text = getString(value);
  return text ? text : null;
}

function normalizePostalCode(value: unknown) {
  return getString(value).replace(/[^\d-]/g, "").slice(0, 12);
}

function normalizePhoneNumber(value: unknown) {
  return getString(value).replace(/[^\d+()-]/g, "").slice(0, 30);
}

function normalizeShippingAddress(input: ShippingAddressInput | null) {
  if (!input) {
    return {
      address: null,
      error: "配送先を入力してください",
    };
  }

  const recipientName = getString(input.recipient_name).slice(0, 80);
  const postalCode = normalizePostalCode(input.postal_code);
  const prefecture = getString(input.prefecture).slice(0, 80);
  const city = getString(input.city).slice(0, 120);
  const addressLine1 = getString(input.address_line1).slice(0, 160);
  const addressLine2 =
    getOptionalString(input.address_line2)?.slice(0, 160) ?? null;
  const phoneNumber = normalizePhoneNumber(input.phone_number);
  const notes = getOptionalString(input.notes)?.slice(0, 500) ?? null;

  if (!recipientName) {
    return {
      address: null,
      error: "宛名を入力してください",
    };
  }

  if (!postalCode) {
    return {
      address: null,
      error: "郵便番号を入力してください",
    };
  }

  if (!prefecture) {
    return {
      address: null,
      error: "都道府県を入力してください",
    };
  }

  if (!city) {
    return {
      address: null,
      error: "市区町村を入力してください",
    };
  }

  if (!addressLine1) {
    return {
      address: null,
      error: "町名・番地・建物名を入力してください",
    };
  }

  if (!phoneNumber) {
    return {
      address: null,
      error: "電話番号を入力してください",
    };
  }

  return {
    address: {
      recipient_name: recipientName,
      postal_code: postalCode,
      prefecture,
      city,
      address_line1: addressLine1,
      address_line2: addressLine2,
      phone_number: phoneNumber,
      notes,
    },
    error: null,
  };
}

function isTerminalOrderStatus(status: string) {
  return [
    "completed",
    "declined_canceled",
    "expired_canceled",
    "canceled",
    "cancelled",
  ].includes(status);
}

function canShareShippingAddress(order: {
  status: string;
  payment_status: string;
  fulfillment_type: string | null;
}) {
  if (order.fulfillment_type !== "product_shipping") return false;
  if (order.payment_status !== "captured") return false;
  if (isTerminalOrderStatus(order.status)) return false;

  return !["delivered", "revision_requested", "completed"].includes(
    order.status
  );
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json({
    ok: true,
    route: "creator order shipping address",
    order_id: id,
    message:
      "POST this route to share a shipping address for product shipping orders.",
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

    const body = (await req.json().catch(() => null)) as
      | ShippingAddressInput
      | null;
    const { address, error: addressError } = normalizeShippingAddress(body);

    if (addressError || !address) {
      return NextResponse.json(
        { error: addressError ?? "配送先を入力してください" },
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
        preparation_data,
        shipping_address_shared_at,
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

    if (order.creator_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文の配送先を共有する権限がありません" },
        { status: 403 }
      );
    }

    if (!canShareShippingAddress(order)) {
      return NextResponse.json(
        { error: "この注文では現在、配送先を共有できません" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const previousPreparationData =
      order.preparation_data &&
      typeof order.preparation_data === "object" &&
      !Array.isArray(order.preparation_data)
        ? order.preparation_data
        : {};

    const nextPreparationData = {
      ...previousPreparationData,
      shipping_address: address,
      shipping_address_shared_at: nowIso,
    };

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: order.status === "accepted_captured" ? "in_progress" : order.status,
        preparation_status: "waiting_shipment",
        preparation_data: nextPreparationData,
        shipping_address_shared_at: nowIso,
        updated_at: nowIso,
      } as never)
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    const eventType = order.shipping_address_shared_at
      ? "creator_updated_shipping_address"
      : "creator_shared_shipping_address";

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: eventType,
      event_data: {
        preparation_status: "waiting_shipment",
        address_fields: {
          recipient_name: address.recipient_name,
          postal_code: address.postal_code,
          prefecture: address.prefecture,
          city: address.city,
          has_address_line2: Boolean(address.address_line2),
          has_notes: Boolean(address.notes),
        },
      },
    });

    const orderName = getOrderNotificationName(order);

    await createInAppNotification({
      recipientUserId: order.b_user_id,
      actorUserId: user.id,
      notificationType: "shipping_address_shared",
      title: order.shipping_address_shared_at
        ? "配送先が更新されました"
        : "配送先が共有されました",
      body:
        orderName === "注文"
          ? "商品発送に必要な配送先を確認できます。"
          : `${orderName}の商品発送に必要な配送先を確認できます。`,
      linkPath: `/b/orders/${order.id}`,
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      importance: "high",
      metadata: {
        product_name: order.product_name,
        menu_title: order.menu_title_snapshot,
        fulfillment_type: "product_shipping",
        shipping_address_shared_at: nowIso,
        event_type: eventType,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: order.status === "accepted_captured" ? "in_progress" : order.status,
      preparation_status: "waiting_shipment",
      shipping_address_shared_at: nowIso,
    });
  } catch (error) {
    console.error("creator order shipping address error", error);

    return NextResponse.json(
      { error: "配送先の共有に失敗しました" },
      { status: 500 }
    );
  }
}