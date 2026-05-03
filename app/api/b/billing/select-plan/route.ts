// app/api/b/billing/select-plan/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type PlanCode = "free" | "standard" | "global_pro";

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // no-op
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("auth.getUser error:", userError);
    return NextResponse.json(
      { error: { message: "ログイン状態の確認に失敗しました。" } },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: { message: "ログインが必要です。" } },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const plan = body?.plan as PlanCode | undefined;

  if (!plan || !["free", "standard", "global_pro"].includes(plan)) {
    return NextResponse.json(
      { error: { message: "不正なプランです。" } },
      { status: 400 }
    );
  }

  if (plan !== "free") {
    return NextResponse.json(
      {
        error: {
          message:
            "Standard / GlobalPro の開始は Stripe Checkout から行ってください。",
        },
      },
      { status: 400 }
    );
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("user_roles error:", roleError);
    return NextResponse.json(
      { error: { message: "ロール確認に失敗しました。" } },
      { status: 500 }
    );
  }

  const isCompany = (roleRows ?? []).some((r) => r.role === "company");
  if (!isCompany) {
    return NextResponse.json(
      { error: { message: "企業アカウントのみプラン変更できます。" } },
      { status: 403 }
    );
  }

  const { data: activeSuspensions, error: suspensionError } = await supabase
    .from("user_suspensions")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (suspensionError) {
    console.error("user_suspensions error:", suspensionError);
    return NextResponse.json(
      { error: { message: "利用状態の確認に失敗しました。" } },
      { status: 500 }
    );
  }

  if ((activeSuspensions ?? []).length > 0) {
    return NextResponse.json(
      { error: { message: "現在このアカウントではプラン変更できません。" } },
      { status: 403 }
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("approval_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (companyError) {
    console.error("companies error:", companyError);
    return NextResponse.json(
      { error: { message: "企業情報の確認に失敗しました。" } },
      { status: 500 }
    );
  }

  if (!company) {
    return NextResponse.json(
      { error: { message: "企業情報が見つかりません。" } },
      { status: 500 }
    );
  }

  if (company.approval_status !== "approved") {
    return NextResponse.json(
      { error: { message: "審査承認後にプラン変更が可能になります。" } },
      { status: 403 }
    );
  }

  const { data: userState, error: userStateError } = await supabase
    .from("user_states")
    .select(
      `
      stripe_subscription_id,
      stripe_subscription_status,
      stripe_cancel_at_period_end
      `
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (userStateError) {
    console.error("user_states select error:", userStateError);
    return NextResponse.json(
      { error: { message: "現在の契約状態の確認に失敗しました。" } },
      { status: 500 }
    );
  }

  const hasStripeManagedSubscription =
    !!userState?.stripe_subscription_id &&
    userState.stripe_subscription_status !== "canceled" &&
    userState.stripe_subscription_status !== "incomplete_expired";

  if (hasStripeManagedSubscription) {
    return NextResponse.json(
      {
        error: {
          message:
            "有料プランの解約・ダウングレードは Billing Portal から行ってください。",
        },
      },
      { status: 400 }
    );
  }

  const requestUsageResetAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: updateError } = await supabase
    .from("user_states")
    .update({
      company_plan_code: "free",
      company_subscription_status: "active",
      monthly_request_limit: 5,
      monthly_request_used: 0,
      request_usage_reset_at: requestUsageResetAt,
      stripe_subscription_id: null,
      stripe_subscription_status: "canceled",
      stripe_price_id: null,
      stripe_current_period_end: null,
      stripe_cancel_at_period_end: false,
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("user_states update error:", updateError);
    return NextResponse.json(
      { error: { message: "プラン更新に失敗しました。" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    plan: "free",
    company_subscription_status: "active",
    monthly_request_limit: 5,
    monthly_request_used: 0,
    request_usage_reset_at: requestUsageResetAt,
  });
}