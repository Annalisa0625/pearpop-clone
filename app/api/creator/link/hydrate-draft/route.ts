import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import { isCreatorLinkButtonStyle, isCreatorLinkFontStyle, isCreatorLinkTheme } from "@/lib/trendre-link/constants";
import { isCreatorLinkSocialPlatform, normalizeSocialProfile, validateCreatorLinkItemAppearance, validateGeneralLink } from "@/lib/trendre-link/item-validation";
import { validateCreatorLinkSlug } from "@/lib/trendre-link/slug";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";

type RawDraft = {
  version?: unknown; draftId?: unknown;
  page?: Record<string, unknown>;
  socials?: unknown;
  links?: unknown;
  avatarUrl?: unknown;
  coverUrl?: unknown;
};

function fail(error: string, status: number) { return NextResponse.json({ ok: false, error }, { status }); }

export async function POST(request: NextRequest) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return fail("ログインが必要です。", 401);
  let body: { pageId?: unknown; draft?: RawDraft };
  try { body = await request.json() as { pageId?: unknown; draft?: RawDraft }; } catch { return fail("送信内容が不正です。", 400); }
  if (typeof body.pageId !== "string" || !UUID_PATTERN.test(body.pageId) || !body.draft || body.draft.version !== 1 || !body.draft.page) return fail("下書きの形式が不正です。", 400);

  const draft = body.draft;
  const page = draft.page as Record<string, unknown>;
  const displayName = typeof page.displayName === "string" ? page.displayName.trim() : "";
  const displayNameColor = page.displayNameColor === undefined || page.displayNameColor === null ? null : page.displayNameColor;
  const bio = typeof page.bio === "string" ? page.bio.trim() : "";
  const slug = typeof page.slug === "string" ? validateCreatorLinkSlug(page.slug) : null;
  if (!(displayNameColor === null || (typeof displayNameColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(displayNameColor)))) return fail("Invalid display name color.", 400);
  if (!displayName || displayName.length > 80 || bio.length > 500 || !slug?.valid || !isCreatorLinkTheme(String(page.themeKey)) || !isCreatorLinkButtonStyle(String(page.buttonStyle)) || !isCreatorLinkFontStyle(String(page.fontStyle)) || (page.accentColor !== null && (typeof page.accentColor !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(page.accentColor))) || typeof page.isAcceptingInquiries !== "boolean") return fail("下書きの内容を確認してください。", 400);
  const avatarUrl = typeof draft.avatarUrl === "string" ? draft.avatarUrl : null;
  const coverUrl = typeof draft.coverUrl === "string" ? draft.coverUrl : null;

  const parsedSocials: Array<{ platform: string; title: string; url: string; metadata: object; isVisible: boolean }> = [];
  if (!Array.isArray(draft.socials) || !Array.isArray(draft.links) || draft.socials.length > 4 || draft.links.length > 30) return fail("下書きの内容を確認してください。", 400);
  for (const raw of draft.socials) {
    if (typeof raw !== "object" || raw === null) return fail("SNSの内容を確認してください。", 400);
    const social = raw as Record<string, unknown>;
    if (typeof social.platform !== "string" || !isCreatorLinkSocialPlatform(social.platform) || typeof social.url !== "string" || typeof social.isVisible !== "boolean") return fail("SNSの内容を確認してください。", 400);
    const normalized = normalizeSocialProfile(social.platform, social.url);
    const appearance = validateCreatorLinkItemAppearance(social.metadata);
    if (!normalized.ok || !appearance.ok || parsedSocials.some((item) => item.platform === social.platform)) return fail("SNSの内容を確認してください。", 400);
    parsedSocials.push({ platform: social.platform, title: normalized.value.title, url: normalized.value.url, metadata: appearance.value, isVisible: social.isVisible });
  }
  const parsedLinks: Array<{ title: string; url: string; metadata: object; isVisible: boolean; sortOrder: number }> = [];
  for (const raw of draft.links) {
    if (typeof raw !== "object" || raw === null) return fail("リンクの内容を確認してください。", 400);
    const link = raw as Record<string, unknown>;
    if (typeof link.title !== "string" || typeof link.url !== "string" || typeof link.isVisible !== "boolean" || !Number.isInteger(link.sortOrder)) return fail("リンクの内容を確認してください。", 400);
    const validated = validateGeneralLink({ title: link.title, url: link.url });
    const appearance = validateCreatorLinkItemAppearance(link.metadata);
    if (!validated.ok || !appearance.ok) return fail("リンクの内容を確認してください。", 400);
    parsedLinks.push({ title: validated.value.title, url: validated.value.url, metadata: appearance.value, isVisible: link.isVisible, sortOrder: Number(link.sortOrder) });
  }

  try {
    const { data: target, error: targetError } = await supabaseAdmin.from("creator_link_pages").select("id,status,setup_completed_at,is_accepting_inquiries").eq("id", body.pageId).eq("owner_user_id", auth.user.id).maybeSingle();
    if (targetError) throw targetError;
    // A completed or public page must never be overwritten by a browser-local guest draft.
    if (!target || target.status !== "draft" || target.setup_completed_at) return fail("この下書きを安全に反映できません。既存のLinkページは上書きされません。", 409);
    const { data: available, error: slugError } = await supabaseAdmin.rpc("is_creator_link_slug_available", { p_slug: slug.normalizedSlug, p_exclude_page_id: target.id, p_owner_user_id: auth.user.id });
    if (slugError) throw slugError;
    if (available !== true) return fail("この公開URLは他のユーザーに使用されています。URLを変更してください。", 409);

    const { error: pageError } = await supabaseAdmin.from("creator_link_pages").update({ slug: slug.normalizedSlug, display_name: displayName, display_name_color: typeof displayNameColor === "string" ? displayNameColor.toUpperCase() : null, bio: bio || null, theme_key: page.themeKey as string, accent_color: typeof page.accentColor === "string" ? page.accentColor.toUpperCase() : null, button_style: page.buttonStyle as string, font_style: page.fontStyle as string, avatar_url: avatarUrl, cover_url: coverUrl, is_accepting_inquiries: target.is_accepting_inquiries || (page.isAcceptingInquiries as boolean), status: "draft" }).eq("id", target.id).eq("owner_user_id", auth.user.id);
    if (pageError) throw pageError;

    // This page is still private. Replacing draft-managed items makes retry converge without public duplicates.
    const { error: deleteError } = await supabaseAdmin.from("creator_link_items").delete().eq("page_id", target.id).in("item_type", ["social", "link"]);
    if (deleteError) throw deleteError;
    const entries = [
      ...parsedSocials.map((item, index) => ({ page_id: target.id, item_type: "social" as const, platform: item.platform, title: item.title, description: null, url: item.url, metadata: item.metadata, sort_order: index, is_visible: item.isVisible })),
      ...parsedLinks.sort((a, b) => a.sortOrder - b.sortOrder).map((item, index) => ({ page_id: target.id, item_type: "link" as const, platform: null, title: item.title, description: null, url: item.url, metadata: item.metadata, sort_order: parsedSocials.length + index, is_visible: item.isVisible })),
    ];
    if (entries.length) { const { error } = await supabaseAdmin.from("creator_link_items").insert(entries as never); if (error) throw error; }
    return NextResponse.json({ ok: true, pageId: target.id, slug: slug.normalizedSlug });
  } catch (error) {
    console.error("trendre link guest draft hydration failed", { cause: error instanceof Error ? error.message : "unknown" });
    return fail("下書きを反映できませんでした。下書きはこの端末に保存されています。", 500);
  }
}
