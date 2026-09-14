import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";
import {
  GET as getCreatorList,
  __setCompanyCreatorListDepsLoaderForTests,
} from "../app/api/b/creators/route.ts";
import {
  GET as getCreatorDetail,
  __setCompanyCreatorDetailDepsLoaderForTests,
} from "../app/api/b/creators/[id]/route.ts";

afterEach(() => {
  __setCompanyCreatorListDepsLoaderForTests();
  __setCompanyCreatorDetailDepsLoaderForTests();
});

function queryResult(result: { data: any; error: any }, onSelect?: (value: string) => void) {
  const builder: any = {
    select(value: string) {
      onSelect?.(value);
      return builder;
    },
    eq() { return builder; },
    in() { return builder; },
    order() { return builder; },
    range() { return builder; },
    maybeSingle: async () => result,
    then(resolve: (value: any) => unknown, reject: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return builder;
}

function authenticatedClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
  };
}

test("Company Creator list rejects unauthenticated and non-Company callers", async () => {
  __setCompanyCreatorListDepsLoaderForTests(async () => ({
    createSupabaseServerClient: async () => authenticatedClient(null),
    supabaseAdmin: { from: () => assert.fail("admin query must not run") },
  }));
  const unauthenticated = await getCreatorList(
    new Request("https://app.example.test/api/b/creators"),
  );
  assert.equal(unauthenticated.status, 401);

  __setCompanyCreatorListDepsLoaderForTests(async () => ({
    createSupabaseServerClient: async () => authenticatedClient({ id: "creator-user" }),
    supabaseAdmin: {
      from(table: string) {
        assert.equal(table, "user_roles");
        return queryResult({ data: [{ role: "creator" }], error: null });
      },
    },
  }));
  const forbidden = await getCreatorList(
    new Request("https://app.example.test/api/b/creators"),
  );
  assert.equal(forbidden.status, 403);
});

test("Company Creator list keeps eligible Japan and includes menu-free Korea/Taiwan", async () => {
  const selected: string[] = [];
  const creators = [
    { id: "jp", display_name: "JP", country: "日本", creator_social_accounts: [], email: "private@example.test" },
    { id: "kr", display_name: "KR", country: "韓国", creator_social_accounts: [] },
    { id: "tw", display_name: "TW", country: "台湾", creator_social_accounts: [] },
  ];
  const menus = [
    { id: "jp-menu", creator_id: "jp", title: "JP Menu", price: 3000, currency: "JPY", is_active: true },
    { id: "kr-menu", creator_id: "kr", title: "Injected KR Menu", price: 3000, currency: "JPY", is_active: true },
  ];
  __setCompanyCreatorListDepsLoaderForTests(async () => ({
    createSupabaseServerClient: async () => authenticatedClient({ id: "company-user" }),
    supabaseAdmin: {
      from(table: string) {
        if (table === "user_roles") return queryResult({ data: [{ role: "company" }], error: null });
        if (table === "creators") return queryResult({ data: creators, error: null }, (value) => selected.push(value));
        if (table === "creator_menus") return queryResult({ data: menus, error: null }, (value) => selected.push(value));
        if (table === "creator_portfolio_assets") return queryResult({ data: [], error: null }, (value) => selected.push(value));
        return assert.fail(`unexpected table ${table}`);
      },
      rpc: async () => ({ data: [{ creator_id: "jp" }], error: null }),
    },
  }));

  const response = await getCreatorList(
    new Request("https://app.example.test/api/b/creators?limit=100&offset=0"),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.creators.map((creator: any) => creator.id), ["jp", "kr", "tw"]);
  assert.deepEqual(body.menus.map((menu: any) => menu.id), ["jp-menu"]);
  assert.equal("email" in body.creators[0], false);
  assert.equal(selected.some((columns) => columns.includes("email")), false);
});

test("Company Creator detail returns a read-only Taiwan profile without paid Menu data", async () => {
  const queriedTables: string[] = [];
  const creator = {
    id: "tw",
    display_name: "TW Creator",
    avatar_url: null,
    category: "美容",
    country: "台湾",
    user_id: "private-auth-id",
    bank_account: "private",
  };
  __setCompanyCreatorDetailDepsLoaderForTests(async () => ({
    createSupabaseServerClient: async () => authenticatedClient({ id: "company-user" }),
    supabaseAdmin: {
      from(table: string) {
        queriedTables.push(table);
        if (table === "user_roles") return queryResult({ data: [{ role: "company" }], error: null });
        if (table === "creators") return queryResult({ data: creator, error: null });
        if (table === "creator_social_accounts") {
          return queryResult({
            data: [{ id: "social", creator_id: "tw", platform: "Instagram", url: "https://example.test/tw", private_note: "secret" }],
            error: null,
          });
        }
        if (table === "creator_portfolio_assets") return queryResult({ data: [], error: null });
        return assert.fail(`unexpected table ${table}`);
      },
      rpc: async () => assert.fail("Taiwan must not require payout readiness"),
    },
  }));

  const response = await getCreatorDetail(
    new Request("https://app.example.test/api/b/creators/tw"),
    { params: Promise.resolve({ id: "tw" }) },
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.creator.country, "台湾");
  assert.deepEqual(body.menus, []);
  assert.equal("user_id" in body.creator, false);
  assert.equal("bank_account" in body.creator, false);
  assert.equal("private_note" in body.socialAccounts[0], false);
  assert.equal(queriedTables.includes("creator_menus"), false);
});

test("Company Creator detail preserves Japan payout and active Menu behavior", async () => {
  __setCompanyCreatorDetailDepsLoaderForTests(async () => ({
    createSupabaseServerClient: async () => authenticatedClient({ id: "company-user" }),
    supabaseAdmin: {
      from(table: string) {
        if (table === "user_roles") return queryResult({ data: [{ role: "company" }], error: null });
        if (table === "creators") {
          return queryResult({ data: { id: "jp", display_name: "JP", country: "日本" }, error: null });
        }
        if (table === "creator_menus") {
          return queryResult({ data: [{ id: "menu", creator_id: "jp", title: "Menu", currency: "JPY", sort_order: 0 }], error: null });
        }
        if (table === "creator_social_accounts" || table === "creator_portfolio_assets") {
          return queryResult({ data: [], error: null });
        }
        return assert.fail(`unexpected table ${table}`);
      },
      rpc: async () => ({ data: [{ creator_id: "jp" }], error: null }),
    },
  }));

  const response = await getCreatorDetail(
    new Request("https://app.example.test/api/b/creators/jp"),
    { params: Promise.resolve({ id: "jp" }) },
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.menus.length, 1);
  assert.equal(body.menus[0].currency, "JPY");
});

test("Company Creator pages no longer read Creator public data directly from Supabase", () => {
  for (const file of ["app/b/creators/page.tsx", "app/b/creators/[id]/page.tsx"]) {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const table of ["creators", "creator_menus", "creator_social_accounts", "creator_portfolio_assets"]) {
      assert.equal(source.includes(`.from(\"${table}\")`), false, `${file} still reads ${table}`);
    }
    assert.equal(source.includes("get_payout_ready_creator_ids"), false);
  }
});
