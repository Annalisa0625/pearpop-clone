export type PaymentIntentForCapture = {
  status: string;
};

export type PaymentIntentCaptureGateway<T extends PaymentIntentForCapture> = {
  retrieve: (paymentIntentId: string) => Promise<T>;
  capture: (paymentIntentId: string, idempotencyKey: string) => Promise<T>;
};

export function isOrderCreator(
  order: { creator_user_id: string },
  userId: string
) {
  return order.creator_user_id === userId;
}

export function shouldRepairAcceptedOrder(order: {
  status: string;
  payment_status: string;
}) {
  return (
    order.status === "accepted_captured" &&
    order.payment_status === "captured"
  );
}

export function isOrderCaptureInProgress(paymentIntentStatus: string) {
  return paymentIntentStatus === "processing";
}

export function orderCaptureIdempotencyKey(
  orderId: string,
  paymentIntentId: string
) {
  return `creator-order-capture/${orderId}/${paymentIntentId}`;
}

export async function retrieveOrCaptureOrderPaymentIntent<
  T extends PaymentIntentForCapture,
>(args: {
  gateway: PaymentIntentCaptureGateway<T>;
  orderId: string;
  paymentIntentId: string;
}) {
  const current = await args.gateway.retrieve(args.paymentIntentId);
  if (current.status !== "requires_capture") return current;

  return args.gateway.capture(
    args.paymentIntentId,
    orderCaptureIdempotencyKey(args.orderId, args.paymentIntentId)
  );
}
