"use server"

import { createClient } from "@/lib/supabase/server"
import { put, del } from "@vercel/blob"

export async function uploadContactAvatar(contactId: string, file: File, tenantId: string) {
  try {
    const supabase = await createClient()

    // Check if contact exists and belongs to tenant
    const { data: contact, error: fetchError } = await supabase
      .from("contact")
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
      .from("contact")
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
      .from("contact")
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
      .from("contact")
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

function getAbsoluteAvatarUrl(avatarPath: string): string {
  console.log("[v0] Converting avatar path to absolute URL:", avatarPath)

  // If already an absolute URL (Vercel Blob or full HTTP URL), return as-is
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
    console.log("[v0] Already absolute URL, returning as-is")
    return avatarPath
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined")
  }

  const fullUrl = `${supabaseUrl}/storage/v1/object/public/avatar/${avatarPath}`
  console.log("[v0] Constructed Supabase Storage URL:", fullUrl)
  return fullUrl
}

export async function getContactAvatarUrl(contactId: string) {
  try {
    const supabase = await createClient()

    const { data: contact, error } = await supabase.from("contact").select("avatar_path").eq("id", contactId).single()

    if (error || !contact) {
      return { success: false, error: "Contact not found" }
    }

    if (!contact.avatar_path) {
      return { success: false, error: "No avatar found" }
    }

    const absoluteUrl = getAbsoluteAvatarUrl(contact.avatar_path)

    return { success: true, url: absoluteUrl }
  } catch (error: any) {
    console.error("Error fetching contact avatar URL:", error)
    return { success: false, error: error.message }
  }
}

export async function getPassengerAvatarUrl(passengerId: string) {
  try {
    console.log("[v0] Fetching passenger avatar for ID:", passengerId)
    const supabase = await createClient()

    const { data: passenger, error } = await supabase
      .from("contact_passenger")
      .select("avatar_path")
      .eq("id", passengerId)
      .single()

    console.log("[v0] Passenger avatar query result:", { passenger, error })

    if (error || !passenger) {
      return { success: false, error: "Passenger not found" }
    }

    if (!passenger.avatar_path) {
      return { success: false, error: "No avatar found" }
    }

    const absoluteUrl = getAbsoluteAvatarUrl(passenger.avatar_path)

    return { success: true, url: absoluteUrl }
  } catch (error: any) {
    console.error("[v0] Error fetching passenger avatar URL:", error)
    return { success: false, error: error.message }
  }
}
