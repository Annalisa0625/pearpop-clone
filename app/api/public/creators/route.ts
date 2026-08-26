import { NextRequest, NextResponse } from "next/server";

import { parsePublicCreatorPagination } from "@/lib/public-creators/pagination";
import { listPublicCreators } from "@/lib/public-creators/server";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await listPublicCreators(parsePublicCreatorPagination(request.nextUrl.searchParams)));
  } catch {
    return NextResponse.json({ error: "公開クリエイター情報を取得できませんでした。" }, { status: 500 });
  }
}
