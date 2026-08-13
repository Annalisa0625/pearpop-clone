import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isCreatorOnlyBlockedApiPath, isCreatorOnlyBlockedPagePath, isCreatorOnlyRelease } from "@/lib/release-mode";

function notFoundResponse(isApi: boolean) {
  return isApi
    ? NextResponse.json({ error: "Not Found" }, { status: 404 })
    : new NextResponse("Not Found", { status: 404 });
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/");

  if (
    isCreatorOnlyRelease() &&
    (isApi ? isCreatorOnlyBlockedApiPath(pathname) : isCreatorOnlyBlockedPagePath(pathname))
  ) {
    return notFoundResponse(isApi);
  }

  // These endpoints were outside the legacy middleware matcher. Keep Stripe's
  // signed webhook and external auth callbacks free from session-refresh work.
  if (pathname === "/api/stripe/webhook" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
