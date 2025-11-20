"use client"

import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export async function getContacts(tenantId: string) {
  const { data, error } = await supabase
    .from("contact")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
  if (error) throw error
  return data
}

export async function upsertContact(contact: any) {
  const { data, error } = await supabase
    .from("contact")
    .upsert(contact, { onConflict: "id" })
    .select()
    .single()
  if (error) throw error
  return data
}
