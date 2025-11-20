import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export async function updateContact(contactId: string, updates: any) {
  const { error } = await supabase.from("contact").update(updates).eq("id", contactId)
  if (error) throw error
  return true
}
