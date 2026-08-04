import assert from "node:assert/strict";
import test from "node:test";

import { insertOrRecoverUnique } from "../lib/db/unique-insert.ts";

test("Promise.allの同時insertで23505を既存行へ回収し1件だけ作る", async () => {
  let row: { id: string } | null = null;
  let inserts = 0;
  const submit = () => insertOrRecoverUnique({
    insert: async () => {
      await Promise.resolve();
      if (row) return { data: null, error: { code: "23505" } };
      row = { id: "one" };
      inserts += 1;
      return { data: row, error: null };
    },
    recover: async () => ({ data: row, error: null }),
    missingError: "missing",
  });

  const [first, second] = await Promise.all([submit(), submit()]);
  assert.equal(inserts, 1);
  assert.equal(first.value.id, "one");
  assert.equal(second.value.id, "one");
  assert.equal([first.duplicate, second.duplicate].filter(Boolean).length, 1);
});

test("23505以外と回収不能な23505を成功扱いにしない", async () => {
  await assert.rejects(
    insertOrRecoverUnique({
      insert: async () => ({ data: null, error: { code: "42501", message: "denied" } }),
      recover: async () => ({ data: { id: "never" }, error: null }),
      missingError: "missing",
    })
  );
  await assert.rejects(
    insertOrRecoverUnique({
      insert: async () => ({ data: null, error: { code: "23505" } }),
      recover: async () => ({ data: null, error: null }),
      missingError: "missing",
    })
  );
});
