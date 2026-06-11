// File: app/api/company/orders/[id]/visit-schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type VisitScheduleInput = {
  visit_scheduled_at?: unknown;
  visit_location?: unknown;
  visit_notes?: unknown;
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

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeVisitDateTime(value: unknown) {
  const raw = getString(value);

  if (!raw) return null;

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function canRegisterVisitSchedule(order: {
  status: string;
  payment_status: string;
  fulfillment_type: string | null;
}) {
  if (order.fulfillment_type !== "visit") return false;
  if (order.payment_status !== "captured") return false;

  return order.status === "accepted_captured" || order.status === "in_progress";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json({
    ok: true,
    route: "company order visit schedule",
    order_id: id,
    message: "POST this route to register visit schedule information.",
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await context.params;

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as VisitScheduleInput | null;

    const visitScheduledAt = normalizeVisitDateTime(body?.visit_scheduled_at);
    const visitLocation = getString(body?.visit_location).slice(0, 300);
    const visitNotes = getString(body?.visit_notes).slice(0, 1000) || null;

    if (!visitScheduledAt) {
      return NextResponse.json(
        { error: "来店日時を入力してください" },
        { status: 400 }
      );
    }

    if (!visitLocation) {
      return NextResponse.json(
        { error: "来店場所を入力してください" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        b_user_id,
        creator_user_id,
        status,
        payment_status,
        fulfillment_type,
        preparation_status,
        visit_scheduled_at,
        visit_location,
        visit_notes
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりませんでした" },
        { status: 404 }
      );
    }

    if (order.b_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文の来店情報を更新する権限がありません" },
        { status: 403 }
      );
    }

    if (!canRegisterVisitSchedule(order)) {
      return NextResponse.json(
        { error: "この注文では現在、来店情報を登録できません" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: order.status === "accepted_captured" ? "in_progress" : order.status,
        preparation_status: "schedule_confirmed",
        visit_scheduled_at: visitScheduledAt,
        visit_location: visitLocation,
        visit_notes: visitNotes,
        preparation_ready_at: nowIso,
        updated_at: nowIso,
      } as never)
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: order.visit_scheduled_at
        ? "company_updated_visit_schedule"
        : "company_registered_visit_schedule",
      event_data: {
        previous_preparation_status: order.preparation_status,
        preparation_status: "schedule_confirmed",
        visit_scheduled_at: visitScheduledAt,
        visit_location: visitLocation,
        has_visit_notes: Boolean(visitNotes),
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: order.status === "accepted_captured" ? "in_progress" : order.status,
      preparation_status: "schedule_confirmed",
      visit_scheduled_at: visitScheduledAt,
      visit_location: visitLocation,
      visit_notes: visitNotes,
      preparation_ready_at: nowIso,
    });
  } catch (error) {
    console.error("company order visit schedule error", error);

    return NextResponse.json(
      { error: "来店情報の登録に失敗しました" },
      { status: 500 }
    );
  }
}