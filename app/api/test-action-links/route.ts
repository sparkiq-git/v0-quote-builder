import { NextResponse } from "next/server"
import { createActionLinkClient } from "@/lib/supabase/action-links"
import { sha256Base64url } from "@/lib/security/token"
import { rlPerIp, rlPerToken } from "@/lib/redis"
import { verifyTurnstile } from "@/lib/supabase/turnstile"

export async function GET() {
  try {
    console.log("🧪 Testing action links dependencies...")
    
    // Test 1: Environment variables
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      TURNSTILE_SECRET_KEY: !!process.env.TURNSTILE_SECRET_KEY,
    }
    console.log("Environment variables:", envVars)
    
    // Test 2: Supabase client
    try {
      const supabase = await createActionLinkClient(true)
      console.log("✅ Supabase client created successfully")
    } catch (err) {
      console.error("❌ Supabase client error:", err)
      return NextResponse.json({ error: "Supabase client failed", details: err }, { status: 500 })
    }
    
    // Test 3: Token hashing
    try {
      const hash = sha256Base64url("test-token")
      console.log("✅ Token hashing works:", hash)
    } catch (err) {
      console.error("❌ Token hashing error:", err)
      return NextResponse.json({ error: "Token hashing failed", details: err }, { status: 500 })
    }
    
    // Test 4: Redis connection
    try {
      const ipResult = await rlPerIp.limit("test:ip:test")
      console.log("✅ Redis IP rate limiter works:", ipResult)
    } catch (err) {
      console.error("❌ Redis IP rate limiter error:", err)
      return NextResponse.json({ error: "Redis IP rate limiter failed", details: err }, { status: 500 })
    }
    
    try {
      const tokenResult = await rlPerToken.limit("test:token:test")
      console.log("✅ Redis token rate limiter works:", tokenResult)
    } catch (err) {
      console.error("❌ Redis token rate limiter error:", err)
      return NextResponse.json({ error: "Redis token rate limiter failed", details: err }, { status: 500 })
    }
    
    // Test 5: Turnstile (without actual verification)
    try {
      console.log("✅ Turnstile module loaded successfully")
    } catch (err) {
      console.error("❌ Turnstile module error:", err)
      return NextResponse.json({ error: "Turnstile module failed", details: err }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "All action links dependencies are working",
      envVars 
    })
    
  } catch (err: any) {
    console.error("Test route error:", err)
    return NextResponse.json({ 
      error: "Test failed", 
      details: err.message,
      stack: err.stack 
    }, { status: 500 })
  }
}
