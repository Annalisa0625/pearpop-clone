import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isCreatorLinkInquiryTemplate } from "@/lib/trendre-link/constants";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import { INQUIRY_FORM_DEFAULTS, isCreatorLinkInquiryFormKind } from "@/lib/trendre-link/inquiry-forms";
import { UUID_PATTERN } from "@/lib/trendre-link/items-server";
import type { CreatorLinkInquiryFormsUpdateResponse, CreatorLinkInquiryType } from "@/lib/trendre-link/types";
import type { Tables } from "@/types/database.types";

type InquiryTypeRow = Tables<"creator_link_inquiry_types">;
type RequestForm = { kind?: unknown; title?: unknown; isEnabled?: unknown; sortOrder?: unknown };
type RequestBody = { pageId?: unknown; forms?: unknown };

function response(error: string, status: number) {
  return NextResponse.json<CreatorLinkInquiryFormsUpdateResponse>({ ok: false, error }, { status });
}

function simpleFormId(pageId: string) {
  const hex = createHash("sha256").update(`trendre-link-simple-inquiry:${pageId}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function toInquiryType(row: InquiryTypeRow): CreatorLinkInquiryType {
  if (row.template_key !== null && !isCreatorLinkInquiryTemplate(row.template_key)) throw new Error("invalid_template_key");
  return { id: row.id, pageId: row.page_id, templateKey: row.template_key, title: row.title, description: row.description, sortOrder: row.sort_order, isEnabled: row.is_enabled, isCustom: row.is_custom, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function POST(request: NextRequest) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return response("ログインが必要です。", 401);

  let body: RequestBody;
  try { body = await request.json() as RequestBody; }
  catch { return response("入力内容を確認してください。", 400); }
  if (typeof body.pageId !== "string" || !UUID_PATTERN.test(body.pageId) || !Array.isArray(body.forms)) return response("フォーム設定が正しくありません。", 400);

  const parsed = new Map<"simple" | "pr", { title: string; isEnabled: boolean; sortOrder: number }>();
  for (const raw of body.forms as RequestForm[]) {
    if (!isCreatorLinkInquiryFormKind(raw.kind) || typeof raw.title !== "string" || !raw.title.trim() || raw.title.trim().length > 80 || typeof raw.isEnabled !== "boolean" || !Number.isInteger(raw.sortOrder) || Number(raw.sortOrder) < 0 || Number(raw.sortOrder) > 1000 || parsed.has(raw.kind)) return response("フォーム設定が正しくありません。", 400);
    parsed.set(raw.kind, { title: raw.title.trim(), isEnabled: raw.isEnabled, sortOrder: Number(raw.sortOrder) });
  }
  if (parsed.size !== 2) return response("2種類のフォーム設定を送信してください。", 400);

  try {
    const { data: page, error: pageError } = await supabaseAdmin.from("creator_link_pages").select("id").eq("id", body.pageId).eq("owner_user_id", auth.user.id).maybeSingle();
    if (pageError) throw new Error("page_lookup_failed");
    if (!page) return response("ページが見つかりません。", 404);

    const { data: rows, error: rowsError } = await supabaseAdmin.from("creator_link_inquiry_types").select("*").eq("page_id", page.id).order("sort_order", { ascending: true });
    if (rowsError) throw new Error("inquiry_types_lookup_failed");
    const simpleExisting = rows?.find((row) => row.template_key === null && row.is_custom) ?? null;
    const prExisting = rows?.find((row) => row.template_key === "pr_post") ?? null;
    const saved: InquiryTypeRow[] = [];

    for (const kind of ["simple", "pr"] as const) {
      const form = parsed.get(kind)!;
      const existing = kind === "simple" ? simpleExisting : prExisting;
      const payload = { page_id: page.id, template_key: kind === "simple" ? null : "pr_post", title: form.title, description: INQUIRY_FORM_DEFAULTS[kind].description, sort_order: form.sortOrder, is_enabled: form.isEnabled, is_custom: kind === "simple" };
      if (existing) {
        const { data, error } = await supabaseAdmin.from("creator_link_inquiry_types").update(payload).eq("id", existing.id).eq("page_id", page.id).select("*").single();
        if (error) throw new Error("inquiry_type_update_failed");
        saved.push(data);
      } else {
        const id = kind === "simple" ? simpleFormId(page.id) : undefined;
        const { data, error } = await supabaseAdmin.from("creator_link_inquiry_types").insert({ ...payload, ...(id ? { id } : {}) }).select("*").single();
        if (error) {
          if (kind === "simple" && error.code === "23505") {
            const { data: raced, error: racedError } = await supabaseAdmin.from("creator_link_inquiry_types").update(payload).eq("id", id!).eq("page_id", page.id).select("*").single();
            if (racedError) throw new Error("inquiry_type_race_recovery_failed");
            saved.push(raced);
            continue;
          }
          throw new Error("inquiry_type_insert_failed");
        }
        saved.push(data);
      }
    }

    const isAcceptingInquiries = [...parsed.values()].some((form) => form.isEnabled);
    const { error: pageUpdateError } = await supabaseAdmin.from("creator_link_pages").update({ is_accepting_inquiries: isAcceptingInquiries }).eq("id", page.id).eq("owner_user_id", auth.user.id);
    if (pageUpdateError) throw new Error("page_update_failed");
    return NextResponse.json<CreatorLinkInquiryFormsUpdateResponse>({ ok: true, inquiryTypes: saved.sort((a, b) => a.sort_order - b.sort_order).map(toInquiryType), isAcceptingInquiries });
  } catch (error) {
    console.error("[trendre-link/inquiry-types] フォーム設定を保存できませんでした。", { cause: error instanceof Error ? error.message : "unknown" });
    return response("フォーム設定を保存できませんでした。時間をおいて再度お試しください。", 500);
  }
}
