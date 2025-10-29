"use client"

import { createClient } from "@/lib/supabase/client"
import type { AircraftModelRecord } from "@/lib/types"

/** 🔹 Get all aircraft models with images and manufacturer info */
export async function getModels(): Promise<AircraftModelRecord[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("aircraft_model")
    .select(`
      *,
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
    `)
    .order("name")
  
  if (error) throw error
  
  // Transform the data to include images array and manufacturer info
  return (data ?? []).map(model => ({
    ...model,
    manufacturer: model.aircraft_manufacturer,
    images: model.aircraft_model_image
      ?.sort((a: any, b: any) => {
        // Sort by primary first, then by display_order
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        return a.display_order - b.display_order
      })
      .map((img: any) => img.public_url)
      .filter(Boolean) || []
  }))
}

/** 🔹 Insert new model */
export async function insertModel(payload: Partial<AircraftModelRecord>): Promise<AircraftModelRecord> {
  const { data, error } = await supabase.from("aircraft_model").insert(payload).select("*").single()
  if (error) throw error
  return data
}

/** 🔹 Update existing model */
export async function updateModel(id: string, updates: Partial<AircraftModelRecord>): Promise<AircraftModelRecord> {
  const { data, error } = await supabase
    .from("aircraft_model")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return data
}

/** 🔹 Delete model */
export async function deleteModel(id: string): Promise<void> {
  const { error } = await supabase.from("aircraft_model").delete().eq("id", id)
  if (error) throw error
}
