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
  // 初期実装では「本人確認情報提出済み」かつ「payout可能」を完了扱いにする。
  // 今後、charges_enabled / requirements などもDBに保存したくなったら拡張する。
  return Boolean(account.details_submitted && account.payouts_enabled);
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
      stripeAccount = await stripe.accounts.create({
        type: "express",
        country: "JP",
        email: user.email ?? undefined,
        business_type: "individual",
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
      });

      stripeAccountId = stripeAccount.id;
    }

    const onboardingCompleted =
      getConnectOnboardingCompleted(stripeAccount);

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