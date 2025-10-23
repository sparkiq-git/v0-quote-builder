// /lib/redis.ts
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// --- Lazy configuration to avoid build-time errors ---
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    
    if (!url || !token) {
      throw new Error("Missing KV_REST_API_URL / KV_REST_API_TOKEN");
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
}

// ✅ Lazy Redis client (used by both existing features & new rate limiting)
export { getRedisClient as redis };

// --- Existing exports (unchanged) ---
export const AIRPORTS_INDEX_KEY =
  process.env.AIRPORTS_INDEX_KEY || "airports:index";
export const AIRPORTS_INDEX_TMP_KEY = "airports:index:tmp";
export const AIRPORT_DOC = (id: string | number) => `airports:doc:${id}`;

export const sanitize = (s = "") =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const splitWords = (s?: string | null) => {
  const n = sanitize(s ?? "");
  return n ? Array.from(new Set(n.split(" ").filter(Boolean))) : [];
};

// --- 🔹 New: Rate limiting & idempotency utilities --- //

/**
 * Global rate limiters using lazy Redis client.
 * Adjust per-IP or per-token limits as needed.
 */
export const rlPerIp = new Ratelimit({
  redis: getRedisClient,
  limiter: Ratelimit.fixedWindow(20, "1 m"), // 20 req/min per IP
  analytics: true,
});

export const rlPerToken = new Ratelimit({
  redis: getRedisClient,
  limiter: Ratelimit.fixedWindow(10, "10 m"), // 10 req/10min per token
  analytics: true,
});

// Idempotency function moved to lib/idempotency.ts to avoid duplication
