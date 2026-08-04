import assert from "node:assert/strict";
import test from "node:test";

import { normalizeNextPath } from "../lib/auth/next-path.ts";

test("登録・ログイン後の同一オリジン相対パスだけを許可する", () => {
  assert.equal(
    normalizeNextPath("/in/trendre-gnufha?resume=inquiry"),
    "/in/trendre-gnufha?resume=inquiry"
  );
  assert.equal(normalizeNextPath("https://evil.example/path"), null);
  assert.equal(normalizeNextPath("//evil.example/path"), null);
  assert.equal(normalizeNextPath("/\\evil.example/path"), null);
  assert.equal(normalizeNextPath("/%0aevil"), null);
  assert.equal(normalizeNextPath("/%5cevil.example/path"), null);
  assert.equal(normalizeNextPath("/%2f%2fevil.example/path"), null);
  assert.equal(normalizeNextPath("/%252f%252fevil.example/path"), null);
});
