// File: app/api/admin/users/list/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PrimaryRole = "admin" | "company" | "creator" | "unknown";

type AuthUserLite = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type AdminUserRow = {
  user_id: string;
  email: string | null;
  roles: string[];
  primary_role: PrimaryRole;
  display_name: string;
  created_at: string | null;
  last_sign_in_at: string | null;

  is_suspended: boolean;
  suspend_level: number | null;
  suspend_reason: string | null;

  company_name: string | null;
  company_approval_status: string | null;
  company_plan_code: string | null;
  company_subscription_status: string | null;
  monthly_request_used: number | null;
  monthly_request_limit: number | null;

  creator_name: string | null;
  creator_approval_status: string | null;
  creator_is_public: boolean | null;
  creator_is_suspended: boolean | null;
  creator_stripe_onboarding_completed: boolean | null;
  creator_menu_count: number;
  creator_portfolio_count: number;

  b_order_count: number;
  c_order_count: number;
  active_b_order_count: number;
  active_c_order_count: number;
  delayed_c_order_count: number;
};

function uniq(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
}

function getTime(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  return time;
}

function daysSince(value: string | null | undefined) {
  const time = getTime(value);

  if (time == null) return null;

  const diff = Date.now() - time;

  if (diff < 0) return 0;

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isActiveOrder(status: string | null | undefined) {
  return ["accepted_captured", "in_progress", "revision_requested"].includes(
    status ?? ""
  );
}

function choosePrimaryRole(roles: string[]): PrimaryRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("company")) return "company";
  if (roles.includes("creator")) return "creator";
  return "unknown";
}

export async function GET() {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const [
      { data: companies, error: companiesErr },
      { data: creators, error: creatorsErr },
      { data: profiles, error: profilesErr },
      { data: userRoles, error: userRolesErr },
      { data: userStates, error: userStatesErr },
      { data: creatorMenus, error: creatorMenusErr },
      { data: portfolioAssets, error: portfolioAssetsErr },
      { data: orders, error: ordersErr },
      authResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("companies")
        .select(
          "id, user_id, company_name, contact_email, approval_status, created_at"
        )
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("creators")
        .select(
          `
          id,
          user_id,
          display_name,
          contact_email,
          approval_status,
          avatar_url,
          is_public,
          is_suspended,
          stripe_onboarding_completed,
          created_at
        `
        )
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("profiles")
        .select(
          `
          id,
          username,
          avatar_url,
          created_at,
          updated_at,
          is_suspended,
          suspend_level,
          suspend_reason,
          suspended_at,
          onboarding_completed,
          public_profile_completed
        `
        ),

      supabaseAdmin.from("user_roles").select("user_id, role"),

      supabaseAdmin
        .from("user_states")
        .select(
          `
          user_id,
          company_plan_code,
          company_subscription_status,
          monthly_request_used,
          monthly_request_limit,
          creator_profile_completed,
          company_profile_completed,
          onboarding_completed,
          updated_at
        `
        ),

      supabaseAdmin.from("creator_menus").select("id, creator_id, is_active"),

      supabaseAdmin
        .from("creator_portfolio_assets")
        .select("id, creator_id, is_public"),

      supabaseAdmin
        .from("orders")
        .select(
          `
          id,
          b_user_id,
          creator_user_id,
          status,
          payment_status,
          accepted_at,
          captured_at,
          delivered_post_url,
          completed_at,
          created_at
        `
        ),

      supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),
    ]);

    if (companiesErr) throw companiesErr;
    if (creatorsErr) throw creatorsErr;
    if (profilesErr) throw profilesErr;
    if (userRolesErr) throw userRolesErr;
    if (userStatesErr) throw userStatesErr;
    if (creatorMenusErr) throw creatorMenusErr;
    if (portfolioAssetsErr) throw portfolioAssetsErr;
    if (ordersErr) throw ordersErr;

    if (authResult.error) {
      throw authResult.error;
    }

    const authUsers: AuthUserLite[] =
      authResult.data?.users?.map((user) => ({
        id: user.id,
        email: user.email ?? null,
        created_at: user.created_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
      })) ?? [];

    const companiesSafe = companies ?? [];
    const creatorsSafe = creators ?? [];
    const profilesSafe = profiles ?? [];
    const userRolesSafe = userRoles ?? [];
    const userStatesSafe = userStates ?? [];
    const creatorMenusSafe = creatorMenus ?? [];
    const portfolioAssetsSafe = portfolioAssets ?? [];
    const ordersSafe = orders ?? [];

    const allUserIds = uniq([
      ...authUsers.map((user) => user.id),
      ...companiesSafe.map((company) => company.user_id),
      ...creatorsSafe.map((creator) => creator.user_id),
      ...profilesSafe.map((profile) => profile.id),
      ...userRolesSafe.map((role) => role.user_id),
      ...userStatesSafe.map((state) => state.user_id),
    ]);

    const authMap = new Map(authUsers.map((user) => [user.id, user]));

    const companyMap = new Map(
      companiesSafe.map((company) => [company.user_id, company])
    );

    const creatorMap = new Map(
      creatorsSafe.map((creator) => [creator.user_id, creator])
    );

    const profileMap = new Map(
      profilesSafe.map((profile) => [profile.id, profile])
    );

    const userStateMap = new Map(
      userStatesSafe.map((state) => [state.user_id, state])
    );

    const roleMap = new Map<string, string[]>();

    for (const roleRow of userRolesSafe) {
      const current = roleMap.get(roleRow.user_id) ?? [];
      current.push(roleRow.role);
      roleMap.set(roleRow.user_id, Array.from(new Set(current)));
    }

    const creatorMenuCountMap = new Map<string, number>();
    const creatorPortfolioCountMap = new Map<string, number>();

    for (const menu of creatorMenusSafe) {
      if (!menu.creator_id) continue;

      creatorMenuCountMap.set(
        menu.creator_id,
        (creatorMenuCountMap.get(menu.creator_id) ?? 0) + 1
      );
    }

    for (const asset of portfolioAssetsSafe) {
      if (!asset.creator_id) continue;

      creatorPortfolioCountMap.set(
        asset.creator_id,
        (creatorPortfolioCountMap.get(asset.creator_id) ?? 0) + 1
      );
    }

    const bOrderCountMap = new Map<string, number>();
    const cOrderCountMap = new Map<string, number>();
    const activeBOrderCountMap = new Map<string, number>();
    const activeCOrderCountMap = new Map<string, number>();
    const delayedCOrderCountMap = new Map<string, number>();

    for (const order of ordersSafe) {
      if (order.b_user_id) {
        bOrderCountMap.set(
          order.b_user_id,
          (bOrderCountMap.get(order.b_user_id) ?? 0) + 1
        );

        if (isActiveOrder(order.status)) {
          activeBOrderCountMap.set(
            order.b_user_id,
            (activeBOrderCountMap.get(order.b_user_id) ?? 0) + 1
          );
        }
      }

      if (order.creator_user_id) {
        cOrderCountMap.set(
          order.creator_user_id,
          (cOrderCountMap.get(order.creator_user_id) ?? 0) + 1
        );

        if (isActiveOrder(order.status)) {
          activeCOrderCountMap.set(
            order.creator_user_id,
            (activeCOrderCountMap.get(order.creator_user_id) ?? 0) + 1
          );

          const acceptedAt = order.accepted_at ?? order.captured_at;
          const elapsedDays = daysSince(acceptedAt);

          if (!order.delivered_post_url && elapsedDays != null && elapsedDays >= 7) {
            delayedCOrderCountMap.set(
              order.creator_user_id,
              (delayedCOrderCountMap.get(order.creator_user_id) ?? 0) + 1
            );
          }
        }
      }
    }

    const users: AdminUserRow[] = allUserIds
      .map((userId): AdminUserRow => {
        const authUser = authMap.get(userId) ?? null;
        const company = companyMap.get(userId) ?? null;
        const creator = creatorMap.get(userId) ?? null;
        const profile = profileMap.get(userId) ?? null;
        const userState = userStateMap.get(userId) ?? null;

        const roles = [...(roleMap.get(userId) ?? [])];

        if (company && !roles.includes("company")) {
          roles.push("company");
        }

        if (creator && !roles.includes("creator")) {
          roles.push("creator");
        }

        const uniqueRoles = Array.from(new Set(roles));
        const primaryRole = choosePrimaryRole(uniqueRoles);

        const companyName = company?.company_name ?? null;
        const creatorName = creator?.display_name ?? null;

        const displayName =
          companyName ||
          creatorName ||
          profile?.username ||
          authUser?.email ||
          userId;

        return {
          user_id: userId,
          email:
            authUser?.email ??
            company?.contact_email ??
            creator?.contact_email ??
            null,
          roles: uniqueRoles,
          primary_role: primaryRole,
          display_name: displayName,
          created_at:
            authUser?.created_at ??
            profile?.created_at ??
            company?.created_at ??
            creator?.created_at ??
            null,
          last_sign_in_at: authUser?.last_sign_in_at ?? null,

          is_suspended:
            Boolean(profile?.is_suspended) || Boolean(creator?.is_suspended),
          suspend_level: profile?.suspend_level ?? null,
          suspend_reason: profile?.suspend_reason ?? null,

          company_name: companyName,
          company_approval_status: company?.approval_status ?? null,
          company_plan_code: userState?.company_plan_code ?? null,
          company_subscription_status:
            userState?.company_subscription_status ?? null,
          monthly_request_used: userState?.monthly_request_used ?? null,
          monthly_request_limit: userState?.monthly_request_limit ?? null,

          creator_name: creatorName,
          creator_approval_status: creator?.approval_status ?? null,
          creator_is_public: creator?.is_public ?? null,
          creator_is_suspended: creator?.is_suspended ?? null,
          creator_stripe_onboarding_completed:
            creator?.stripe_onboarding_completed ?? null,
          creator_menu_count: creator?.id
            ? creatorMenuCountMap.get(creator.id) ?? 0
            : 0,
          creator_portfolio_count: creator?.id
            ? creatorPortfolioCountMap.get(creator.id) ?? 0
            : 0,

          b_order_count: bOrderCountMap.get(userId) ?? 0,
          c_order_count: cOrderCountMap.get(userId) ?? 0,
          active_b_order_count: activeBOrderCountMap.get(userId) ?? 0,
          active_c_order_count: activeCOrderCountMap.get(userId) ?? 0,
          delayed_c_order_count: delayedCOrderCountMap.get(userId) ?? 0,
        };
      })
      .sort((a, b) => {
        const aTime = getTime(a.created_at) ?? 0;
        const bTime = getTime(b.created_at) ?? 0;
        return bTime - aTime;
      });

    return NextResponse.json(
      {
        users,
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
    console.error("admin users list error:", err);

    return NextResponse.json(
      { error: "failed to load admin users" },
      { status: 500 }
    );
  }
}