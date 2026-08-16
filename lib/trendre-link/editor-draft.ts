import type { CreatorLinkLayoutToken } from "./layout-order";

export type CreatorLinkEditorDraft<TForm, TItem, TInquiryForms> = {
  form: TForm;
  items: TItem[];
  layoutOrder: CreatorLinkLayoutToken[];
  inquiryForms: TInquiryForms;
};

export type CreatorLinkUnsavedDecision = "save" | "discard" | "keep";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

export function creatorLinkEditorDraftFingerprint<TForm, TItem, TInquiryForms>(
  draft: CreatorLinkEditorDraft<TForm, TItem, TInquiryForms>,
) {
  return JSON.stringify(stableValue(draft));
}

export function areCreatorLinkEditorDraftsEqual<TForm, TItem, TInquiryForms>(
  left: CreatorLinkEditorDraft<TForm, TItem, TInquiryForms>,
  right: CreatorLinkEditorDraft<TForm, TItem, TInquiryForms>,
) {
  return creatorLinkEditorDraftFingerprint(left) === creatorLinkEditorDraftFingerprint(right);
}

export function createCreatorLinkTemporaryItemId() {
  return crypto.randomUUID();
}

export function reorderCreatorLinkDraftItems<T extends { id: string; sortOrder: number }>(
  allItems: readonly T[],
  orderedItems: readonly Pick<T, "id">[],
) {
  const orderedIds = orderedItems.map((item) => item.id);
  const slots = allItems
    .filter((item) => orderedIds.includes(item.id))
    .map((item) => item.sortOrder)
    .sort((left, right) => left - right);
  const reordered = new Map(
    orderedIds.map((id, index) => {
      const item = allItems.find((candidate) => candidate.id === id);
      return [id, item ? { ...item, sortOrder: slots[index] ?? item.sortOrder } : null] as const;
    }),
  );
  return allItems
    .map((item) => reordered.get(item.id) ?? item)
    .filter((item): item is T => item !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function replaceCreatorLinkDraftLayoutItemId(
  order: readonly CreatorLinkLayoutToken[],
  temporaryId: string,
  persistedId: string,
) {
  const temporaryToken = `link:${temporaryId}`;
  const persistedToken = `link:${persistedId}` as CreatorLinkLayoutToken;
  return order.map((token) => token === temporaryToken ? persistedToken : token);
}

export async function canLeaveCreatorLinkEditor(
  dirty: boolean,
  decision: CreatorLinkUnsavedDecision,
  save: () => Promise<boolean>,
) {
  if (!dirty) return true;
  if (decision === "keep") return false;
  if (decision === "discard") return true;
  return save();
}
