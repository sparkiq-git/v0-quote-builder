import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 Testing connections...")
    
    // Test 1: Environment variables
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      TURNSTILE_SECRET_KEY: !!process.env.TURNSTILE_SECRET_KEY,
    }
    console.log("Environment variables:", envVars)
    
    // Test 2: Supabase client creation
    try {
      const { createActionLinkClient } = await import("@/lib/supabase/action-links")
      const supabase = await createActionLinkClient(true)
      console.log("✅ Supabase client created successfully")
    } catch (err) {
      console.error("❌ Supabase client creation failed:", err)
      return NextResponse.json({ error: "Supabase client creation failed", details: err }, { status: 500 })
    }
    
    // Test 3: Redis connection
    try {
      const { rlPerIp } = await import("@/lib/redis")
      const result = await rlPerIp.limit("test:connection")
      console.log("✅ Redis connection works:", result)
    } catch (err) {
      console.error("❌ Redis connection failed:", err)
      return NextResponse.json({ error: "Redis connection failed", details: err }, { status: 500 })
    }
    
    // Test 4: Turnstile (without actual verification)
    try {
      const { verifyTurnstile } = await import("@/lib/supabase/turnstile")
      console.log("✅ Turnstile module loaded")
    } catch (err) {
      console.error("❌ Turnstile module failed:", err)
      return NextResponse.json({ error: "Turnstile module failed", details: err }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "All connections successful",
      envVars 
    })
    
  } catch (err: any) {
    console.error("❌ Connection test error:", err)
    return NextResponse.json({ 
      error: "Connection test failed", 
      details: err.message,
      stack: err.stack 
    }, { status: 500 })
  }
}
