import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

/** ✅ Zod validation for inserts/updates */
const ImageSchema = z.object({
  aircraft_model_id: z.string(),
  storage_path: z.string(),
  public_url: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  is_primary: z.boolean().optional(),
  display_order: z.number().optional().default(0),
})

/** 🔹 GET: List all images for a model */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const modelId = searchParams.get("modelId")

    if (!modelId)
      return NextResponse.json({ success: false, error: "Missing modelId" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId)
      return NextResponse.json({ success: false, error: "Missing tenant ID" }, { status: 400 })

    const { data, error } = await supabase
      .from("aircraft_model_image")
      .select("*")
      .eq("aircraft_model_id", modelId)
      .eq("tenant_id", tenantId)
      .order("is_primary", { ascending: false })
      .order("display_order")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] GET /model-images error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 POST: Insert a new image */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ImageSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId)
      return NextResponse.json({ success: false, error: "Missing tenant ID" }, { status: 400 })

    const { data, error } = await supabase
      .from("aircraft_model_image")
      .insert({
        tenant_id: tenantId,
        aircraft_model_id: parsed.aircraft_model_id,
        storage_path: parsed.storage_path,
        public_url: parsed.public_url,
        caption: parsed.caption,
        is_primary: parsed.is_primary ?? false,
        display_order: parsed.display_order ?? 0,
        uploaded_by: user.id,
      })
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] POST /model-images error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 PATCH: Update caption / primary / order */
export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ success: false, error: "Missing image ID" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId)
      return NextResponse.json({ success: false, error: "Missing tenant ID" }, { status: 400 })

    const { data, error } = await supabase
      .from("aircraft_model_image")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] PATCH /model-images error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 DELETE: Remove image */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ success: false, error: "Missing image ID" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId)
      return NextResponse.json({ success: false, error: "Missing tenant ID" }, { status: 400 })

    const { error } = await supabase
      .from("aircraft_model_image")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)

    if (error) throw error
    return NextResponse.json({ success: true, message: "Image deleted" })
  } catch (err: any) {
    console.error("[API] DELETE /model-images error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
