import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";

type PageType = "link" | "profile";
type SeriesPoint = { date: string; count: number };

type AnalyticsResponse =
  | {
      ok: true;
      days: 7 | 30 | 90;
      totals: Record<PageType, number>;
      series: Record<PageType, SeriesPoint[]>;
      setupPending?: boolean;
    }
  | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function parseDays(value: string | null): 7 | 30 | 90 {
  return value === "30" ? 30 : value === "90" ? 90 : 7;
}

function toJstDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

function createEmptySeries(days: 7 | 30 | 90): Record<PageType, SeriesPoint[]> {
  const now = Date.now();
  const dates = Array.from({ length: days }, (_, index) => {
    const remaining = days - 1 - index;
    return toJstDateKey(new Date(now - remaining * DAY_MS));
  });

  return {
    link: dates.map((date) => ({ date, count: 0 })),
    profile: dates.map((date) => ({ date, count: 0 })),
  };
}

export async function GET(request: NextRequest) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) {
    return NextResponse.json<AnalyticsResponse>(
      { ok: false, error: "ログインが必要です。" },
      { status: 401 }
    );
  }

  const days = parseDays(request.nextUrl.searchParams.get("days"));
  const series = createEmptySeries(days);
  const startJstDate = series.link[0]?.date;
  const startUtc = startJstDate
    ? new Date(`${startJstDate}T00:00:00+09:00`).toISOString()
    : new Date(Date.now() - (days - 1) * DAY_MS).toISOString();

  const admin = supabaseAdmin as any;
  const { data, error } = await admin
    .from("creator_page_views")
    .select("page_type, viewed_at")
    .eq("owner_user_id", auth.user.id)
    .gte("viewed_at", startUtc)
    .order("viewed_at", { ascending: true });

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json<AnalyticsResponse>({
        ok: true,
        days,
        totals: { link: 0, profile: 0 },
        series,
        setupPending: true,
      });
    }

    console.error("creator analytics load failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json<AnalyticsResponse>(
      { ok: false, error: "アクセスデータを読み込めませんでした。" },
      { status: 500 }
    );
  }

  const indexByDate = new Map(
    series.link.map((point, index) => [point.date, index] as const)
  );

  for (const row of (data ?? []) as Array<{
    page_type: PageType;
    viewed_at: string;
  }>) {
    if (row.page_type !== "link" && row.page_type !== "profile") continue;
    const dateKey = toJstDateKey(row.viewed_at);
    const index = indexByDate.get(dateKey);
    if (index === undefined) continue;
    series[row.page_type][index].count += 1;
  }

  return NextResponse.json<AnalyticsResponse>({
    ok: true,
    days,
    totals: {
      link: series.link.reduce((sum, point) => sum + point.count, 0),
      profile: series.profile.reduce((sum, point) => sum + point.count, 0),
    },
    series,
  });
}
