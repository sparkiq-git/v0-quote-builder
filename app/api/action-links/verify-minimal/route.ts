import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    console.log("🧪 Minimal verify route started")
    
    // Test 1: Basic request parsing
    const body = await req.json()
    console.log("✅ JSON parsing works")
    
    // Test 2: Basic validation
    const { token, email, captchaToken } = body
    if (!token || !email || !captchaToken) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 })
    }
    console.log("✅ Basic validation passed")
    
    // Test 3: Try imports one by one
    console.log("Testing imports...")
    
    try {
      const { sha256Base64url } = await import("@/lib/security/token")
      const hash = sha256Base64url(token)
      console.log("✅ Token hashing works:", hash.substring(0, 10) + "...")
    } catch (err) {
      console.error("❌ Token hashing failed:", err)
      return NextResponse.json({ ok: false, error: "Token hashing failed" }, { status: 500 })
    }
    
    try {
      const { createActionLinkClient } = await import("@/lib/supabase/action-links")
      const supabase = await createActionLinkClient(true)
      console.log("✅ Supabase client created")
    } catch (err) {
      console.error("❌ Supabase client failed:", err)
      return NextResponse.json({ ok: false, error: "Supabase client failed" }, { status: 500 })
    }
    
    try {
      const { rlPerIp } = await import("@/lib/redis")
      const ipRes = await rlPerIp.limit("test:minimal:verify")
      console.log("✅ Redis rate limiting works:", ipRes)
    } catch (err) {
      console.error("❌ Redis rate limiting failed:", err)
      return NextResponse.json({ ok: false, error: "Redis rate limiting failed" }, { status: 500 })
    }
    
    try {
      const { verifyTurnstile } = await import("@/lib/supabase/turnstile")
      await verifyTurnstile(captchaToken)
      console.log("✅ CAPTCHA verification works")
    } catch (err) {
      console.error("❌ CAPTCHA verification failed:", err)
      return NextResponse.json({ ok: false, error: "CAPTCHA verification failed" }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "All components working",
      receivedData: { token: token.substring(0, 10) + "...", email, captchaToken: captchaToken.substring(0, 10) + "..." }
    })
    
  } catch (err: any) {
    console.error("❌ Minimal verify error:", err)
    return NextResponse.json({ 
      error: "Minimal verify failed", 
      details: err.message,
      stack: err.stack 
    }, { status: 500 })
  }
}
