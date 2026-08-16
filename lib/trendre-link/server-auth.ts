import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  reconcileBearerAndCookieUser,
  resolveCookieAuthenticatedUser,
  SESSION_IDENTITY_ERROR,
  type TrendreLinkAuthResult,
} from "@/lib/trendre-link/auth-identity";

export {
  reconcileBearerAndCookieUser,
  resolveCookieAuthenticatedUser,
  SESSION_IDENTITY_ERROR,
  type TrendreLinkAuthResult,
};

async function getCookieUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function getTrendreLinkBearerAuthenticatedUser(
  request: NextRequest
): Promise<TrendreLinkAuthResult> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) {
    return { user: null, error: SESSION_IDENTITY_ERROR };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(match[1].trim());
  if (error || !data.user) {
    return { user: null, error: SESSION_IDENTITY_ERROR };
  }

  return reconcileBearerAndCookieUser(data.user, await getCookieUser());
}

export async function getTrendreLinkAuthenticatedUser(
  request: NextRequest
): Promise<TrendreLinkAuthResult> {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    return getTrendreLinkBearerAuthenticatedUser(request);
  }

  return resolveCookieAuthenticatedUser(await getCookieUser());
}

