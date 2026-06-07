// File: app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PrimaryRole = "admin" | "company" | "creator" | "unknown";

function choosePrimaryRole(roles: string[]): PrimaryRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("company")) return "company";
  if (roles.includes("creator")) return "creator";
  return "unknown";
}

function getPublicUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) return null;

  try {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdminApi();

  if (!admin.ok) {
    return admin.response;
  }

  const { userId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const [
      authResult,
      { data: profile, error: profileErr },
      { data: roleRows, error: roleErr },
      { data: userState, error: userStateErr },
      { data: company, error: companyErr },
      { data: creator, error: creatorErr },
      { data: bOrders, error: bOrdersErr },
      { data: cOrders, error: cOrdersErr },
    ] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),

      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),

      supabaseAdmin.from("user_roles").select("user_id, role").eq("user_id", userId),

      supabaseAdmin
        .from("user_states")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("companies")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("creators")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("orders")
        .select(
          `
          id,
          created_at,
          updated_at,
          status,
          payment_status,
          product_name,
          menu_title_snapshot,
          buyer_total_amount,
          creator_payout_amount,
          currency,
          b_user_id,
          creator_user_id,
          accepted_at,
          captured_at,
          delivered_at,
          completed_at,
          delivered_post_url
        `
        )
        .eq("b_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80),

      supabaseAdmin
        .from("orders")
        .select(
          `
          id,
          created_at,
          updated_at,
          status,
          payment_status,
          product_name,
          menu_title_snapshot,
          buyer_total_amount,
          creator_payout_amount,
          currency,
          b_user_id,
          creator_user_id,
          accepted_at,
          captured_at,
          delivered_at,
          completed_at,
          delivered_post_url
        `
        )
        .eq("creator_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

    if (profileErr) console.error("admin user detail profile error:", profileErr);
    if (roleErr) console.error("admin user detail role error:", roleErr);
    if (userStateErr) console.error("admin user detail userState error:", userStateErr);
    if (companyErr) console.error("admin user detail company error:", companyErr);
    if (creatorErr) console.error("admin user detail creator error:", creatorErr);
    if (bOrdersErr) console.error("admin user detail bOrders error:", bOrdersErr);
    if (cOrdersErr) console.error("admin user detail cOrders error:", cOrdersErr);

    const authUser = authResult.data?.user
      ? {
          id: authResult.data.user.id,
          email: authResult.data.user.email ?? null,
          phone: authResult.data.user.phone ?? null,
          created_at: authResult.data.user.created_at ?? null,
          updated_at: authResult.data.user.updated_at ?? null,
          last_sign_in_at: authResult.data.user.last_sign_in_at ?? null,
          email_confirmed_at: authResult.data.user.email_confirmed_at ?? null,
          phone_confirmed_at: authResult.data.user.phone_confirmed_at ?? null,
          app_metadata: authResult.data.user.app_metadata ?? null,
          user_metadata: authResult.data.user.user_metadata ?? null,
        }
      : null;

    const roles = Array.from(
      new Set(
        ((roleRows ?? []) as Array<{ role: string | null }>)
          .map((row) => row.role)
          .filter((role): role is string => Boolean(role))
      )
    );

    if (company && !roles.includes("company")) {
      roles.push("company");
    }

    if (creator && !roles.includes("creator")) {
      roles.push("creator");
    }

    const primaryRole = choosePrimaryRole(roles);

    let creatorSocialAccounts: any[] = [];
    let creatorMenus: any[] = [];
    let portfolioAssets: any[] = [];

    if (creator?.id) {
      const [
        { data: socialRows, error: socialErr },
        { data: menuRows, error: menuErr },
        { data: portfolioRows, error: portfolioErr },
      ] = await Promise.all([
        supabaseAdmin
          .from("creator_social_accounts")
          .select("*")
          .eq("creator_id", creator.id)
          .order("created_at", { ascending: true }),

        supabaseAdmin
          .from("creator_menus")
          .select("*")
          .eq("creator_id", creator.id),

        supabaseAdmin
          .from("creator_portfolio_assets")
          .select("*")
          .eq("creator_id", creator.id),
      ]);

      if (socialErr) {
        console.error("admin user detail social error:", socialErr);
      }

      if (menuErr) {
        console.error("admin user detail menu error:", menuErr);
      }

      if (portfolioErr) {
        console.error("admin user detail portfolio error:", portfolioErr);
      }

      creatorSocialAccounts = socialRows ?? [];
      creatorMenus = menuRows ?? [];

      portfolioAssets = (portfolioRows ?? []).map((asset: any) => ({
        ...asset,
        public_url:
          asset.public_url ??
          getPublicUrl(asset.storage_bucket ?? null, asset.storage_path ?? null),
      }));
    }

    if (!authUser && !company && !creator && !profile) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        type: primaryRole,
        userId,
        authUser,
        roles,
        profile: profile ?? null,
        userState: userState ?? null,
        company: company ?? null,
        creator: creator ?? null,
        creatorSocialAccounts,
        creatorMenus,
        portfolioAssets,
        bOrders: bOrders ?? [],
        cOrders: cOrders ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("admin user detail error:", err);

    return NextResponse.json(
      { error: "failed to load admin user detail" },
      { status: 500 }
    );
  }
}