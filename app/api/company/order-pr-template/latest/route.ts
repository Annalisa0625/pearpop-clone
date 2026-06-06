// File: app/api/company/order-pr-template/latest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LatestOrderTemplateRow = {
  id: string;
  project_type: string | null;
  product_name: string | null;
  product_url: string | null;
  deadline: string | null;
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

function hasTemplateValue(row: LatestOrderTemplateRow) {
  const hasProjectType = !!row.project_type?.trim();
  const hasProductName = !!row.product_name?.trim();
  const hasProductUrl = !!row.product_url?.trim();
  const hasDeadline = !!row.deadline?.trim();
  const hasAccount = !!row.pr_account?.trim();
  const hasHashtags =
    Array.isArray(row.pr_hashtags) &&
    row.pr_hashtags.some((tag) => !!tag?.trim());
  const hasNotes = !!row.post_notes?.trim();

  return (
    hasProjectType ||
    hasProductName ||
    hasProductUrl ||
    hasDeadline ||
    hasAccount ||
    hasHashtags ||
    hasNotes
  );
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
        project_type,
        product_name,
        product_url,
        deadline,
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

    const rows = (data ?? []) as LatestOrderTemplateRow[];
    const latest = rows.find(hasTemplateValue) ?? null;

    return NextResponse.json({
      template: latest
        ? {
            order_id: latest.id,
            project_type: latest.project_type ?? "",
            product_name: latest.product_name ?? "",
            product_url: latest.product_url ?? "",
            deadline: latest.deadline ?? "",
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
    console.error("latest company order template error", error);

    return NextResponse.json(
      { error: "前回の注文内容を取得できませんでした" },
      { status: 500 }
    );
  }
}