// File: app/api/orders/[id]/reference-assets/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

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

const AUTH_TIMEOUT_MS = 8000;
const DB_TIMEOUT_MS = 8000;
const SIGNED_URL_TIMEOUT_MS = 3500;

function withTimeout<T = any>(
  promiseLike: PromiseLike<T> | T,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = Promise.resolve(promiseLike);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function loadSupabaseAdmin() {
  const mod = await import("@/lib/supabaseAdmin");
  return (mod as any).supabaseAdmin;
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length);
}

async function getAuthenticatedUser(args: {
  supabaseAdmin: any;
  token: string;
}) {
  const authResult: any = await withTimeout(
    args.supabaseAdmin.auth.getUser(args.token),
    AUTH_TIMEOUT_MS,
    "髫ｱ蟠趣ｽｨ・ｼ隲繝ｻ・ｰ・ｱ邵ｺ・ｮ驕抵ｽｺ髫ｱ髦ｪ竊楢ｭ弱ｋ菫｣邵ｺ蠕個ｰ邵ｺ荵昶夢邵ｺ・ｦ邵ｺ繝ｻ竏ｪ邵ｺ繝ｻ
  );

  const user = authResult?.data?.user ?? null;
  const error = authResult?.error ?? null;

  if (error || !user) {
    return { user: null, error: "髫ｱ蟠趣ｽｨ・ｼ邵ｺ・ｫ陞滂ｽｱ隰ｨ蜉ｱ・邵ｺ・ｾ邵ｺ蜉ｱ笳・ };
  }

  return { user, error: null };
}

async function createSignedUrlSafe(args: {
  supabaseAdmin: any;
  bucket: string;
  path: string;
}) {
  try {
    const result: any = await withTimeout(
      args.supabaseAdmin.storage
        .from(args.bucket)
        .createSignedUrl(args.path, 60 * 30),
      SIGNED_URL_TIMEOUT_MS,
      "signed url timeout"
    );

    if (result?.error) {
      console.warn("reference asset signed url skipped:", result.error);
      return null;
    }

    return result?.data?.signedUrl ?? null;
  } catch (error) {
    console.warn("reference asset signed url skipped:", error);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json(
        { error: "髫ｱ蟠趣ｽｨ・ｼ郢晏現繝ｻ郢ｧ・ｯ郢晢ｽｳ邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・ },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "雎包ｽｨ隴≫束D邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・ },
        { status: 400 }
      );
    }

    const supabaseAdmin = await loadSupabaseAdmin();

    const { user, error: authError } = await getAuthenticatedUser({
      supabaseAdmin,
      token,
    });

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const result: any = await withTimeout(
      supabaseAdmin
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
        .eq("order_id", id)
        .or(
          `b_user_id.eq.${user.id},creator_user_id.eq.${user.id},uploaded_by_user_id.eq.${user.id}`
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      DB_TIMEOUT_MS,
      "陷ｿ繧環繝ｻ・ｳ繝ｻ萓ｭ邵ｺ・ｮ陷ｿ髢・ｾ蜉ｱ竊楢ｭ弱ｋ菫｣邵ｺ蠕個ｰ邵ｺ荵昶夢邵ｺ・ｦ邵ｺ繝ｻ竏ｪ邵ｺ繝ｻ
    );

    if (result?.error) {
      throw result.error;
    }

    const rows = ((result?.data ?? []) as ReferenceAssetRow[]).filter(
      (asset) =>
        asset.storage_bucket &&
        asset.storage_path &&
        (asset.file_type === "image" || asset.file_type === "pdf")
    );

    const assets = await Promise.all(
      rows.map(async (asset) => {
        const signedUrl = await createSignedUrlSafe({
          supabaseAdmin,
          bucket: asset.storage_bucket,
          path: asset.storage_path,
        });

        return {
          id: asset.id,
          order_id: asset.order_id,
          file_name: asset.file_name,
          file_type: asset.file_type,
          mime_type: asset.mime_type,
          size_bytes: asset.size_bytes,
          sort_order: asset.sort_order,
          created_at: asset.created_at,
          signed_url: signedUrl,
        };
      })
    );

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("order reference assets error", error);

    return NextResponse.json(
      { error: "陷ｿ繧環繝ｻ・ｳ繝ｻ萓ｭ郢ｧ雋槫徐陟募干縲堤ｸｺ髦ｪ竏ｪ邵ｺ蟶呻ｽ鍋ｸｺ・ｧ邵ｺ蜉ｱ笳・, assets: [] },
      { status: 200 }
    );
  }
}