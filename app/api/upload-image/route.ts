import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    console.log("🔧 Server API called - upload-image")
    
    const formData = await req.formData()
    const file = formData.get("file") as File
    const modelId = formData.get("modelId") as string
    const tenantId = formData.get("tenantId") as string
    const userId = formData.get("userId") as string

    console.log("📋 Form data received:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      modelId,
      tenantId,
      userId
    })

    if (!file || !modelId || !tenantId || !userId) {
      console.error("❌ Missing required fields")
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 })
    }

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("🔑 Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      supabaseUrlLength: supabaseUrl?.length,
      serviceRoleKeyLength: serviceRoleKey?.length
    })

    if (!supabaseUrl) {
      console.error("❌ Missing Supabase URL")
      return NextResponse.json({ 
        success: false, 
        error: "Server configuration error: Missing Supabase URL" 
      }, { status: 500 })
    }

    let supabase
    if (serviceRoleKey) {
      console.log("🔑 Using service role client")
      // Use service role client to bypass RLS
      supabase = createClient(supabaseUrl, serviceRoleKey)
    } else {
      console.log("⚠️ Service role key not found, using regular server client")
      // Fallback to regular server client (may still have RLS issues)
      const { createClient: createServerClient } = await import("@/lib/supabase/server")
      supabase = await createServerClient()
    }
    
    // Generate file name and path
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const storagePath = `models/${modelId}/${fileName}`

    console.log("🚀 Server-side upload starting:", {
      fileName,
      storagePath,
      fileSize: file.size,
      modelId,
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

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from("aircraft_model_image")
      .insert({
        tenant_id: tenantId,
        aircraft_model_id: modelId,
        storage_path: storagePath,
        public_url: publicUrl,
        uploaded_by: userId,
        caption: null,
        is_primary: false,
        display_order: 0,
      })
      .select("*")
      .single()

    if (dbError) {
      console.error("Database insert error:", dbError)
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${dbError.message}` 
      }, { status: 500 })
    }

    console.log("✅ Server upload successful:", dbData)

    return NextResponse.json({ 
      success: true, 
      data: {
        id: dbData.id,
        url: publicUrl,
        storagePath: storagePath
      }
    })

  } catch (error: any) {
    console.error("Upload API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
