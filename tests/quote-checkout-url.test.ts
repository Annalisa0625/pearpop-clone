import assert from "node:assert/strict";
import test from "node:test";

import { getCheckoutBaseUrl } from "../lib/trendre-link/quote-checkout-url.ts";

test("PreviewではVercelが許可したHostだけを使用する", () => {
  const args = {
    fallbackBaseUrl: "https://app.trendre.example/",
    vercelEnv: "preview",
    vercelUrl: "preview-abc.vercel.app",
  };
  assert.equal(
    getCheckoutBaseUrl({ ...args, requestOrigin: "https://preview-abc.vercel.app" }),
    "https://preview-abc.vercel.app"
  );
  assert.equal(
    getCheckoutBaseUrl({ ...args, requestOrigin: "https://evil.example" }),
    "https://app.trendre.example"
  );
  assert.equal(
    getCheckoutBaseUrl({ ...args, requestOrigin: "http://preview-abc.vercel.app" }),
    "https://app.trendre.example"
  );
});

test("Productionではrequest Hostを信用せず設定済みURLへ固定する", () => {
  assert.equal(
    getCheckoutBaseUrl({
      requestOrigin: "https://attacker.example",
      fallbackBaseUrl: "https://trendre.example/",
      vercelEnv: "production",
    }),
    "https://trendre.example"
  );
});

test("ローカル環境ではlocalhostのhttpだけを許可する", () => {
  assert.equal(
    getCheckoutBaseUrl({
      requestOrigin: "http://localhost:3000",
      fallbackBaseUrl: "https://trendre.example",
    }),
    "http://localhost:3000"
  );
  assert.equal(
    getCheckoutBaseUrl({
      requestOrigin: "https://evil.example",
      fallbackBaseUrl: "https://trendre.example",
    }),
    "https://trendre.example"
  );
});
