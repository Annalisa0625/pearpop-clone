// File: app/api/creator/connect/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthResult = {
  user: User | null;
  error: string | null;
};

async function getAuthenticatedUser(req: NextRequest): Promise<AuthResult> {
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

function getConnectOnboardingCompleted(account: Stripe.Account) {
  return Boolean(account.details_submitted && account.payouts_enabled);
}

function maskStripeAccountId(value: string | null) {
  if (!value) return null;
  if (value.length <= 10) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "creator connect status",
    message:
      "POST this route with Authorization: Bearer <Supabase access token> to refresh Stripe Connect account status.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { data: creator, error: creatorError } = await supabaseAdmin
      .from("creators")
      .select(
        `
        id,
        user_id,
        display_name,
        stripe_account_id,
        stripe_onboarding_completed
      `
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (creatorError) {
      throw creatorError;
    }

    if (!creator) {
      return NextResponse.json(
        { error: "クリエイター情報が見つかりませんでした" },
        { status: 404 }
      );
    }

    if (!creator.stripe_account_id) {
      return NextResponse.json({
        ok: true,
        has_stripe_account: false,
        stripe_account_id: null,
        stripe_account_id_masked: null,
        stripe_onboarding_completed: false,
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
        requirements_currently_due: [],
        requirements_past_due: [],
        disabled_reason: null,
      });
    }

    const stripe = getStripe();

    const account = (await stripe.accounts.retrieve(
      creator.stripe_account_id
    )) as Stripe.Account;

    const onboardingCompleted = getConnectOnboardingCompleted(account);
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("creators")
      .update({
        stripe_onboarding_completed: onboardingCompleted,
        updated_at: nowIso,
      })
      .eq("id", creator.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      ok: true,
      has_stripe_account: true,
      stripe_account_id: account.id,
      stripe_account_id_masked: maskStripeAccountId(account.id),
      stripe_onboarding_completed: onboardingCompleted,
      details_submitted: Boolean(account.details_submitted),
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      requirements_currently_due: account.requirements?.currently_due ?? [],
      requirements_past_due: account.requirements?.past_due ?? [],
      disabled_reason: account.requirements?.disabled_reason ?? null,
    });
  } catch (error) {
    console.error("creator connect status error", error);

    return NextResponse.json(
      { error: "Stripe Connectの状態確認に失敗しました" },
      { status: 500 }
    );
  }
}