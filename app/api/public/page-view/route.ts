import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StoredPageType = "link" | "profile";
type RequestedPageType = StoredPageType | "auto";
type RequestBody = { pageType?: unknown; slug?: unknown };

type ResolvedPage = {
  ownerUserId: string;
  pageType: StoredPageType;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSlug(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 100) return null;
  return normalized;
}

async function resolveLink(slug: string): Promise<ResolvedPage | null> {
  const admin = supabaseAdmin as any;
  const { data } = await admin
    .from("creator_link_pages")
    .select("owner_user_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const ownerUserId =
    (data as { owner_user_id?: string | null } | null)?.owner_user_id ?? null;

  return ownerUserId ? { ownerUserId, pageType: "link" } : null;
}

async function resolveProfile(slug: string): Promise<ResolvedPage | null> {
  const admin = supabaseAdmin as any;
  const bySlug = await admin
    .from("creators")
    .select("user_id")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .eq("approval_status", "approved")
    .maybeSingle();

  const slugOwner =
    (bySlug.data as { user_id?: string | null } | null)?.user_id ?? null;
  if (slugOwner) return { ownerUserId: slugOwner, pageType: "profile" };

  if (!UUID_PATTERN.test(slug)) return null;

  const byId = await admin
    .from("creators")
    .select("user_id")
    .eq("id", slug)
    .eq("is_public", true)
    .eq("approval_status", "approved")
    .maybeSingle();

  const idOwner =
    (byId.data as { user_id?: string | null } | null)?.user_id ?? null;

  return idOwner ? { ownerUserId: idOwner, pageType: "profile" } : null;
}

async function resolvePage(pageType: RequestedPageType, slug: string) {
  if (pageType === "link") return resolveLink(slug);
  if (pageType === "profile") return resolveProfile(slug);
  return (await resolveLink(slug)) ?? resolveProfile(slug);
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const pageType = body.pageType;
  const slug = normalizeSlug(body.slug);

  if (
    (pageType !== "link" && pageType !== "profile" && pageType !== "auto") ||
    !slug
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const resolved = await resolvePage(pageType, slug);
    if (!resolved) return new NextResponse(null, { status: 204 });

    const admin = supabaseAdmin as any;
    const { error } = await admin.from("creator_page_views").insert({
      owner_user_id: resolved.ownerUserId,
      page_type: resolved.pageType,
      viewed_at: new Date().toISOString(),
    });

    if (error && error.code !== "42P01") {
      console.error("public page view insert failed", {
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("public page view tracking failed", {
      cause: error instanceof Error ? error.message : "unknown",
    });
  }

  return new NextResponse(null, { status: 204 });
}
