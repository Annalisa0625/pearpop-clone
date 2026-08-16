const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreatorLinkLayoutToken = "social" | "work" | `link:${string}`;

export function parseCreatorLinkLayoutToken(value: unknown): CreatorLinkLayoutToken | null {
  if (value === "social" || value === "work") return value;
  if (typeof value !== "string" || !value.startsWith("link:")) return null;
  return UUID_PATTERN.test(value.slice(5)) ? value as `link:${string}` : null;
}

export function parseCreatorLinkLayoutOrder(value: unknown): CreatorLinkLayoutToken[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: CreatorLinkLayoutToken[] = [];
  const seen = new Set<string>();
  for (const valueToken of value) {
    const token = parseCreatorLinkLayoutToken(valueToken);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    parsed.push(token);
  }
  return parsed;
}

export function createCreatorLinkLegacyLayoutOrder(linkIds: readonly string[]): CreatorLinkLayoutToken[] {
  const uniqueLinkIds = [...new Set(linkIds.filter((id) => UUID_PATTERN.test(id)))];
  return ["social", "work", ...uniqueLinkIds.map((id) => `link:${id}` as const)];
}

export function normalizeCreatorLinkLayoutOrder(value: unknown, linkIds: readonly string[]): CreatorLinkLayoutToken[] {
  const fallback = createCreatorLinkLegacyLayoutOrder(linkIds);
  if (!Array.isArray(value)) return fallback;

  const allowedLinks = new Set(fallback.filter((token): token is `link:${string}` => token.startsWith("link:")));
  const normalized: CreatorLinkLayoutToken[] = [];
  const seen = new Set<string>();
  for (const valueToken of value) {
    const token = parseCreatorLinkLayoutToken(valueToken);
    if (!token || seen.has(token)) continue;
    const valid = token === "social" || token === "work" || allowedLinks.has(token);
    if (!valid) continue;
    seen.add(token);
    normalized.push(token as CreatorLinkLayoutToken);
  }
  for (const token of fallback) {
    if (!seen.has(token)) normalized.push(token);
  }
  return normalized;
}

export function areCreatorLinkLayoutOrdersEqual(
  left: readonly CreatorLinkLayoutToken[],
  right: readonly CreatorLinkLayoutToken[],
) {
  return left.length === right.length && left.every((token, index) => token === right[index]);
}

export function reorderVisibleCreatorLinkLayoutOrder(
  fullOrder: readonly CreatorLinkLayoutToken[],
  visibleOrder: readonly CreatorLinkLayoutToken[],
) {
  const visible = new Set(visibleOrder);
  let index = 0;
  return fullOrder.map((token) => visible.has(token) ? visibleOrder[index++] ?? token : token);
}
