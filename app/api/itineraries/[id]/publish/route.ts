import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })
    }

    const { id } = params

    // Fetch itinerary with contact and passengers
    const { data: itinerary, error: itineraryError } = await supabase
      .from("itinerary")
      .select(
        `
        id,
        title,
        trip_summary,
        tenant_id,
        contact:contact_id (
          id,
          full_name,
          email
        )
      `
      )
      .eq("id", id)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 })
    }

    // Verify tenant access
    if (itinerary.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Fetch passengers for this itinerary
    const { data: passengerAssignments, error: passengersError } = await supabase
      .from("itinerary_passenger")
      .select(
        `
        passenger:passenger_id (
          id,
          full_name,
          email
        )
      `
      )
      .eq("itinerary_id", id)

    if (passengersError) {
      console.error("Error fetching passengers:", passengersError)
      return NextResponse.json({ error: "Failed to fetch passengers" }, { status: 500 })
    }

    // Collect all recipients: contact + passengers
    const recipients: Array<{ email: string; name: string }> = []

    // Add contact if exists
    if (itinerary.contact?.email) {
      recipients.push({
        email: itinerary.contact.email,
        name: itinerary.contact.full_name || "Contact",
      })
    }

    // Add passengers
    const passengerEmails = new Set<string>()
    if (passengerAssignments) {
      for (const assignment of passengerAssignments) {
        const passenger = assignment.passenger
        if (passenger?.email && !passengerEmails.has(passenger.email.toLowerCase())) {
          passengerEmails.add(passenger.email.toLowerCase())
          recipients.push({
            email: passenger.email,
            name: passenger.full_name || "Passenger",
          })
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients found. Please ensure the itinerary has a contact and/or passengers." },
        { status: 400 }
      )
    }

    // Call edge function for each recipient
    const results = []
    const errors = []

    for (const recipient of recipients) {
      try {
        const payload = {
          tenant_id: tenantId,
          email: recipient.email,
          action_type: "view_itinerary",
          metadata: {
            itinerary_id: id,
            title: itinerary.title || itinerary.trip_summary || "Itinerary",
          },
          created_by: user.id,
        }

        const { data: edgeData, error: edgeError } = await supabase.functions.invoke("create-action-link", {
          body: payload,
        })

        if (edgeError) {
          console.error(`Error creating link for ${recipient.email}:`, edgeError)
          errors.push({ email: recipient.email, error: edgeError.message })
        } else {
          results.push({ email: recipient.email, link_id: edgeData?.id })
        }
      } catch (err: any) {
        console.error(`Exception creating link for ${recipient.email}:`, err)
        errors.push({ email: recipient.email, error: err.message })
      }
    }

    // Audit log
    try {
      await supabase.from("audit_log").insert({
        tenant_id: tenantId,
        actor_user_id: user.id,
        action: "itinerary.publish",
        target_id: id,
        details: {
          recipients_count: recipients.length,
          successful: results.length,
          failed: errors.length,
        },
        ip: request.headers.get("x-forwarded-for") || "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
      })
    } catch (auditErr) {
      console.error("Audit log error:", auditErr)
      // Non-critical, continue
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(
        {
          error: "Failed to publish itinerary",
          details: errors,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      published: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Publish itinerary error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

