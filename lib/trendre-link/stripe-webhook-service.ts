import type Stripe from "stripe";

export function constructVerifiedStripeEvent(args: {
  payload: string;
  signature: string;
  secret: string;
  constructEvent: (payload: string, signature: string, secret: string) => Stripe.Event;
}) {
  return args.constructEvent(args.payload, args.signature, args.secret);
}

export async function handleTrendreLinkWebhookEvent(args: {
  event: Stripe.Event;
  createOrder: (session: Stripe.Checkout.Session) => Promise<unknown>;
}) {
  if (args.event.type !== "checkout.session.completed") return false;
  const session = args.event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.source !== "trendre_link_quote") return false;
  await args.createOrder(session);
  return true;
}
