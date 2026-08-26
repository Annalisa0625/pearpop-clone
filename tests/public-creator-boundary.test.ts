import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePublicCreatorPagination,
} from "../lib/public-creators/pagination.ts";

const read = (path: string) => readFileSync(path, "utf8");
const boundary = read("lib/public-creators/server.ts");
const adminClient = read("lib/supabaseAdmin.ts");
const publicCreatorListRoute = read("app/api/public/creators/route.ts");
const publicCreatorDetailRoute = read("app/api/public/creators/[id]/route.ts");
const publicInquiryRoute = read("app/api/public/inquiries/route.ts");
const home = read("app/home/page.tsx");
const companyCreatorList = read("app/b/creators/page.tsx");
const companyCreatorDetail = read("app/b/creators/[id]/page.tsx");
const companyCreatorRequest = read("app/b/creators/[id]/request/CreatorRequestClient.tsx");
const companyMenuList = read("app/b/creators/[id]/menus/page.tsx");
const companyMenuDetail = read("app/b/creators/[id]/menus/[menuId]/page.tsx");
const publicCreatorPage = read("app/in/[slug]/page.tsx");
const publicRoutes = [
  "app/home/page.tsx",
  "app/b/creators/page.tsx",
  "app/b/creators/[id]/page.tsx",
  "app/b/creators/[id]/request/CreatorRequestClient.tsx",
  "app/b/creators/[id]/menus/page.tsx",
  "app/b/creators/[id]/menus/[menuId]/page.tsx",
  "app/in/[slug]/page.tsx",
].map(read);

test("public creator boundary is server-only and explicitly projects safe fields", () => {
  assert.match(boundary, /import "server-only"/);
  assert.match(adminClient, /import "server-only"/);
  assert.match(boundary, /const CREATOR_COLUMNS = "id, display_name, avatar_url, bio, category, prefecture, rating, total_orders, can_receive_products, public_slug"/);
  assert.doesNotMatch(boundary, /select\(\"\*\"\)/);
  for (const field of ["full_name", "phone_country_code", "phone_number", "phone_verified_at", "contact_email", "gender", "birth_date", "stripe_account_id", "stripe_onboarding_completed", "user_id", "city"]) {
    assert.doesNotMatch(boundary, new RegExp(`\\b${field}\\b`));
  }
});

test("public and company clients do not query protected creator tables or payout RPC directly", () => {
  for (const source of publicRoutes) {
    assert.doesNotMatch(source, /supabaseAdmin/);
    assert.doesNotMatch(source, /from\("creators"\)/);
    assert.doesNotMatch(source, /from\("creator_social_accounts"\)/);
    assert.doesNotMatch(source, /get_payout_ready_creator_ids/);
  }
});

test("signup username availability returns only a boolean and has no browser profiles query", () => {
  const signup = read("app/signup/creator/SignupCreatorClient.tsx");
  const route = read("app/api/signup/username-availability/route.ts");
  assert.doesNotMatch(signup, /from\("profiles"\)/);
  assert.match(signup, /api\/signup\/username-availability/);
  assert.match(route, /NextResponse\.json\(\{ available: !data \}\)/);
  assert.doesNotMatch(route, /username:\s*data/);
});

test("payout-ready is explicit only for orderable Creator callers", () => {
  const publicDetail = boundary.slice(
    boundary.indexOf("export async function getPublicCreatorById"),
    boundary.indexOf("export async function getOrderablePublicCreatorById")
  );
  assert.doesNotMatch(publicDetail, /payoutReadyCreatorIds/);
  assert.match(boundary, /export async function getOrderablePublicCreatorById/);
  assert.match(publicCreatorDetailRoute, /requirePayoutReady.*=== "1"/);
  assert.match(companyCreatorDetail, /requirePayoutReady=1/);
  assert.match(companyCreatorRequest, /requirePayoutReady=1/);
  assert.match(publicCreatorPage, /getOrderablePublicCreatorBySlugOrId/);
  assert.doesNotMatch(companyMenuList, /requirePayoutReady=1/);
  assert.doesNotMatch(companyMenuDetail, /requirePayoutReady=1/);
});

test("public Creator pagination clamps untrusted values and bounds related queries to page IDs", () => {
  assert.deepEqual(parsePublicCreatorPagination(new URLSearchParams()), {
    limit: DEFAULT_LIMIT,
    offset: 0,
  });
  assert.deepEqual(parsePublicCreatorPagination(new URLSearchParams("limit=8&offset=50")), {
    limit: 8,
    offset: 50,
  });
  assert.deepEqual(parsePublicCreatorPagination(new URLSearchParams("limit=0&offset=-1")), {
    limit: 1,
    offset: 0,
  });
  assert.deepEqual(parsePublicCreatorPagination(new URLSearchParams("limit=999999&offset=1.5")), {
    limit: MAX_LIMIT,
    offset: 0,
  });
  assert.match(publicCreatorListRoute, /parsePublicCreatorPagination\(request\.nextUrl\.searchParams\)/);
  assert.match(boundary, /\.range\(offset, offset \+ limit - 1\)/);
  assert.match(boundary, /loadPublicRelations\(creators\.map\(\(creator\) => creator\.id\)\)/);
  assert.match(home, /api\/public\/creators\?limit=8/);
  assert.match(companyCreatorList, /api\/public\/creators\?limit=\$\{pageLimit\}&offset=\$\{offset\}/);
});

test("public inquiries reject suspended Creators without using service role for INSERT", () => {
  const lookup = publicInquiryRoute.slice(
    publicInquiryRoute.indexOf("const { data: creator"),
    publicInquiryRoute.indexOf("if (creatorError)")
  );
  assert.match(lookup, /supabaseAdmin/);
  assert.match(lookup, /\.eq\("is_suspended", false\)/);
  const insert = publicInquiryRoute.slice(publicInquiryRoute.indexOf("const { data: inquiry"));
  assert.match(insert, /await supabase\s*\.from\("creator_inquiries"\)\s*\.insert/);
  assert.doesNotMatch(insert, /supabaseAdmin\s*\.from\("creator_inquiries"\)/);
});
