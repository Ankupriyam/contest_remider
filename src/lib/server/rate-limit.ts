import { getEnv } from "./config";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(request: Request): Response | null {
  const env = getEnv();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + env.RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (bucket.count >= env.RATE_LIMIT_MAX) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  bucket.count += 1;
  return null;
}
