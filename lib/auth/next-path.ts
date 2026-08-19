export function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return null;

  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (
        next.startsWith("//") ||
        next.includes("\\") ||
        /[\u0000-\u001f\u007f]/.test(next)
      ) {
        return null;
      }
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }

  try {
    const base = new URL("https://trendre.invalid");
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin) return null;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}
