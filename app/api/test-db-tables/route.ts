import { NextResponse } from "next/server"
import { createActionLinkClient } from "@/lib/supabase/action-links"

export async function GET() {
  try {
    console.log("🧪 Testing database tables...")
    
    const supabase = await createActionLinkClient(true)
    console.log("✅ Supabase client created")
    
    // Test 1: Check if action_link table exists
    try {
      const { data, error } = await supabase
        .from("action_link")
        .select("id")
        .limit(1)
      
      if (error) {
        console.error("❌ action_link table error:", error)
        return NextResponse.json({ 
          error: "action_link table issue", 
          details: error.message 
        }, { status: 500 })
      }
      console.log("✅ action_link table accessible")
    } catch (err) {
      console.error("❌ action_link table test failed:", err)
      return NextResponse.json({ 
        error: "action_link table test failed", 
        details: err 
      }, { status: 500 })
    }
    
    // Test 2: Check if action_link_audit_log table exists
    try {
      const { data, error } = await supabase
        .from("action_link_audit_log")
        .select("id")
        .limit(1)
      
      if (error) {
        console.error("❌ action_link_audit_log table error:", error)
        return NextResponse.json({ 
          error: "action_link_audit_log table issue", 
          details: error.message 
        }, { status: 500 })
      }
      console.log("✅ action_link_audit_log table accessible")
    } catch (err) {
      console.error("❌ action_link_audit_log table test failed:", err)
      return NextResponse.json({ 
        error: "action_link_audit_log table test failed", 
        details: err 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "All database tables are accessible" 
    })
    
  } catch (err: any) {
    console.error("❌ Database test error:", err)
    return NextResponse.json({ 
      error: "Database test failed", 
      details: err.message,
      stack: err.stack 
    }, { status: 500 })
  }
}
