// app/api/signup/request/route.ts
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "email and role are required" },
        { status: 400 }
      );
    }

    if (!["creator", "company"].includes(role)) {
      return NextResponse.json(
        { error: "invalid role" },
        { status: 400 }
      );
    }

    // 🔎 既存ユーザーチェック
    const { data: existingUsers } =
      await supabaseAdmin.auth.admin.listUsers();

    const alreadyExists = existingUsers.users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "既に登録済みのメールアドレスです" },
        { status: 400 }
      );
    }

    // 🔐 token生成
    const token = randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // 🧹 既存未使用token削除
    await supabaseAdmin
      .from("signup_tokens")
      .delete()
      .eq("email", email)
      .is("used_at", null);

    // 💾 signup_tokensへ保存
    const { error: insertError } = await supabaseAdmin
      .from("signup_tokens")
      .insert({
        email,
        role,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("signup token insert error:", insertError);
      return NextResponse.json(
        { error: "DB error" },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const signupUrl = `${baseUrl}/signup/complete?token=${token}`;

    console.log("====== DEV SIGNUP LINK ======");
    console.log(signupUrl);
    console.log("=============================");

    return NextResponse.json({
      success: true,
      devSignupUrl: signupUrl,
    });

  } catch (error) {
    console.error("signup request error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}