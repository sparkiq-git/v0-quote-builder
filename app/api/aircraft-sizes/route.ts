import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

export const dynamic = 'force-dynamic'

const AircraftSizeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  display_name: z.string().min(1, "Display name is required"),
  description: z.string().optional().nullable(),
  aircraft_pref: z.string().optional().nullable(),
  size: z.number().int().positive().optional().nullable(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("aircraft_size")
      .select("code, display_name, description, aircraft_pref, size")
      .order("size", { ascending: true, nullsLast: true })
      .order("display_name", { ascending: true })

    if (error) {
      console.error("Error fetching aircraft sizes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error("Aircraft sizes API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = AircraftSizeSchema.parse(body)

    // Check for duplicate code
    const { data: existing } = await supabase
      .from("aircraft_size")
      .select("code")
      .eq("code", parsed.code)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: "An aircraft size with this code already exists" },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from("aircraft_size")
      .insert({
        code: parsed.code,
        display_name: parsed.display_name,
        description: parsed.description || null,
        aircraft_pref: parsed.aircraft_pref || null,
        size: parsed.size || null,
      })
      .select("code, display_name, description, aircraft_pref, size")
      .single()

    if (error) {
      console.error("Error creating aircraft size:", error)
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
    console.error("Create aircraft size error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

