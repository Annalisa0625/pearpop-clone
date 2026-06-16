// File: app/api/banks/[bankCode]/branches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchBranches } from "@/lib/banks/zengin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getLimit(value: string | null) {
  const limit = Number(value ?? 50);

  if (!Number.isFinite(limit)) return 50;

  return Math.min(Math.max(Math.floor(limit), 1), 200);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bankCode: string }> }
) {
  try {
    const { bankCode } = await context.params;
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = getLimit(url.searchParams.get("limit"));

    const result = await searchBranches(bankCode, q, limit);

    if (!result) {
      return NextResponse.json(
        { error: "銀行が見つかりませんでした" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("branch search error:", error);

    return NextResponse.json(
      { error: "支店検索に失敗しました" },
      { status: 500 }
    );
  }
}