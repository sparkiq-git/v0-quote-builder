import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const aircraftId = formData.get("aircraftId") as string
    const tenantId = formData.get("tenantId") as string
    const userId = formData.get("userId") as string

    if (!file || !aircraftId || !tenantId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: file, aircraftId, tenantId, userId" 
      }, { status: 400 })
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ Missing Supabase credentials")
      return NextResponse.json({ 
        success: false, 
        error: "Server configuration error" 
      }, { status: 500 })
    }

    let supabase
    if (serviceRoleKey) {
      console.log("🔑 Using service role client for aircraft image upload")
      // Use service role client to bypass RLS
      supabase = createClient(supabaseUrl, serviceRoleKey)
    } else {
      console.log("⚠️ Service role key not found, using regular server client")
      // Fallback to regular server client (may still have RLS issues)
      const { createClient: createServerClient } = await import("@/lib/supabase/server")
      supabase = await createServerClient()
    }
    
    // Generate file name and path that matches the database constraint
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const storagePath = `tenant/${tenantId}/aircraft/${aircraftId}/${fileName}`

    console.log("🚀 Server-side aircraft image upload starting:", {
      fileName,
      storagePath,
      fileSize: file.size,
      aircraftId,
      tenantId
    })

    // Upload to storage using server-side client (bypasses RLS)
    console.log("📤 Uploading to Supabase storage...")
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("aircraft-media")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      })

    if (uploadError) {
      console.error("❌ Server upload error:", uploadError)
      return NextResponse.json({ 
        success: false, 
        error: `Upload failed: ${uploadError.message}` 
      }, { status: 500 })
    }

    console.log("✅ Storage upload successful:", uploadData)

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("aircraft-media")
      .getPublicUrl(storagePath)
    
    const publicUrl = publicData.publicUrl

    // Save to database using service role client (bypasses RLS)
    const { data: dbData, error: dbError } = await supabase
      .from("aircraft_image")
      .insert({
        aircraft_id: aircraftId,
        tenant_id: tenantId,
        storage_path: storagePath,
        public_url: publicUrl,
        is_primary: false, // Will be set by the client
        display_order: 0, // Will be set by the client
      })
      .select()
      .single()

    if (dbError) {
      console.error("❌ Database insert error:", dbError)
      return NextResponse.json({ 
        success: false, 
        error: `Database insert failed: ${dbError.message}` 
      }, { status: 500 })
    }

    console.log("✅ Database insert successful:", dbData)

    return NextResponse.json({ 
      success: true, 
      data: {
        id: dbData.id,
        url: publicUrl,
        storagePath: storagePath
      }
    })

  } catch (error: any) {
    console.error("❌ Aircraft image upload error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Upload failed" 
    }, { status: 500 })
  }
}
