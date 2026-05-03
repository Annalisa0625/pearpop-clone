// app/api/signup/complete-company/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TERMS_VERSION = "2026-03-29-v1";
const PRIVACY_VERSION = "2026-03-29-v1";

export async function POST(req: Request) {
  try {
    const {
      token,
      company_name,
      website_url,
      phone_number,
      usage_purpose,
      password,
      agreed_to_terms,
      agreed_to_privacy,
    } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    if (!company_name?.trim()) {
      return NextResponse.json(
        { error: "会社名を入力してください" },
        { status: 400 }
      );
    }

    if (!website_url?.trim()) {
      return NextResponse.json(
        { error: "会社HP URL または ECサイト URL を入力してください" },
        { status: 400 }
      );
    }

    if (!/^https?:\/\/.+/i.test(website_url.trim())) {
      return NextResponse.json(
        { error: "URLは http:// または https:// から入力してください" },
        { status: 400 }
      );
    }

    if (!phone_number?.trim()) {
      return NextResponse.json(
        { error: "電話番号を入力してください" },
        { status: 400 }
      );
    }

    if (!usage_purpose?.trim()) {
      return NextResponse.json(
        { error: "利用目的を選択してください" },
        { status: 400 }
      );
    }

    if (!password || password.length < 12) {
      return NextResponse.json(
        { error: "パスワードは12文字以上必要です" },
        { status: 400 }
      );
    }

    if (!agreed_to_terms || !agreed_to_privacy) {
      return NextResponse.json(
        { error: "利用規約とプライバシーポリシーへの同意が必要です" },
        { status: 400 }
      );
    }

    const { data: signup } = await supabaseAdmin
      .from("signup_tokens")
      .select("email, role, expires_at, used_at")
      .eq("token", token)
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
        password,
        email_confirm: true,
      });

    if (createError || !createdUser?.user) {
      return NextResponse.json(
        { error: createError?.message ?? "ユーザー作成に失敗しました" },
        { status: 500 }
      );
    }

    const userId = createdUser.user.id;

    const { error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        user_id: userId,
        company_name: company_name.trim(),
        contact_email: signup.email,
        website_url: website_url.trim(),
        phone_number: phone_number.trim(),
        usage_purpose: usage_purpose.trim(),
        approval_status: "pending",
      });

    if (companyError) {
      return NextResponse.json(
        { error: companyError.message ?? "企業情報作成に失敗しました" },
        { status: 500 }
      );
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
      user_id: userId,
      role: "company",
    });

    if (roleError) {
      return NextResponse.json(
        { error: roleError.message ?? "ロール作成に失敗しました" },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: stateError } = await supabaseAdmin.from("user_states").upsert({
      user_id: userId,
      creator_profile_completed: false,
      company_profile_completed: false,
      onboarding_completed: false,
      company_access_status: "pending_approval",
      company_subscription_status: "inactive",
      terms_agreed_at: nowIso,
      privacy_agreed_at: nowIso,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
    });

    if (stateError) {
      return NextResponse.json(
        { error: stateError.message ?? "ユーザー状態作成に失敗しました" },
        { status: 500 }
      );
    }

    const { error: tokenError } = await supabaseAdmin
      .from("signup_tokens")
      .update({ used_at: nowIso })
      .eq("token", token);

    if (tokenError) {
      return NextResponse.json(
        { error: tokenError.message ?? "トークン更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500 }
    );
  }
}