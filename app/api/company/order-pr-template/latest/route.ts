// File: app/api/company/order-pr-template/latest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LatestPrTemplateRow = {
  id: string;
  product_name: string | null;
  pr_account: string | null;
  pr_hashtags: string[] | null;
  pr_copy_text: string | null;
  post_notes: string | null;
  created_at: string;
};

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

function hasTemplateValue(row: LatestPrTemplateRow) {
  const hasAccount = !!row.pr_account?.trim();
  const hasHashtags =
    Array.isArray(row.pr_hashtags) &&
    row.pr_hashtags.some((tag) => !!tag?.trim());
  const hasNotes = !!row.post_notes?.trim();

  return hasAccount || hasHashtags || hasNotes;
}

export async function GET(req: NextRequest) {
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

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        product_name,
        pr_account,
        pr_hashtags,
        pr_copy_text,
        post_notes,
        created_at
      `
      )
      .eq("b_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as LatestPrTemplateRow[];
    const latest = rows.find(hasTemplateValue) ?? null;

    return NextResponse.json({
      template: latest
        ? {
            order_id: latest.id,
            product_name: latest.product_name,
            pr_account: latest.pr_account ?? "",
            pr_hashtags: Array.isArray(latest.pr_hashtags)
              ? latest.pr_hashtags
              : [],
            pr_copy_text: latest.pr_copy_text ?? "",
            post_notes: latest.post_notes ?? "",
            created_at: latest.created_at,
          }
        : null,
    });
  } catch (error) {
    console.error("latest company order pr template error", error);

    return NextResponse.json(
      { error: "前回の投稿設定を取得できませんでした" },
      { status: 500 }
    );
  }
}