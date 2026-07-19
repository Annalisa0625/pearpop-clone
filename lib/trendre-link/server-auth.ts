import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type TrendreLinkAuthResult = {
  user: User | null;
  error: string | null;
};

export async function getTrendreLinkAuthenticatedUser(
  request: NextRequest
): Promise<TrendreLinkAuthResult> {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match?.[1]) {
      return { user: null, error: "Authorizationヘッダーが不正です。" };
    }

    const { data, error } = await supabaseAdmin.auth.getUser(match[1].trim());

    if (error || !data.user) {
      return { user: null, error: "認証情報を確認できませんでした。" };
    }

    return { user: data.user, error: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { user: null, error: "ログインが必要です。" };
  }

  return { user: data.user, error: null };
}

