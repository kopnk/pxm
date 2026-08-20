import type { H3Event } from "h3";
import { createError } from "h3";
import { resolveClientIp } from "~/server/utils/accessContext";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;
let nextCleanupAt = 0;

function cleanupBuckets(now: number) {
  if (now < nextCleanupAt && buckets.size < MAX_BUCKETS) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey === undefined) break;
    buckets.delete(oldestKey);
  }

  nextCleanupAt = now + CLEANUP_INTERVAL_MS;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  cleanupBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function assertRateLimit(
  event: H3Event,
  scope: string,
  options: RateLimitOptions,
): void {
  const ip = resolveClientIp(event);
  const result = checkRateLimit(`${scope}:${ip}`, options);

  if (!result.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Too many requests. Try again in ${result.retryAfterSec}s`,
    });
  }
}
