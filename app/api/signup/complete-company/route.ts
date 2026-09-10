import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TERMS_VERSION = "2026-03-29-v1";
const PRIVACY_VERSION = "2026-03-29-v1";

type CompleteCompanyBody = {
  company_name?: string;
  website_url?: string;
  phone_number?: string;
  usage_purpose?: string;
  agreed_to_terms?: boolean;
  agreed_to_privacy?: boolean;
};

function getBearerToken(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

function validateCommonInput(body: CompleteCompanyBody) {
  if (!body.company_name?.trim()) return "会社名を入力してください";
  if (!body.website_url?.trim()) return "会社HP URL または ECサイト URL を入力してください";
  if (!/^https?:\/\/.+/i.test(body.website_url.trim())) return "URLは http:// または https:// から入力してください";
  if (!body.phone_number?.trim()) return "電話番号を入力してください";
  if (!body.usage_purpose?.trim()) return "利用目的を選択してください";
  if (!body.agreed_to_terms || !body.agreed_to_privacy) return "利用規約とプライバシーポリシーへの同意が必要です";
  return null;
}

async function ensureCompanyRole(userId: string) {
  const { data, error } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "company").maybeSingle();
  if (error) throw error;
  if (data) return;

  const { error: insertError } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "company" });
  if (!insertError) return;

  if (isUniqueViolation(insertError)) {
    const { data: concurrentRole, error: concurrentRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "company")
      .maybeSingle();
    if (concurrentRoleError) throw concurrentRoleError;
    if (concurrentRole) return;
  }

  throw insertError;
}

async function ensureCompanyState(userId: string) {
  const now = new Date().toISOString();
  const companyState = {
    company_profile_completed: true,
    onboarding_completed: true,
    company_access_status: "approved",
    company_plan_code: "free",
    company_subscription_status: "inactive",
    monthly_request_limit: 5,
    monthly_request_used: 0,
    request_usage_reset_at: now,
    updated_at: now,
  };

  const { data: existing, error: selectError } = await supabaseAdmin.from("user_states").select("user_id").eq("user_id", userId).maybeSingle();
  if (selectError) throw selectError;

  // A state row may belong to an existing Creator or Company. Signup only
  // creates a missing row; it never mutates an existing user's state.
  if (existing) return;

  const { error } = await supabaseAdmin.from("user_states").insert({
    user_id: userId,
    creator_profile_completed: false,
    ...companyState,
    terms_agreed_at: now,
    privacy_agreed_at: now,
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
  });
  if (!error) return;

  if (isUniqueViolation(error)) {
    const { data: concurrentState, error: concurrentStateError } = await supabaseAdmin
      .from("user_states")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (concurrentStateError) throw concurrentStateError;
    if (concurrentState) return;
  }

  throw error;
}

export async function POST(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    if (!accessToken) return NextResponse.json({ error: "認証トークンが必要です" }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    const user = authData.user;
    if (authError || !user) return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
    if (!user.email) return NextResponse.json({ error: "メールアドレスを取得できませんでした" }, { status: 400 });

    const body = (await req.json()) as CompleteCompanyBody;
    const inputError = validateCommonInput(body);
    if (inputError) return NextResponse.json({ error: inputError }, { status: 400 });

    const { data: existingCompany, error: companyLookupError } = await supabaseAdmin.from("companies").select("id").eq("user_id", user.id).maybeSingle();
    if (companyLookupError) throw companyLookupError;

    let companyAlreadyExisted = Boolean(existingCompany);

    if (!existingCompany) {
      const { error: companyInsertError } = await supabaseAdmin.from("companies").insert({
        user_id: user.id,
        company_name: body.company_name!.trim(),
        contact_email: user.email,
        website_url: body.website_url!.trim(),
        phone_number: body.phone_number!.trim(),
        usage_purpose: body.usage_purpose!.trim(),
        approval_status: "approved",
      });

      if (companyInsertError) {
        if (!isUniqueViolation(companyInsertError)) throw companyInsertError;

        const { data: concurrentCompany, error: concurrentCompanyError } = await supabaseAdmin
          .from("companies")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (concurrentCompanyError) throw concurrentCompanyError;
        if (!concurrentCompany) throw companyInsertError;
        companyAlreadyExisted = true;
      }
    }

    // Signup is never an edit endpoint. Existing Company records stay unchanged,
    // but incomplete prior attempts are repaired idempotently.
    await ensureCompanyRole(user.id);
    await ensureCompanyState(user.id);

    return NextResponse.json({ success: true, existing_company: companyAlreadyExisted, user_id: user.id });
  } catch (error) {
    console.error("complete company signup error", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
