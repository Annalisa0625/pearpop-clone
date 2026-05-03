// app/api/admin/company-applications/reject/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  return NextResponse.json(
    { error: "reject API is deprecated. Use /api/admin/company-applications/approve with action=reject" },
    { status: 410 }
  );
}