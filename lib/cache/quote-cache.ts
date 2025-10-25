// lib/cache/quote-cache.ts
import { redis } from "@/lib/redis"

const QUOTE_CACHE_PREFIX = "quote:"
const QUOTE_CACHE_TTL = 300 // 5 minutes

interface QuoteCacheData {
  status: string
  first_opened_at: string | null
  open_count: number
  last_opened_at: string | null
}

/**
 * Get quote data from cache or database
 */
export async function getQuoteData(
  quoteId: string,
  fetchFromDb: () => Promise<QuoteCacheData | null>
): Promise<QuoteCacheData | null> {
  const cacheKey = `${QUOTE_CACHE_PREFIX}${quoteId}`
  
  try {
    // Try cache first
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached as string)
    }
    
    // Cache miss - fetch from database
    const quoteData = await fetchFromDb()
    
    if (quoteData) {
      // Cache the result for 5 minutes
      await redis.setex(cacheKey, QUOTE_CACHE_TTL, JSON.stringify(quoteData))
    }
    
    return quoteData
  } catch (err) {
    console.error("Cache error:", err)
    // On cache error, fall back to database
    return fetchFromDb()
  }
}

/**
 * Invalidate quote cache after update
 */
export async function invalidateQuoteCache(quoteId: string): Promise<void> {
  const cacheKey = `${QUOTE_CACHE_PREFIX}${quoteId}`
  
  try {
    await redis.del(cacheKey)
  } catch (err) {
    console.error("Cache invalidation error:", err)
    // Non-critical, continue
  }
}

/**
 * Update cached quote data
 */
export async function updateQuoteCache(
  quoteId: string,
  updates: Partial<QuoteCacheData>
): Promise<void> {
  const cacheKey = `${QUOTE_CACHE_PREFIX}${quoteId}`
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      const data = JSON.parse(cached as string)
      const updated = { ...data, ...updates }
      await redis.setex(cacheKey, QUOTE_CACHE_TTL, JSON.stringify(updated))
    }
  } catch (err) {
    console.error("Cache update error:", err)
    // Non-critical, continue
  }
}
