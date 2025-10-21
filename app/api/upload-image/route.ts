import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const modelId = formData.get("modelId") as string
    const tenantId = formData.get("tenantId") as string
    const userId = formData.get("userId") as string

    if (!file || !modelId || !tenantId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Generate file name and path
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const storagePath = `models/${modelId}/${fileName}`

    console.log("Server-side upload:", {
      fileName,
      storagePath,
      fileSize: file.size,
      modelId,
      tenantId
    })

    // Upload to storage using server-side client (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("aircraft-media")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      })

    if (uploadError) {
      console.error("Server upload error:", uploadError)
      return NextResponse.json({ 
        success: false, 
        error: `Upload failed: ${uploadError.message}` 
      }, { status: 500 })
    }

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
