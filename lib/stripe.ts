// lib/stripe.ts
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getStripePriceId(plan: "standard" | "global_pro") {
  if (plan === "standard") {
    if (!process.env.STRIPE_PRICE_STANDARD_MONTHLY) {
      throw new Error("STRIPE_PRICE_STANDARD_MONTHLY is not set");
    }
    return process.env.STRIPE_PRICE_STANDARD_MONTHLY;
  }

  if (!process.env.STRIPE_PRICE_GLOBAL_PRO_MONTHLY) {
    throw new Error("STRIPE_PRICE_GLOBAL_PRO_MONTHLY is not set");
  }

  return process.env.STRIPE_PRICE_GLOBAL_PRO_MONTHLY;
}

export function getBaseUrl() {
  if (!process.env.BASE_URL) {
    throw new Error("BASE_URL is not set");
  }

  return process.env.BASE_URL.replace(/\/$/, "");
}