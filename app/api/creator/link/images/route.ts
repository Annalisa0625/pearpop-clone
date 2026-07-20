import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import { getCreatorImageBucket } from "@/lib/trendre-link/storage";

const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type UploadResponse = { ok: true; url: string } | { ok: false; error: string };

function errorResponse(error: string, status: number) {
  return NextResponse.json<UploadResponse>({ ok: false, error }, { status });
}

function hasExpectedImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  return bytes.length >= 12
    && bytes.subarray(0, 4).toString("ascii") === "RIFF"
    && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export async function POST(request: NextRequest) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return errorResponse("ログインが必要です。", 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("画像データを読み込めませんでした。", 400);
  }

  const file = formData.get("file");
  const kind = formData.get("kind");
  if (!(file instanceof File) || (kind !== "avatar" && kind !== "background")) {
    return errorResponse("画像の入力内容が正しくありません。", 400);
  }

  const extension = IMAGE_TYPES.get(file.type);
  if (!extension) return errorResponse("JPEG、PNG、WebP画像を選択してください。", 400);

  const maxSize = kind === "avatar" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxSize) {
    return errorResponse(kind === "avatar" ? "画像は5MB以内にしてください。" : "画像は10MB以内にしてください。", 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasExpectedImageSignature(bytes, file.type)) {
    return errorResponse("画像ファイルの形式を確認してください。", 400);
  }

  const bucket = getCreatorImageBucket();
  const path = `trendre-link/${auth.user.id}/${kind}-${randomUUID()}.${extension}`;
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error("storage_upload_failed");

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json<UploadResponse>({ ok: true, url: data.publicUrl });
  } catch (error) {
    console.error("[trendre-link/images] 画像を保存できませんでした。", {
      cause: error instanceof Error ? error.message : "unknown",
    });
    return errorResponse("画像を保存できませんでした。Storage設定を確認してください。", 500);
  }
}
