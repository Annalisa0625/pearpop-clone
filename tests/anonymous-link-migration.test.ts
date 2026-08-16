import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnonymousLinkDraft,
  isCurrentAnonymousLinkMigration,
} from "../lib/trendre-link/anonymous-draft.ts";

const userId = "user-1";
const pageId = "page-1";

test("migrationなしの新規draftはresumeとして扱わない", () => {
  assert.equal(
    isCurrentAnonymousLinkMigration(createAnonymousLinkDraft().migration, userId, pageId),
    false
  );
});

test("同一user・同一bootstrap pageだけをvalid resumeとして扱う", () => {
  const draft = createAnonymousLinkDraft();
  draft.migration = { phase: "hydrating", userId, pageId };

  assert.equal(isCurrentAnonymousLinkMigration(draft.migration, userId, pageId), true);
});

test("別userまたはpageId不一致のmigrationはstaleとして扱う", () => {
  const draft = createAnonymousLinkDraft();
  draft.migration = { phase: "hydrating", userId: "old-user", pageId: "old-page" };

  assert.equal(isCurrentAnonymousLinkMigration(draft.migration, userId, pageId), false);
  assert.equal(isCurrentAnonymousLinkMigration({ ...draft.migration, userId }, userId, pageId), false);
});
