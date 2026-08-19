export type CreatorLinkSocialOrderItem = {
  id?: string;
  itemType: string;
};

export function reorderCreatorLinkSocialItems<T extends CreatorLinkSocialOrderItem>(
  items: readonly T[],
  activeId: string,
  overId: string,
) {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return [...items];
  const reordered = [...items];
  const [active] = reordered.splice(from, 1);
  reordered.splice(to, 0, active);
  return reordered;
}
