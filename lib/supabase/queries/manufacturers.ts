"use client"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()
import type { AircraftManufacturer } from "@/lib/types"

export async function getManufacturers(): Promise<AircraftManufacturer[]> {
  const { data, error } = await supabase
    .from("aircraft_manufacturer")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function insertManufacturer(name: string, tenant_id?: string): Promise<AircraftManufacturer> {
  const { data, error } = await supabase
    .from("aircraft_manufacturer")
    .insert({ name, tenant_id })
    .select("*")
    .single()

  if (error) throw error
  return data
}
