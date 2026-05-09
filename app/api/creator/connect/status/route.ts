// File: app/api/creator/connect/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBaseUrl, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthResult = {
  user: User | null;
  error: string | null;
};

type CreatorForConnectStatus = {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_completed: boolean | null;
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

function buildBusinessProfile(baseUrl: string) {
  return {
    url: baseUrl,
    // 7311 = Advertising Services
    mcc: "7311",
    product_description:
      "Creator provides sponsored social media posts, short videos, and UGC content for brands through Trendre.",
  };
}

function shouldPatchBusinessProfile(account: Stripe.Account) {
  const profile = account.business_profile;

  return (
    !profile?.mcc ||
    !profile?.url ||
    !profile?.product_description
  );
}

function getRequirements(account: Stripe.Account) {
  return {
    currently_due: account.requirements?.currently_due ?? [],
    past_due: account.requirements?.past_due ?? [],
    eventually_due: account.requirements?.eventually_due ?? [],
    pending_verification: account.requirements?.pending_verification ?? [],
    disabled_reason: account.requirements?.disabled_reason ?? null,
  };
}

function getBusinessProfileDebug(account: Stripe.Account) {
  return {
    mcc: account.business_profile?.mcc ?? null,
    url: account.business_profile?.url ?? null,
    product_description: account.business_profile?.product_description ?? null,
    name: account.business_profile?.name ?? null,
    support_url: account.business_profile?.support_url ?? null,
    support_email: account.business_profile?.support_email ?? null,
    support_phone: account.business_profile?.support_phone ?? null,
  };
}

function getIndividualDebug(account: Stripe.Account) {
  return {
    has_individual: Boolean(account.individual),
    first_name: account.individual?.first_name ?? null,
    last_name: account.individual?.last_name ?? null,
    email: account.individual?.email ?? null,
    phone: account.individual?.phone ?? null,
    dob_day_provided: Boolean(account.individual?.dob?.day),
    dob_month_provided: Boolean(account.individual?.dob?.month),
    dob_year_provided: Boolean(account.individual?.dob?.year),
    address_city_provided: Boolean(account.individual?.address?.city),
    address_line1_provided: Boolean(account.individual?.address?.line1),
    address_postal_code_provided: Boolean(
      account.individual?.address?.postal_code
    ),
    verification_status: account.individual?.verification?.status ?? null,
  };
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

    const { data: creatorRow, error: creatorError } = await supabaseAdmin
      .from("creators")
      .select(
        `
        id,
        user_id,
        display_name,
        full_name,
        stripe_account_id,
        stripe_onboarding_completed
      `
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (creatorError) {
      throw creatorError;
    }

    if (!creatorRow) {
      return NextResponse.json(
        { error: "クリエイター情報が見つかりませんでした" },
        { status: 404 }
      );
    }

    const creator = creatorRow as CreatorForConnectStatus;

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
        requirements_eventually_due: [],
        requirements_pending_verification: [],
        disabled_reason: null,
        business_profile: {
          mcc: null,
          url: null,
          product_description: null,
          name: null,
          support_url: null,
          support_email: null,
          support_phone: null,
        },
        individual_debug: {
          has_individual: false,
          first_name: null,
          last_name: null,
          email: null,
          phone: null,
          dob_day_provided: false,
          dob_month_provided: false,
          dob_year_provided: false,
          address_city_provided: false,
          address_line1_provided: false,
          address_postal_code_provided: false,
          verification_status: null,
        },
        patched_business_profile: false,
      });
    }

    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    let account = (await stripe.accounts.retrieve(
      creator.stripe_account_id
    )) as Stripe.Account;

    let patchedBusinessProfile = false;

    if (shouldPatchBusinessProfile(account)) {
      account = (await stripe.accounts.update(creator.stripe_account_id, {
        business_profile: buildBusinessProfile(baseUrl),
        metadata: {
          app: "trendre",
          supabase_user_id: user.id,
          creator_id: creator.id,
        },
      })) as Stripe.Account;

      patchedBusinessProfile = true;
    }

    const onboardingCompleted = getConnectOnboardingCompleted(account);
    const nowIso = new Date().toISOString();
    const requirements = getRequirements(account);

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

      requirements_currently_due: requirements.currently_due,
      requirements_past_due: requirements.past_due,
      requirements_eventually_due: requirements.eventually_due,
      requirements_pending_verification: requirements.pending_verification,
      disabled_reason: requirements.disabled_reason,

      business_profile: getBusinessProfileDebug(account),
      individual_debug: getIndividualDebug(account),
      patched_business_profile: patchedBusinessProfile,

      // 調査用。UI側で使う必要はない。
      debug_note:
        "business_profile fields are returned to verify whether Stripe received mcc/url/product_description.",
    });
  } catch (error) {
    console.error("creator connect status error", error);

    return NextResponse.json(
      { error: "Stripe Connectの状態確認に失敗しました" },
      { status: 500 }
    );
  }
}