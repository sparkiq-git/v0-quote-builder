import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID
    console.log("[v0] Fetching passengers for tenant:", tenantId)

    let query = supabase
      .from("contact_passenger")
      .select(`
        *,
        contact:contact_id!inner (
          id,
          full_name,
          email,
          phone,
          company,
          tenant_id
        )
      `)
      .eq("contact.tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data, error } = await query

    console.log("[v0] Passengers query result:", { data, error, count: data?.length })

    if (error) {
      console.error("Error fetching passengers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in GET /api/passengers:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID

    const { data: contact, error: contactError } = await supabase
      .from("contact")
      .select("id")
      .eq("id", body.contact_id)
      .eq("tenant_id", tenantId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ error: "Contact not found or unauthorized" }, { status: 404 })
    }

    const { data, error } = await supabase.from("contact_passenger").insert(body).select().single()

    if (error) {
      console.error("Error creating passenger:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in POST /api/passengers:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
