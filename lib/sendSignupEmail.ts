// lib/sendSignupEmail.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type SendSignupEmailArgs = {
  to: string;
  signupUrl: string;
};

export async function sendSignupEmail({
  to,
  signupUrl,
}: SendSignupEmailArgs) {
  const { error } = await resend.emails.send({
    from: "Pearpop Clone <onboarding@resend.dev>",
    to, // ← ★ 必須
    subject: "【登録のご案内】48時間以内に登録を完了してください",
    text: `
ご登録ありがとうございます。

以下のリンクから、48時間以内に登録を完了してください。
（※期限を過ぎるとリンクは無効になります）

${signupUrl}
`,
  });

  if (error) {
    console.error("Resend error:", error);
    throw error;
  }
}
