// File: app/api/admin/users/notify/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminApi } from "@/lib/admin/guard";
import { createNotification } from "@/lib/notifications/createNotification";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLinkPath(value: unknown) {
  const raw = normalizeText(value);

  if (!raw) return null;

  if (!raw.startsWith("/")) {
    return `/${raw}`;
  }

  return raw;
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminApi();

    if (!admin.ok) {
      return admin.response;
    }

    const bodyJson = await req.json().catch(() => ({}));

    const userId = normalizeText(bodyJson.userId);
    const title = normalizeText(bodyJson.title);
    const body = normalizeText(bodyJson.body);
    const linkPath = normalizeLinkPath(bodyJson.linkPath);

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    if (!body) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const { data: targetUser, error: targetUserError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (targetUserError || !targetUser?.user) {
      return NextResponse.json(
        { error: "target user not found" },
        { status: 404 }
      );
    }

    const result = await createNotification({
      recipientUserId: userId,
      actorUserId: admin.userId,
      notificationType: "admin_notice",
      title,
      body,
      linkPath,
      entityType: "admin_notice",
      entityId: userId,
      importance: "high",
      metadata: {
        category: "announcement",
        source: "admin_user_detail",
        created_by_admin_user_id: admin.userId,
      },
      createLineDelivery: true,
    });

    if (result.skipped) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: result.reason ?? null,
        notification: result.notification ?? null,
      });
    }

    return NextResponse.json(
      {
        success: true,
        skipped: false,
        notification: result.notification,
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
    console.error("admin notify user error:", error);

    return NextResponse.json(
      { error: "failed to send admin notification" },
      { status: 500 }
    );
  }
}