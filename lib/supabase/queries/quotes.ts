"use client"

import { createClient } from "@/lib/supabase/client"

/* =========================================================
   HELPERS
========================================================= */
const isUUID = (v?: string | null) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || "")

function req<T>(v: T | null | undefined, msg: string): T {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
    throw new Error(msg)
  }
  return v as T
}

/* =========================================================
   CREATE
========================================================= */
export async function createQuote(tenantId?: string) {
  const supabase = createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const user = userData?.user
  if (!user) throw new Error("User not authenticated")

  const tenant_id = tenantId || process.env.NEXT_PUBLIC_TENANT_ID
  if (!tenant_id) throw new Error("Missing tenant_id (argument or env var)")

  const validUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("quote")
    .insert([
      {
        tenant_id,
        created_by_user_id: user.id,
        contact_name: "Pending Contact",
        contact_email: "pending@example.com",
        valid_until: validUntil,
        title: "New Quote",
        status: "draft",
        magic_link_slug: crypto.randomUUID(),
        currency: "USD",
        trip_type: "one-way",
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("❌ Error creating new quote:", error)
    throw error
  }

  return { ...data, legs: [] }
}

/* =========================================================
   READ (GET SINGLE)
========================================================= */
export async function getQuoteById(id: string) {
  if (!id) throw new Error("Missing quote id")
  const supabase = createClient()

  const { data: quote, error: quoteError } = await supabase
    .from("quote")
    .select("*")
    .eq("id", id)
    .single()
  if (quoteError) throw quoteError

  const [{ data: legs }, { data: servicesDb }, { data: options }] = await Promise.all([
    supabase.from("quote_detail").select("*").eq("quote_id", id).order("seq", { ascending: true }),
    supabase.from("quote_item").select("*").eq("quote_id", id).order("created_at", { ascending: true }),
    supabase.from("quote_option").select("*").eq("quote_id", id).order("label", { ascending: true }),
  ])

  // 🛩️ Fetch aircraft data for the options
  const aircraftIds = (options || []).map(opt => opt.aircraft_id).filter(Boolean)
  let aircraftData = []
  
  if (aircraftIds.length > 0) {
    const { data: aircraft, error: aircraftError } = await supabase
      .from("aircraft")
      .select(`
        *,
        aircraft_model!model_id (
          id,
          name,
          manufacturer_id,
          size_code,
          aircraft_manufacturer!manufacturer_id (
            id,
            name
          ),
          aircraft_model_image (
            id,
            public_url,
            is_primary,
            display_order
          )
        ),
        aircraft_image (
          id,
          public_url,
          is_primary,
          display_order
        ),
        operator!operator_id (
          id,
          name,
          icao_code,
          iata_code
        ),
        aircraft_amenity (
          id,
          amenity_id,
          amenity (
            id,
            code,
            name,
            description,
            category,
            icon_type,
            icon_ref
          )
        )
      `)
      .in("id", aircraftIds)
    
    if (aircraftError) {
      console.error("Aircraft fetch error:", aircraftError)
    } else {
      aircraftData = aircraft || []
    }
  }

  const services = (servicesDb || []).map((s: any) => ({
    ...s,
    amount: s.amount ?? s.unit_price ?? 0,
    qty: s.qty ?? 1,
    taxable: s.taxable ?? true,
  }))

  // 🛩️ Transform options with aircraft data
  const enrichedOptions = (options || []).map((option: any) => {
    const aircraft = aircraftData.find(a => a.id === option.aircraft_id)
    const aircraftModel = aircraft?.aircraft_model
    
    return {
      ...option,
      // Include aircraft model data for the component
      aircraftModel: aircraftModel ? {
        id: aircraftModel.id,
        name: aircraftModel.name,
        manufacturer: aircraftModel.aircraft_manufacturer?.name || 'Unknown',
        defaultCapacity: aircraftModel.size_code ? parseInt(aircraftModel.size_code) : 8,
        defaultRangeNm: 2000, // Default range
        defaultSpeedKnots: 400, // Default speed
        images: aircraftModel.aircraft_model_image
          ?.sort((a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1
            if (!a.is_primary && b.is_primary) return 1
            return a.display_order - b.display_order
          })
          .map((img: any) => {
            // If the URL is malformed, try to regenerate it
            if (img.public_url && !img.public_url.includes('/models/')) {
              // Try to reconstruct the correct path
              const fileName = img.public_url.split('/').pop()
              const reconstructedUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/aircraft-media/tenant/${aircraftModel.created_by}/models/${aircraftModel.id}/${fileName}`
              return reconstructedUrl
            }
            return img.public_url
          })
          .filter(Boolean) || [],
      } : null,
      // Include aircraft tail data for the component
      aircraftTail: aircraft ? {
        id: aircraft.id,
        tailNumber: aircraft.tail_number,
        operator: aircraft.operator?.name || aircraft.operator_id,
        operator_id: aircraft.operator_id,
        year: aircraft.year_of_manufacture,
        yearOfRefurbish: aircraft.year_of_refurbish,
        cruisingSpeed: aircraft.cruising_speed,
        rangeNm: aircraft.range_nm,
        amenities: aircraft.aircraft_amenity?.map((amenity: any) => ({
          name: amenity.amenity?.name,
          code: amenity.amenity?.code,
          icon_ref: amenity.amenity?.icon_ref,
          description: amenity.amenity?.description,
          category: amenity.amenity?.category
        })).filter(Boolean) || [],
        images: aircraft.aircraft_image
          ?.sort((a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1
            if (!a.is_primary && b.is_primary) return 1
            return a.display_order - b.display_order
          })
          .map((img: any) => {
            // If the URL is malformed, try to regenerate it
            if (img.public_url && !img.public_url.includes('/aircraft/')) {
              // Try to reconstruct the correct path
              const fileName = img.public_url.split('/').pop()
              const reconstructedUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/aircraft-media/tenant/${aircraft.tenant_id}/aircraft/${aircraft.id}/${fileName}`
              return reconstructedUrl
            }
            return img.public_url
          })
          .filter(Boolean) || [],
        capacityOverride: aircraft.capacity_pax,
        rangeNmOverride: aircraft.range_nm,
        speedKnotsOverride: aircraft.cruising_speed,
        status: aircraft.status,
        homeBase: aircraft.home_base,
        serialNumber: aircraft.serial_number,
        mtowKg: aircraft.mtow_kg,
      } : null,
      // Include amenities with full details
      selectedAmenities: aircraft?.aircraft_amenity?.map((amenity: any) => ({
        name: amenity.amenity?.name,
        code: amenity.amenity?.code,
        icon_ref: amenity.amenity?.icon_ref,
        description: amenity.amenity?.description,
        category: amenity.amenity?.category
      })).filter(Boolean) || [],
    }
  })

  return {
    ...quote,
    legs: legs || [],
    services,
    options: enrichedOptions,
  }
}

/* =========================================================
   UPDATE (PATCH)
========================================================= */
export async function saveQuoteAll(quote: any) {
  if (!quote?.id) throw new Error("Missing quote id in saveQuoteAll()")

  // 🛰️ Log for debug
  console.log("💾 saveQuoteAll → PATCH route", {
    quoteId: quote.id,
    legs: quote.legs?.length || 0,
    options: quote.options?.length || 0,
  })

  const payload = {
    quote: {
      contact_id: quote.contact_id,
      contact_name: quote.contact_name,
      contact_email: quote.contact_email,
      contact_phone: quote.contact_phone,
      contact_company: quote.contact_company,
      valid_until: quote.valid_until,
      notes: quote.notes,
      title: quote.title,
      status: quote.status,
      trip_type: quote.trip_type,
      trip_summary: quote.trip_summary,
      total_pax: quote.total_pax,
      special_notes: quote.special_notes,
    },
    legs: quote.legs || [],
    options: quote.options || [],
    services: quote.services || [],
  }

  const res = await fetch(`/api/quotes/${quote.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Failed to save quote")

  // Refresh from DB
  return await getQuoteById(quote.id)
}

/* =========================================================
   DELETE
========================================================= */
export async function deleteQuote(id: string) {
  if (!id) throw new Error("Missing quote ID")
  const supabase = createClient()

  await Promise.all([
    supabase.from("quote_detail").delete().eq("quote_id", id),
    supabase.from("quote_item").delete().eq("quote_id", id),
    supabase.from("quote_option").delete().eq("quote_id", id),
  ])

  const { error } = await supabase.from("quote").delete().eq("id", id)
  if (error) throw error
}
