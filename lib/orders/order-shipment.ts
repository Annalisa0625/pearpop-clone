import { createHash } from "node:crypto";

export type ShipmentOrder = {
  id: string;
  b_user_id: string;
  creator_user_id: string;
  creator_menu_id?: string | null;
  status: string;
  payment_status: string;
  fulfillment_type: string | null;
  preparation_status: string | null;
  shipping_address_shared_at: string | null;
  shipping_carrier: string | null;
  shipping_tracking_number: string | null;
  shipped_at: string | null;
  received_at: string | null;
};

export type ShipmentRegistrationPlan = {
  shippingCarrier: string;
  shippingTrackingNumber: string;
  shippedAt: string;
  nextStatus: string;
  eventType: "company_registered_product_shipment" | "company_updated_product_shipment";
  eventDedupeKey: string;
  notificationDedupeKey: string;
  notificationTitle: "商品が発送されました" | "発送情報が更新されました";
};

export type ShipmentRegistrationDependencies = {
  updateOrder: (plan: ShipmentRegistrationPlan) => Promise<void>;
  recordEvent: (plan: ShipmentRegistrationPlan) => Promise<void>;
  notifyCreator: (
    plan: ShipmentRegistrationPlan,
    recipientUserId: string
  ) => Promise<{ ok: boolean; error?: string | null }>;
};

export class ShipmentRegistrationError extends Error {
  readonly code: "forbidden" | "not_available" | "notification_failed";

  constructor(
    code: "forbidden" | "not_available" | "notification_failed",
    message: string
  ) {
    super(message);
    this.name = "ShipmentRegistrationError";
    this.code = code;
  }
}

export function normalizeShipmentCarrier(value: unknown) {
  return (typeof value === "string" ? value.trim() : "").slice(0, 80);
}

export function normalizeShipmentTrackingNumber(value: unknown) {
  return (typeof value === "string" ? value.trim() : "")
    .replace(/\s+/g, "")
    .slice(0, 120);
}

export function isShipmentCompany(order: Pick<ShipmentOrder, "b_user_id">, userId: string) {
  return order.b_user_id === userId;
}

export function canRegisterOrderShipment(
  order: Pick<
    ShipmentOrder,
    | "status"
    | "payment_status"
    | "fulfillment_type"
    | "shipping_address_shared_at"
    | "received_at"
  >
) {
  if (order.fulfillment_type !== "product_shipping") return false;
  if (order.payment_status !== "captured") return false;
  if (!order.shipping_address_shared_at) return false;
  if (order.received_at) return false;

  return order.status === "accepted_captured" || order.status === "in_progress";
}

function shipmentFingerprint(shippingCarrier: string, shippingTrackingNumber: string) {
  return createHash("sha256")
    .update(`${shippingCarrier}\u0000${shippingTrackingNumber}`)
    .digest("hex")
    .slice(0, 32);
}

export function buildShipmentRegistrationPlan(args: {
  order: ShipmentOrder;
  shippingCarrier: string;
  shippingTrackingNumber: string;
  nowIso: string;
}): ShipmentRegistrationPlan {
  const fingerprint = shipmentFingerprint(
    args.shippingCarrier,
    args.shippingTrackingNumber
  );
  const versionKey = `${args.order.id}:${fingerprint}`;

  return {
    shippingCarrier: args.shippingCarrier,
    shippingTrackingNumber: args.shippingTrackingNumber,
    shippedAt: args.order.shipped_at ?? args.nowIso,
    nextStatus:
      args.order.status === "accepted_captured" ? "in_progress" : args.order.status,
    eventType: args.order.shipped_at
      ? "company_updated_product_shipment"
      : "company_registered_product_shipment",
    eventDedupeKey: `order-shipment:${versionKey}`,
    notificationDedupeKey: `product-shipped:${versionKey}`,
    notificationTitle: args.order.shipped_at
      ? "発送情報が更新されました"
      : "商品が発送されました",
  };
}

export async function executeShipmentRegistration(args: {
  order: ShipmentOrder;
  userId: string;
  shippingCarrier: string;
  shippingTrackingNumber: string;
  nowIso: string;
  dependencies: ShipmentRegistrationDependencies;
}) {
  if (!isShipmentCompany(args.order, args.userId)) {
    throw new ShipmentRegistrationError(
      "forbidden",
      "この注文の発送情報を更新する権限がありません"
    );
  }
  if (!canRegisterOrderShipment(args.order)) {
    throw new ShipmentRegistrationError(
      "not_available",
      "この注文では現在、発送情報を登録できません"
    );
  }

  const plan = buildShipmentRegistrationPlan(args);
  await args.dependencies.updateOrder(plan);
  await args.dependencies.recordEvent(plan);
  const notification = await args.dependencies.notifyCreator(
    plan,
    args.order.creator_user_id
  );
  if (!notification.ok) {
    throw new ShipmentRegistrationError(
      "notification_failed",
      notification.error || "shipment_notification_failed"
    );
  }

  return plan;
}
