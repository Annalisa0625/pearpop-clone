// app/api/signup/complete-company/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TERMS_VERSION = "2026-03-29-v1";
const PRIVACY_VERSION = "2026-03-29-v1";

type CompleteCompanyBody = {
  token?: string;
  email?: string;
  password?: string;
  company_name?: string;
  website_url?: string;
  phone_number?: string;
  usage_purpose?: string;
  agreed_to_terms?: boolean;
  agreed_to_privacy?: boolean;
};

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  return token?.trim() || null;
}

function validateCommonInput(body: CompleteCompanyBody) {
  if (!body.company_name?.trim()) {
    return "会社名を入力してください";
  }

  if (!body.website_url?.trim()) {
    return "会社HP URL または ECサイト URL を入力してください";
  }

  if (!/^https?:\/\/.+/i.test(body.website_url.trim())) {
    return "URLは http:// または https:// から入力してください";
  }

  if (!body.phone_number?.trim()) {
    return "電話番号を入力してください";
  }

  if (!body.usage_purpose?.trim()) {
    return "利用目的を選択してください";
  }

  if (!body.agreed_to_terms || !body.agreed_to_privacy) {
    return "利用規約とプライバシーポリシーへの同意が必要です";
  }

  return null;
}

async function ensureCompanyRole(userId: string) {
  const { data: existingRole, error: existingRoleError } = await supabaseAdmin
    .from("user_roles")
    .select("id, role")
    .eq("user_id", userId)
    .eq("role", "company")
    .maybeSingle();

  if (existingRoleError) {
    throw existingRoleError;
  }

  if (existingRole) {
    return;
  }

  const { error: roleInsertError } = await supabaseAdmin
    .from("user_roles")
    .insert({
      user_id: userId,
      role: "company",
    });

  if (roleInsertError) {
    throw roleInsertError;
  }
}

async function ensureUserState(userId: string) {
  const nowIso = new Date().toISOString();

  const statePayload = {
    creator_profile_completed: false,
    company_profile_completed: true,
    onboarding_completed: true,

    company_access_status: "approved",
    company_plan_code: "free",
    company_subscription_status: "inactive",

    monthly_request_limit: 5,
    monthly_request_used: 0,
    request_usage_reset_at: nowIso,

    terms_agreed_at: nowIso,
    privacy_agreed_at: nowIso,
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    updated_at: nowIso,
  };

  const { data: existingState, error: existingStateError } = await supabaseAdmin
    .from("user_states")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingStateError) {
    throw existingStateError;
  }

  if (existingState) {
    const { error: updateStateError } = await supabaseAdmin
      .from("user_states")
      .update(statePayload)
      .eq("user_id", userId);

    if (updateStateError) {
      throw updateStateError;
    }

    return;
  }

  const { error: insertStateError } = await supabaseAdmin
    .from("user_states")
    .insert({
      user_id: userId,
      ...statePayload,
    });

  if (insertStateError) {
    throw insertStateError;
  }
}

async function ensureCompanyRecords(args: {
  userId: string;
  email: string;
  companyName: string;
  websiteUrl: string;
  phoneNumber: string;
  usagePurpose: string;
}) {
  const nowIso = new Date().toISOString();

  const { data: existingCompany, error: existingCompanyError } =
    await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("user_id", args.userId)
      .maybeSingle();

  if (existingCompanyError) {
    throw existingCompanyError;
  }

  if (existingCompany?.id) {
    const { error: updateCompanyError } = await supabaseAdmin
      .from("companies")
      .update({
        company_name: args.companyName,
        contact_email: args.email,
        website_url: args.websiteUrl,
        phone_number: args.phoneNumber,
        usage_purpose: args.usagePurpose,
        approval_status: "approved",
        updated_at: nowIso,
      })
      .eq("id", existingCompany.id);

    if (updateCompanyError) {
      throw updateCompanyError;
    }
  } else {
    const { error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        user_id: args.userId,
        company_name: args.companyName,
        contact_email: args.email,
        website_url: args.websiteUrl,
        phone_number: args.phoneNumber,
        usage_purpose: args.usagePurpose,
        approval_status: "approved",
      });

    if (companyError) {
      throw companyError;
    }
  }

  await ensureCompanyRole(args.userId);
  await ensureUserState(args.userId);
}

async function completeWithExistingSession(
  req: Request,
  body: CompleteCompanyBody
) {
  const token = getBearerToken(req);

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const email = user.email;

  if (!email) {
    return NextResponse.json(
      { error: "メールアドレスを取得できませんでした" },
      { status: 400 }
    );
  }

  await ensureCompanyRecords({
    userId: user.id,
    email,
    companyName: body.company_name!.trim(),
    websiteUrl: body.website_url!.trim(),
    phoneNumber: body.phone_number!.trim(),
    usagePurpose: body.usage_purpose!.trim(),
  });

  return NextResponse.json({
    success: true,
    mode: "oauth_or_existing_session",
    user_id: user.id,
    email,
  });
}

async function findExistingUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  return (
    data.users.find(
      (item) => item.email?.toLowerCase() === email.toLowerCase()
    ) ?? null
  );
}

async function completeWithEmailPassword(body: CompleteCompanyBody) {
  if (!body.email?.trim()) {
    return NextResponse.json(
      { error: "メールアドレスを入力してください" },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return NextResponse.json(
      { error: "メールアドレスの形式が正しくありません" },
      { status: 400 }
    );
  }

  if (!body.password || body.password.length < 12) {
    return NextResponse.json(
      { error: "パスワードは12文字以上必要です" },
      { status: 400 }
    );
  }

  const email = body.email.trim();
  const existingUser = await findExistingUserByEmail(email);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: createdUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          role: "company",
          company_name: body.company_name?.trim() ?? "",
        },
      });

    if (createError || !createdUser?.user) {
      return NextResponse.json(
        { error: createError?.message ?? "ユーザー作成に失敗しました" },
        { status: 500 }
      );
    }

    userId = createdUser.user.id;
  }

  await ensureCompanyRecords({
    userId,
    email,
    companyName: body.company_name!.trim(),
    websiteUrl: body.website_url!.trim(),
    phoneNumber: body.phone_number!.trim(),
    usagePurpose: body.usage_purpose!.trim(),
  });

  return NextResponse.json({
    success: true,
    mode: existingUser ? "email_password_existing_user" : "email_password",
    user_id: userId,
    email,
  });
}

// 旧メールリンク方式の互換。company-entry は /signup/company へ移行済みなので通常は使わない。
async function completeWithLegacyToken(body: CompleteCompanyBody) {
  if (!body.token) return null;

  if (!body.password || body.password.length < 12) {
    return NextResponse.json(
      { error: "パスワードは12文字以上必要です" },
      { status: 400 }
    );
  }

  const { data: signup } = await supabaseAdmin
    .from("signup_tokens")
    .select("email, role, expires_at, used_at")
    .eq("token", body.token)
    .maybeSingle();

  if (!signup) {
    return NextResponse.json(
      { error: "無効なトークンです" },
      { status: 400 }
    );
  }

  if (signup.used_at) {
    return NextResponse.json(
      { error: "このURLは既に使用されています" },
      { status: 400 }
    );
  }

  if (new Date(signup.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "トークンの有効期限が切れています" },
      { status: 400 }
    );
  }

  if (signup.role !== "company") {
    return NextResponse.json(
      { error: "このURLは企業登録用ではありません" },
      { status: 400 }
    );
  }

  const { data: createdUser, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: signup.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        role: "company",
        company_name: body.company_name?.trim() ?? "",
      },
    });

  if (createError || !createdUser?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "ユーザー作成に失敗しました" },
      { status: 500 }
    );
  }

  await ensureCompanyRecords({
    userId: createdUser.user.id,
    email: signup.email,
    companyName: body.company_name!.trim(),
    websiteUrl: body.website_url!.trim(),
    phoneNumber: body.phone_number!.trim(),
    usagePurpose: body.usage_purpose!.trim(),
  });

  const nowIso = new Date().toISOString();

  await supabaseAdmin
    .from("signup_tokens")
    .update({ used_at: nowIso })
    .eq("token", body.token);

  return NextResponse.json({
    success: true,
    mode: "legacy_token",
    user_id: createdUser.user.id,
    email: signup.email,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CompleteCompanyBody;

    const commonError = validateCommonInput(body);

    if (commonError) {
      return NextResponse.json({ error: commonError }, { status: 400 });
    }

    const legacyResult = await completeWithLegacyToken(body);
    if (legacyResult) return legacyResult;

    const sessionResult = await completeWithExistingSession(req, body);
    if (sessionResult) return sessionResult;

    return await completeWithEmailPassword(body);
  } catch (error) {
    console.error("complete company signup error", error);

    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}