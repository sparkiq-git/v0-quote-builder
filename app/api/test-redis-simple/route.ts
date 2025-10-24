import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    console.log("🧪 Testing Redis connection...")
    
    // Test basic Redis operations
    const testKey = `test:${Date.now()}`
    const testValue = "Hello Redis!"
    
    // Set a test value
    const setResult = await redis().set(testKey, testValue, { ex: 60 })
    console.log("✅ Redis SET result:", setResult)
    
    // Get the test value
    const getResult = await redis().get(testKey)
    console.log("✅ Redis GET result:", getResult)
    
    // Test rate limiting
    const rateLimitResult = await redis().eval(`
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      
      local current = redis.call('GET', key)
      if current == false then
        redis.call('SET', key, 1)
        redis.call('EXPIRE', key, window)
        return {1, window}
      end
      
      local count = tonumber(current)
      if count >= limit then
        return {0, redis.call('TTL', key)}
      end
      
      redis.call('INCR', key)
      return {count + 1, redis.call('TTL', key)}
    `, {
      keys: [`test:rate:${Date.now()}`],
      arguments: ['5', '60']
    })
    
    console.log("✅ Redis EVAL result:", rateLimitResult)
    
    // Clean up test key
    await redis().del(testKey)
    
    return NextResponse.json({
      success: true,
      message: "Redis is working!",
      results: {
        set: setResult,
        get: getResult,
        rateLimit: rateLimitResult
      }
    })
  } catch (error: any) {
    console.error("❌ Redis test failed:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
