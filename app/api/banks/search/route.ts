// File: app/api/banks/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchBanks } from "@/lib/banks/zengin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getLimit(value: string | null) {
  const limit = Number(value ?? 30);

  if (!Number.isFinite(limit)) return 30;

  return Math.min(Math.max(Math.floor(limit), 1), 100);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = getLimit(url.searchParams.get("limit"));

    const banks = await searchBanks(q, limit);

    return NextResponse.json({
      ok: true,
      banks,
    });
  } catch (error) {
    console.error("bank search error:", error);

    return NextResponse.json(
      { error: "銀行検索に失敗しました" },
      { status: 500 }
    );
  }
}