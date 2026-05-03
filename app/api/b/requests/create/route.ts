// File: app/api/b/requests/create/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
}

function isSameUsageMonth(a: Date, b: Date) {
  return getMonthKey(a) === getMonthKey(b);
}

function getPlanMonthlyLimit(plan: "free" | "standard" | "global_pro") {
  return plan === "free" ? 5 : null;
}

function normalizeCountry(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function isJapanCountry(value: string | null | undefined) {
  const normalized = normalizeCountry(value);
  return ["日本", "japan", "jp", "jpn"].includes(normalized);
}

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

  const now = new Date();

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
      { error: { message: "企業アカウントのみ依頼を送信できます。" } },
      { status: 403 }
    );
  }

  const { data: activeSuspensions, error: suspensionError } = await supabase
    .from("user_suspensions")
    .select("id, level, is_active")
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
      { error: { message: "現在このアカウントでは依頼を送信できません。" } },
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
      { error: { message: "審査承認後に依頼送信が可能になります。" } },
      { status: 403 }
    );
  }

  const { data: userState, error: stateError } = await supabase
    .from("user_states")
    .select(
      `
      company_profile_completed,
      company_access_status,
      company_subscription_status,
      company_plan_code,
      monthly_request_limit,
      monthly_request_used,
      request_usage_reset_at
      `
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (stateError) {
    console.error("user_states error:", stateError);
    return NextResponse.json(
      { error: { message: "利用状態の確認に失敗しました。" } },
      { status: 500 }
    );
  }

  if (!userState) {
    return NextResponse.json(
      { error: { message: "利用状態が見つかりません。" } },
      { status: 500 }
    );
  }

  if (!userState.company_profile_completed) {
    return NextResponse.json(
      {
        error: {
          message: "企業プロフィールの登録完了後に依頼送信が可能になります。",
        },
      },
      { status: 403 }
    );
  }

  if (userState.company_access_status !== "approved") {
    return NextResponse.json(
      { error: { message: "現在このアカウントでは依頼を送信できません。" } },
      { status: 403 }
    );
  }

  if (userState.company_subscription_status !== "active") {
    return NextResponse.json(
      { error: { message: "依頼送信には有効なプラン登録が必要です。" } },
      { status: 403 }
    );
  }

  const companyPlanCode = (userState.company_plan_code ?? "free") as
    | "free"
    | "standard"
    | "global_pro";

  if (!["free", "standard", "global_pro"].includes(companyPlanCode)) {
    return NextResponse.json(
      { error: { message: "プラン状態が不正です。" } },
      { status: 500 }
    );
  }

  let monthlyRequestUsed = userState.monthly_request_used ?? 0;
  let monthlyRequestLimit = userState.monthly_request_limit ?? null;
  const resetAtRaw = userState.request_usage_reset_at;

  let needsUsageReset = false;

  if (!resetAtRaw) {
    needsUsageReset = true;
  } else {
    const resetAt = new Date(resetAtRaw);
    if (Number.isNaN(resetAt.getTime()) || !isSameUsageMonth(resetAt, now)) {
      needsUsageReset = true;
    }
  }

  if (needsUsageReset) {
    const nextLimit = getPlanMonthlyLimit(companyPlanCode);

    const { error: resetError } = await supabase
      .from("user_states")
      .update({
        monthly_request_used: 0,
        monthly_request_limit: nextLimit,
        request_usage_reset_at: now.toISOString(),
      })
      .eq("user_id", user.id);

    if (resetError) {
      console.error("usage reset error:", resetError);
      return NextResponse.json(
        { error: { message: "利用回数の更新に失敗しました。" } },
        { status: 500 }
      );
    }

    monthlyRequestUsed = 0;
    monthlyRequestLimit = nextLimit;
  }

  if (companyPlanCode === "free") {
    if (
      monthlyRequestLimit !== null &&
      monthlyRequestUsed >= monthlyRequestLimit
    ) {
      return NextResponse.json(
        {
          error: {
            message:
              "Freeプランでは月5通まで依頼送信できます。上限に達したため、プラン変更をご検討ください。",
          },
        },
        { status: 403 }
      );
    }
  }

  const body = await req.json().catch(() => null);

  const creator_user_id = body?.creator_user_id as string | undefined;
  const creator_menu_id =
    (body?.creator_menu_id as string | null | undefined) ?? null;
  const product_name =
    (body?.product_name as string | null | undefined) ?? null;
  const product_url = (body?.product_url as string | null | undefined) ?? null;
  const deadline = (body?.deadline as string | null | undefined) ?? null;
  const has_free_offer = !!body?.has_free_offer;
  const note = (body?.note as string | null | undefined) ?? null;

  const requested_platform =
    (body?.requested_platform as string | null | undefined) ?? null;
  const requested_budget =
    body?.requested_budget === "" || body?.requested_budget == null
      ? null
      : Number(body.requested_budget);
  const wants_secondary_use = !!body?.wants_secondary_use;

  if (!creator_user_id) {
    return NextResponse.json(
      { error: { message: "creator_user_id is required" } },
      { status: 400 }
    );
  }

  if (!note || note.trim().length < 10) {
    return NextResponse.json(
      { error: { message: "依頼内容は10文字以上で入力してください。" } },
      { status: 400 }
    );
  }

  if (!product_name || product_name.trim().length < 2) {
    return NextResponse.json(
      { error: { message: "商品名は2文字以上で入力してください。" } },
      { status: 400 }
    );
  }

  if (!requested_platform) {
    return NextResponse.json(
      { error: { message: "希望媒体を選択してください。" } },
      { status: 400 }
    );
  }

  if (requested_budget !== null && Number.isNaN(requested_budget)) {
    return NextResponse.json(
      { error: { message: "希望金額が不正です。" } },
      { status: 400 }
    );
  }

  const { data: creatorRow, error: creatorError } = await supabase
    .from("creators")
    .select("id, approval_status")
    .eq("id", creator_user_id)
    .maybeSingle();

  if (creatorError) {
    console.error("creator check error:", creatorError);
    return NextResponse.json(
      { error: { message: "依頼先クリエイターの確認に失敗しました。" } },
      { status: 500 }
    );
  }

  if (!creatorRow || creatorRow.approval_status !== "approved") {
    return NextResponse.json(
      { error: { message: "依頼先クリエイターが見つかりません。" } },
      { status: 400 }
    );
  }

  // Free / Standard は日本向けクリエイターのみ
  if (companyPlanCode === "free" || companyPlanCode === "standard") {
    const { data: socialRows, error: socialError } = await supabase
      .from("creator_social_accounts")
      .select("audience_country")
      .eq("creator_id", creator_user_id);

    if (socialError) {
      console.error("creator_social_accounts error:", socialError);
      return NextResponse.json(
        { error: { message: "クリエイター地域情報の確認に失敗しました。" } },
        { status: 500 }
      );
    }

    const hasJapanAudience = (socialRows ?? []).some((row) =>
      isJapanCountry(row.audience_country)
    );

    if (!hasJapanAudience) {
      return NextResponse.json(
        {
          error: {
            message:
              companyPlanCode === "free"
                ? "Freeプランでは、日本向けのクリエイターにのみ依頼できます。海外向けクリエイターへの依頼はGlobalProをご利用ください。"
                : "Standardプランでは、日本向けのクリエイターにのみ依頼できます。海外向けクリエイターへの依頼はGlobalProをご利用ください。",
          },
        },
        { status: 403 }
      );
    }
  }

  const { error: insertError } = await supabase.from("requests").insert({
    b_user_id: user.id,
    creator_user_id,
    creator_menu_id,
    product_name,
    product_url,
    deadline,
    has_free_offer,
    note,
    requested_platform,
    requested_budget,
    wants_secondary_use,
    status: "pending",
  });

  if (insertError) {
    console.error("requests insert error:", insertError);
    return NextResponse.json(
      { error: { message: "リクエスト作成に失敗しました。" } },
      { status: 500 }
    );
  }

  if (companyPlanCode === "free") {
    const { error: usageUpdateError } = await supabase
      .from("user_states")
      .update({
        monthly_request_used: monthlyRequestUsed + 1,
      })
      .eq("user_id", user.id);

    if (usageUpdateError) {
      console.error("monthly_request_used update error:", usageUpdateError);
    }
  }

  return NextResponse.json({
    ok: true,
    plan: companyPlanCode,
    monthly_request_used:
      companyPlanCode === "free" ? monthlyRequestUsed + 1 : monthlyRequestUsed,
    monthly_request_limit: monthlyRequestLimit,
  });
}