// File: app/api/admin/users/unban/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const body = await req.json().catch(() => ({}));
    const userId = normalizeText(body.userId);

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { data: targetUser, error: targetUserError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (targetUserError || !targetUser?.user) {
      return NextResponse.json(
        { error: "target user not found" },
        { status: 404 }
      );
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        ban_duration: "none",
      }
    );

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const [{ error: profileError }, { error: creatorError }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .update({
          is_suspended: false,
          suspend_reason: null,
          suspend_level: null,
          suspended_at: null,
        })
        .eq("id", userId),

      supabaseAdmin
        .from("creators")
        .update({
          is_suspended: false,
        })
        .eq("user_id", userId),
    ]);

    if (profileError) {
      console.warn("admin user unban profile update skipped:", profileError);
    }

    if (creatorError) {
      console.warn("admin user unban creator update skipped:", creatorError);
    }

    const { error: releaseError } = await supabaseAdmin
      .from("user_suspensions")
      .update({
        is_active: false,
        released_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .is("released_at", null);

    if (releaseError) {
      console.warn("admin user suspension release skipped:", releaseError);
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("admin user unban error:", error);

    return NextResponse.json(
      { error: "failed to unsuspend user" },
      { status: 500 }
    );
  }
}