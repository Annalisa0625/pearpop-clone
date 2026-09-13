import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";
import {
  __setProfileServerDepsLoaderForTests,
  POST as saveProfile,
} from "../app/api/creator/profile/route.ts";
import {
  __setSignupServerDepsLoaderForTests,
  POST as completeSignup,
} from "../app/api/signup/complete-creator/route.ts";
import {
  canonicalizeCreatorLocation,
  getCreatorLocationAfterCountryChange,
  getCreatorProfileLocationState,
  isCreatorCountry,
  JAPAN_PREFECTURES,
  normalizeCreatorDraftLocation,
  restoreCreatorSignupDraftLocation,
} from "../lib/creator/country.ts";

const root = resolve(process.cwd());
const signupClient = readFileSync(
  resolve(root, "app/signup/creator/SignupCreatorClient.tsx"),
  "utf8",
);
const profileClient = readFileSync(
  resolve(root, "app/creator/profile/page.tsx"),
  "utf8",
);

afterEach(() => {
  __setSignupServerDepsLoaderForTests();
  __setProfileServerDepsLoaderForTests();
});

function validSignupBody(overrides: Record<string, unknown> = {}) {
  return {
    username: "country_test_creator",
    display_name: "Country Test Creator",
    avatar_url: "https://example.test/avatar.jpg",
    portfolio_assets: [
      { asset_url: "https://example.test/portfolio-1.jpg" },
      { asset_url: "https://example.test/portfolio-2.jpg" },
      { asset_url: "https://example.test/portfolio-3.jpg" },
    ],
    gender: "女性",
    birth_date: "1990-01-01",
    country: "日本",
    prefecture: "東京都",
    can_receive_products: true,
    main_category: "美容",
    sub_categories: ["美容"],
    content_language: "日本語",
    response_language: "日本語",
    social_accounts: [
      {
        platform: "Instagram",
        username_or_url: "country_test_creator",
        follower_range: "1万〜5万",
        audience_country: "日本",
      },
    ],
    first_menus: [{ menu_type: "Instagram投稿", price: 3000 }],
    agreed_to_terms: true,
    agreed_to_privacy: true,
    ...overrides,
  };
}

function mockSignupRoute() {
  const calls = {
    rpcs: [] as Array<{ name: string; args: any }>,
  };
  const supabaseAdmin = {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            email: "creator@example.test",
            user_metadata: {},
          },
        },
        error: null,
      }),
      admin: {
        updateUserById: async () => ({ error: null }),
      },
    },
    rpc: async (name: string, args: any) => {
      calls.rpcs.push({ name, args });
      return {
        data: [{ status: "completed_now", creator_id: "creator-1" }],
        error: null,
      };
    },
  };
  __setSignupServerDepsLoaderForTests(async () => ({ supabaseAdmin }));
  return calls;
}

async function postSignup(body: Record<string, unknown>) {
  return completeSignup(new Request("https://app.example.test/api/signup/complete-creator", {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }));
}

function validProfileBody(overrides: Record<string, unknown> = {}) {
  return {
    displayName: "Country Test Creator",
    category: "美容",
    country: "日本",
    prefecture: "東京都",
    canReceiveProducts: true,
    contentLanguage: "日本語",
    responseLanguage: "日本語",
    subCategories: ["美容"],
    avatarUrl: null,
    shouldPublishCreator: false,
    socialAccountsChanged: false,
    ...overrides,
  };
}

function mockProfileRoute() {
  const calls = {
    rpcs: [] as Array<{ name: string; args: any }>,
  };
  const authenticatedClient = {
    auth: {
      getUser: async () => ({
        data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
        error: null,
      }),
    },
  };
  const supabaseAdmin = {
    from(table: string) {
      assert.equal(table, "creators");
      const builder: any = {
        select() { return builder; },
        eq() { return builder; },
        maybeSingle: async () => ({ data: { id: "creator-1" }, error: null }),
      };
      return builder;
    },
    rpc: async (name: string, args: any) => {
      calls.rpcs.push({ name, args });
      return { data: [{ creator_id: "creator-1" }], error: null };
    },
  };
  __setProfileServerDepsLoaderForTests(async () => ({
    createSupabaseServerClient: async () => authenticatedClient,
    supabaseAdmin,
  }));
  return calls;
}

async function postProfile(body: Record<string, unknown>) {
  return saveProfile(new Request("https://app.example.test/api/creator/profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as never);
}

test("Creator Country accepts only the three canonical database values", () => {
  assert.equal(isCreatorCountry("日本"), true);
  assert.equal(isCreatorCountry("韓国"), true);
  assert.equal(isCreatorCountry("台湾"), true);
  assert.equal(isCreatorCountry("JP"), false);
  assert.equal(isCreatorCountry("Japan"), false);
  assert.equal(isCreatorCountry(""), false);
});

test("Japan requires one or more of the 47 supported prefectures", () => {
  assert.equal(JAPAN_PREFECTURES.length, 47);

  assert.deepEqual(canonicalizeCreatorLocation("日本", "東京都"), {
    ok: true,
    country: "日本",
    prefecture: "東京都",
    prefectures: ["東京都"],
  });
  assert.deepEqual(canonicalizeCreatorLocation("日本", ""), {
    ok: false,
    error: "prefecture_required",
  });
  assert.deepEqual(canonicalizeCreatorLocation("日本", "ソウル"), {
    ok: false,
    error: "invalid_prefecture",
  });
  assert.deepEqual(canonicalizeCreatorLocation("日本", ["東京都", 1]), {
    ok: false,
    error: "invalid_prefecture",
  });
});

test("Korea and Taiwan always canonicalize prefecture to null", () => {
  assert.deepEqual(canonicalizeCreatorLocation("韓国", "東京都"), {
    ok: true,
    country: "韓国",
    prefecture: null,
    prefectures: [],
  });
  assert.deepEqual(canonicalizeCreatorLocation("台湾", "大阪府"), {
    ok: true,
    country: "台湾",
    prefecture: null,
    prefectures: [],
  });
});

test("old signup drafts default to Japan and non-Japan drafts discard prefecture", () => {
  assert.deepEqual(normalizeCreatorDraftLocation(undefined, "東京都"), {
    country: "日本",
    prefecture: "東京都",
    prefectures: ["東京都"],
  });
  assert.deepEqual(normalizeCreatorDraftLocation("韓国", "東京都"), {
    country: "韓国",
    prefecture: null,
    prefectures: [],
  });
  assert.deepEqual(normalizeCreatorDraftLocation("台湾", "大阪府"), {
    country: "台湾",
    prefecture: null,
    prefectures: [],
  });
  assert.deepEqual(normalizeCreatorDraftLocation(undefined, "東京都、ソウル"), {
    country: "日本",
    prefecture: "東京都",
    prefectures: ["東京都"],
  });
});

test("profile load preserves Korea and Taiwan and falls back legacy values to Japan", () => {
  assert.equal(getCreatorProfileLocationState("韓国", null).country, "韓国");
  assert.equal(getCreatorProfileLocationState("台湾", null).country, "台湾");
  assert.equal(getCreatorProfileLocationState(null, "東京都").country, "日本");
  assert.equal(getCreatorProfileLocationState("Japan", "東京都").country, "日本");
});

test("profile country transitions enforce the country-prefecture invariant", () => {
  assert.deepEqual(getCreatorLocationAfterCountryChange("韓国", ["東京都"]), {
    country: "韓国",
    prefecture: null,
    prefectures: [],
  });
  assert.deepEqual(getCreatorLocationAfterCountryChange("台湾", ["大阪府"]), {
    country: "台湾",
    prefecture: null,
    prefectures: [],
  });
  assert.deepEqual(canonicalizeCreatorLocation("韓国", ["東京都"]), {
    ok: true,
    country: "韓国",
    prefecture: null,
    prefectures: [],
  });
  assert.deepEqual(canonicalizeCreatorLocation("台湾", ["東京都"]), {
    ok: true,
    country: "台湾",
    prefecture: null,
    prefectures: [],
  });
  assert.deepEqual(canonicalizeCreatorLocation("日本", []), {
    ok: false,
    error: "prefecture_required",
  });
});

test("signup draft restoration preserves canonical countries and legacy compatibility", () => {
  assert.deepEqual(restoreCreatorSignupDraftLocation({ prefecture: "東京都" }), {
    country: "日本",
    prefecture: "東京都",
  });
  assert.deepEqual(restoreCreatorSignupDraftLocation({
    country: "韓国",
    prefecture: "東京都",
  }), {
    country: "韓国",
    prefecture: "",
  });
  assert.deepEqual(restoreCreatorSignupDraftLocation({
    country: "台湾",
    prefecture: "大阪府",
  }), {
    country: "台湾",
    prefecture: "",
  });
  assert.deepEqual(restoreCreatorSignupDraftLocation({
    country: "invalid",
    prefecture: "東京都",
  }), {
    country: "日本",
    prefecture: "東京都",
  });
});

for (const scenario of [
  { country: "日本", prefecture: "東京都", expectedPrefecture: "東京都" },
  { country: "韓国", prefecture: "東京都", expectedPrefecture: null },
  { country: "台湾", prefecture: "大阪府", expectedPrefecture: null },
]) {
  test(`signup route canonicalizes ${scenario.country} before the completion RPC`, async () => {
    const calls = mockSignupRoute();
    const response = await postSignup(validSignupBody({
      country: scenario.country,
      prefecture: scenario.prefecture,
    }));

    assert.equal(response.status, 200);
    assert.equal(calls.rpcs.length, 1);
    assert.equal(calls.rpcs[0].name, "complete_creator_signup");
    assert.equal(calls.rpcs[0].args.p_payload.country, scenario.country);
    assert.equal(
      calls.rpcs[0].args.p_payload.prefecture,
      scenario.expectedPrefecture,
    );
  });
}

for (const scenario of [
  { name: "missing country", overrides: { country: undefined } },
  { name: "invalid country", overrides: { country: "JP" } },
  {
    name: "missing Japanese prefecture",
    overrides: { country: "日本", prefecture: undefined },
  },
  {
    name: "invalid Japanese prefecture",
    overrides: { country: "日本", prefecture: "東京" },
  },
]) {
  test(`signup route rejects ${scenario.name} without an RPC`, async () => {
    const calls = mockSignupRoute();
    const response = await postSignup(validSignupBody(scenario.overrides));

    assert.equal(response.status, 400);
    assert.equal(calls.rpcs.length, 0);
  });
}

for (const scenario of [
  { country: "韓国", prefecture: "東京都", expectedPrefecture: null },
  { country: "台湾", prefecture: "大阪府", expectedPrefecture: null },
  { country: "日本", prefecture: "東京都", expectedPrefecture: "東京都" },
]) {
  test(`profile route canonicalizes ${scenario.country} before the save RPC`, async () => {
    const calls = mockProfileRoute();
    const response = await postProfile(validProfileBody({
      country: scenario.country,
      prefecture: scenario.prefecture,
    }));

    assert.equal(response.status, 200);
    assert.equal(calls.rpcs.length, 1);
    assert.equal(calls.rpcs[0].name, "save_creator_profile");
    assert.equal(calls.rpcs[0].args.p_payload.country, scenario.country);
    assert.equal(
      calls.rpcs[0].args.p_payload.prefecture,
      scenario.expectedPrefecture,
    );
  });
}

for (const scenario of [
  { name: "empty Japanese prefecture", overrides: { country: "日本", prefecture: "" } },
  { name: "invalid country", overrides: { country: "JP", prefecture: null } },
]) {
  test(`profile route rejects ${scenario.name} without an RPC`, async () => {
    const calls = mockProfileRoute();
    const response = await postProfile(validProfileBody(scenario.overrides));

    assert.equal(response.status, 400);
    assert.equal(calls.rpcs.length, 0);
  });
}

test("Signup and Profile clients consume the tested state helpers", () => {
  assert.match(signupClient, /restoreCreatorSignupDraftLocation\(draft\)/);
  assert.match(signupClient, /getCreatorLocationAfterCountryChange\(/);
  assert.doesNotMatch(signupClient, /creator_country:\s*country/);

  assert.match(profileClient, /getCreatorProfileLocationState\(/);
  assert.match(profileClient, /getCreatorLocationAfterCountryChange\(/);
});

test("Country selector uses native radio controls and local flag assets", () => {
  const selector = readFileSync(
    resolve(root, "components/creator/CountrySelector.tsx"),
    "utf8",
  );

  assert.match(selector, /type="radio"/);
  assert.match(selector, /checked=\{selected\}/);
  assert.match(selector, /const name = useId\(\)/);
  assert.match(selector, /<legend className="sr-only">\{ariaLabel\}<\/legend>/);
  assert.doesNotMatch(selector, /<fieldset aria-label=/);
  assert.match(selector, /\/flags\/\$\{flagCode\}\.svg/);
  assert.match(selector, /sizes="30px"/);
  assert.match(selector, /focus-visible/);

  for (const code of ["jp", "kr", "tw"]) {
    const flag = readFileSync(resolve(root, `public/flags/${code}.svg`), "utf8");
    assert.match(flag, /viewBox="0 0 30 20"/);
    assert.doesNotMatch(
      flag,
      /<script|foreignObject|(?:xlink:)?href=|<image|<metadata/i,
    );
  }
});
