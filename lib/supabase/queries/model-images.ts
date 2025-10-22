"use client"

import { supabase } from "@/lib/supabase/client"

export interface AircraftModelImage {
  id: string
  tenant_id: string
  aircraft_model_id: string
  storage_path: string
  public_url: string | null
  caption: string | null
  is_primary: boolean
  display_order: number
  created_at: string
}

/** 🔹 Get all images for a model */
export async function getModelImages(modelId: string): Promise<AircraftModelImage[]> {
  const { data, error } = await supabase
    .from("aircraft_model_image")
    .select("*")
    .eq("aircraft_model_id", modelId)
    .order("display_order")
  if (error) throw error
  return data ?? []
}

/** 🔹 Insert a new image record */
export async function insertModelImage(payload: Omit<AircraftModelImage, "id" | "created_at">) {
  const { data, error } = await supabase.from("aircraft_model_image").insert(payload).select("*").single()
  if (error) throw error
  return data
}

/** 🔹 Update image metadata (caption, order, primary flag) */
export async function updateModelImage(id: string, updates: Partial<AircraftModelImage>) {
  const { data, error } = await supabase.from("aircraft_model_image").update(updates).eq("id", id).select("*").single()
  if (error) throw error
  return data
}

/** 🔹 Delete an image */
export async function deleteModelImage(id: string) {
  const { error } = await supabase.from("aircraft_model_image").delete().eq("id", id)
  if (error) throw error
}

/** 🔹 Set a new primary image (unsets others for that model) */
export async function setPrimaryModelImage(modelId: string, imageId: string) {
  const { error: unset } = await supabase
    .from("aircraft_model_image")
    .update({ is_primary: false })
    .eq("aircraft_model_id", modelId)

  if (unset) throw unset

  const { data, error: set } = await supabase
    .from("aircraft_model_image")
    .update({ is_primary: true })
    .eq("id", imageId)
    .select("*")
    .single()

  if (set) throw set
  return data
}
