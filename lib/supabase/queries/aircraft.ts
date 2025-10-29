"use client"
import type { AircraftRecord } from "@/lib/types"

export async function getAircraft(): Promise<AircraftRecord[]> {
  // Only run on client side
  if (typeof window === 'undefined') throw new Error("getAircraft can only be called on client side")
  
  const { createClient } = await import("@/lib/supabase/client")
  const supabase = createClient()
  const { data, error } = await supabase
    .from("aircraft")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getAircraftById(id: string): Promise<AircraftRecord | null> {
  const { data, error } = await supabase.from("aircraft").select("*").eq("id", id).single()
  if (error) throw error
  return data
}

export async function insertAircraft(payload: Partial<AircraftRecord>): Promise<AircraftRecord> {
  const { data, error } = await supabase.from("aircraft").insert(payload).select("*").single()
  if (error) throw error
  return data
}

export async function updateAircraft(id: string, updates: Partial<AircraftRecord>): Promise<AircraftRecord> {
  const { data, error } = await supabase.from("aircraft").update(updates).eq("id", id).select("*").single()
  if (error) throw error
  return data
}

export async function deleteAircraft(id: string): Promise<void> {
  const { error } = await supabase.from("aircraft").delete().eq("id", id)
  if (error) throw error
}
