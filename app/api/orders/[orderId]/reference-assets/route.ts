// File: app/api/orders/[orderId]/reference-assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReferenceAssetRow = {
  id: string;
  order_id: string;
  b_user_id: string;
  creator_user_id: string;
  uploaded_by_user_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  file_type: "image" | "pdf";
  mime_type: string;
  size_bytes: number;
  sort_order: number;
  created_at: string;
};

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return { user: null, error: "認証トークンがありません" };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "認証に失敗しました" };
  }

  return { user, error: null };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    if (!orderId) {
      return NextResponse.json(
        { error: "注文IDがありません" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("order_reference_assets")
      .select(
        `
        id,
        order_id,
        b_user_id,
        creator_user_id,
        uploaded_by_user_id,
        storage_bucket,
        storage_path,
        file_name,
        file_type,
        mime_type,
        size_bytes,
        sort_order,
        created_at
      `
      )
      .eq("order_id", orderId)
      .or(
        `b_user_id.eq.${user.id},creator_user_id.eq.${user.id},uploaded_by_user_id.eq.${user.id}`
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = ((data ?? []) as ReferenceAssetRow[]).filter(
      (asset) =>
        asset.storage_bucket &&
        asset.storage_path &&
        (asset.file_type === "image" || asset.file_type === "pdf")
    );

    const assets = await Promise.all(
      rows.map(async (asset) => {
        const { data: signedData, error: signedError } =
          await supabaseAdmin.storage
            .from(asset.storage_bucket)
            .createSignedUrl(asset.storage_path, 60 * 30);

        return {
          id: asset.id,
          order_id: asset.order_id,
          file_name: asset.file_name,
          file_type: asset.file_type,
          mime_type: asset.mime_type,
          size_bytes: asset.size_bytes,
          sort_order: asset.sort_order,
          created_at: asset.created_at,
          signed_url: signedError ? null : signedData?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("order reference assets error", error);

    return NextResponse.json(
      { error: "参考資料を取得できませんでした" },
      { status: 500 }
    );
  }
}