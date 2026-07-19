import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import { validateCreatorLinkSlug } from "@/lib/trendre-link/slug";
import type { CreatorLinkSlugAvailabilityResponse } from "@/lib/trendre-link/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("slug") ?? "";
  const excludePageId = request.nextUrl.searchParams.get("excludePageId");
  const validation = validateCreatorLinkSlug(input);

  if (!validation.valid) {
    const response: CreatorLinkSlugAvailabilityResponse = {
      ok: true,
      input,
      normalizedSlug: validation.normalizedSlug,
      available: false,
      reason: validation.reason,
    };

    return NextResponse.json(response);
  }

  const auth = await getTrendreLinkAuthenticatedUser(request);
  let verifiedExcludePageId: string | null = null;

  if (excludePageId) {
    if (!UUID_PATTERN.test(excludePageId)) {
      return NextResponse.json(
        { ok: false, error: "除外するページIDが不正です。" },
        { status: 400 }
      );
    }

    if (!auth.user) {
      return NextResponse.json(
        { ok: false, error: auth.error ?? "ログインが必要です。" },
        { status: 401 }
      );
    }

    const { data: ownedPage, error: ownedPageError } = await supabaseAdmin
      .from("creator_link_pages")
      .select("id")
      .eq("id", excludePageId)
      .eq("owner_user_id", auth.user.id)
      .maybeSingle();

    if (ownedPageError) {
      console.error("trendre link slug exclusion ownership check failed");
      return NextResponse.json(
        { ok: false, error: "ページ情報の確認に失敗しました。" },
        { status: 500 }
      );
    }

    if (!ownedPage) {
      return NextResponse.json(
        { ok: false, error: "このページを除外する権限がありません。" },
        { status: 403 }
      );
    }

    verifiedExcludePageId = ownedPage.id;
  }

  const { data: available, error } = await supabaseAdmin.rpc(
    "is_creator_link_slug_available",
    {
      p_slug: validation.normalizedSlug,
      p_exclude_page_id: verifiedExcludePageId ?? undefined,
      p_owner_user_id: auth.user?.id ?? undefined,
    }
  );

  if (error) {
    console.error("trendre link slug availability RPC failed");
    return NextResponse.json(
      { ok: false, error: "slugの利用可否を確認できませんでした。" },
      { status: 500 }
    );
  }

  const response: CreatorLinkSlugAvailabilityResponse = {
    ok: true,
    input,
    normalizedSlug: validation.normalizedSlug,
    available: available === true,
    reason: available === true ? null : "unavailable",
  };

  return NextResponse.json(response);
}
