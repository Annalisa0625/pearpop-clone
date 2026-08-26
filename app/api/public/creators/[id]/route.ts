import { NextRequest, NextResponse } from "next/server";

import {
  getOrderablePublicCreatorById,
  getPublicCreatorById,
} from "@/lib/public-creators/server";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const requirePayoutReady = _request.nextUrl.searchParams.get("requirePayoutReady") === "1";
    const data = requirePayoutReady
      ? await getOrderablePublicCreatorById(id)
      : await getPublicCreatorById(id);
    if (!data) return NextResponse.json({ error: "クリエイターが見つかりません。" }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "公開クリエイター情報を取得できませんでした。" }, { status: 500 });
  }
}
