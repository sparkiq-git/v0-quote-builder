import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const ManufacturerSchema = z.object({
  name: z.string().min(2, "Name is required"),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("aircraft_manufacturer")
      .select("id, name")
      .order("name", { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (err: any) {
    console.error("[API] GET /manufacturers error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load manufacturers" },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ManufacturerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("aircraft_manufacturer")
      .insert({
        name: parsed.data.name.trim(),
        created_by: user.id,
      })
      .select("id, name")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: false, error: "Manufacturer already exists" }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] POST /manufacturers error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create manufacturer" },
      { status: 500 },
    )
  }
}
