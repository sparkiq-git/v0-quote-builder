import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 Testing imports step by step...")
    
    // Test 1: Basic response
    console.log("Step 1: Basic response")
    
    // Test 2: Zod import
    try {
      const { z } = await import("zod")
      console.log("✅ Zod import works")
    } catch (err) {
      console.error("❌ Zod import failed:", err)
      return NextResponse.json({ error: "Zod import failed", details: err }, { status: 500 })
    }
    
    // Test 3: Token security import
    try {
      const { sha256Base64url } = await import("@/lib/security/token")
      const hash = sha256Base64url("test")
      console.log("✅ Token security import works:", hash.substring(0, 10) + "...")
    } catch (err) {
      console.error("❌ Token security import failed:", err)
      return NextResponse.json({ error: "Token security import failed", details: err }, { status: 500 })
    }
    
    // Test 4: Supabase action links import
    try {
      const { createActionLinkClient } = await import("@/lib/supabase/action-links")
      console.log("✅ Supabase action links import works")
    } catch (err) {
      console.error("❌ Supabase action links import failed:", err)
      return NextResponse.json({ error: "Supabase action links import failed", details: err }, { status: 500 })
    }
    
    // Test 5: Redis import
    try {
      const { rlPerIp, rlPerToken } = await import("@/lib/redis")
      console.log("✅ Redis import works")
    } catch (err) {
      console.error("❌ Redis import failed:", err)
      return NextResponse.json({ error: "Redis import failed", details: err }, { status: 500 })
    }
    
    // Test 6: Turnstile import
    try {
      const { verifyTurnstile } = await import("@/lib/supabase/turnstile")
      console.log("✅ Turnstile import works")
    } catch (err) {
      console.error("❌ Turnstile import failed:", err)
      return NextResponse.json({ error: "Turnstile import failed", details: err }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "All imports successful" 
    })
    
  } catch (err: any) {
    console.error("❌ Import test error:", err)
    return NextResponse.json({ 
      error: "Import test failed", 
      details: err.message,
      stack: err.stack 
    }, { status: 500 })
  }
}
