import { createHash } from "node:crypto";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

function requestFingerprint(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return createHash("sha256").update(`${scope}:${address}`, "utf8").digest("hex");
}

export function allowQuoteAccessRequest(args: {
  request: Request;
  scope: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const key = requestFingerprint(args.request, args.scope);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value as string);
    }
    buckets.set(key, { count: 1, resetAt: now + args.windowMs });
    return true;
  }

  if (current.count >= args.limit) return false;
  current.count += 1;
  return true;
}
