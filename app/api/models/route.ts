import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createActionLinkClient } from "@/lib/supabase/action-links"
import { z } from "zod"

/** 🔹 Define minimal schema validation (keeps API safe) */
const ModelSchema = z.object({
  manufacturer_id: z.string().nullable().optional(),
  name: z.string().min(2, "Name is required"),
  icao_type_designator: z.string().nullable().optional(),
  size_code: z.string().nullable().optional(),
})

/** 🔹 GET: List public aircraft models with tenant-specific images */
export async function GET() {
  try {
    // Use service role client to bypass RLS for public catalog access
    const supabase = await createActionLinkClient(true)
    
    // For public catalog, we don't require authentication
    // But we still need to get the current user's tenant_id for images if they're logged in
    const regularClient = await createClient()
    const {
      data: { user },
    } = await regularClient.auth.getUser()
    
    const tenantId = user?.app_metadata?.tenant_id

    // Test query to verify service role client can access data
    const { data: testData, error: testError } = await supabase
      .from("aircraft_model")
      .select("id, name")
      .limit(1)
    
    console.log('Service role test query:', { testData, testError })

    // First get all public aircraft models (using service role to bypass RLS)
    const { data: models, error: modelsError } = await supabase
      .from("aircraft_model")
      .select(`
        id, manufacturer_id, name, icao_type_designator, size_code, created_at,
        range_nm, mtow_kg, cruising_speed, capacity_pax, notes, created_by
      `)
      .order("name")

    if (modelsError) {
      console.error('Models query error:', modelsError)
      throw modelsError
    }

    console.log('Models query successful:', { modelsCount: models?.length, usingServiceRole: true })

    // Get manufacturer data for these models (using service role to bypass RLS)
    const { data: manufacturers, error: manufacturersError } = await supabase
      .from("aircraft_manufacturer")
      .select("id, name")

    if (manufacturersError) {
      console.error('Manufacturers query error:', manufacturersError)
      throw manufacturersError
    }

    console.log('Manufacturers query successful:', { manufacturersCount: manufacturers?.length })

    // Then get tenant-specific images for these models (if user is logged in)
    let images = []
    if (tenantId) {
      const { data: imagesData, error: imagesError } = await supabase
        .from("aircraft_model_image")
        .select("id, aircraft_model_id, public_url, is_primary, display_order")
        .eq("tenant_id", tenantId)

      if (imagesError) {
        console.error('Images query error:', imagesError)
        throw imagesError
      }

      images = imagesData || []
      console.log('Images query successful:', { imagesCount: images.length })
    } else {
      console.log('No tenant ID, skipping images query')
    }

    // Combine the data
    const data = models?.map(model => ({
      ...model,
      aircraft_manufacturer: manufacturers?.find(m => m.id === model.manufacturer_id) || null,
      aircraft_model_image: images?.filter(img => img.aircraft_model_id === model.id) || []
    })) || []

    console.log('Models API response:', { 
      modelsCount: models?.length || 0, 
      manufacturersCount: manufacturers?.length || 0,
      imagesCount: images?.length || 0,
      combinedDataCount: data.length,
      hasTenantId: !!tenantId,
      firstModel: models?.[0],
      firstManufacturer: manufacturers?.[0]
    })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] GET /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 POST: Create a new public model (requires authentication) */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ModelSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("aircraft_model")
      .insert({
        manufacturer_id: parsed.manufacturer_id,
        name: parsed.name,
        icao_type_designator: parsed.icao_type_designator,
        size_code: parsed.size_code,
        created_by: user.id,
      })
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] POST /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 PATCH: Update a public model by ID (requires authentication, only by creator) */
export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ success: false, error: "Missing model ID" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("aircraft_model")
      .update(updates)
      .eq("id", id)
      .eq("created_by", user.id)
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] PATCH /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 DELETE: Delete a public model by ID (requires authentication, only by creator) */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ success: false, error: "Missing model ID" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { error } = await supabase
      .from("aircraft_model")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id)

    if (error) throw error
    return NextResponse.json({ success: true, message: "Model deleted" })
  } catch (err: any) {
    console.error("[API] DELETE /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
