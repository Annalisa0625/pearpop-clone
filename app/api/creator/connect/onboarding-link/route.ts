// File: app/api/creator/connect/onboarding-link/route.ts
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

type CreatorForConnect = {
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

function isStripeResourceMissing(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeStripeError = error as {
    type?: string;
    code?: string;
    statusCode?: number;
  };

  return (
    maybeStripeError.type === "StripeInvalidRequestError" &&
    maybeStripeError.code === "resource_missing"
  );
}

function getConnectOnboardingCompleted(account: Stripe.Account) {
  return Boolean(account.details_submitted && account.payouts_enabled);
}

function normalizeName(value: string | null | undefined) {
  return value?.trim() || "";
}

function splitJapaneseName(name: string) {
  const clean = name.trim();

  if (!clean) {
    return {
      firstName: undefined,
      lastName: undefined,
    };
  }

  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return {
      lastName: parts[0],
      firstName: parts.slice(1).join(" "),
    };
  }

  return {
    lastName: clean,
    firstName: undefined,
  };
}

function buildBusinessProfile(baseUrl: string): Stripe.AccountCreateParams.BusinessProfile {
  return {
    url: baseUrl,
    // 7311 = Advertising Services.
    // クリエイターがPR投稿・UGC制作を提供する用途に一番近い。
    mcc: "7311",
    product_description:
      "Creator provides sponsored social media posts, short videos, and UGC content for brands through Trendre.",
  };
}

function buildAccountCreateParams({
  user,
  creator,
  baseUrl,
}: {
  user: User;
  creator: CreatorForConnect;
  baseUrl: string;
}): Stripe.AccountCreateParams {
  const fullName = normalizeName(creator.full_name || creator.display_name);
  const { firstName, lastName } = splitJapaneseName(fullName);

  return {
    type: "express",
    country: "JP",
    email: user.email ?? undefined,
    business_type: "individual",
    business_profile: buildBusinessProfile(baseUrl),
    individual: {
      email: user.email ?? undefined,
      first_name: firstName,
      last_name: lastName,
    },
    capabilities: {
      transfers: {
        requested: true,
      },
    },
    metadata: {
      app: "trendre",
      supabase_user_id: user.id,
      creator_id: creator.id,
    },
  };
}

function buildAccountUpdateParams({
  user,
  creator,
  baseUrl,
}: {
  user: User;
  creator: CreatorForConnect;
  baseUrl: string;
}): Stripe.AccountUpdateParams {
  const fullName = normalizeName(creator.full_name || creator.display_name);
  const { firstName, lastName } = splitJapaneseName(fullName);

  return {
    email: user.email ?? undefined,
    business_profile: buildBusinessProfile(baseUrl),
    individual: {
      email: user.email ?? undefined,
      first_name: firstName,
      last_name: lastName,
    },
    metadata: {
      app: "trendre",
      supabase_user_id: user.id,
      creator_id: creator.id,
    },
  };
}

// ルート存在確認用。
// ブラウザで /api/creator/connect/onboarding-link を開いた時に、
// 404ではなくこのJSONが出れば、Next.jsがAPIルートを認識できています。
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "creator connect onboarding link",
    message:
      "POST this route with Authorization: Bearer <Supabase access token> to create a Stripe Express onboarding link.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { data: roles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      throw roleError;
    }

    const hasCreatorRole = Boolean(
      roles?.some((item) => item.role === "creator")
    );

    if (!hasCreatorRole) {
      return NextResponse.json(
        { error: "クリエイター権限がありません" },
        { status: 403 }
      );
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

    const creator = creatorRow as CreatorForConnect;
    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    let stripeAccountId = creator.stripe_account_id;
    let stripeAccount: Stripe.Account | null = null;

    if (stripeAccountId) {
      try {
        stripeAccount = (await stripe.accounts.retrieve(
          stripeAccountId
        )) as Stripe.Account;
      } catch (error) {
        if (!isStripeResourceMissing(error)) {
          throw error;
        }

        // Stripe側でアカウントが消えている/存在しない場合は、新規作成し直す。
        stripeAccountId = null;
        stripeAccount = null;
      }
    }

    if (!stripeAccountId || !stripeAccount) {
      stripeAccount = await stripe.accounts.create(
        buildAccountCreateParams({
          user,
          creator,
          baseUrl,
        })
      );

      stripeAccountId = stripeAccount.id;
    } else {
      // 既存アカウントでも、business_profileなど不足しやすい項目を補完する。
      stripeAccount = (await stripe.accounts.update(
        stripeAccountId,
        buildAccountUpdateParams({
          user,
          creator,
          baseUrl,
        })
      )) as Stripe.Account;
    }

    const onboardingCompleted = getConnectOnboardingCompleted(stripeAccount);
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("creators")
      .update({
        stripe_account_id: stripeAccountId,
        stripe_onboarding_completed: onboardingCompleted,
        updated_at: nowIso,
      })
      .eq("id", creator.id);

    if (updateError) {
      throw updateError;
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      refresh_url: `${baseUrl}/creator/payouts?connect=refresh`,
      return_url: `${baseUrl}/creator/payouts?connect=return`,
      collection_options: {
        fields: "currently_due",
      },
    });

    return NextResponse.json({
      ok: true,
      url: accountLink.url,
      stripe_account_id: stripeAccountId,
      stripe_onboarding_completed: onboardingCompleted,
    });
  } catch (error) {
    console.error("creator connect onboarding link error", error);

    return NextResponse.json(
      { error: "Stripe Connectのオンボーディングリンク作成に失敗しました" },
      { status: 500 }
    );
  }
}