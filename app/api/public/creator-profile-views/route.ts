// File: app/api/public/creator-profile-views/route.ts

import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TrackProfileViewBody = {
  creator_id?: unknown;
};

type PublicCreatorRow = {
  id: string;
  user_id: string;
  is_public: boolean | null;
  approval_status: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function getOptionalViewerUserId() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "このリクエストは受け付けられません。" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | TrackProfileViewBody
    | null;
  const creatorId = getString(body?.creator_id);

  if (!UUID_PATTERN.test(creatorId)) {
    return NextResponse.json(
      { ok: false, error: "クリエイターIDの形式が正しくありません。" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin as any;

  try {
    const { data, error } = await db
      .from("creators")
      .select("id, user_id, is_public, approval_status")
      .eq("id", creatorId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const creator = (data as PublicCreatorRow | null) ?? null;

    if (
      !creator ||
      creator.is_public !== true ||
      creator.approval_status !== "approved"
    ) {
      return NextResponse.json(
        { ok: false, error: "公開プロフィールが見つかりません。" },
        { status: 404 }
      );
    }

    const viewerUserId = await getOptionalViewerUserId();

    if (viewerUserId && viewerUserId === creator.user_id) {
      return NextResponse.json({
        ok: true,
        tracked: false,
        skipped: "self_view",
      });
    }

    const { error: insertError } = await db
      .from("creator_page_views")
      .insert({
        owner_user_id: creator.user_id,
        page_type: "profile",
        viewed_at: new Date().toISOString(),
      });

    if (insertError) {
      if (insertError.code === "42P01") {
        return NextResponse.json({
          ok: true,
          tracked: false,
          setup_pending: true,
        });
      }

      throw insertError;
    }

    return NextResponse.json(
      {
        ok: true,
        tracked: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("creator profile view tracking failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "プロフィール閲覧を記録できませんでした。",
      },
      { status: 500 }
    );
  }
}