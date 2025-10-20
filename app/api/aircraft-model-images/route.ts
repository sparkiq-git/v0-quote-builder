import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const ImageUploadSchema = z.object({
  modelId: z.string(),
  storagePath: z.string(),
  publicUrl: z.string(),
  caption: z.string().nullable().optional(),
  isPrimary: z.boolean().optional().default(false),
  displayOrder: z.number().optional().default(0),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { modelId, storagePath, publicUrl, caption, isPrimary, displayOrder } = ImageUploadSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Missing tenant ID" }, { status: 400 })
    }

    // Verify the model exists and user has access to it
    const { data: modelData, error: modelError } = await supabase
      .from("aircraft_model")
      .select("id")
      .eq("id", modelId)
      .eq("tenant_id", tenantId)
      .single()

    if (modelError || !modelData) {
      return NextResponse.json({ success: false, error: "Aircraft model not found or access denied" }, { status: 404 })
    }

    // Insert the image record
    const { data, error } = await supabase
      .from("aircraft_model_image")
      .insert({
        tenant_id: tenantId,
        aircraft_model_id: modelId,
        storage_path: storagePath,
        public_url: publicUrl,
        uploaded_by: user.id,
        caption: caption || null,
        is_primary: isPrimary || false,
        display_order: displayOrder || 0,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Database insert error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] POST /aircraft-model-images error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
