"use server"

import { createClient } from "@/lib/supabase/server"
import { put, del } from "@vercel/blob"

export async function uploadContactAvatar(contactId: string, file: File, tenantId: string) {
  try {
    const supabase = await createClient()

    // Check if contact exists and belongs to tenant
    const { data: contact, error: fetchError } = await supabase
      .from("contacts")
      .select("id, avatar_path")
      .eq("id", contactId)
      .eq("tenant_id", tenantId)
      .single()

    if (fetchError || !contact) {
      return { success: false, error: "Contact not found" }
    }

    // Delete old avatar if exists
    if (contact.avatar_path) {
      try {
        await del(contact.avatar_path)
      } catch (deleteError) {
        console.error("Error deleting old avatar:", deleteError)
      }
    }

    // Upload new avatar
    const blob = await put(`contacts/${tenantId}/${contactId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

    // Update contact with new avatar path
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ avatar_path: blob.url })
      .eq("id", contactId)
      .eq("tenant_id", tenantId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, url: blob.url }
  } catch (error: any) {
    console.error("Error uploading contact avatar:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteContactAvatar(contactId: string) {
  try {
    const supabase = await createClient()

    // Get contact with avatar
    const { data: contact, error: fetchError } = await supabase
      .from("contacts")
      .select("id, avatar_path, tenant_id")
      .eq("id", contactId)
      .single()

    if (fetchError || !contact) {
      return { success: false, error: "Contact not found" }
    }

    // Delete from blob storage
    if (contact.avatar_path) {
      try {
        await del(contact.avatar_path)
      } catch (deleteError) {
        console.error("Error deleting avatar from blob:", deleteError)
      }
    }

    // Update contact to remove avatar path
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ avatar_path: null })
      .eq("id", contactId)
      .eq("tenant_id", contact.tenant_id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting contact avatar:", error)
    return { success: false, error: error.message }
  }
}

export async function getContactAvatarUrl(contactId: string) {
  try {
    const supabase = await createClient()

    const { data: contact, error } = await supabase.from("contacts").select("avatar_path").eq("id", contactId).single()

    if (error || !contact) {
      return { success: false, error: "Contact not found" }
    }

    if (!contact.avatar_path) {
      return { success: false, error: "No avatar found" }
    }

    return { success: true, url: contact.avatar_path }
  } catch (error: any) {
    console.error("Error fetching contact avatar URL:", error)
    return { success: false, error: error.message }
  }
}

export async function getPassengerAvatarUrl(passengerId: string) {
  try {
    const supabase = await createClient()

    const { data: passenger, error } = await supabase
      .from("passengers")
      .select("avatar_path")
      .eq("id", passengerId)
      .single()

    if (error || !passenger) {
      return { success: false, error: "Passenger not found" }
    }

    if (!passenger.avatar_path) {
      return { success: false, error: "No avatar found" }
    }

    return { success: true, url: passenger.avatar_path }
  } catch (error: any) {
    console.error("Error fetching passenger avatar URL:", error)
    return { success: false, error: error.message }
  }
}
