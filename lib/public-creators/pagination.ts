export const DEFAULT_LIMIT = 24;
export const MAX_LIMIT = 50;

export type PublicCreatorPagination = {
  limit: number;
  offset: number;
};

function parseInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parsePublicCreatorPagination(searchParams: URLSearchParams) {
  const rawLimit = parseInteger(searchParams.get("limit"));
  const rawOffset = parseInteger(searchParams.get("offset"));

  return {
    limit: rawLimit === null ? DEFAULT_LIMIT : Math.min(Math.max(rawLimit, 1), MAX_LIMIT),
    offset: rawOffset === null ? 0 : Math.max(rawOffset, 0),
  };
}
