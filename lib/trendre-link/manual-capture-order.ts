export type ExistingManualCaptureOrder = {
  status: string;
  paymentStatus: string;
};

export type ManualCaptureOrderPlan =
  | {
      ok: true;
      orderStatus: "authorized_pending_creator" | "accepted_captured";
      paymentStatus: "authorized" | "captured";
      repairExistingOrder: boolean;
    }
  | { ok: false; reason: "intent_status" | "existing_order_state" };

export function getManualCaptureOrderPlan(args: {
  paymentIntentStatus: string;
  existingOrder: ExistingManualCaptureOrder | null;
}): ManualCaptureOrderPlan {
  if (!args.existingOrder) {
    if (args.paymentIntentStatus !== "requires_capture") {
      return { ok: false, reason: "intent_status" };
    }
    return {
      ok: true,
      orderStatus: "authorized_pending_creator",
      paymentStatus: "authorized",
      repairExistingOrder: false,
    };
  }

  const authorized =
    args.existingOrder.status === "authorized_pending_creator" &&
    args.existingOrder.paymentStatus === "authorized";
  const captured =
    args.existingOrder.status === "accepted_captured" &&
    args.existingOrder.paymentStatus === "captured";

  if (args.paymentIntentStatus === "requires_capture" && authorized) {
    return {
      ok: true,
      orderStatus: "authorized_pending_creator",
      paymentStatus: "authorized",
      repairExistingOrder: false,
    };
  }
  if (args.paymentIntentStatus === "succeeded" && (authorized || captured)) {
    return {
      ok: true,
      orderStatus: "accepted_captured",
      paymentStatus: "captured",
      repairExistingOrder: authorized,
    };
  }
  return { ok: false, reason: "existing_order_state" };
}
