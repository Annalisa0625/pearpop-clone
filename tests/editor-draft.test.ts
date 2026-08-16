import assert from "node:assert/strict";
import test from "node:test";

import {
  areCreatorLinkEditorDraftsEqual,
  canLeaveCreatorLinkEditor,
  createCreatorLinkTemporaryItemId,
  reorderCreatorLinkDraftItems,
  replaceCreatorLinkDraftLayoutItemId,
  type CreatorLinkEditorDraft,
} from "../lib/trendre-link/editor-draft.ts";

type TestDraft = CreatorLinkEditorDraft<
  { name: string; status: string },
  { id: string; sortOrder: number; metadata: { color?: string } },
  { simple: { title: string; isEnabled: boolean } }
>;

const baseline = (): TestDraft => ({
  form: { name: "Creator", status: "private" },
  items: [{ id: "item-a", sortOrder: 0, metadata: {} }],
  layoutOrder: ["social", "link:item-a", "work"],
  inquiryForms: { simple: { title: "Contact", isEnabled: true } },
});

test("draft equality detects page, item metadata, ordering, deletion, and inquiry edits", () => {
  const saved = baseline();
  assert.equal(areCreatorLinkEditorDraftsEqual(saved, baseline()), true);
  assert.equal(areCreatorLinkEditorDraftsEqual(saved, { ...baseline(), form: { name: "Changed", status: "private" } }), false);
  assert.equal(areCreatorLinkEditorDraftsEqual(saved, { ...baseline(), items: [{ id: "item-a", sortOrder: 0, metadata: { color: "#fff" } }] }), false);
  assert.equal(areCreatorLinkEditorDraftsEqual(saved, { ...baseline(), items: [] }), false);
  assert.equal(areCreatorLinkEditorDraftsEqual(saved, { ...baseline(), layoutOrder: ["work", "social", "link:item-a"] }), false);
  assert.equal(areCreatorLinkEditorDraftsEqual(saved, { ...baseline(), inquiryForms: { simple: { title: "PR", isEnabled: true } } }), false);
});

test("a successful save snapshot clears dirty state while a failed save retains it", async () => {
  const saved = baseline();
  const edited = { ...baseline(), form: { name: "Edited", status: "private" } };
  assert.equal(areCreatorLinkEditorDraftsEqual(edited, saved), false);
  let persisted = saved;
  const succeeded = await canLeaveCreatorLinkEditor(true, "save", async () => {
    persisted = edited;
    return true;
  });
  assert.equal(succeeded, true);
  assert.equal(areCreatorLinkEditorDraftsEqual(edited, persisted), true);

  persisted = saved;
  const failed = await canLeaveCreatorLinkEditor(true, "save", async () => false);
  assert.equal(failed, false);
  assert.equal(areCreatorLinkEditorDraftsEqual(edited, persisted), false);
});

test("draft reorder is pure and preserves unrelated item slots", () => {
  const original = [
    { id: "social", sortOrder: 0 },
    { id: "link-a", sortOrder: 1 },
    { id: "link-b", sortOrder: 2 },
  ];
  const reordered = reorderCreatorLinkDraftItems(original, [{ id: "link-b" }, { id: "link-a" }]);
  assert.deepEqual(reordered.map((item) => item.id), ["social", "link-b", "link-a"]);
  assert.deepEqual(original.map((item) => item.id), ["social", "link-a", "link-b"]);
});

test("temporary item IDs are stable UUIDs and are replaced before layout persistence", () => {
  const temporaryId = createCreatorLinkTemporaryItemId();
  assert.match(temporaryId, /^[0-9a-f-]{36}$/i);
  assert.deepEqual(
    replaceCreatorLinkDraftLayoutItemId(["work", `link:${temporaryId}`, "social"], temporaryId, "real-id"),
    ["work", "link:real-id", "social"],
  );
});

test("navigation decisions keep editing, discard immediately, or await save", async () => {
  let saveFinished = false;
  let saveCalls = 0;
  assert.equal(await canLeaveCreatorLinkEditor(true, "keep", async () => { saveCalls += 1; return true; }), false);
  assert.equal(await canLeaveCreatorLinkEditor(true, "discard", async () => { saveCalls += 1; return true; }), true);
  assert.equal(saveCalls, 0);
  const result = await canLeaveCreatorLinkEditor(true, "save", async () => {
    saveCalls += 1;
    await Promise.resolve();
    saveFinished = true;
    return true;
  });
  assert.equal(result, true);
  assert.equal(saveFinished, true);
  assert.equal(saveCalls, 1);
  assert.equal(await canLeaveCreatorLinkEditor(false, "keep", async () => { saveCalls += 1; return false; }), true);
  assert.equal(saveCalls, 1);
});
