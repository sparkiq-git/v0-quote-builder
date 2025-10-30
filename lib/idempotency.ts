// lib/idempotency.ts
import { redis } from "./redis"

export async function ensureIdempotency(key: string, ttlSeconds = 60) {
  // returns true if we set it, false if it already existed (duplicate)
  const redisClient = redis() // Call the lazy function
  const result = await redisClient.set(`idem:${key}`, "1", { nx: true, ex: ttlSeconds })
  return result === "OK"
}
