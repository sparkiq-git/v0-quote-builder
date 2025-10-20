import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { modelId, storagePath, publicUrl, tenantId } = body

    if (!modelId || !storagePath || !publicUrl || !tenantId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: modelId, storagePath, publicUrl, tenantId" 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Insert the image record using server-side client
    const { data, error } = await supabase
      .from("aircraft_model_image")
      .insert({
        tenant_id: tenantId,
        aircraft_model_id: modelId,
        storage_path: storagePath,
        public_url: publicUrl,
        uploaded_by: null, // We'll set this to null to avoid auth issues
        caption: null,
        is_primary: false,
        display_order: 0,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Database insert error:", error)
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${error.message}`,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] POST /aircraft-model-images error:", err)
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 })
  }
}