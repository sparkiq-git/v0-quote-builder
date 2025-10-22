"use client"

import { supabase } from "@/lib/supabase/client"
import type { AircraftModelRecord } from "@/lib/types"

/** 🔹 Get all aircraft models */
export async function getModels(): Promise<AircraftModelRecord[]> {
  const { data, error } = await supabase.from("aircraft_model").select("*").order("name")
  if (error) throw error
  return data ?? []
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
