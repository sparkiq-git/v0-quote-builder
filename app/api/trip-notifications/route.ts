import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    console.log("🔔 trip_notifications API route called")
    const body = await req.json()
    console.log("🔔 Request body:", JSON.stringify(body, null, 2))
    const { tenant_id, email, action_type, metadata } = body

    // Validate required fields
    if (!tenant_id || !email || !action_type) {
      console.error("❌ Missing required fields:", { tenant_id: !!tenant_id, email: !!email, action_type: !!action_type })
      return NextResponse.json(
        { error: "Missing required fields: tenant_id, email, action_type" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const payload = {
      tenant_id,
      email,
      action_type,
      metadata: metadata || {},
    }
    console.log("🔔 Calling edge function 'trip_notifications' with payload:", JSON.stringify(payload, null, 2))

    const { data, error } = await supabase.functions.invoke("trip_notifications", {
      body: payload,
    })

    console.log("🔔 Edge function response:", { data, error })
    console.log("🔔 Error type:", error?.constructor?.name)
    console.log("🔔 Error details:", error ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : null)

    // Check if data has error (edge function returned error in response body)
    if (data && typeof data === 'object') {
      // Check for {ok: false, error: "..."} pattern
      if ('ok' in data && !data.ok && data.error) {
        console.error("❌ trip_notifications edge function returned ok: false with error:", data.error)
        const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        return NextResponse.json(
          { error: errorMessage, details: data },
          { status: 400 }
        )
      }
      
      // Check for {error: "..."} pattern
      if ('error' in data && data.error) {
        console.error("❌ trip_notifications edge function returned error in data:", data.error)
        const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        return NextResponse.json(
          { error: errorMessage, details: data },
          { status: 400 }
        )
      }
    }

    // If SDK returned an error object, extract message
    if (error) {
      console.error("❌ trip_notifications edge function SDK error:", error)
      // The error from Supabase SDK might contain the response body
      const errorMessage = error.message || 
                         (error as any)?.message ||
                         error.toString() || 
                         "Edge Function returned an error"
      return NextResponse.json(
        { error: errorMessage, details: { error, data } },
        { status: 400 }
      )
    }

    console.log("✅ trip_notifications edge function called successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("❌ Failed to call trip_notifications edge function:", error)
    console.error("❌ Error stack:", error?.stack)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
