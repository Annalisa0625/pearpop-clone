// app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBaseUrl, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function ensureCompanyUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "company")
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

async function getCompanyAndUserState(userId: string) {
  const [companyResult, userStateResult] = await Promise.all([
    supabaseAdmin
      .from("companies")
      .select("contact_email")
      .eq("user_id", userId)
      .maybeSingle(),

    supabaseAdmin
      .from("user_states")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (companyResult.error) {
    throw companyResult.error;
  }

  if (userStateResult.error) {
    throw userStateResult.error;
  }

  return {
    contactEmail: companyResult.data?.contact_email ?? null,
    stripeCustomerId: userStateResult.data?.stripe_customer_id ?? null,
  };
}

async function upsertUserState(
  userId: string,
  patch: Record<string, string | number | boolean | null>
) {
  const { error } = await supabaseAdmin
    .from("user_states")
    .upsert(
      {
        user_id: userId,
        ...patch,
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) {
    throw error;
  }
}

async function resolveStrictStripeCustomer(args: {
  userId: string;
  email: string;
  storedCustomerId?: string | null;
}) {
  const stripe = getStripe();

  if (args.storedCustomerId) {
    try {
      const storedCustomer = await stripe.customers.retrieve(
        args.storedCustomerId
      );

      if (!("deleted" in storedCustomer)) {
        console.log("stripe portal: using stored customer id", {
          userId: args.userId,
          customerId: storedCustomer.id,
          metadataUserId: storedCustomer.metadata?.supabase_user_id ?? null,
        });

        return storedCustomer;
      }
    } catch (error) {
      console.warn("stripe portal: stored customer retrieve failed", {
        userId: args.userId,
        storedCustomerId: args.storedCustomerId,
        error,
      });
    }
  }

  const listed = await stripe.customers.list({
    email: args.email,
    limit: 20,
  });

  const matched = listed.data.find(
    (customer) => customer.metadata?.supabase_user_id === args.userId
  );

  if (!matched) {
    console.warn("stripe portal: no strict metadata match found", {
      userId: args.userId,
      email: args.email,
      candidates: listed.data.map((customer) => ({
        id: customer.id,
        metadataUserId: customer.metadata?.supabase_user_id ?? null,
      })),
    });
    return null;
  }

  await upsertUserState(args.userId, {
    stripe_customer_id: matched.id,
  });

  console.log("stripe portal: using metadata-matched customer", {
    userId: args.userId,
    customerId: matched.id,
  });

  return matched;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const isCompany = await ensureCompanyUser(user.id);

    if (!isCompany) {
      return NextResponse.json(
        { error: "企業ユーザーのみ利用できます" },
        { status: 403 }
      );
    }

    const { contactEmail, stripeCustomerId } = await getCompanyAndUserState(
      user.id
    );

    const email = user.email ?? contactEmail ?? null;

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスを取得できませんでした" },
        { status: 400 }
      );
    }

    const customer = await resolveStrictStripeCustomer({
      userId: user.id,
      email,
      storedCustomerId: stripeCustomerId,
    });

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "このアカウントに紐づく Stripe の課金情報を厳密に特定できませんでした。Sandbox に重複 customer がある可能性があります。",
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    console.log("stripe portal: creating billing portal session", {
      userId: user.id,
      customerId: customer.id,
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${baseUrl}/b/billing/portal-return`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe portal error", error);
    return NextResponse.json(
      { error: "Billing Portal の起動に失敗しました" },
      { status: 500 }
    );
  }
}