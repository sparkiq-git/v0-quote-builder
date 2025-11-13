import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenantId } from "@/lib/supabase/member-helpers"
import { z } from "zod"

export const dynamic = 'force-dynamic'

const OperatorSchema = z.object({
  name: z.string().min(1, "Operator name is required"),
  icao_code: z.string().optional().nullable(),
  iata_code: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getCurrentTenantId()
    if (!tenantId) return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })

    const { data, error } = await supabase
      .from("operator")
      .select("id, name, icao_code, iata_code")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching operators:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error("Operators API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getCurrentTenantId()
    if (!tenantId) return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })

    const body = await req.json()
    const parsed = OperatorSchema.parse(body)

    // Check for duplicate name within tenant
    const { data: existing } = await supabase
      .from("operator")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", parsed.name)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: "An operator with this name already exists" },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from("operator")
      .insert({
        tenant_id: tenantId,
        name: parsed.name,
        icao_code: parsed.icao_code || null,
        iata_code: parsed.iata_code || null,
      })
      .select("id, name, icao_code, iata_code")
      .single()

    if (error) {
      console.error("Error creating operator:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Create operator error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

