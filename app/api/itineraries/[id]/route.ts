import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    const { data, error } = await supabase
      .from("itinerary")
      .select(`
        *,
        contact:contact_id (
          id,
          full_name,
          email,
          phone,
          company
        ),
        quote:quote_id (
          id,
          title,
          contact_name,
          contact_email,
          contact_company
        ),
        invoice:invoice_id (
          id,
          number,
          status,
          amount,
          currency
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Itinerary not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch itinerary details
    const { data: details, error: detailsError } = await supabase
      .from("itinerary_detail")
      .select("*")
      .eq("itinerary_id", id)
      .order("seq", { ascending: true })

    if (detailsError) {
      console.error("Error fetching itinerary details:", detailsError)
    }

    return NextResponse.json({
      data: {
        ...data,
        details: details || [],
      },
    })
  } catch (error: any) {
    console.error("Get itinerary error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    // Validate status change if trying to set to trip_confirmed
    if (body.status === "trip_confirmed") {
      // Check if invoice is paid
      const { data: itinerary } = await supabase
        .from("itinerary")
        .select("invoice_id, invoice:invoice_id(status)")
        .eq("id", id)
        .single()

      if (itinerary?.invoice && (itinerary.invoice as any).status !== "paid") {
        return NextResponse.json({ error: "Invoice must be paid before confirming trip" }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from("itinerary")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating itinerary:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Update itinerary error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
