// app/api/signup/complete/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "token required" },
        { status: 400 }
      );
    }

    const { data: signup, error } = await supabaseAdmin
      .from("signup_tokens")
      .select("email, role, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !signup) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    if (signup.used_at) {
      return NextResponse.json(
        { error: "Token already used" },
        { status: 400 }
      );
    }

    if (new Date(signup.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      role: signup.role,
      email: signup.email,
    });

  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500 }
    );
  }
}