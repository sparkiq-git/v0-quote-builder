import { supabase } from "@/lib/supabase/client"

export async function updateContact(contactId: string, updates: any) {
  const { error } = await supabase.from("contact").update(updates).eq("id", contactId)
  if (error) throw error
  return true
}
