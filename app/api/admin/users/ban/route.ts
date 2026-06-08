// File: app/api/admin/users/ban/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BanLevel = "temporary" | "permanent";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLevel(value: unknown): BanLevel {
  return value === "permanent" ? "permanent" : "temporary";
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const body = await req.json().catch(() => ({}));

    const userId = normalizeText(body.userId);
    const reason = normalizeText(body.reason);
    const adminNote = normalizeText(body.adminNote);
    const level = normalizeLevel(body.level);

    if (!userId || !reason) {
      return NextResponse.json(
        { error: "userId and reason are required" },
        { status: 400 }
      );
    }

    if (userId === admin.userId) {
      return NextResponse.json(
        { error: "自分自身のアカウントは停止できません" },
        { status: 400 }
      );
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
        ban_duration: "876000h",
      }
    );

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const [{ error: profileError }, { error: creatorError }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .update({
          is_suspended: true,
          suspend_reason: reason,
          suspend_level: level === "permanent" ? 2 : 1,
          suspended_at: new Date().toISOString(),
        })
        .eq("id", userId),

      supabaseAdmin
        .from("creators")
        .update({
          is_suspended: true,
        })
        .eq("user_id", userId),
    ]);

    if (profileError) {
      console.warn("admin user ban profile update skipped:", profileError);
    }

    if (creatorError) {
      console.warn("admin user ban creator update skipped:", creatorError);
    }

    const { error: suspensionError } = await supabaseAdmin
      .from("user_suspensions")
      .insert({
        user_id: userId,
        reason,
        level,
        is_active: true,
        admin_note: adminNote || null,
      });

    if (suspensionError) {
      console.warn("admin user suspension log skipped:", suspensionError);
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
    console.error("admin user ban error:", error);

    return NextResponse.json(
      { error: "failed to suspend user" },
      { status: 500 }
    );
  }
}